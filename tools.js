var MongoClient = require( 'mongodb' ).MongoClient;
var mongo_url = 'mongodb://localhost:27017';
const crypto = require('crypto');

module.exports = {

	checkHash:async function(req,res) {
		

		try {
			var hash_id=0;
			
			var generate_flag =false;
				
			var hashes = db.collection('hashes');
			console.log('hashes: '.hashes);

			var old_hash;
			if (req.cookies.hash) {
				var old_hash = req.cookies.hash;

				if (hashes) {
					doc = await hashes.findOne({hash:old_hash})
				}

				if (!doc) {
					generate_flag=true;
				} else {
					hash_id = doc._id;
					user_id = doc.user_id;
				}
				
			} else {
				generate_flag=true;
			}

			if (generate_flag) {
				user_id = 0;
				var token = crypto.randomBytes(64).toString('hex');
				old_hash = token;
	    		

	    		var doc = await hashes.insert({hash:token,user_id:user_id});
	    		hash_id = doc._id;
	    		res.cookie('hash' , token);
	    		//res.end('cookie is set');
	    	} 
    		
			return {hash_id:hash_id,hash:old_hash,user_id:user_id};

    	} catch(e) {
			console.log(e);
			//res.end(e);
		}

	

	}

}

