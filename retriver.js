var http = require('http');
var iconv = require('iconv-lite');
var util = require('./util')
var fileSource = require('./fileSource');
var mongodb = require('mongodb');
//We need to work with "MongoClient" interface in order to connect to a mongodb server.
var MongoClient = mongodb.MongoClient;

// Connection URL. This is where your mongodb server is running.
var Retriver = function(src, dest) {
	console.log("Retriver constructor...", src);
	this._src = src;
	this._dest = dest;
};

Retriver.prototype.get = function(stockId) {
	console.log("NOT IMPELEMENTED!");
};

Retriver.prototype.onData = function(data) {
	//if (typeof this.handler === 'object')
	this._dest.process(data);
};

Retriver.prototype.start = function() {
	this._src.init(this);
	this._dest.init(this);
};

Retriver.prototype.onDone = function() {
	this._src.onDone();
};

Retriver.prototype.finish = function() {
	if (typeof this.doFinish === Function)
		this.doFinish();
	this._dest.finish();
}



var HttpRetriver = function(src, dest) {
	this.options = {
  		host: 'hq.sinajs.cn',
	};
	var that = this;
	HttpRetriver.parent.constructor.apply(this, arguments);
	HttpRetriver.callback = function(response) {
	  var chunks = [];

	  //another chunk of data has been recieved, so append it to `str`
	  response.on('data', function (chunk) {
	    chunks.push(chunk);
	  });

	  //the whole response has been recieved, so we just print it out here
	  response.on('end', function () {
	    var decodedBody = iconv.decode(Buffer.concat(chunks), 'gb2312');
	    // parese the data and return to handler
	    that.onData(decodedBody);
	  });
	};
};
// inherited from Retrive
util.extend(HttpRetriver, Retriver);
HttpRetriver.prototype.get = function(stockId) {
	console.log('retrive: ', stockId);
	var path = '/list=sz' + stockId; 
	this.options['path']= path;
	//console.log('HttpRetriver::get() with ', path);
	http.request(this.options, HttpRetriver.callback).end();
};

var Store = function() {

};

Store.prototype.init = function(src) {
	this._source = src;
};

Store.prototype.process = function(data) {
	var sinaPreprocess = function(rawdata) {
		try {
			var stock_id = rawdata.match(/(\d{6})/)[0];
			var results = rawdata.match(/".*?"/)[0].split(',');
			var details = {
				id:     stock_id,
				name:   results[0].substring(1),
				exchange: {
					open: 	parseFloat(results[1]), // 9.40
					close: 	parseFloat(results[3]), // 9.25
					high: 	parseFloat(results[4]),  //9.46
					low: 	parseFloat(results[5]),  // 9.22
				}
			};
			console.log(details);
			return details
		} catch (err) {
			console.log('Invalid data [', data, ']');
		}
	}
	this.store(sinaPreprocess(data));
};
Store.prototype.store = function(data) {
	console.log("store not IMPELEMENTED");
};

Store.prototype.finish = function() {
	// for base
	this.doFinish();
}

// store to data
var MongoStore = function(options) {
	var url = 'mongodb://172.17.0.2:27017/local';
	var self = this;
	this._ready = false;
	this._col_stock_id = undefined;
	this._db = undefined;
	MongoStore.parent.constructor.constructor.apply(this, arguments);
	MongoClient.connect(url, function (err, db) {
		if (err) {
		    console.log('Unable to connect to the mongoDB server. Error:', err);
	  	} else {
	    	//HURRAY!! We are connected. :)
	    	console.log('Connection established to', url);
	    	self._ready = true;
	    	self._col_stock_id = db.collection("stockIDInfo2");
	    	self._db = db;
	  	}
	});
	this.doFinish = function() {
		this._db.close();
	}
};

util.extend(MongoStore, Store);

MongoStore.prototype.store = function(data) {
	var self = this;
	if (!this._ready) return;
	var stock_id = data.id;
	console.log("yaojie stock id: ", stock_id);
	//var cursor = this._col_stock_id.find({id: stock_id});
	//if (!cursor.hasNext()) 
	try {
		console.log("mongo not found!");
		self._col_stock_id.insert({id: stock_id, name: data.name}, function(err, result) {
			if (err) {
				console.log("update stockIDInfo failed!");
			}
			// create a new document to store the daily exchange info
			console.log("begin update exchange info: ", data.exchange);
			var name = 'y'+stock_id;
			self._db.collection(name).insert(data.exchange, function(err, result) {
				if (err) {
					console.log('Insert error:', err);
				} else {
					// notify for next requrest
					self._source.onDone();
				}
			});
		});
	} catch (err) {
		console.log("MongoStore update with error: ", err);
	}
};

var file = new fileSource('/data/sz.csv');
var store = new MongoStore();
var retriver = new HttpRetriver(file, store);
retriver.start();

