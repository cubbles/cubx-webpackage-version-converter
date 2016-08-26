#!/usr/bin/env node
/* eslint-env node */
'use strict';
var Converter = require('../lib/converter');
var commandLineArgs = require('command-line-args');

var webpackagePath;

var optionDefinitions = [
  { name: 'path', type: String, defaultOption: true }
];

var options = commandLineArgs(optionDefinitions);

if (!options.path) {
  console.error('Missed necessary parameter "webpackagePath". Usage: cubx-webpackage-version-converter <webpackagPath> [--loglevel <logLevel>]');
  process.exit(0);
} else {
  webpackagePath = options.path;
}
var converter = new Converter(webpackagePath);
converter.convert();

