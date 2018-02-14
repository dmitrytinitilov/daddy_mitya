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
					/*for (i=0;i<questions.length;i++) {

					}*/
				}
			}

			xhr.open("GET",'/api/get_questions_to_bot?bot_nick='+_botNick,true);
			xhr.send();
			
		}

	}

}())




