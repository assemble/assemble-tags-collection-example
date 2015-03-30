var assemble = require('assemble');
var through = require('through2');
var unique = require('array-unique');
var extname = require('gulp-extname');
var File = require('vinyl');

/**
 * Create a new template type for caching and loading
 * "index" templates
 */

assemble.create('index', 'indices', {isRenderable: true});
assemble.indices('templates/indices/*.hbs');

/**
 * Task with:
 *  - 'tags' plugin, which currently only will generate a list (index) of tags from front-matter of all files in the task
 *  - 'extname' plugin for renaming extensions to 'html'
 */

assemble.task('default', function () {
  assemble.src('templates/*.hbs')
    .pipe(plugin('basic'))
    .pipe(extname())
    .pipe(assemble.dest('result/'));
});

/**
 * 'tags' plugin
 *
 *   - in the main function, we push the file into a `files`
 *     array, then we push the file back into the stream
 *   - in the flush function we take the `files` array that we built up,
 *     then we create a new vinyl file using the template defined by the
 *     user in the task. in this case, the template name is `basic`
 */

function plugin(template) {
  var files = [];
  return through.obj(function (file, enc, cb) {
    files.push(file);
    this.push(file);

    cb();
  }, function (cb) {
    var stream = this;
    var tags = aggregateTags(files);

    var tmpl = assemble.views.indices[template];
    tmpl.data.tags = buildLinks(tags, files);

    assemble.render(tmpl, function (err, content) {
      if (err) console.log(err);
      var file = new File({path : 'index.html'});

      // `data` needed for assemble
      file.data = {};
      file.contents = new Buffer(content);
      stream.push(file);
      cb();
    });
  });
}

/**
 * Generate a array of unique tags from the front matter
 * of all files.
 */

function aggregateTags(files) {
  var len = files.length;
  var tags = [];

  while (len--) {
    var data = files[len].data;
    if (data.tags) {
      tags = tags.concat(data.tags);
    }
  }
  return unique(tags);
}

/**
 * Get the data we need from each file, so we can build
 * links to each file, for each tag.
 */

function buildLinks(tags, files) {
  var res = {};
  tags.sort();

  for (var i = 0; i < tags.length; i++) {
    var len = files.length;
    var tag = tags[i];
    res[tag] = [];
    res[tag].name = tag;

    while (len--) {
      var file = files[len];
      var data = file.data;

      if (data.tags && data.tags.indexOf(tag) !== -1) {
        res[tag].push(file.data.dest);
      }
    }
  }
  return res;
}
