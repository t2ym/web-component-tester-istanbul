var _ = require('lodash');

function Validator(thresholds) {
  if (thresholds) {
    if (thresholds['global']) {
      if (Object.keys(thresholds).length > 1) {
        console.warn('Only global thresholds are effective for coverage');
      }
      thresholds = thresholds['global'];
    }
    console.log('Received global coverage thresholds ' + JSON.stringify(thresholds));
  }
  this.thresholds = thresholds || {};
}

Validator.prototype.validate = function(map) {
  var summary = map.getCoverageSummary();
  var thresholdsMet = true;

  for (var key in this.thresholds) {
    if (summary[key].pct < this.thresholds[key]) {
      thresholdsMet = false;
      console.log('Coverage for ' + key +
        ' ('  + summary[key].pct + '%)' +
        ' does not meet configured threshold (' +
        this.thresholds[key] + '%) ');
    }
  }

  return thresholdsMet;
}

module.exports = Validator;