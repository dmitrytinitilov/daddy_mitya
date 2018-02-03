const util = require('util');

var tools = require('./tools');

module.exports = function(app, db) {


	app.get('/', function(req,res){
		res.render('chat');
	});

	app.get('/invite',function(req,res){
		res.render('invite');
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

	

	app.get('/make_index',function(req,res){

		db.open(function(err,db){
			var replies = db.collection("replies");

			replies.createIndex({ text: "text" },function(err,res){
				res.end('index построен');
				db.close();
			})
		})

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

	app.post('/api/register',function(req,res){
		(async function() {

			try {
				var invite = req.body.invite;
				var login  = req.body.login;
				var password = req.body.password;

				var loginpass = db.collection("loginpass");

				const hash = crypto.createHmac('sha256', password)
                   .update(login)
                   .digest('hex');

				await loginpass.insert({login:login,password:crypto_password})
				res.end('added');

			} catch(e) {
				console.log(e);
				res.end('error');
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