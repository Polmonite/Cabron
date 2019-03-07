jQuery(function() {
	Controller.setup();
	SceneManager.switchScene('welcome');
	setTimeout(function() {
		gameTitle.fadeIn(1500);
	}, 1000);
	muteBtn.attr('data-mute', 'mute');
	body.one('click', function() {
		Audio.playSound('mariachi', 0.3);
		muteBtn.attr('data-mute', '');
	});
	muteBtn.on('click', function(e) {
		e.preventDefault();
		e.stopPropagation();
		if (muteBtn.attr('data-mute') === 'mute') {
			Audio.playSound('mariachi', 0.3);
			muteBtn.attr('data-mute', '');
		} else {
			Audio.playSound('mariachi', 0);
			muteBtn.attr('data-mute', 'mute');
		}
	})
	let name = window.location.search.replace('?', '').split('&').filter(function(param, carry) {
		console.log(param.substring(0, 'name='.length))
		return param.substring(0, 'name='.length) === 'name=';
	});
	name = (name.length > 0)
		? name[0].substring('name='.length)
		: '';
	username.val(name);
});