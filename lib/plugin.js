var middleware = require('./middleware');
var libCoverage = require('istanbul-lib-coverage');
var libReport = require('istanbul-lib-report');
var reports = require('istanbul-reports');
var Validator = require('./validator');
var sync = true;
var package = require('../package.json');

/**
* Tracks coverage objects and writes results by listening to events
* emitted from wct test runner.
*/

function Listener(emitter, pluginOptions) {
  this.options = pluginOptions;
  this.map = libCoverage.createCoverageMap({});
  this.context = libReport.createContext({ dir: this.options.dir });
  this.validator = new Validator(this.options.thresholds);
  this.reporters = this.options.reporters || [ 'text-summary', 'lcov' ];
  this.chain = false;

  emitter.on('sub-suite-end', function(browser, data) {
    if (data) {
      for (var prop in data) {
        if (prop.indexOf('__coverage__') === 0) {
          emitter.emit('log:debug', 'coverage', 'sub-suite-end', 'map.merge(data.' + prop + ')');
          this.map.merge(data[prop]);
        }
      }
    }
  }.bind(this));

  emitter.on('run-end', function(error) {
    if (!error) {
      var tree = libReport.summarizers.pkg(this.map);
      this.reporters.forEach(function (reporter) {
        tree.visit(reports.create(reporter), this.context);
      }, this);

      if (!this.validator.validate(this.map)) {
        throw new Error('Coverage failed');
      }
    }
  }.bind(this));

  emitter.hook('define:webserver', function(express, substitute, options) {
    this.chain = true;
    emitter.emit('log:debug', 'coverage', 'define:webserver', package.name, package.version);
    express.use(middleware(emitter.options.root, this.options, emitter, options, this.chain));
    var layer = express._router.stack.pop();
    for (var i = express._router.stack.length - 1; i >= 0; i--) {
      var current = express._router.stack[i];
      if (current.handle.toString().startsWith('(req, res, next) => {')) {
        express._router.stack.splice(i + 1, 0, layer);
        break;
      }
    }
    substitute(express);
    return Promise.resolve();
  }.bind(this));

  emitter.hook('prepare:webserver', function(express) {
    emitter.emit('log:debug', 'coverage', 'prepare:webserver', package.name, package.version);
    if (!this.chain) {
      express.use(middleware(emitter.options.root, this.options, emitter, null, this.chain));
    }
    return Promise.resolve();
  }.bind(this));

};

module.exports = Listener;
