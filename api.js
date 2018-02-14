const util   = require('util');
const crypto = require('crypto');

var ObjectId = require('mongodb').ObjectID;

var tools = require('./tools');

module.exports = function(app, db) {


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

				if (login && password) {
					const crypto_password = crypto.createHmac('sha256', password)
	                   .update(login)
	                   .digest('hex');

					await loginpass.insert({login:login,password:crypto_password})
					res.end('added');
				} else {
					res.end('Sorry. There is no data');
				}

			} catch(e) {
				console.log(e);
				res.end('error');
			}

		})()
	})

	app.post('/api/login',function(req,res){
		(async function() {

			try {
				var login  = req.body.login;
				var password = req.body.password;

				var loginpass = db.collection("loginpass");

				var logged_flag = false;

				if (login && password) {
					const crypto_password = crypto.createHmac('sha256', password)
	                   .update(login)
	                   .digest('hex');

	                var user;
	                if (user = await loginpass.findOne({login:login,password:crypto_password}) ) {

	                	logged_flag = true;

	                	//console.log(util.inspect(user));

	                	var user_id = (user._id).toString();

	                	console.log('user_id: '+user_id);

	                	var hash_obj = await tools.checkHash(req,res);
						console.log('hash_obj: '+util.inspect(hash_obj)); 
						var hash_id = hash_obj.hash_id;

						var hashes = db.collection("hashes");

						await hashes.update(
						    { _id: ObjectId(hash_id) },
						    {
						    	$set: {
						    		user_id:user_id
						    	}
						    },
						    { upsert: false, multi: true }
						)
	                }
	            }

	            if (logged_flag) {
	            	res.end('logged');
	            } else {
	            	res.end('rejected');
	            }

			} catch(e){
				console.log(e);
				res.end('error');
			}
		})()
	})

	app.post('/api/create_bot',function(req,res){
		(async function() {

			try {

				console.log('Making bot');
				var bots = db.collection("bots");
				var nick = req.body.nick;
				var name = req.body.name;
				var description = req.body.description;

				var hash_obj = await tools.checkHash(req,res);

				var done_flag = false;

				if (hash_obj.user_id!=0) {
					bots.insert({nick:nick,name:name,description:description,owner_id:hash_obj.user_id});
					done_flag = true;
				}

				if (done_flag) {
					res.end('bot is ready');
				} else {
					res.end('you have no rights to make bot');
				}

			} catch(e) {

			}
		})()

	})

	app.post('/api/create_quad',function(req,res){
		(async function() {

			try {

				console.log('Making quad');
				var quads = db.collection("quads");
				var name = req.body.name;
				var description = req.body.description;
				var slug = req.body.slug;

				var hash_obj = await tools.checkHash(req,res);

				var done_flag = false;

				if (hash_obj.user_id!=0) {
					$ins_obj =  {
									name:name,
									description:description,
									slug:slug,
									owner_id:hash_obj.user_id
								}

					quads.insert($ins_obj);
					done_flag = true;
				}

				if (done_flag) {
					res.end('quad is ready');
				} else {
					res.end('you have no rights to make quad');
				}

			} catch(e) {

			}
		})()

	})
	
	app.get('/api/add_bot_to_quad',function(req,res){

		(async function() {

			try {

				var hash_obj = await tools.checkHash(req,res);

				var bots_on_quads = db.collection("bots_on_quads");
				var bots = db.collection("bots");
				var quads = db.collection("quads");
				console.log('bot nick '+req.query.bot_nick);
				console.log('quad slug '+req.query.quad_slug);

				var bot_nick = req.query.bot_nick;
				var quad_slug = req.query.quad_slug;

				var bot = await bots.findOne({nick:bot_nick});
				var quad = await quads.findOne({nick:quad_slug});

				if (bot.owner_id === hash_obj.user_id && quad.owner_id === hash_obj.user_id) {
					$ins_obj =  {
									bot_nick:bot_nick,
									quad_slug:quad_slug
								}

					await bots_on_quads.insert($ins_obj);
				}
				
				res.redirect('/::'+quad_slug);
				
			} catch(e) {
				console.log(e);
			}

		})()
		
	})


	app.get('/api/get_bot_answer',function(req,res){

		(async function() {

			try {
				res.set('Content-Type', 'text/html');

				var bots = db.collection("bots");
				var replies = db.collection("replies");
				var text = req.query.text;

				var hash_obj = await tools.checkHash(req,res);
				console.log(util.inspect(hash_obj)); 
				var hash_id = hash_obj.hash_id;

				var generate_flag = false;
		
				var bot_id = 0;
				if (req.query.bot_nick) {
					bot_nick = req.query.bot_nick;

					bot= await bots.findOne({nick:bot_nick})
					if (bot) {
						bot_id = bot._id.toString();
					}
				}

				//watch on which reply current user stops
				var user_bot_talks = db.collection("user_bot_talks");

				var ref_id = 0;

				if (talk= await user_bot_talks.findOne({bot_id:bot_id,hash_id:hash_id})) {
					ref_id = talk.ref_id;
				} else {
					var $ins_obj = {
									bot_id:bot_id,
									hash_id:hash_id,
									ref_id:ref_id
								}

					await user_bot_talks.insert($ins_obj);
				}

				console.log('bot_id: ' + util.inspect(bot_id));

				//YOU HAVE TO CHECK IF BASE ALREADY HAD SUCH REPLY

				var $find = {
								$text: { $search: text },
								ref_id:ref_id,
								to_bot_id:bot_id,  //replies to this bot
								answer_num:{$gt:0}
							}
				var items = await replies.find($find).toArray();

				console.log('Questions '+util.inspect(items)+'\n');

				if (!(items && items.length>0)) {

					if (ref_id!=0) {
						$ins_obj =  {
										text:text,
									 	ref_id:ref_id,
									 	to_bot_id:bot_id,
									 	bot_id:0,   //because use is not a bot
									 	answer_num:0
									}

						await replies.insert($ins_obj)
					}
					ref_id =0;

					$find = {
								$text: { $search: text },
								ref_id:0,
								bot_id:bot_id,
								answer_num:{$gt:0}
							}

					var items = await replies.find($find).toArray();

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

					//adding reply to global context
					$ins_obj =  {
									text:text,
									ref_id:0,
									to_bot_id:bot_id,
									answer_num:0
								}

					await replies.insert($ins_obj)

					res.write('NO_ANSWER_ERROR');
					res.end();
					
				}

				console.log('You stopped on '+ref_id);

				//updating phrase on which current user stops
				await user_bot_talks.update({
												hash_id:hash_id,
												bot_id:bot_id
											},
											{
												$set:{ref_id:ref_id}
											})

			} catch(e) {
				console.log(e);
			}

		})()
		
	})

	app.get('/api/get_questions_to_bot',function(req,res){

		(async function() {

			try {
				res.header("Content-Type", "application/json; charset=utf-8");

				var bots = db.collection("bots");
				var replies = db.collection("replies");
				var bot_id =0;

				if (req.query.bot_nick) {
					bot_nick = req.query.bot_nick;

					console.log('Hey do you need '+bot_nick+' bot?');

					bot= await bots.findOne({nick:bot_nick})
					if (bot) {
						bot_id = bot._id.toString();
						owner_id = bot.owner_id;
					}
					console.log('You got bot_id'+bot_id);
				}

				var hash_obj = await tools.checkHash(req,res);
			
				if (bot_id && owner_id && owner_id === hash_obj.user_id) {
					var $find = {								
								to_bot_id:bot_id,  //replies to this bot
								answer_num:{$eq:0}
							}

					var questions = await replies.find($find).toArray();

					res.end(JSON.stringify(questions));
				} else {
					res.end('{"error":"NO DATA"}');
				}
				
			} catch(e) {
				console.log(e);
			}
		})()
	})

	app.get('/api/get_reply_by_id',function(req,res){

		(async function() {

			try {
				res.header("Content-Type", "application/json; charset=utf-8");
				var hash_obj = await tools.checkHash(req,res);

				var bots = db.collection("bots");
				var replies = db.collection("replies");

		    	var id = req.query.id;
		    	console.log('id: '+id);
				var reply = await replies.findOne({_id:ObjectId(id)})

				var bot_id = reply.to_bot_id;
				var bot = await bots.findOne({_id:ObjectId(bot_id)})
				owner_id = bot.owner_id;

				
				if (owner_id === hash_obj.user_id) {
					res.end(JSON.stringify(reply));
				} else {
					res.end('{"error":"reply is not yours or for you"}');
				}

			} catch(e) {
				console.log(e);
			}
		})()
	})


	//needed to be tested
	app.get('/api/add_answer_to_reply',function(req,res){

		(async function() {

			try {
				res.header("Content-Type", "application/json; charset=utf-8");
				var hash_obj = await tools.checkHash(req,res);

				var replies = db.collection("replies");
				var bots = db.collection("bots");

				var user_text = req.query.text;
				var ref_id = 0;
				if (req.query.ref_id) {
					ref_id = req.query.ref_id;

					var question = await replies.find({_id:ObjectId(ref_id)});
				}
				
				var bot_nick  = req.query.bot_nick;

				bot= await bots.findOne({nick:bot_nick})
				if (bot) {
					bot_id = bot._id.toString();
					owner_id = bot.owner_id;
				}

				if (ref_id!=0 && question && question.to_bot_id === bot_id && bot.owner_id === hash_obj.user_id) {
					replies.insert({text:user_text,ref_id:ref_id,bot_id:bot_id,to_bot_id:0});
				}

			} catch(e) {
				console.log(e);
			}
		})()
	})


	return app

}