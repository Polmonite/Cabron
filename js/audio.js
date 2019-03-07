Audio = function() {
	let registry = {
		goat: { file: new Audio('assets/sounds/goat.wav'), loop: false },
		turbo: { file: new Audio('assets/sounds/turbo.wav'), loop: false },
		mariachi: { file: new Audio('assets/music/mariachi.mp3'), loop: true, autoplay: true },
		lost: { file: new Audio('assets/music/lost.mp3'), loop: false },
		won: { file: new Audio('assets/music/won.mp3'), loop: false }
	};

	for (let i in registry) {
		registry[i].file.preload = 'auto';
		registry[i].file.load();
		if (typeof registry[i].loop != 'undefined') {
			registry[i].file.loop = registry[i].loop;
		}
		if (typeof registry[i].autoplay != 'undefined') {
			registry[i].file.autoplay = registry[i].autoplay;
		}
		registry[i].play = function() {
			if (registry[i].file.readyState < 4) {
				registry[i].file.onloadeddata = function() {
					registry[i].file.play();
				};
			} else {
				registry[i].file.play();
			}
		};
	}

	let a = {};

	a.playSound = function(sound, volume) {
		if (typeof registry[sound] !== 'undefined') {
			registry[sound].file.volume = volume;
console.log(volume)
			registry[sound].play();
		}
	};

	return a;
}();