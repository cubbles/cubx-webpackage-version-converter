/* globals describe, it, beforeEach, afterEach, expect, sinon */
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
    var path;
    var fs;
    var webpackageName;

    var testRootPath;
    var spyCallback;
    var Converter;
    beforeEach(function (done) {
      proxyquire = require('proxyquire');
      path = require('path');
      fs = require('fs-extra');
      testRootPath = path.join(process.cwd(), 'test');
      webpackageName = 'my-webpackage';
      var testPath = path.resolve(testRootPath, 'webpackages', webpackageName);
      var tempPath = path.resolve(__dirname, '../resources/8.3.1/');
      Converter = proxyquire('../../lib/converter', {
        'inquirer': {
          'prompt': function (config) {
            return new Promise(function (resolve, reject) {
              resolve({ rteVersion: expectedRteVersion });
            });
          }
        }
      });
      expectedRteVersion = '2.0.0';
      expectedWebpackagePath = testPath;

      fs.copy(tempPath, testPath, function (err) {
        if (err) {
          throw new Error(err);
        }
        done();
      });
    });
    afterEach(function (done) {
      var testPathRoot = path.resolve(testRootPath, 'webpackages');
      fs.remove(testPathRoot, function (err) {
        if (err) {
          throw new Error(err);
        }
        done();
      });
    });
    describe('call callback', function () {
      beforeEach(function (done) {
        function callback () {
          done();
        };
        spyCallback = sinon.spy(callback);
        converter = new Converter(expectedWebpackagePath);
        converter.convert(spyCallback);
      });

      it('callback function should be called', function () {
        spyCallback.should.be.calledOnce;
      });
    });
    describe('absent callback', function () {
      beforeEach(function () {
        converter = new Converter(expectedWebpackagePath);
      });

      it('missing callback function should be not called', function () {
        expect(function () {
          converter.convert();
        }).to.not.throw(Error);
      });
    });
  });
})();
