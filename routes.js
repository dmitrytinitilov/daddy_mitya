const util = require('util');

var tools = require('./tools');

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

	app.get('/api/init_answers',function(req,res){

		console.log('init answers');

		(async function() {

			try {
				var replies = db.collection("replies");

				items = await replies.find({}).toArray();

				if (items && items.length>0) {

					for (i=0;i<items.length;i++) {
						var question_id = (items[i]._id).toString();

						answers = await replies.find({ref_id:question_id}).toArray();

						if (answers) {

							var ans_num = 0 
							if (answers.length)
								ans_num = answers.length;

							await replies.update({_id:items[i]._id},{$set:{answer_num:ans_num}},{ upsert: false, multi: true })
													
						}
					}
				}

				res.end('Answers are ready');

			} catch(e) {
				console.log(e);
			}

		})()
		
	})


	app.get('/api/get_bot_answer',function(req,res){

		(async function() {

			try {

				res.set('Content-Type', 'text/html');
				var replies = db.collection("replies");
				var text = req.query.text;

				var hash_obj = await tools.checkHash(req,res);
				console.log(util.inspect(hash_obj)); 
				var hash_id = hash_obj.hash_id;

				var generate_flag = false;
		
				var bot_id = 0;
				if (req.query.bot_id) {
					bot_id = parseInt(req.query.bot_id);
				}

				var user_bot_talks = db.collection("user_bot_talks");

				var ref_id = 0;

				if (talk= await user_bot_talks.findOne({bot_id:bot_id,hash_id:hash_id})) {
					ref_id = talk.ref_id;
				} else {
					await user_bot_talks.insert({bot_id:bot_id,hash_id:hash_id,ref_id:ref_id});
				}


				console.log('bot_id: ' + util.inspect(bot_id));

				//YOU HAVE TO CHECK IF BASE ALREADY HAD SUCH REPLY

				var items = await replies.find({ $text: { $search: text }, ref_id:ref_id, bot_id:bot_id, answer_num:{$gt:0}}).toArray();

				console.log('Questions '+util.inspect(items)+'\n');

				if (!(items && items.length>0)) {
					await replies.insert({text:text,ref_id:ref_id,bot_id:bot_id,answer_num:0})

					ref_id =0;
					var items = await replies.find({ $text: { $search: text }, ref_id:0, bot_id:bot_id, answer_num:{$gt:0}}).toArray();

					console.log('General Questions '+util.inspect(items)+'\n');
				}

				if (items && items.length>0) {
					var question_id = (items[0]._id).toString();
					console.log('ref_id '+question_id+'\n');

					ans_result = await replies.findOne({ref_id:question_id});

					console.log('Answers '+util.inspect(ans_result));

					ref_id = question_id; // new reply

					if (ans_result) {

						res.write(ans_result.text);
					} else {
						res.write('NO_ANSWER_ERROR');
					}

					res.end();
					
				} else {

					await replies.insert({text:text,ref_id:0,bot_id:bot_id,answer_num:0})

					res.write('NO_ANSWER_ERROR');
					res.end();
					
				}

				console.log('You stopped on '+ref_id);

				await user_bot_talks.update({hash_id:hash_id,bot_id:bot_id},{$set:{ref_id:ref_id}})

			} catch(e) {
				console.log(e);
			}

		})()
		
	})


	return app

}