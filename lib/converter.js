(function () {
  'strict mode';

  var Converter = function (webpackagePath) {
    if (!webpackagePath) {
      console.error('Converter: Missed parameter for webpackage path.');
      throw new Error('Missed parameter for webpackage path.');
    }
    this._webpackagePath = webpackagePath;
  };

  Converter.prototype.convert = function () {
    var inquirer = require('inquirer');
    var WebpackageConverter = require('./webpackageConverter');
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
      console.log('rte version:' + answers.rteVersion);
      try {
        console.log(self);
        var webpackageConverter = new WebpackageConverter(self._webpackagePath, answers.rteVersion);
        webpackageConverter.convert();
      } catch (err) {
        console.log('Converter: An exception occured in WebpackageConverter.', err);
        throw new Error();
      }
    });
  };

  exports = module.exports = Converter;
  // webpackageConverter instantiieren
})();
