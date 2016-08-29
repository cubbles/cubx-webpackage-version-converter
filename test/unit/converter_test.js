/* globals describe, it, beforeEach, afterEach, before, after, expect, sinon */
(function () {
  'use strict';
  describe('Converter', function () {
    var proxyquire;
    // eslint-disable-next-line no-unused-vars
    var inquirer;
    // eslint-disable-next-line no-unused-vars
    var WebpackageConverter;
    // eslint-disable-next-line no-unused-vars
    var expectedWebpackagePath;
    var expectedRteVersion;
    var converter;
    var callback;
    before(function () {
      expectedRteVersion = '2.0.0';
      proxyquire = require('proxyquire');
      inquirer = proxyquire('inquirer', {
        'prompt': function (config) {
          return new Promise(function (resolve, reject) {
            resolve({ rteVersion: expectedRteVersion });
          });
        },
        '@noCallThru': true,
        '@global': true
      });
    });
    after(function () {
      inquirer = null;
    });
    beforeEach(function () {
      var expectedWebpackagePath = '../webpackages/my-webpackage';
      WebpackageConverter = proxyquire('../../lib/WebpackageConverter', {
        'convert': function (webpackagePath, rteVersion) {
          expect(webpackagePath).to.be.exists;
          webpackagePath.should.be.equal(expectedWebpackagePath);
          expect(rteVersion).to.be.exists;
          rteVersion.should.be.equal(expectedRteVersion);
        },
        '@noCallThru': true,
        '@global': true
      });
      var Converter = require('../../lib/converter');
      converter = new Converter(expectedWebpackagePath);
      callback = sinon.spy();
    });
    afterEach(function () {
      WebpackageConverter = null;
    });
    it('callback function schould be called', function () {
      converter.convert(callback);
      callback.should.be.calledOnce;
    });
  });
})();
