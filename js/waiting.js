WaitingScene = function() {
	let scene = {};

	let initOnce = false;

	let protected = {};

	protected.loop = null;

	scene.setup = function() {
		waitingSceneContainer.show();
		Messages.show();
		Hud.clear();

		// enable start button when there are at least 2 players
		protected.loop = setInterval(
			function() {
				startGame.prop('disabled', !(Hud.numPlayers() > 1));
			},
			250
		);

		// begin game
		startGame.on('click', function(e) {
			e.preventDefault();
			SceneManager.switchScene('game');

			socket.emit('start-game', {
				code: roomCode.val()
			});
		});

		// add ai
		addAi.on('click', function(e) {
			e.preventDefault();

			socket.emit('add-ai', {
				code: roomCode.val()
			});
		});

		// cancel
		cancel.on('click', function(e) {
			e.preventDefault();
			SceneManager.switchScene('welcome');

			socket.emit('exit-room', {});

			Hud.refreshPlayers([]);
		});

		// -- socket

		if (!initOnce) {

			socket.on('game-begin', function(data) {
		    console.log('game-begin! ', data);
		    if (SceneManager.isScene('game')) {
					GameScene.redraw();
				} else {
					SceneManager.switchScene('game');
				}
		  });

			initOnce = true;

		}
	};

	scene.shutdown = function() {
		roomName.text('');
		if (protected.loop != null) {
			clearInterval(protected.loop);
		}

		waitingSceneContainer.hide();
	};

	return scene;
}();