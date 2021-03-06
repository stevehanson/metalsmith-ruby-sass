(function() {
  'use strict';

  var each = require('async').each,
      path = require('path'),
      spawn = require('win-spawn'),
      which = require('which'),

      MAX_CSS_SIZE = 100000, // 100,000

      isSassFile = function isSassFile(filename) {
        return (/^[^_].*\.scss/).test(path.basename(filename));
      },

      isPartial = function isPartial(filename) {
        return (/^_.*\.scss/).test(path.basename(filename));
      },

      compile = function(basePath, files, filename, done) {
        var file = files[filename],
            includes = this.includePaths || [],
            outputStyle = this.outputStyle || 'compressed',
            imagePath = this.imagePath || '/',
            outputDir = this.outputDir || path.dirname(filename),
            trace = this.trace;

        if (isSassFile(filename) === true) {

          var args = ['--scss'];

          if(trace) {
            args.push('--trace');
          }

          if(includes) {
            args.push('--load-path', includes);
          }

          args.push('--style', outputStyle);

          args.push(path.join(basePath, filename))

          var child = spawn('sass', args);
          var css = '';

          child.stdout.on('data', function (cssChunk) {
            css += cssChunk;
          });

          child.on('error', function (err) {
            throw err;
          });

          child.on('close', function (code) {
            if (code > 0) {
              return console.log('Failed to compile SASS. Exited with error code ' + code);
            }

            // replace contents
            file.contents = new Buffer(css);
            // rename file extension
            files[path.join(outputDir, path.basename(filename).replace('.scss', '.css'))] = file;
            delete files[filename];
            done();

          });

        } else if (isPartial(filename) === true) {
          delete files[filename];
          done();
        } else {
          done();
        }
      },

      compileSass = function compileSass(files, metalsmith, done) {
        var basePath = path.join(metalsmith.dir, metalsmith._src);
        each(Object.keys(files), compile.bind(this, basePath, files), done);
      },

      plugin = function plugin(options) {
        var config = options || {};

        try {
          which.sync('sass');
        } catch (err) {
          return '\nYou need to have Ruby and Sass installed and in your PATH for this task to work.\n';
        }


        return compileSass.bind(config);
      };

  module.exports = plugin;
}());
