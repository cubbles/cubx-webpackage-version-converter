(function () {
  'use strict';

  var path = require('path');
  var fs = require('fs');

  function filterFiles (startPath, filter, callback) {
    // console.log('Starting from dir '+startPath+'/');

    if (!fs.existsSync(startPath)) {
      console.log('no dir ', startPath);
      return;
    }

    var files = fs.readdirSync(startPath);
    for (var i = 0; i < files.length; i++) {
      var filename = path.join(startPath, files[ i ]);
      var stat = fs.lstatSync(filename);
      if (stat.isDirectory()) {
        filterFiles(filename, filter, callback); // recurse
      } else if (filter.test(filename)) {
        callback(filename);
      }
    }
  };

  exports = module.exports = filterFiles;
})();
