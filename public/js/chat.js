var pushButton  = document.querySelector('.push_button');
pushButton.addEventListener('click', askQuestion);

function askQuestion() {
	var xhr = new XMLHttpRequest();

	var talkbox = document.querySelector('.talkbox');

	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4 && xhr.status == 200) {
	
			console.log('botAnswer: '+xhr.responseText);
			talkbox.innerHTML+=('<div class="bot_reply">'+xhr.responseText+'<div>');
		}
	}

	var userSpeech = document.querySelector('.user_speech');

	console.log('userSpeech: '+userSpeech.value);

	talkbox.innerHTML+=('<div class="user_reply">'+userSpeech.value+'<div>');

	xhr.open("GET","/api/get_bot_answer?text="+userSpeech.value,true);
	xhr.send();
	userSpeech.value = '';
}

