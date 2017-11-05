var pushButton  = document.querySelector('.push_button');
pushButton.addEventListener('click', askQuestion);

function askQuestion() {
	var xhr = new XMLHttpRequest();

	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4 && xhr.status == 200) {
			var talkbox = document.querySelector('.talkbox');
			console.log('botAnswer: '+xhr.responseText);
			talkbox.value+=xhr.responseText;
		}
	}

	var userSpeech = document.querySelector('.user_speech');

	console.log('userSpeech: '+userSpeech.value);

	xhr.open("GET","/get_answer?text="+userSpeech.value,true);
	xhr.send();
	userSpeech.value = '';
}

