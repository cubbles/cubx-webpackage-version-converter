/* globals describe,beforeEach,it,expect,afterEach */
(function () {
  // function (manifestConverter, manifest831, convertedManifest910) {
  'use strict';
  describe('ManifestConverter', function () {
    var convertedManifest910;
    var manifest831;
    var convertedManifest910WithRteUpdate;
    var webpackageConverter;
    var path;
    var fs;
    var webpackageName;
    var webpackagePath;
    var testRootPath;
    var rteVersion;
    beforeEach(function (done) {
      path = require('path');
      fs = require('fs-extra');
      testRootPath = path.join(process.cwd(), 'test');
      webpackageName = 'my-webpackage';
      var testPath = path.resolve(testRootPath, 'webpackages', webpackageName);
      webpackagePath = testPath;
      rteVersion = '2.0.0';
      var tempPath = path.resolve(__dirname, '../resources/8.3.1/');
      var WebpackageConverter = require('../../lib/webpackageConverter');
      webpackageConverter = new WebpackageConverter(webpackagePath, rteVersion);
      fs.copy(tempPath, testPath, function (err) {
        if (err) {
          throw new Error(err);
        } else {
          var pathName = path.resolve(testPath, 'convertedManifest@9.1.0.json');
          convertedManifest910 = fs.readFileSync(pathName, 'utf8');
          pathName = path.resolve(testPath, 'manifest.webpackage');
          manifest831 = fs.readFileSync(pathName, 'utf8');
          pathName = path.resolve(testPath, 'convertedManifest@9.1.0withRteUpdate.json');
          convertedManifest910WithRteUpdate = fs.readFileSync(pathName, 'utf8');
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
    describe('Single converter methods', function () {
      var manifest;
      var originalManifest;
      var convertedManifest;
      beforeEach(function () {
        convertedManifest = JSON.parse(convertedManifest910);
        manifest = JSON.parse(manifest831);
        originalManifest = JSON.parse(manifest831);
      });

      describe('#_determineTransformationList()', function () {
        it('modelVersion "8.3.1" should get the transformmationlist with key "8"', function () {
          var list = webpackageConverter._determineTransformationList('8.3.1');
          expect(list).to.be.exists;
          list.should.be.eql(webpackageConverter._transformationMatrix['8']);
        });
        it('modelVersion "8.0.0" should get the transformmationlist with key "8"', function () {
          var list = webpackageConverter._determineTransformationList('8.0.0');
          expect(list).to.be.exists;
          list.should.be.eql(webpackageConverter._transformationMatrix['8']);
        });
        it('modelVersion "9.1.0" should get the transformmationlist with key "9.1.0"', function () {
          var list = webpackageConverter._determineTransformationList('9.1.0');
          expect(list).to.be.exists;
          list.should.be.eql(webpackageConverter._transformationMatrix['9.1.0']);
        });
      });
      describe('#_addResourcesArrayToArtifacts()', function () {
        it('should add property "resources" containing an empty array to each artifact out of type [elementaryComponents|compoundComponents|utilities].', function () {
          webpackageConverter._addResourcesArrayToArtifacts(manifest);
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
          webpackageConverter._removeSingleEndpointsFromArtifacts(manifest);
          expect(manifest.artifacts.apps[ 0 ]).to.not.have.ownProperty('endpoints');
          expect(manifest.artifacts.compoundComponents[ 0 ]).to.not.have.ownProperty('endpoints');
          expect(manifest.artifacts.elementaryComponents[ 1 ]).to.not.have.ownProperty('endpoints');
          expect(manifest.artifacts.utilities[ 0 ]).to.not.have.ownProperty('endpoints');
          expect(manifest.artifacts.utilities[ 1 ]).to.have.ownProperty('endpoints');
        });
        it('should move "dependencies" and "resources" from the artifacts single endpoint to artifact itself.', function () {
          webpackageConverter._removeSingleEndpointsFromArtifacts(manifest);
          expect(manifest.artifacts.apps[ 0 ]).to.have.ownProperty('dependencies');
          expect(manifest.artifacts.apps[ 0 ]).to.have.ownProperty('resources');
          expect(manifest.artifacts.apps[ 0 ].dependencies).to.eql(originalManifest.artifacts.apps[ 0 ].endpoints[ 0 ].dependencies);
          expect(manifest.artifacts.apps[ 0 ].resources).to.eql(originalManifest.artifacts.apps[ 0 ].endpoints[ 0 ].resources);

          expect(manifest.artifacts.compoundComponents[ 0 ]).to.have.ownProperty('dependencies');
          expect(manifest.artifacts.compoundComponents[ 0 ]).to.have.ownProperty('resources');
          expect(manifest.artifacts.compoundComponents[ 0 ].dependencies).to.eql(originalManifest.artifacts.compoundComponents[ 0 ].endpoints[ 0 ].dependencies);
          expect(manifest.artifacts.compoundComponents[ 0 ].resources).to.eql(originalManifest.artifacts.compoundComponents[ 0 ].endpoints[ 0 ].resources);

          expect(manifest.artifacts.elementaryComponents[ 1 ]).to.have.ownProperty('dependencies');
          expect(manifest.artifacts.elementaryComponents[ 1 ]).to.have.ownProperty('resources');
          expect(manifest.artifacts.elementaryComponents[ 1 ].dependencies).to.eql(originalManifest.artifacts.elementaryComponents[ 0 ].endpoints[ 0 ].dependencies);
          expect(manifest.artifacts.elementaryComponents[ 1 ].resources).to.eql(originalManifest.artifacts.elementaryComponents[ 0 ].endpoints[ 0 ].resources);

          expect(manifest.artifacts.utilities[ 0 ]).to.not.have.ownProperty('dependencies');
          expect(manifest.artifacts.utilities[ 0 ]).to.have.ownProperty('resources');
          expect(manifest.artifacts.utilities[ 0 ].resources).to.eql(originalManifest.artifacts.utilities[ 0 ].endpoints[ 0 ].resources);
        });
        it('should not append "endpointId" of removed endpoint to "artifactId" using - separator.', function () {
          webpackageConverter._removeSingleEndpointsFromArtifacts(manifest);
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
          webpackageConverter._removeSingleEndpointsFromArtifacts(manifest);
          webpackageConverter._convertMultipleEndpointsToArtifacts(manifest);
        });
        it('should convert dependency "[webpackageId]/[artifactId]/[endpointId]" to {webpackageId: "[webpackageId]", artifactId: "[artifactId]#[endpointId]"}.', function () {
          webpackageConverter._convertArtifactDependencyItems(manifest);
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
          webpackageConverter._convertArtifactDependencyItems(manifest);
          var dependency = manifest.artifacts.elementaryComponents[ 0 ].dependencies[ 3 ];
          expect(dependency).to.eql(convertedManifest.artifacts.elementaryComponents[ 0 ].dependencies[ 3 ]);
        });
      });
      describe('#_convertMultipleEndpointsToArtifacts()', function () {
        it('should remove all artifacts with multiple endpoints', function () {
          webpackageConverter._convertMultipleEndpointsToArtifacts(manifest);
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
          webpackageConverter._convertMultipleEndpointsToArtifacts(manifest);
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
          webpackageConverter._convertMultipleEndpointsToArtifacts(manifest);
          var artifacts = [];
          // manifest artifacts to flat array
          Object.keys(manifest.artifacts).forEach(function (artifactType) {
            artifacts.concat(manifest.artifacts[ artifactType ]);
          });
          // itrate originManifest artifacts
          Object.keys(originalManifest.artifacts).forEach(function (artifactType) {
            originalManifest.artifacts[ artifactType ].forEach(function (artifact) {
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
          webpackageConverter._convertMultipleEndpointsToArtifacts(manifest);
          expect(manifest.artifacts.utilities).to.have.lengthOf(3);
          expect(manifest.artifacts.utilities[ 1 ]).to.eql({
            artifactId: 'my-util2' + webpackageConverter.endpointSeparator + 'main',
            description: 'This util demonstrates ... This endpoint is used for...',
            resources: [ 'import.html' ],
            dependencies: [ 'd3-charts-lib@1.0/bar-chart/main' ]
          });
          expect(manifest.artifacts.utilities[ 2 ]).to.eql({
            artifactId: 'my-util2' + webpackageConverter.endpointSeparator + 'min',
            description: 'This util demonstrates ...',
            resources: [ 'import.min.html' ],
            dependencies: [ 'd3-charts-lib@1.0/bar-chart/main' ]
          });
        });
      });
      describe('#_convertComponentIdToArtifactIdInMembers()', function () {
        it('should add property "artifactId" and remove property "componentId" for all members in compound components.', function () {
          webpackageConverter._convertComponentIdToArtifactIdInMembers(manifest);
          manifest.artifacts.compoundComponents.forEach(function (compound) {
            compound.members.forEach(function (member) {
              expect(member).to.have.ownProperty('artifactId');
              expect(member).to.not.have.ownProperty('componentId');
            });
          });
        });
        it('should assign corresponding [artifactId] value to property "artifactId" for each member', function () {
          webpackageConverter._convertComponentIdToArtifactIdInMembers(manifest);
          var members = manifest.artifacts.compoundComponents[ 0 ].members;
          expect(members[ 0 ].artifactId).to.eql('generic-view');
          expect(members[ 1 ].artifactId).to.eql('generic-view');
          expect(members[ 2 ].artifactId).to.eql('station-view');
        });
      });
      describe('#_changeRteVersionInManifest()', function () {
        var expectedManifest;
        var manifest;
        beforeEach(function () {
          manifest = JSON.parse(convertedManifest910);
          expectedManifest = JSON.parse(convertedManifest910WithRteUpdate);
        });
        it('should add property "artifactId" and remove property "componentId" for all members in compound components.', function () {
          webpackageConverter._changeRteVersionInManifest(manifest);

          manifest.artifacts.elementaryComponents.forEach(function (artifact) {
            if (artifact.dependencies) {
              var depList = artifact.dependencies.filter((dep) => dep.webpackageId && dep.webpackageId.startsWith('cubx.core.rte'));
              depList.should.have.length(1);
              depList.forEach(function (dep) {
                dep.should.have.ownProperty('webpackageId', 'cubx.core.rte@2.0.0');
              });
            }
          });
        });
        it('should assign corresponding [artifactId] value to property "artifactId" for each member', function () {
          webpackageConverter._changeRteVersionInManifest(manifest);
          var dependencies = manifest.artifacts.elementaryComponents[ 0 ].dependencies;
          var expectedDependencies = expectedManifest.artifacts.elementaryComponents[ 0 ].dependencies;
          dependencies.should.eql(expectedDependencies);
        });
      });
      describe('#_changeWebcomponentsPathInHTMLFiles()', function () {
        it('rte version should be changed in my-elementary/demo/index.html file', function () {
          webpackageConverter._changeWebcomponentsPathInHTMLFiles();

          var pathToFile = path.resolve(webpackagePath, 'my-elementary', 'demo', 'index.html');
          var data = fs.readFileSync(pathToFile, 'utf-8');
          expect(data).to.be.not.null;
          expect(data.indexOf('/webcomponents-lite/webcomponents-lite.js')).to.be.above(-1);
          expect(data.indexOf('/webcomponents/webcomponents-lite.js')).to.be.equal(-1);
        });
        it('rte version should be changed in my-elementary/docs/index.html file', function () {
          webpackageConverter._changeWebcomponentsPathInHTMLFiles();
          var pathToFile = path.resolve(webpackagePath, 'my-elementary', 'docs', 'index.html');
          var data = fs.readFileSync(pathToFile, 'utf-8');
          expect(data).to.be.not.null;
          expect(data.indexOf('/webcomponents-lite/webcomponents-lite.js')).to.be.above(-1);
          expect(data.indexOf('/webcomponents/webcomponents-lite.js')).to.be.equal(-1);
        });
        it('rte version should be changed in my-compound/demo/index.html file', function () {
          webpackageConverter._changeWebcomponentsPathInHTMLFiles();
          var pathToFile = path.resolve(webpackagePath, 'my-compound', 'demo', 'index.html');
          var data = fs.readFileSync(pathToFile, 'utf-8');
          expect(data).to.be.not.null;
          expect(data.indexOf('/webcomponents-lite/webcomponents-lite.js')).to.be.above(-1);
          expect(data.indexOf('/webcomponents/webcomponents-lite.js')).to.be.equal(-1);
        });
        it('rte version should be changed in my-compound/docs/index.html file', function () {
          webpackageConverter._changeWebcomponentsPathInHTMLFiles();
          var pathToFile = path.resolve(webpackagePath, 'my-compound', 'docs', 'index.html');
          var data = fs.readFileSync(pathToFile, 'utf-8');
          expect(data).to.be.not.null;
          expect(data.indexOf('/webcomponents-lite/webcomponents-lite.js')).to.be.above(-1);
          expect(data.indexOf('/webcomponents/webcomponents-lite.js')).to.be.equal(-1);
        });
        it('rte version should be changed in my-app/index.html file', function () {
          webpackageConverter._changeWebcomponentsPathInHTMLFiles();
          var pathToFile = path.resolve(webpackagePath, 'my-app', 'index.html');
          var data = fs.readFileSync(pathToFile, 'utf-8');
          expect(data).to.be.not.null;
          expect(data.indexOf('/webcomponents-lite/webcomponents-lite.js')).to.be.above(-1);
          expect(data.indexOf('/webcomponents/webcomponents-lite.js')).to.be.equal(-1);
        });
        it('rte version should be changed in app/index.html file', function () {
          webpackageConverter._changeWebcomponentsPathInHTMLFiles();
          var pathToFile = path.resolve(webpackagePath, 'app', 'index.html');
          var data = fs.readFileSync(pathToFile, 'utf-8');
          expect(data).to.be.not.null;
          expect(data.indexOf('/webcomponents-lite/webcomponents-lite.js')).to.be.above(-1);
          expect(data.indexOf('/webcomponents/webcomponents-lite.js')).to.be.equal(-1);
        });
      });
      describe('#_changeRTEVersionInHTMLFiles()', function () {
        it('rte version should be changed in my-elementary/demo/index.html file', function () {
          webpackageConverter._changeRTEVersionInHTMLFiles();
          var pathToFile = path.resolve(webpackagePath, 'my-elementary', 'demo', 'index.html');
          var data = fs.readFileSync(pathToFile, 'utf-8');
          expect(data).to.be.not.null;
          expect(data.indexOf('cubx.core.rte@' + rteVersion + '/crc-loader')).to.be.above(-1);
        });
        it('rte version should be changed in my-elementary/docs/index.html file', function () {
          webpackageConverter._changeRTEVersionInHTMLFiles();
          var pathToFile = path.resolve(webpackagePath, 'my-elementary', 'docs', 'index.html');
          var data = fs.readFileSync(pathToFile, 'utf-8');
          expect(data).to.be.not.null;
          expect(data.indexOf('cubx.core.rte@' + rteVersion + '/crc-loader')).to.be.above(-1);
        });
        it('rte version should be changed in my-compound/demo/index.html file', function () {
          webpackageConverter._changeRTEVersionInHTMLFiles();
          var pathToFile = path.resolve(webpackagePath, 'my-compound', 'demo', 'index.html');
          var data = fs.readFileSync(pathToFile, 'utf-8');
          expect(data).to.be.not.null;
          expect(data.indexOf('cubx.core.rte@' + rteVersion + '/crc-loader')).to.be.above(-1);
        });
        it('rte version should be changed in my-compound/docs/index.html file', function () {
          webpackageConverter._changeRTEVersionInHTMLFiles();
          var pathToFile = path.resolve(webpackagePath, 'my-compound', 'docs', 'index.html');
          var data = fs.readFileSync(pathToFile, 'utf-8');
          expect(data).to.be.not.null;
          expect(data.indexOf('cubx.core.rte@' + rteVersion + '/crc-loader')).to.be.above(-1);
        });
        it('rte version should be changed in my-app/index.html file', function () {
          webpackageConverter._changeRTEVersionInHTMLFiles();
          var pathToFile = path.resolve(webpackagePath, 'my-app', 'index.html');
          var data = fs.readFileSync(pathToFile, 'utf-8');
          expect(data).to.be.not.null;
          expect(data.indexOf('cubx.core.rte@' + rteVersion + '/crc-loader')).to.be.above(-1);
        });
        it('rte version should be changed in app/index.html file', function () {
          webpackageConverter._changeRTEVersionInHTMLFiles();
          var pathToFile = path.resolve(webpackagePath, 'app', 'index.html');
          var data = fs.readFileSync(pathToFile, 'utf-8');
          expect(data).to.be.not.null;
          expect(data.indexOf('cubx.core.rte@' + rteVersion + '/crc-loader')).to.be.above(-1);
        });
        it('rte version should be changed in app/index.html file', function () {
          webpackageConverter._changeRTEVersionInHTMLFiles();
          var pathToFile = path.resolve(webpackagePath, 'my-elementary', 'my-elementary-style.html');
          var data = fs.readFileSync(pathToFile, 'utf-8');
          pathToFile = path.resolve(testRootPath, 'resources', '8.3.1', 'my-elementary', 'my-elementary-style.html');
          var origData = fs.readFileSync(pathToFile, 'utf-8');
          expect(data).to.be.not.null;
          data.should.be.equal(origData);
        });
      });
    });

    describe('Complete manifest transformations', function () {
      describe('#_convert()', function () {
        it('should convert given manifest with model version 8.x.x to model version 9.1', function () {
          var manifest = JSON.parse(manifest831);
          var expectedResult = JSON.parse(convertedManifest910WithRteUpdate);
          var convertedManifest = webpackageConverter._convert(manifest);
          expect(convertedManifest).to.eql(expectedResult);
        });
        it('should apply conversion directly on given manifest if it\'s an object', function () {
          var manifestAsObject = JSON.parse(manifest831);
          var convertedManifest = webpackageConverter._convert(manifestAsObject);
          expect(convertedManifest).equal(manifestAsObject);
        });
        it('should return converted manifest as object if manifest is given as JSON string', function () {
          var manifestAsJson = manifest831;
          var convertedManifest = webpackageConverter._convert(manifestAsJson);
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
          var expectedResult = JSON.parse(convertedManifest910WithRteUpdate);
          webpackageConverter.convert();
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

