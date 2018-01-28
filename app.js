const util = require('util');
const crypto = require('crypto');
var fs = require('fs');

var express = require('express');
var cookieParser = require('cookie-parser');
var app = express();
app.use(cookieParser());
app.use(express.static('public'));

var bodyParser = require('body-parser')
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

app.set('view engine','pug');

var mongo = require('mongodb');
var host  = 'localhost';
var port  = 27017;
var ObjectId = require('mongodb').ObjectID;

/*var MongoClient = require('mongodb').MongoClient;
var url = 'mongodb://localhost:27017';*/


//var multer  = require('multer')
//var upload = multer({ dest: 'public/uploads/' })

//var tools = require('./tools');

//var db = new mongo.Db('daddy_mitya', new mongo.Server(host, port, {}), {safe:false});


(async function() {

	try {

		/*var database = await MongoClient.connect(url);
		const db = database.db('daddy_mitya');*/
		var getDb = require('./dbs');
		db = await getDb();

		var routes = require('./routes');
		app = routes(app, db);

		var server = app.listen(8081,function(){
			var host = server.address().address;
			var port = server.address().port;

			console.log("Example app listening at http://%s:%s", host, port)
		})
	} catch(e) {
		console.log(e);
	}

})()



