const { series } = require('gulp');
const { src, dest } = require('gulp');
var merge = require('gulp-merge-json');

function outputConfig(cb) {
    // place code for your default task here

    let srcFiles = src(['config.common.json', 'config.dev.json'], {
      allowEmpty: true
    });

    srcFiles.pipe(merge({
        fileName: 'config.json'
    }))
    .pipe(dest('./build'));

    cb();
  }
  
exports.default = series(outputConfig);