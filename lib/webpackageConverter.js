/**
 * Created by jtrs on 22.08.2016.
 */
(function () {
  'strict mode';

  var fs = require('fs-extra');
  var path = require('path');
  var filterFiles = require('./filterFiles');
  /**
   * The manifestConverter can be used to convert manifest.webpackage objects.
   * @class WebpackageConverter
   * @global
   * @constructor
   * @param {string} webpackagepath path of the webpackage to convert
   * @param {string} rteTargetVersion the new version of cubx.core.rte
   */
  var WebpackageConverter = function (webpackagePath, rteTargetVersion) {
    if (!webpackagePath) {
      console.error('WebpackageConverter: Missed parameter for webpackage path.');
      throw new Error('Missed parameter for webpackage path.');
    }
    if (!rteTargetVersion) {
      console.error('WebpackageConverter: Missed parameter for webpackage path.');
      throw new Error('Missed parameter for webpackage path.');
    }
    if (!path.isAbsolute(webpackagePath)) {
      this._webpackagePath = path.join(process.cwd(), webpackagePath);
    } else {
      this._webpackagePath = webpackagePath;
    }

    this._rteTargetVersion = rteTargetVersion;
    /**
     * Holds a well defined transformation matrix defining all transformations that need to be done depending on source
     * ModelVersion. Each item contains all transformations that need to be done to convert to current given _targetVersion.
     * @type {object}
     * @private
     */
    this._transformationMatrix = {
      '8': [
        '_addResourcesArrayToArtifacts',
        '_removeSingleEndpointsFromArtifacts',
        '_convertMultipleEndpointsToArtifacts',
        '_convertArtifactDependencyItems',
        '_convertComponentIdToArtifactIdInMembers',
        '_changeRTEVersionInHTMLFiles',
        '_changeWebcomponentsPathInHTMLFiles',
        '_changeRteVersionInManifest'
      ],
      '9.1.1': [
        '_changeRTEVersionInHTMLFiles',
        '_changeWebcomponentsPathInHTMLFiles',
        '_changeRteVersionInManifest'
      ]
    };

    /**
     * Define target model version for output manifest files
     * @type {string}
     * @private
     */
    this._targetVersion = '9.1.1';

    /**
     * The separator that is used when concatenating artifactId and endpointId from ModelVersion 8.x manifest files
     * @type {string}
     */
    this.endpointSeparator = '-';
  };

  /**
   * Convert a given manifest files into latest modelVersion.
   * Note: If the given manifest is of type object the conversion is done directly on the manifest object.
   * @param {object|string} manifest Object or JSON string representing a manifest.webpackage.
   * @return {object} convertedManifest An object representing a converted manifest.
   * @memberOf WebpackageConverter
   */
  WebpackageConverter.prototype.convert = function () {
    var pathName = path.resolve(this._webpackagePath, 'manifest.webpackage');
    var manifest = fs.readFileSync(pathName, 'utf8');
    var convertedManifest = this._convert(manifest);
    fs.writeFileSync(pathName, JSON.stringify(convertedManifest, null, 2), 'utf8');
  };
  /**
   * Convert a given manifest files into latest modelVersion.
   * Note: If the given manifest is of type object the conversion is done directly on the manifest object.
   * @param {object|string} manifest Object or JSON string representing a manifest.webpackage.
   * @return {object} convertedManifest An object representing a converted manifest.
   * @memberOf WebpackageConverter
   */
  WebpackageConverter.prototype._convert = function (manifest) {
    var convertedManifest = typeof manifest === 'string' ? JSON.parse(manifest) : manifest;
    var modelVersion = convertedManifest.modelVersion;
    var self = this;

    // for now only convert manifests that hav model version 8.x.x
    // if (modelVersion.indexOf('8.') === 0) {
    var transformationList = this._determineTransformationList(modelVersion);
    transformationList.forEach(function (fn) {
      self[ fn ](convertedManifest);
    });
    convertedManifest.modelVersion = this._targetVersion;
    // }

    return convertedManifest;
  };

  /**
   * Based on given _transformationMatrix determine the transformations that need to be proceeded
   * @memberOf WebpackageConverter
   * @param {string} sourceModelVersion The source modelVersion
   * @return {array} An array of methods to call in provided order
   * @private
   */
  WebpackageConverter.prototype._determineTransformationList = function (sourceModelVersion) {
    // Array.prototype.find not works if use in desvtools
    var keys = Object.keys(this._transformationMatrix);

    if (!keys) {
      return [];
    }
    var key;
    for (var i = 0; i < keys.length; i++) {
      if (sourceModelVersion.startsWith(keys[ i ])) {
        key = keys[ i ];
      }
    }
    if (!key) {
      return [];
    }
    return this._transformationMatrix[ key ];
  };

  /**
   * Iterate over each artifact and create a 'resources' property for each of them.
   * Note: The changes will be made directly on the given manifest object.
   * Note: If there is already a resources array for an artifact it will be overwritten!
   * @param {object} manifest A valid manifest object
   * @private
   * @memberOf WebpackageConverter
   */
  WebpackageConverter.prototype._addResourcesArrayToArtifacts = function (manifest) {
    // iterate over each artifact but ignore all artifacts of type 'app'
    Object.keys(manifest.artifacts).forEach(function (artifactType) {
      if (artifactType !== 'apps') {
        manifest.artifacts[ artifactType ].forEach(function (artifact) {
          artifact.resources = [];
        });
      }
    });
  };

  /**
   * Convert each dependency in dependencies array from string to object. Only dependencies on artifact level will be
   * considered.
   * Note: The changes will be made directly on the given manifest object.
   * @param {object} manifest A valid manifest object
   * @memberOf WebpackageConverter
   * @private
   */
  WebpackageConverter.prototype._convertArtifactDependencyItems = function (manifest) {
    Object.keys(manifest.artifacts).forEach(function (artifactType) {
      manifest.artifacts[ artifactType ].forEach(function (artifact) {
        if (artifact.hasOwnProperty('dependencies') && artifact.dependencies.length > 0) {
          artifact.dependencies.forEach(function (dependency, index, dependencies) {
            var segments = dependency.split('/');
            var dependencyObject = {};
            if (segments[ 0 ] !== 'this') {
              dependencyObject.webpackageId = segments[ 0 ];
            }
            if (segments[ 0 ] === 'this') {
              dependencyObject.artifactId = segments[ 1 ];
            } else {
              dependencyObject.artifactId = segments[ 1 ];
              dependencyObject.endpointId = segments[ 2 ];
            }
            dependencies[ index ] = dependencyObject;
          });
        }
      });
    });
  };

  /**
   * Rename componentId property to artifactId and remove webpackageId|this in each member of compounds.
   * Note: The changes will be made directly on the given manifest object.
   * @memberOf WebpackageConverter
   * @param {object} manifest A valid manifest object
   * @private
   */
  WebpackageConverter.prototype._convertComponentIdToArtifactIdInMembers = function (manifest) {
    if (!manifest.artifacts.hasOwnProperty('compoundComponents')) {
      return;
    }

    manifest.artifacts.compoundComponents.forEach(function (compound) {
      compound.members.forEach(function (member) {
        var artifactId = member.componentId.split('/')[ 1 ];
        member.artifactId = artifactId;
        delete member.componentId;
      });
    });
  };

  /**
   * Convert Artifacts which have multiple endpoints to multiple Artifacts.
   * Note: The changes will be made directly on the given manifest object.
   * @memberOf WebpackageConverter
   * @param {object} manifest A valid manifest object
   * @private
   */
  WebpackageConverter.prototype._convertMultipleEndpointsToArtifacts = function (manifest) {
    var self = this;
    Object.keys(manifest.artifacts).forEach(function (artifactType) {
      var convertedArtifacts = [];
      manifest.artifacts[ artifactType ].forEach(function (artifact, index, artifacts) {
        if (artifact.hasOwnProperty('endpoints') && artifact.endpoints.length > 1) {
          var oldArtifactId = artifact.artifactId;
          artifact.endpoints.forEach(function (endpoint) {
            var convertedArtifact = JSON.parse(JSON.stringify(artifact));
            var endpointStr = endpoint.endpointId.replace(/[^a-z0-9-]/g, '-');
            convertedArtifact.artifactId = convertedArtifact.artifactId + self.endpointSeparator + endpointStr;
            self._changeArtifactIdInMembersAndDependencies(manifest, oldArtifactId, convertedArtifact.artifactId);
            convertedArtifact.resources = endpoint.resources;
            if (endpoint.hasOwnProperty('dependencies')) {
              convertedArtifact.dependencies = endpoint.dependencies;
            }
            if (endpoint.hasOwnProperty('description') && convertedArtifact.hasOwnProperty('description')) {
              convertedArtifact.description = convertedArtifact.description + ' ' + endpoint.description;
            } else if (!convertedArtifact.hasOwnProperty('description') && endpoint.hasOwnProperty('description')) {
              convertedArtifact.description = endpoint.description;
            }
            delete convertedArtifact.endpoints;
            convertedArtifacts.push(convertedArtifact);
            self._copyArtifactFilesToNewArtifactDirectory(oldArtifactId, convertedArtifact.artifactId);
          });
          self._deleteArtifactDirectory(oldArtifactId);
        } else {
          convertedArtifacts.push(artifact);
        }
      });
      manifest.artifacts[ artifactType ] = convertedArtifacts;
    });
  };

  /**
   * Find the oldArtifactId in members and in dependencies and change it to newArtifactId
   * @param {object} manifest the manifest
   * @param {string} oldArtifactId the old artifactId (The artifactId, wich should be changed)
   * @param {string} newArtifactId the new artifactId
   * @private
   */
  WebpackageConverter.prototype._changeArtifactIdInMembersAndDependencies = function (manifest, oldArtifactId, newArtifactId) {
    var memberList = [];
    Object.keys(manifest.artifacts).forEach(function (artifactType) {
      manifest.artifacts[ artifactType ].forEach(function (artifact) {
        var newDeps = [];
        if (artifact.hasOwnProperty('dependencies')) {
          artifact.dependencies.forEach(function (dep) {
            if (dep.startsWith('this/' + oldArtifactId + '/')) {
              dep = dep.replace(oldArtifactId, newArtifactId);
            }
            newDeps.push(dep);
          });
          artifact.dependencies = newDeps;
        }
        if (artifact.hasOwnProperty('members')) {
          memberList = memberList.concat(artifact.members);
        }
      });
    });

    var filteredMembers = memberList.filter(function (member) {
      return member.componentId === 'this/' + oldArtifactId;
    });

    filteredMembers.forEach(function (member) {
      member.componentId = member.componentId.replace(oldArtifactId, newArtifactId);
    });
  };
  /**
   * Generate a new path to a renamed artifact, and copy all files from the origin path to the new path
   * @param {string} oldArtifactId the old artifactId
   * @param {string} newArtifactId the new artifactId
   * @private
   */
  WebpackageConverter.prototype._copyArtifactFilesToNewArtifactDirectory = function (oldArtifactId, newArtifactId) {
    var oldArtifactPath = path.resolve(this._webpackagePath, oldArtifactId);
    var newArtifactPath = path.resolve(this._webpackagePath, newArtifactId);
    fs.copySync(oldArtifactPath, newArtifactPath);
  };

  /**
   * Delete the directory of the artifact
   * @param {string} artifactId artifactId
   * @private
   */
  WebpackageConverter.prototype._deleteArtifactDirectory = function (artifactId) {
    var oldArtifactPath = path.resolve(this._webpackagePath, artifactId);
    fs.removeSync(oldArtifactPath);
  };
  /**
   * Remove endpoints for artifacts that have only one endpoint.
   * Note: The changes will be made directly on the given manifest object.
   * @param {object} manifest A valid manifest object
   * @memberOf WebpackageConverter
   * @private
   */
  WebpackageConverter.prototype._removeSingleEndpointsFromArtifacts = function (manifest) {
    Object.keys(manifest.artifacts).forEach(function (artifactType) {
      manifest.artifacts[ artifactType ].forEach(function (artifact) {
        // only process artifact if there is one single endpoint
        if (artifact.hasOwnProperty('endpoints') && artifact.endpoints.length === 1) {
          // append endpointId to artifactId using defined separator
          artifact.artifactId = artifact.artifactId;
          // move resources from endpoint to artifact, if there are any
          if (artifact.endpoints[ 0 ].resources.length > 0) {
            artifact.resources = artifact.endpoints[ 0 ].resources;
          }
          // move dependencies from endpoint to artifact, if there are any
          if (artifact.endpoints[ 0 ].hasOwnProperty('dependencies') && artifact.endpoints[ 0 ].dependencies.length > 0) {
            artifact.dependencies = artifact.endpoints[ 0 ].dependencies;
          }
          delete artifact.endpoints;
        }
      });
    });
  };

  /**
   * update the rte Version html files with the value of this.rteTargetVersion
   * @private
   */
  WebpackageConverter.prototype._changeRTEVersionInHTMLFiles = function () {
    var self = this;

    filterFiles(this._webpackagePath, /\.html$/, function (filename) {
      try {
        var data = fs.readFileSync(filename, 'utf8');

        var pattern = /(cubx.core.rte@)((\d{1,3}\.\d{1,3}\.\d{1,3})(-SNAPSHOT)?)(\/)/g;
        var newData = data.replace(pattern, '$1' + self._rteTargetVersion + '$5');
        try {
          fs.writeFileSync(filename, newData, 'utf8');
        } catch (error) {
          console.error('An error occured by write the file:' + filename);
        }
      } catch (err) {
        console.error('An error occured by read the file:' + filename);
      }
    });
  };

  /**
   * update the artifactId of the webcomponent reference to webcomponent-lite
   * @private
   */
  WebpackageConverter.prototype._changeWebcomponentsPathInHTMLFiles = function () {
    filterFiles(this._webpackagePath, /\.html$/, function (filename) {
      try {
        var data = fs.readFileSync(filename, 'utf8');

        var pattern = /(webcomponents)(\/webcomponents-lite.js)/g;
        var newData = data.replace(pattern, '$1-lite$2');
        try {
          fs.writeFileSync(filename, newData, 'utf8');
        } catch (error) {
          console.error('An error occured by read file:' + filename);
        }
      } catch (err) {
        console.error('An error occured by read the file:' + filename);
      }
    });
  };

  /**
   * Update references to cubx.core.rte tothe target rte version
   * @param {object} manifest a valid manifest object
   * @private
   */
  WebpackageConverter.prototype._changeRteVersionInManifest = function (manifest) {
    var self = this;
    for (var property in manifest.artifacts) {
      if (manifest.artifacts.hasOwnProperty(property)) {
        manifest.artifacts[ property ].forEach(function (artifact) {
          if (artifact.hasOwnProperty('dependencies')) {
            artifact.dependencies.forEach(function (dep) {
              if (dep.webpackageId && dep.webpackageId.startsWith('cubx.core.rte')) {
                dep.webpackageId = dep.webpackageId.replace(/(cubx.core.rte@)((\d{1,3}\.\d{1,3}\.\d{1,3})(-SNAPSHOT)?)/, '$1' + self._rteTargetVersion);
                delete dep.endpointId;
              }
            });
          }
        });
      }
    }
  };

  exports = module.exports = WebpackageConverter;
})();
