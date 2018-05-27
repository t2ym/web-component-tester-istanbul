var _ = require('lodash');
var minimatch = require('minimatch');
var fs = require('fs');
var path = require('path');
var babylon = require('babylon');
var babylonPlugins = [
  'objectRestSpread',
  'asyncGenerators',
  'dynamicImport',
  'importMeta',
];
var babel = require('@babel/core');
var babelPlugins = [
  require('@babel/plugin-syntax-object-rest-spread'),
  require('@babel/plugin-syntax-async-generators'),
  require('@babel/plugin-syntax-dynamic-import'),
  require('@babel/plugin-syntax-import-meta'),
  require('babel-plugin-istanbul'),
];
var parseurl = require('parseurl');
var scriptHook = require('html-script-hook');
var contentType = require('content-type');
var transformResponse = require('./transform-middleware.js').transformResponse;

// helpers
var cache = {};

function patchCoverageVariable(code) {
  return code.replace(/coverage ?= ?global\[gcv\] ?\|\| ?\(global\[gcv\] ?= ?{}\)/g, 'coverage = WCT.share[gcv] = global[gcv] || (global[gcv] = {})');
}

// babel instrumentation
function instrumentBabel(code, filename) {
  let ast;
  try {
    ast = babylon.parse(code, {
      sourceType: 'script',
      plugins: babylonPlugins,
    });
  }
  catch (e) {
    if (e.message.match(/import.*export.*module/)) {
      ast = babylon.parse(code, {
        sourceType: 'module',
        plugins: babylonPlugins,
      });
    }
    else {
      throw e;
    }
  }
  let { code: instrumented } = babel.transformFromAst(ast, code, { filename: filename, presets: [], plugins: babelPlugins });
  if (typeof instrumented === 'undefined') {
    return code;
  }
  return patchCoverageVariable(instrumented);
}

/**
 * @license
 * Copyright (c) 2015 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
// From https://github.com/Polymer/tools/blob/master/packages/polyserve/src/make_app.ts
function arrayStartsWith(array, prefix) {
  for (let i = 0; i < prefix.length; i++) {
    if (i >= array.length || array[i] !== prefix[i]) {
      return false;
    }
  }
  return true;
}

function getFilePath(root, req, pluginOptions, emitter, options) {
  if (options) {
    // For web-component-tester@^6.6.0
    // From https://github.com/Polymer/tools/blob/master/packages/polyserve/src/make_app.ts
    const rootPath = path.resolve(options.root);
    const baseComponentDir = options.componentDir;
    const componentDir = path.resolve(root, baseComponentDir);
    const packageName = options.packageName;
    const url = parseurl(req);
    let splitPath = url.pathname.split('/').slice(1);
    const splitPackagePath = packageName.split('/');
    if (arrayStartsWith(splitPath, splitPackagePath)) {
      if (rootPath) {
        splitPath = [rootPath].concat(splitPath.slice(splitPackagePath.length));
      }
      else {
        splitPath = splitPath.slice(splitPackagePath.length);
      }
    }
    else {
      splitPath = [componentDir].concat(splitPath);
    }
    return splitPath.join('/');
  }
  else {
    // For @t2ym/web-component-tester@6.0.2
    let pathname = parseurl(req).pathname;
    let rootDirName = root.split(/[\/\\]/).pop();
    let componentPathName = pathname.split(/\//)[1];
    return req._filePath || (rootDirName === componentPathName ? path.join(root, '..', pathname) : path.join(root, pathname));
  }
}

function instrumentHtml(html, req, root, pluginOptions, emitter, options){
  var asset = req.url;
  var htmlFilePath = getFilePath(root, req, pluginOptions, emitter, options);

  if ( !cache[asset] ){
    cache[asset] = scriptHook (html, {scriptCallback: gotScript});
  }

  function gotScript(code, loc) {
    return instrumentBabel(code, htmlFilePath);
  }

  return cache[asset];
}

function instrumentAsset(code, req, root, pluginOptions, emitter, options){
  var asset = req.url;
  var assetPath = getFilePath(root, req, pluginOptions, emitter, options);

  if ( !cache[asset] ){
    cache[asset] = instrumentBabel(code, assetPath);
  }

  return cache[asset];
}

// from polyserve
const javaScriptMimeTypes = [
  'application/javascript',
  'application/ecmascript',
  'text/javascript',
  'text/ecmascript'
];
const htmlMimeType = 'text/html';
const compileMimeTypes = [
  htmlMimeType
].concat(javaScriptMimeTypes);
function getContentType(response) {
  const contentTypeHeader = response.getHeader('Content-Type');
  return contentTypeHeader && contentType.parse(contentTypeHeader).type;
}

/**
 * Middleware that serves an instrumented asset based on user
 * configuration of coverage
 */
function coverageMiddleware(root, pluginOptions, emitter, options, chain = false, last = false) {
  return transformResponse({
    chain: chain,
    last: last,
    shouldTransform(_request, response) {
      return response.statusCode >= 200 && response.statusCode < 300 &&
        compileMimeTypes.indexOf(getContentType(response)) >= 0;
    },
    transform(request, response, body) {
      const relativePath = parseurl(request).pathname;
      const contentType = getContentType(response);
      const source = body;

      // always ignore platform files in addition to user's blacklist
      var blacklist = ['/web-component-tester/*'].concat(pluginOptions.exclude);
      var whitelist = pluginOptions.include;

      // check asset against rules
      var process = match(relativePath, whitelist) && !match(relativePath, blacklist);

      if (process) {
        if (contentType === htmlMimeType) {
          body = instrumentHtml(source, request, root, pluginOptions, emitter, options);
        }
        if (javaScriptMimeTypes.indexOf(contentType) !== -1) {
          body = instrumentAsset(source, request, root, pluginOptions, emitter, options);
        }
        emitter.emit('log:debug', 'coverage', 'instrument', relativePath);
      }
      else {
        // no transformation
        emitter.emit('log:debug', 'coverage', 'skip      ', relativePath);
      }
      return body;
    }
  });
}

/**
 * Returns true if the supplied string mini-matches any of the supplied patterns
 */
function match(str, rules) {
    return _.some(rules, minimatch.bind(null, str));
}

function _getFilePathFromWaterfall(waterfall, request) {
  var requestPath = parseurl(request).pathname;
  var pathLookup = _.find(waterfall, function(pathLookup) {
    return requestPath.indexOf(pathLookup.prefix) === 0;
  });

  return requestPath.replace(pathLookup.prefix, pathLookup.target);
}

// Lifted from https://github.com/PolymerLabs/serve-waterfall
/**
 * @param {Mappings} mappings The mappings to serve.
 * @param {string} root The root directory paths are relative to.
 * @return {Array<{prefix: string, target: string}>}
 */
function _buildWaterfall(pathLookups, root) {
  var basename = path.basename(root);
  var waterfall = _.map(pathLookups, function(pathLookup) {
      var prefix = Object.keys(pathLookup)[0];
      return {
        prefix: prefix.replace('<basename>', basename),
        target: path.resolve(root, pathLookup[prefix]),
      };
    });

  return waterfall;
}

module.exports = coverageMiddleware;
