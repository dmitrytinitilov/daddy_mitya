const util   = require('util');
const crypto = require('crypto');

var ObjectId = require('mongodb').ObjectID;

var tools = require('./tools');

module.exports = function(app, db) {

	var bodyParser = require('body-parser')
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({
	  extended: true
	}));


	app.get('/', function(req,res){
		(async function() {

			try {
				var quads = db.collection("quads");

				var local_quads = await quads.find({location:'odessa'}).toArray();

				res.render('start',{quads:local_quads});
			} catch(e) {
				console.log(e);
			}
		})()
	});

	app.get('/invite',function(req,res){
		res.render('invite');
	})

	app.get('/login',function(req,res){
		res.render('login');
	})

	app.get('/create_bot',function(req,res){
		res.render('create_bot_form');
	})

	app.get('/create_quad',function(req,res){
		res.render('create_quad');
	})

	app.get('/\:\::quad_slug',function(req,res){

		(async function() {

			try {
				console.log('slug '+req.params.quad_slug);
				var quad_bot_str = req.params.quad_slug;

				var quad_bot_arr = quad_bot_str.match(/^(\w+)(@(\w*))?$/);

				console.log(util.inspect(quad_bot_arr));

				var quad_slug = quad_bot_arr[1];
				var bot_nick  = quad_bot_arr[3];

				if (bot_nick) {
					//res.render('Bot: '+bot_nick);
					//res.end('Bot: '+bot_nick);
					res.render('bot.pug',{bot_nick:bot_nick});
				} else {

					var quads = db.collection("quads");
					var bots_on_quads = db.collection("bots_on_quads");

					var quad_obj = await quads.findOne({slug:quad_slug});
					bots = await bots_on_quads.find({quad_slug:quad_slug}).toArray();

					//console.log('quad_obj '+util.inspect(quad_obj));
					console.log('quad_obj '+util.inspect(quad_obj));

					res.render('quad',{quad_obj:quad_obj,bots:bots});
				}
			} catch(e) {
				console.log(e);
			}
		})()
	})

	app.get('/questions_to_bot',function(req,res) {
		(async function() {
			try {
				var hash_obj = await tools.checkHash(req,res);

				var render_flag = false;

				console.log('user_id ' + hash_obj.user_id);

				if (hash_obj.user_id) {
					var bots = db.collection("bots");

					var bot = await bots.findOne({owner_id:hash_obj.user_id});

					if (bot) {
						res.render('questions',{bot_nick:bot.nick});
						render_flag = true;
					} 

					
				} 

				if (!render_flag) {
					res.end('BEZ DATA. LOGIN PLEASE.');
				}
				
				
			} catch(e) {
				console.log(e);
			}
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

	/*app.get('/api/init_answers',function(req,res){

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
				var name = req.body.name;
				var description = req.body.description;

				var hash_obj = await tools.checkHash(req,res);

				var done_flag = false;

				if (hash_obj.user_id!=0) {
					bots.insert({name:name,description:description,owner_id:hash_obj.user_id});
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
					quads.insert({name:name,description:description,slug:slug,owner_id:hash_obj.user_id});
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
*/

	return app

}