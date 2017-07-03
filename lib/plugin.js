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

  emitter.on('sub-suite-end', function(browser, data) {
    if (data && data.__coverage__) {
      this.map.merge(data.__coverage__);
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

  emitter.hook('prepare:webserver', function(express) {
    emitter.emit('log:debug', 'coverage', 'prepare:webserver', package.name, package.version);
    express.use(middleware(emitter.options.root, this.options, emitter));
    return Promise.resolve();
  }.bind(this));

};

module.exports = Listener;
