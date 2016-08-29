(function () {
  'strict mode';

  var inquirer = require('inquirer');
  var WebpackageConverter = require('./webpackageConverter');
  /**
   *
   * @param webpackagePath

   * @constructor
   */
  var Converter = function (webpackagePath) {
    if (!webpackagePath) {
      console.error('Converter: Missed parameter for webpackage path.');
      throw new Error('Missed parameter for webpackage path.');
    }
    this._webpackagePath = webpackagePath;
  };

  /**
   * Convert the webpackage
   * @param callback callback function called after processing
   */
  Converter.prototype.convert = function (callback) {
    var self = this;
    inquirer.prompt([
      {
        type: 'input',
        name: 'rteVersion',
        message: 'Please type the required version of cubx.core.rte:',
        default: '2.0.0',
        validate: function (val) {
          var pattern = /^\d{1,2}\.\d{1,3}\.\d{1,3}$/;
          console.log('validate:' + val.match(pattern) !== null);
          return val.match(pattern) !== null;
        }
      }
    ]).then(function (answers) {
      try {
        var webpackageConverter = new WebpackageConverter(self._webpackagePath, answers.rteVersion);
        webpackageConverter.convert();
        if (callback) {
          callback();
        }
      } catch (err) {
        console.error('Converter: An exception occured in WebpackageConverter.', err);
        throw new Error();
      }
    });
  };

  exports = module.exports = Converter;
})();
