# cubx-webpackage-version-converter

[![Build Status](https://travis-ci.org/cubbles/cubx-webpackage-version-converter.svg?branch=master)](https://travis-ci.org/cubbles/cubx-webpackage-version-converter)

Version converter for cubbles webpackages. Convert an webapckage with modelVersion 8.x to modelVersion 9.1.
 
 
Usage: 
* command line: 


    cubx-webpackage-version-converter <webpacakgePath>

*  other npm modules


    var webpackagePath = ...
    var Converter = requiere('cubx-webpackage-version-converter');
    var converter = new Converter(webpackagePath);
    converter.convert();
