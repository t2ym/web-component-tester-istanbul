var middleware = require('./middleware');
var istanbul = require('istanbul');
var Validator = require('./validator');
var sync = true;

/**
* Tracks coverage objects and writes results by listening to events
* emitted from wct test runner.
*/

function Listener(emitter, pluginOptions) {

  this.options = pluginOptions;
  this.collector = new istanbul.Collector();
  this.reporter = new istanbul.Reporter(false, this.options.dir);
  this.validator = new Validator(this.options.thresholds);
  this.reporter.addAll(this.options.reporters)

  emitter.on('sub-suite-end', function(browser, data) {
    if (data && data.__coverage__) {
      this.collector.add(data.__coverage__);
    }
  }.bind(this));

  emitter.on('istanbul-coverage', function(browser, data) {
    var browserId = [ browser.platform, browser.browserName, browser.version ].join(' ');
    emitter.emit('log:debug', 'coverage', 'collect   ', browserId, data.command, data.command === 'fragment' ? data.path.join('.') : '');
    var cursor, parent, prop;
    if (data) {
      switch (data.command) {
      case 'reset':
        this.tmpData = this.tmpData || {};
        this.tmpData[browserId] = { __coverage__: {} };
        break;
      case 'fragment':
        parent = this.tmpData[browserId];
        prop = '__coverage__';
        cursor = parent[prop];
        data.path.forEach(function (_prop) {
          parent = cursor;
          cursor[_prop] = cursor[_prop] || {};
          cursor = cursor[_prop];
          prop = _prop;
        });
        parent[prop] = data.fragment;
        break;
      case 'collect':
        this.collector.add(this.tmpData[browserId].__coverage__);
        break;
      default:
        break;
      }
    }
  }.bind(this));

  emitter.on('run-end', function(error) {
    if (!error) {
      this.reporter.write(this.collector, sync, function() {});

      if (!validator.validate(this.collector)) {
        throw new Error('Coverage failed');
      }
    }
  }.bind(this));

  emitter.hook('prepare:webserver', function(express) {
    express.use(middleware(emitter.options.root, this.options, emitter));
    express._delayedAppConfig();
    return Promise.resolve();
  }.bind(this));

};

module.exports = Listener;
