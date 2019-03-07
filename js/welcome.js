WelcomeScene = function() {
	let scene = {};

	let initOnce = false;

	scene.setup = function() {
		roomCode.val('');
		welcomeSceneContainer.show();
		Messages.clear().show();
		Hud.clear();

		// disable forms deafult submit
		roomForm.submit(function(e) {
			e.preventDefault();
		});

		// basic enable/disable join und create buttons
		roomFormFields.on('keyup', function() {
			if (roomCode.val() != '' && username.val() != '') {
				roomFormButtons.prop('disabled', false);
			} else {
				roomFormButtons.prop('disabled', true);
			}
		});

		// join a room
		joinRoom.on('click', function(e) {
			e.preventDefault();
			socket.emit('join-room', {
				username: username.val().toUpperCase(),
				code: roomCode.val().toUpperCase()
			});
		});

		// create a room
		createRoom.on('click', function(e) {
			e.preventDefault();
			socket.emit('create-room', {
				username: username.val().toUpperCase(),
				code: roomCode.val().toUpperCase()
			});
		});

		// -- socket

		if (!initOnce) {

			// on room msg
			socket.on('room-msg', function(data) {
		    console.log('<< room-created: ', data);
		    Messages.add(data.msg);
		  });

			// on room creation
			socket.on('room-created', function(data) {
		    console.log('<< room-created: ', data);
		    Messages.add(data.msg, { player: data.player, username: data.username });
		    roomName.text('ROOM: ' + data.code);
				SceneManager.switchScene('waiting');

				Hud.addPlayer(data.player, data.username);
				Hud.me(data.player);
		  });

			// on room join
			socket.on('room-joined', function(data) {
				console.log('<< room-joined: ', data);
				roomName.text('ROOM: ' + data.code);
				Messages.add(data.msg, { player: data.player, username: data.username });

				Hud.refreshPlayers(data.players);

				if (SceneManager.isScene('welcome')) {
					Hud.me(data.player);
					SceneManager.switchScene('waiting');
				}
	  	});

			// on room exit
			socket.on('room-exit', function(data) {
				console.log('<< room-exit: ', data);
				roomName.text('');
				Messages.add(data.msg, { player: data.player, username: data.username });

				Hud.refreshPlayers(data.players);
	  	});

			initOnce = true;

		}
	};

	scene.shutdown = function() {
		welcomeSceneContainer.hide();
		// username.val('');
	};

	return scene;
}();