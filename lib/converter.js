/**
 * Created by jtrs on 22.08.2016.
 */
(function () {
  'strict mode';

  var fs = require('fs-extra');
  var path = require('path');
  /**
   * The manifestConverter can be used to convert manifest.webpackage objects.
   * @class ManifestConverter
   * @global
   * @constructor
   */
  var ManifestConverter = function (webpackagePath) {
    if (!path.isAbsolute(webpackagePath)) {
      this._webpackagePath = path.join(process.cwd(), webpackagePath);
    } else {
      this._webpackagePath = webpackagePath;
    }

    /**
     * Holds a well defined transformation matrix defining all transformations that need to be done depending on source
     * ModelVersion. Each item contains all transformations that need to be done to convert to current given _targetVersion.
     * @type {object}
     * @private
     */
    this._transformationMatrix = {
      '8.x.x': [
        '_addResourcesArrayToArtifacts',
        '_removeSingleEndpointsFromArtifacts',
        '_convertMultipleEndpointsToArtifacts',
        '_convertArtifactDependencyItems',
        '_convertComponentIdToArtifactIdInMembers'
      ]
    };

    /**
     * Define target model version for output manifest files
     * @type {string}
     * @private
     */
    this._targetVersion = '9.1.0';

    /**
     * The separator that is used when concatenating artifactId and endpointId from ModelVersion 8.x manifest files
     * @type {string}
     */
    this.endpointSeparator = '-';
  };

  /**
   * Based on given _transformationMatrix determine the transformations that need to be proceeded
   * @memberOf ManifestConverter
   * @param {string} sourceModelVersion The source modelVersion
   * @return {array} An array of methods to call in provided order
   * @private
   */
  ManifestConverter.prototype._determineTransformationList = function (sourceModelVersion) {
    var transformationList = [];

    if (sourceModelVersion.indexOf('8.') === 0) {
      // deal with modelVersion 8
      transformationList = this._transformationMatrix[ '8.x.x' ];
    } else if (this._transformationMatrix.hasOwnProperty(sourceModelVersion)) {
      transformationList = this._transformationMatrix[ sourceModelVersion ];
    }

    return transformationList;
  };

  /**
   * Iterate over each artifact and create a 'resources' property for each of them.
   * Note: The changes will be made directly on the given manifest object.
   * Note: If there is already a resources array for an artifact it will be overwritten!
   * @param {object} manifest A valid manifest object
   * @private
   * @memberOf ManifestConverter
   */
  ManifestConverter.prototype._addResourcesArrayToArtifacts = function (manifest) {
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
   * @memberOf ManifestConverter
   * @private
   */
  ManifestConverter.prototype._convertArtifactDependencyItems = function (manifest) {
    var self = this;
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
              dependencyObject.artifactId = segments[ 1 ] + self.endpointSeparator + segments[ 2 ];
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
   * @memberOf ManifestConverter
   * @param {object} manifest A valid manifest object
   * @private
   */
  ManifestConverter.prototype._convertComponentIdToArtifactIdInMembers = function (manifest) {
    manifest.artifacts.compoundComponents.forEach(function (compound) {
      compound.members.forEach(function (member) {
        member.artifactId = member.componentId.split('/')[ 1 ];
        delete member.componentId;
      });
    });
  };

  /**
   * Convert Artifacts which have multiple endpoints to multiple Artifacts.
   * Note: The changes will be made directly on the given manifest object.
   * @memberOf ManifestConverter
   * @param {object} manifest A valid manifest object
   * @private
   */
  ManifestConverter.prototype._convertMultipleEndpointsToArtifacts = function (manifest) {
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
            self._generateFilesforEndpoint(oldArtifactId, convertedArtifact.artifactId);
          });
          self._deleteOriginArtifactFiles(oldArtifactId);
        } else {
          convertedArtifacts.push(artifact);
        }
      });
      manifest.artifacts[ artifactType ] = convertedArtifacts;
    });
  };
  ManifestConverter.prototype._generateFilesforEndpoint = function (oldArtifactId, newArtifactId) {
    var oldArtifactPath = path.resolve(this._webpackagePath, oldArtifactId);
    var newArtifactPath = path.resolve(this._webpackagePath, newArtifactId);
    fs.copySync(oldArtifactPath, newArtifactPath);
  };

  ManifestConverter.prototype._deleteOriginArtifactFiles = function (oldArtifactId) {
    var oldArtifactPath = path.resolve(this._webpackagePath, oldArtifactId);
    fs.removeSync(oldArtifactPath);
  };
  /**
   * Remove endpoints for artifacts that have only one endpoint.
   * Note: The changes will be made directly on the given manifest object.
   * @param {object} manifest A valid manifest object
   * @memberOf ManifestConverter
   * @private
   */
  ManifestConverter.prototype._removeSingleEndpointsFromArtifacts = function (manifest) {
    Object.keys(manifest.artifacts).forEach(function (artifactType) {
      manifest.artifacts[ artifactType ].forEach(function (artifact) {
        // only process artifact if there is one single endpoint
        if (artifact.endpoints.length === 1) {
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
   * Convert a given manifest files into latest modelVersion.
   * Note: If the given manifest is of type object the conversion is done directly on the manifest object.
   * @param {object|string} manifest Object or JSON string representing a manifest.webpackage.
   * @return {object} convertedManifest An object representing a converted manifest.
   * @memberOf ManifestConverter
   */
  ManifestConverter.prototype.convert = function () {
    var pathName = path.resolve(this._webpackagePath, 'manifest.webpackage');
    var manifest = fs.readFileSync(pathName, 'utf8');
    var convertedManifest = this._convert(manifest);
    fs.writeFileSync(pathName, JSON.stringify(convertedManifest, null, 4), 'utf8');
  };
  /**
   * Convert a given manifest files into latest modelVersion.
   * Note: If the given manifest is of type object the conversion is done directly on the manifest object.
   * @param {object|string} manifest Object or JSON string representing a manifest.webpackage.
   * @return {object} convertedManifest An object representing a converted manifest.
   * @memberOf ManifestConverter
   */
  ManifestConverter.prototype._convert = function (manifest) {
    var convertedManifest = typeof manifest === 'string' ? JSON.parse(manifest) : manifest;
    var modelVersion = convertedManifest.modelVersion;
    var self = this;

    // for now only convert manifests that hav model version 8.x.x
    if (modelVersion.indexOf('8.') === 0) {
      var transformationList = this._determineTransformationList(modelVersion);
      transformationList.forEach(function (fn) {
        self[ fn ](convertedManifest);
      });
      convertedManifest.modelVersion = this._targetVersion;
    }

    return convertedManifest;
  };

  exports = module.exports = ManifestConverter;
})();
