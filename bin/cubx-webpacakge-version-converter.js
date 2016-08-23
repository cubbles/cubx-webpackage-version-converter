#!/usr/bin/env node
/* eslint-env node */
'use strict';
var converter = require('../lib/convderter');
var commandLineArgs = require('command-line-args');

var webpackagePath;

var optionDefinitions = [
  { name: 'path', type: String, defaultOption: true }
];

var options = commandLineArgs(optionDefinitions);

if (!options.path) {
  console.error('Missed necessary parameter "webpackagePath". Usage: cubx-webpacakge-version-converter <webpackagPath> [--loglevel <logLevel>]');
  process.exit(0);
} else {
  webpackagePath = options.path;
}

converter.convert(webpackagePath);
