/* globals describe,beforeEach,it,expect,afterEach */
(function () {
  // function (manifestConverter, manifest831, convertedManifest910) {
  'use strict';
  var convertedManifest910;
  var manifest831;
  var converter;
  var path;
  var fs;
  var webpackageName;
  var webpackagePath;
  var testRootPath;
  beforeEach(function (done) {
    path = require('path');
    fs = require('fs-extra');
    testRootPath = path.join(process.cwd(), 'test');
    webpackageName = 'my-webpackage';
    var testPath = path.resolve(testRootPath, 'webpackages', webpackageName);
    webpackagePath = testPath;
    var tempPath = path.resolve(__dirname, '../resources/8.3.1/');
    var Converter = require('../../lib/converter');
    converter = new Converter(webpackagePath);
    fs.copy(tempPath, testPath, function (err) {
      if (err) {
        throw new Error(err);
      } else {
        var pathName = path.resolve(testPath, 'convertedManifest@9.1.0.json');
        console.log(pathName);
        convertedManifest910 = fs.readFileSync(pathName, 'utf8');
        pathName = path.resolve(testPath, 'manifest@8.3.1.json');
        manifest831 = fs.readFileSync(pathName, 'utf8');
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
  describe('ManifestConverter', function () {
    describe('Single converter methods', function () {
      var manifest;
      var originalManifest;
      var convertedManifest;
      beforeEach(function () {
        convertedManifest = JSON.parse(convertedManifest910);
        manifest = JSON.parse(manifest831);
        originalManifest = JSON.parse(manifest831);
      });
      describe('#_addResourcesArrayToArtifacts()', function () {
        it('should add property "resources" containing an empty array to each artifact out of type [elementaryComponents|compoundComponents|utilities].', function () {
          converter._addResourcesArrayToArtifacts(manifest);
          Object.keys(manifest.artifacts).forEach(function (artifactType) {
            if (artifactType !== 'apps') {
              manifest.artifacts[ artifactType ].forEach(function (artifact) {
                expect(artifact).to.have.ownProperty('resources');
                expect(artifact.resources).to.be.an.instanceOf(Array);
              });
            }
          });
        });
      });
      describe('#_removeSingleEndpointsFromArtifacts()', function () {
        it('should remove "endpoints" property from all artifacts which have exactly one endpoint.', function () {
          converter._removeSingleEndpointsFromArtifacts(manifest);
          expect(manifest.artifacts.apps[ 0 ]).to.not.have.ownProperty('endpoints');
          expect(manifest.artifacts.compoundComponents[ 0 ]).to.not.have.ownProperty('endpoints');
          expect(manifest.artifacts.elementaryComponents[ 0 ]).to.not.have.ownProperty('endpoints');
          expect(manifest.artifacts.utilities[ 0 ]).to.not.have.ownProperty('endpoints');
          expect(manifest.artifacts.utilities[ 1 ]).to.have.ownProperty('endpoints');
        });
        it('should move "dependencies" and "resources" from the artifacts single endpoint to artifact itself.', function () {
          converter._removeSingleEndpointsFromArtifacts(manifest);
          expect(manifest.artifacts.apps[ 0 ]).to.have.ownProperty('dependencies');
          expect(manifest.artifacts.apps[ 0 ]).to.have.ownProperty('resources');
          expect(manifest.artifacts.apps[ 0 ].dependencies).to.eql(originalManifest.artifacts.apps[ 0 ].endpoints[ 0 ].dependencies);
          expect(manifest.artifacts.apps[ 0 ].resources).to.eql(originalManifest.artifacts.apps[ 0 ].endpoints[ 0 ].resources);

          expect(manifest.artifacts.compoundComponents[ 0 ]).to.have.ownProperty('dependencies');
          expect(manifest.artifacts.compoundComponents[ 0 ]).to.have.ownProperty('resources');
          expect(manifest.artifacts.compoundComponents[ 0 ].dependencies).to.eql(originalManifest.artifacts.compoundComponents[ 0 ].endpoints[ 0 ].dependencies);
          expect(manifest.artifacts.compoundComponents[ 0 ].resources).to.eql(originalManifest.artifacts.compoundComponents[ 0 ].endpoints[ 0 ].resources);

          expect(manifest.artifacts.elementaryComponents[ 0 ]).to.have.ownProperty('dependencies');
          expect(manifest.artifacts.elementaryComponents[ 0 ]).to.have.ownProperty('resources');
          expect(manifest.artifacts.elementaryComponents[ 0 ].dependencies).to.eql(originalManifest.artifacts.elementaryComponents[ 0 ].endpoints[ 0 ].dependencies);
          expect(manifest.artifacts.elementaryComponents[ 0 ].resources).to.eql(originalManifest.artifacts.elementaryComponents[ 0 ].endpoints[ 0 ].resources);

          expect(manifest.artifacts.utilities[ 0 ]).to.not.have.ownProperty('dependencies');
          expect(manifest.artifacts.utilities[ 0 ]).to.have.ownProperty('resources');
          expect(manifest.artifacts.utilities[ 0 ].resources).to.eql(originalManifest.artifacts.utilities[ 0 ].endpoints[ 0 ].resources);
        });
        it('should not append "endpointId" of removed endpoint to "artifactId" using - separator.', function () {
          converter._removeSingleEndpointsFromArtifacts(manifest);
          var artifactId = originalManifest.artifacts.apps[ 0 ].artifactId;

          expect(manifest.artifacts.apps[ 0 ].artifactId).to.eql(artifactId);

          artifactId = originalManifest.artifacts.compoundComponents[ 0 ].artifactId;
          expect(manifest.artifacts.compoundComponents[ 0 ].artifactId).to.eql(artifactId);

          artifactId = originalManifest.artifacts.elementaryComponents[ 0 ].artifactId;
          expect(manifest.artifacts.elementaryComponents[ 0 ].artifactId).to.eql(artifactId);

          artifactId = originalManifest.artifacts.utilities[ 0 ].artifactId;
          expect(manifest.artifacts.utilities[ 0 ].artifactId).to.eql(artifactId);
        });
      });
      describe('#_convertArtifactDependencyItems()', function () {
        beforeEach(function () {
          manifest = JSON.parse(manifest831);
          converter._removeSingleEndpointsFromArtifacts(manifest);
          converter._convertMultipleEndpointsToArtifacts(manifest);
        });
        it('should convert dependency "[webpackageId]/[artifactId]/[endpointId]" to {webpackageId: "[webpackageId]", artifactId: "[artifactId]#[endpointId]"}.', function () {
          converter._convertArtifactDependencyItems(manifest);
          var dependencies = manifest.artifacts.apps[ 0 ].dependencies;
          expect(dependencies).to.eql(convertedManifest.artifacts.apps[ 0 ].dependencies);

          dependencies = manifest.artifacts.elementaryComponents[ 0 ].dependencies;
          expect(dependencies).to.eql(convertedManifest.artifacts.elementaryComponents[ 0 ].dependencies);

          dependencies = manifest.artifacts.utilities[ 1 ].dependencies;
          expect(dependencies).to.eql(convertedManifest.artifacts.utilities[ 1 ].dependencies);
          dependencies = manifest.artifacts.utilities[ 2 ].dependencies;
          expect(dependencies).to.eql(convertedManifest.artifacts.utilities[ 2 ].dependencies);
        });
        it('should convert dependency "this/[artifactId]/[endpointId]" to object {artifactId: "[artifactId]#[endpointId]"}.', function () {
          converter._convertArtifactDependencyItems(manifest);
          var dependency = manifest.artifacts.elementaryComponents[ 0 ].dependencies[ 3 ];
          expect(dependency).to.eql(convertedManifest.artifacts.elementaryComponents[ 0 ].dependencies[ 3 ]);
        });
      });
      describe('#_convertMultipleEndpointsToArtifacts()', function () {
        it('should remove all artifacts with multiple endpoints', function () {
          converter._convertMultipleEndpointsToArtifacts(manifest);
          Object.keys(manifest.artifacts).forEach(function (artifactType) {
            manifest.artifacts[ artifactType ].forEach(function (artifact) {
              if (artifact.hasOwnProperty('endpoints')) {
                artifact.endpoints.should.has.lengthOf(1);
              } else {
                artifact.should.not.hasOwnProperty('endpoints');
              }
            });
          });
        });
        it('should create a copy of artifact directory with a new artifactId', function (done) {
          var promises = [];
          converter._convertMultipleEndpointsToArtifacts(manifest);
          Object.keys(manifest.artifacts).forEach(function (artifactType) {
            manifest.artifacts[ artifactType ].forEach(function (artifact) {
              var expectedArtifactPath = path.resolve(webpackagePath, artifact.artifactId);
              promises.push(new Promise(function (resolve, reject) {
                fs.access(expectedArtifactPath, function (err) {
                  expect(err).to.be.null;
                  resolve(true);
                });
              }));
            });
          });
          Promise.all(promises).then(done());
        });
        it('should delete the directory with old artifactId', function (done) {
          var promises = [];
          converter._convertMultipleEndpointsToArtifacts(manifest);
          var artifacts = [];
          // manifest artifacts to flat array
          Object.keys(manifest.artifacts).forEach(function (artifactType) {
            artifacts.concat(manifest.artifacts[artifactType]);
          });
          // itrate originManifest artifacts
          Object.keys(originalManifest.artifacts).forEach(function (artifactType) {
            originalManifest.artifacts[artifactType].forEach(function (artifact) {
              if (!artifacts.find(function (art) { return art.artifactId === artifact.artifactId; })) {
                // artifact not find in manifest.artifacts flatted list then check directory
                var expectedArtifactPath = path.resolve(webpackagePath, artifact.artifactId);
                promises.push(new Promise(function (resolve, reject) {
                  // directory not exists, fs.access have to have en error
                  fs.access(expectedArtifactPath, function (err) {
                    expect(err).to.be.not.null;
                    resolve(true);
                  });
                }));
              }
            });
          });
          Promise.all(promises).then(done());
        });
        it('should create new artifact with artifactId [artifactId]#[endpointId] for each endpoint holding coressponding resources and dependencies.', function () {
          converter._convertMultipleEndpointsToArtifacts(manifest);
          expect(manifest.artifacts.utilities).to.have.lengthOf(3);
          expect(manifest.artifacts.utilities[ 1 ]).to.eql({
            artifactId: 'my-util2' + converter.endpointSeparator + 'main',
            description: 'This util demonstrates ... This endpoint is used for...',
            resources: [ 'import.html' ],
            dependencies: [ 'd3-charts-lib@1.0/bar-chart/main' ]
          });
          expect(manifest.artifacts.utilities[ 2 ]).to.eql({
            artifactId: 'my-util2' + converter.endpointSeparator + 'min',
            description: 'This util demonstrates ...',
            resources: [ 'import.min.html' ],
            dependencies: [ 'd3-charts-lib@1.0/bar-chart/main' ]
          });
        });
      });
      describe('#_convertComponentIdToArtifactIdInMembers()', function () {
        it('should add property "artifactId" and remove property "componentId" for all members in compound components.', function () {
          converter._convertComponentIdToArtifactIdInMembers(manifest);
          manifest.artifacts.compoundComponents.forEach(function (compound) {
            compound.members.forEach(function (member) {
              expect(member).to.have.ownProperty('artifactId');
              expect(member).to.not.have.ownProperty('componentId');
            });
          });
        });
        it('should assign corresponding [artifactId] value to property "artifactId" for each member', function () {
          converter._convertComponentIdToArtifactIdInMembers(manifest);
          var members = manifest.artifacts.compoundComponents[ 0 ].members;
          expect(members[ 0 ].artifactId).to.eql('generic-view');
          expect(members[ 1 ].artifactId).to.eql('generic-view');
          expect(members[ 2 ].artifactId).to.eql('station-view');
        });
      });
    });
    describe('Complete manifest transformations', function () {
      describe('#_convert()', function () {
        it('should convert given manifest with model version 8.x.x to model version 9.1', function () {
          var manifest = JSON.parse(manifest831);
          var expectedResult = JSON.parse(convertedManifest910);
          var convertedManifest = converter._convert(manifest);
          expect(convertedManifest).to.eql(expectedResult);
        });
        it('should apply conversion directly on given manifest if it\'s an object', function () {
          var manifestAsObject = JSON.parse(manifest831);
          var convertedManifest = converter._convert(manifestAsObject);
          expect(convertedManifest).equal(manifestAsObject);
        });
        it('should return converted manifest as object if manifest is given as JSON string', function () {
          var manifestAsJson = manifest831;
          var convertedManifest = converter._convert(manifestAsJson);
          expect(convertedManifest).to.be.instanceOf(Object);
        });
      });
      describe('#convert()', function () {
        var manifestPathName;
        beforeEach(function (done) {
          var origManPathName = path.resolve(webpackagePath, 'manifest@8.3.1.json');
          manifestPathName = path.resolve(webpackagePath, 'manifest.webpackage');
          fs.copy(origManPathName, manifestPathName, function (err) {
            if (err) {
              throw new Error(err);
            }
            done();
          });
        });
        it('should convert given manifest with model version 8.x.x to model version 9.1', function (done) {
          var expectedResult = JSON.parse(convertedManifest910);
          converter.convert();
          fs.readFile(manifestPathName, 'utf8', function (err, data) {
            expect(err).to.be.null;
            var convertedManifest = JSON.parse(data);
            expect(convertedManifest).to.eql(expectedResult);
            done();
          });
        });
      });
    });
  });
})();

