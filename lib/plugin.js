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

  emitter.on('run-end', function(error) {
    if (!error) {
      this.reporter.write(this.collector, sync, function() {});

      if (!validator.validate(this.collector)) {
        throw new Error('Coverage failed');
      }
    }
  }.bind(this));

// Note: this patch is required for polyserve
//gulp.task('patch-polyserve', () => {
//  return gulp.src([
//    'node_modules/polyserve/lib/start_server.js',
//    'node_modules/polyserve/lib/transform-middleware.js',
//    'node_modules/web-component-tester/node_modules/polyserve/lib/start_server.js',
//    'node_modules/web-component-tester/node_modules/polyserve/lib/transform-middleware.js' ], 
//    { base: 'node_modules' })
//    .pipe(gulpif('**/start_server.js', replace(
//      "if (options.compile === 'auto' || options.compile === 'always')",
//      "app._delayedAppConfig = () => {\n    if (/* patched */ options.compile === 'auto' || options.compile === 'always')", 'g')))
//    .pipe(gulpif('**/start_server.js', replace(
//      "return app;",
//      "}\n    return /* patched */ app;", 'g')))
//    .pipe(gulpif('**/transform-middleware.js', replace(
//                    "newBody = transformer.transform(req, res, body);",`
//                    let tmpBody = body;
//                    if (Array.isArray(req._transformers)) {
//                        req._transformers.forEach(_transformer => {
//                            tmpBody = _transformer.transform(req, res, tmpBody);
//                        });
//                    }
//                    newBody = transformer.transform(req, res, tmpBody);`, 'g')))
//    .pipe(gulp.dest('node_modules'));
//});

  emitter.hook('prepare:webserver', function(express) {
    express.use(middleware(emitter.options.root, this.options, emitter));
    express._delayedAppConfig();
    return Promise.resolve();
  }.bind(this));

};

module.exports = Listener;
