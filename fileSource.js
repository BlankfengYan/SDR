var fs = require('fs'),
	lineReader = require('line-reader');


function FileSource(file) {
	this._file = file;
}

var lineReaderClose = function (reader) {
  reader.close(function(err) {
    if (err) console.log('line-reader close failed');
  });
}

var readNextLine = function(reader, handler) {
  if (reader.hasNextLine()) {
    reader.nextLine(function(err, line) {
      console.log(line);
      handler.get(line);
    });
  } else {
  	handler.finish();
    lineReaderClose(reader);
  }
}


FileSource.prototype.init = function(handler) {
	self = this;
	this._handler = handler;
	lineReader.open('/data/sz.csv', function(err, reader) {
		if (!err) {
			self._reader = reader;
			readNextLine(reader, self._handler);
		}
	});
};

FileSource.prototype.onDone = function() {
	readNextLine(this._reader, this._handler);
};

module.exports = FileSource;

