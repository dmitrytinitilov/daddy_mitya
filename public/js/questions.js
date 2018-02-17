/*document.addEventListener("DOMContentLoaded", function(event) {
   loadQuestions();
});*/

BotQuestions = (function(){

	var _botNick = ''; 

	return {
		init : function(bot_nick) {
			_botNick = bot_nick;
		},
		loadQuestions:function() {
			var xhr = new XMLHttpRequest();

			var talkbox = document.querySelector('.talkbox');

			xhr.onreadystatechange = function() {
				if (xhr.readyState == 4 && xhr.status == 200) {
			
					questions = JSON.parse(xhr.responseText);

					console.log(questions);

					var allRepliesBlock = document.createDocumentFragment();
					for (i=0;i<questions.length;i++) {
						var reply_block = document.createElement("div");
						reply_block.className = 'bot_reply';
						reply_block.innerHTML = questions[i].text;

						var answer_form = document.createElement("form");

						answer_form.action = '/api/add_answer_to_reply';

						var question_id_input = document.createElement("input");
						question_id_input.type = 'hidden';
						question_id_input.value = questions[i]._id;
						question_id_input.name = 'ref_id'
						answer_form.appendChild(question_id_input);

						var bot_id_input = document.createElement("input");
						bot_id_input.type = 'hidden';
						bot_id_input.value = questions[i].to_bot_id;
						bot_id_input.name = 'bot_id'
						answer_form.appendChild(bot_id_input);

						var answer_area = document.createElement("textarea");
						answer_area.name = 'text';
						//reply_block.appendChild(answer_area);
						answer_form.appendChild(answer_area);

						var post_button = document.createElement("button");
						post_button.innerHTML = 'answer';
						answer_form.appendChild(post_button);

						reply_block.appendChild(answer_form);


						allRepliesBlock.appendChild(reply_block);
					}

					var talkbox = document.querySelector('.talkbox');
					talkbox.appendChild(allRepliesBlock);
				}
			}

			xhr.open("GET",'/api/get_questions_to_bot?bot_nick='+_botNick,true);
			xhr.send();
			
		}

	}

}())




