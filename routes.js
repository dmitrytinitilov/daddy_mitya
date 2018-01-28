const util = require('util');

module.exports = function(app, db) {


	app.get('/', function(req,res){
		res.render('chat');
	});

	app.get('/chat',function(req,res){
		res.render('chat');
	})

	app.get('/set_hash',function(req,res){

		(async function() {

			try {
				var generate_flag =false;
				db = await db.open();
				if (req.cookies.hash) {
				
					var hashes = db.collection("hashes");
					var old_hash = req.cookies.hash;

					doc = await hashes.findOne({hash:old_hash})

					if (!doc) {
						generate_flag=true;
					}
					
				} else {
					generate_flag=true;
				}

				if (generate_flag) {
					var token = crypto.randomBytes(64).toString('hex');
		    		var hashes = db.collection("hashes");

		    		await hashes.insert({hash:token});
		    		res.cookie('hash' , token).send('hash is set');
		    	}
	    		db.close();
	    		res.end('ops');

	    	} catch(e) {
				console.log(e);
			}

			return 
		})()
		
	})


	app.get('/phrases',function(req,res){
		db.open(function(err,db) {

			var replies = db.collection("replies");

			res.set('Content-Type', 'text/html');

			replies.find().toArray(function(err, items) {
				console.log(items);
				for (i=0;i<items.length;i++) {
					res.write((items[i]._id).toString()+' ');
					res.write((items[i].ref_id).toString()+' ');

					if (items[i].text)
						res.write((items[i].text).toString());

					res.write('<a href="/get_phrase?id='+ items[i]._id +'">');
						res.write('[edit]');
					res.write('</a>');
					res.write('<br>');
				}
				res.end();
				db.close();
			})
		})
	})

	app.get('/get_phrase',function(req,res){

		db.open(function(err,db){

			res.set('Content-Type', 'text/html');

	    	var replies = db.collection("replies");

	    	var id = req.query.id;

	    	console.log('id: '+id);

	    	replies.findOne({_id:ObjectId(id)},function(err, result) {

	    		console.log('Error '+err+' '+'Result '+util.inspect(result)+'\n');

	    		if (result && result.text) {
	    			res.write(result.text);

	    			res.write('<form action="/push_phrase" method="GET">');
	    				res.write('<input type="text" name="text">');
	    				res.write('<input type="hidden" name="ref_id" value="'+req.query.id+'">');
	    				res.write('<input type="submit" value="Ответить">');
	    			res.write('</form>');
	    		}
	    		else
	    			res.write('Ничего не найдено');

	    		db.close();
	    		res.end();
	    	});		
		})

	});

	app.get('/make_index',function(req,res){

		db.open(function(err,db){
			var replies = db.collection("replies");

			replies.createIndex({ text: "text" },function(err,res){
				res.end('index построен');
				db.close();
			})
		})

	})

	app.get('/get_answer',function(req,res){

		(async function() {

			try {
				var generate_flag =false;
			//	db = await db.open();

				res.set('Content-Type', 'text/html');
				var replies = db.collection("replies");
				var text = req.query.text;

				var ref_id = 0;

				console.log('text: '+text);


				items = await replies.find({ $text: { $search: text }, ref_id:0}).toArray();

				console.log('Result '+util.inspect(items)+'\n');
				if (items && items.length>0) {
					var question_id = (items[0]._id).toString();
					console.log('ref_id '+question_id+'\n');

					replies.findOne({ref_id:question_id},function(err,ans_result){

						console.log('Error '+err+' '+'Result '+util.inspect(ans_result));

						if (ans_result) {
							res.write(ans_result.text);
						} else {
							res.write('NO_ANSWER_ERROR');
						}

						res.end();
						//db.close();
					})
				} else {

					replies.insert({text:text,ref_id:ref_id,bot_id:0},function(err){
						//db.close();
					});

					res.write('NO_ANSWER_ERROR');
					res.end();
					
				}

			} catch(e) {
					console.log(e);
			}

		})()
		
	})


	app.get('/push_phrase',function(req,res){

		res.set('Content-Type', 'text/html');

		var user_text = req.query.text;

		var ref_id = 0;
		if (req.query.ref_id) {
			ref_id = req.query.ref_id;
		}

		console.log('USER TEXT',user_text);

		/*var database = await MongoClient.connect(url);
		const db = database.db('daddy_mitya');*/

		(async function() {
			try {
				var replies = db.collection("replies");

				await replies.insert({text:user_text,ref_id:ref_id,bot_id:1});
			} catch(e) {
				console.log(e);
			}
		})()

		res.end('Добавлено');

	  //  database.close();
    
	})

////////////////////////////////////////////////////////
///////  API
////////////////////////////////////////////////////////


	app.get('/api/get_bot_answer',function(req,res){

		(async function() {

			try {
				var generate_flag =false;
		
				res.set('Content-Type', 'text/html');
				var replies = db.collection("replies");
				var text = req.query.text;

				bot_id = 0;
				if (req.query.bot_id) {
					bot_id = req.query.bot_id;
				}

				var ref_id = 0;

				console.log('text: '+text);

				items = await replies.find({ $text: { $search: text }, ref_id:0, bot_id:bot_id}).toArray();

				console.log('Result '+util.inspect(items)+'\n');
				if (items && items.length>0) {
					var question_id = (items[0]._id).toString();
					console.log('ref_id '+question_id+'\n');

					ans_result = await replies.findOne({ref_id:question_id});

					console.log('Error '+err+' '+'Result '+util.inspect(ans_result));

					if (ans_result) {
						res.write(ans_result.text);
					} else {
						res.write('NO_ANSWER_ERROR');
					}

					res.end();
					
				} else {

					replies.insert({text:text,ref_id:ref_id,bot_id:0},function(err){
						//db.close();
					});

					res.write('NO_ANSWER_ERROR');
					res.end();
					
				}

			} catch(e) {
					console.log(e);
			}

		})()
		
	})






	return app

}