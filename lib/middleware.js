var _ = require('lodash');
var minimatch = require('minimatch');
var fs = require('fs');
var path = require('path');
var istanbul = require('istanbul-lib-instrument');
var parseurl = require('parseurl');
var scriptHook = require('html-script-hook');
var contentType = require('content-type');
var transformResponse = require('polyserve/lib/transform-middleware.js').transformResponse;

// istanbul
var instrumenter = istanbul.createInstrumenter({
  coverageVariable: '__coverage__',
  preserveComments: true,
  compact: false,
  autoWrap: true
  // debug: false
});

// helpers
var cache = {};

function patchCoverageVariable(code) {
  return code.replace(/coverage ?= ?global\[gcv\] ?\|\| ?\(global\[gcv\] ?= ?{}\)/g, 'coverage = WCT.share[gcv] = global[gcv] || (global[gcv] = {})');
}

function getFilePath(root, req) {
  var pathname = parseurl(req).pathname;
  var rootDirName = root.split(/[\/\\]/).pop();
  var componentPathName = pathname.split(/\//)[1];
  return req._filePath || (rootDirName === componentPathName ? path.join(root, '..', pathname) : path.join(root, pathname));
}

function instrumentHtml(html, req, root){
  var asset = req.url;
  var htmlFilePath = getFilePath(root, req);

  if ( !cache[asset] ){
    cache[asset] = scriptHook (html, {scriptCallback: gotScript});
  }

  function gotScript(code, loc) {
    return patchCoverageVariable(instrumenter.instrumentSync(code, htmlFilePath));
  }

  return cache[asset];
}

function instrumentAsset(code, req, root){
  var asset = req.url;
  var assetPath = getFilePath(root, req);

  if ( !cache[asset] ){
    cache[asset] = patchCoverageVariable(instrumenter.instrumentSync(code, assetPath));
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
function coverageMiddleware(root, options, emitter) {
  return transformResponse({
    shouldTransform(_request, response) {
      return response.statusCode >= 200 && response.statusCode < 300 &&
        compileMimeTypes.indexOf(getContentType(response)) >= 0;
    },
    transform(request, response, body) {
      const relativePath = parseurl(request).pathname;
      const contentType = getContentType(response);
      const source = body;

      // always ignore platform files in addition to user's blacklist
      var blacklist = ['/web-component-tester/*'].concat(options.exclude);
      var whitelist = options.include;

      // check asset against rules
      var process = match(relativePath, whitelist) && !match(relativePath, blacklist);

      if (process) {
        if (contentType === htmlMimeType) {
          body = instrumentHtml(source, request, root);
        }
        if (javaScriptMimeTypes.indexOf(contentType) !== -1) {
          body = instrumentAsset(source, request, root);
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
