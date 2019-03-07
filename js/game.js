GameScene = function() {
	let scene = {};

	let turbos = {
		p_0: false,
		p_1: false,
		p_2: false,
		p_3: false
	};

	let initOnce = false;

	scene.redrawElements = function(elements) {
		elements
			.removeClass('head')
			.removeClass('tail')
			.removeClass('player-0')
			.removeClass('player-1')
			.removeClass('player-2')
			.removeClass('player-3')
			.removeClass('right')
			.removeClass('left')
			.removeClass('down')
			.removeClass('up')
			.removeClass('turbo');
	};

	scene.redraw = function() {
		scene.redrawElements(window.boardCells);
	};

	scene.draw = function(boardStatus, playersStatus, clock) {
		// hud
		for (let i in playersStatus) {
			let player = playersStatus[i];
			if (player.alive) {
				Hud.setPlayerStatus(player.playerNum, 'alive');
			} else if (player.exploding) {
				Hud.setPlayerStatus(player.playerNum, 'hit');
			} else {
				Hud.setPlayerStatus(player.playerNum, 'dead');
			}
			Hud.setPlayerTurbos(player.playerNum, player.turbos);
			Hud.setPlayerWins(player.playerNum, player.wins);
		}
		// board
		for (let xy in boardStatus) {
			let cellStatus = boardStatus[xy];

			let target = typeof board[xy] !== 'undefined'
				? board[xy]
				: null;

			if (target == null) {
				continue;
			}

			if (cellStatus.clean) {
				scene.redrawElements(target);
			}

			if (cellStatus.usingTurbo) {
				target.addClass('turbo');
				if (!turbos['p_' + cellStatus.playerNum]) {
					turbos['p_' + cellStatus.playerNum] = true;
					Audio.playSound('turbo', 1);
				}
			}

			if (cellStatus.alive) {
				target.addClass('player-' + cellStatus.playerNum);
				if (cellStatus.head) {
					target.addClass('head');
					target.addClass(cellStatus.direction);
					if (turbos['p_' + cellStatus.playerNum] && !cellStatus.usingTurbo) {
						turbos['p_' + cellStatus.playerNum] = false;
					}
				} else {
					target.removeClass('head').addClass('tail');
				}
			} else {
				target.addClass('player-' + cellStatus.playerNum);
				if (cellStatus.head) {
					if (cellStatus.exploding) {
						target.addClass('exploding');
					} else {
						scene.redrawElements(target);
					}
				} else {
					target.addClass('tail');
				}
			}
		}
	};

	scene.setup = function() {
		gameSceneContainer.show();
		Messages.clear().hide();
		playAgainForm.hide();

		for (let i in turbos) {
			turbos[i] = false;
		}


		// play again
		playAgain.on('click', function(e) {
			e.preventDefault();
			// SceneManager.switchScene('welcome');
			window.location.href = '?name=' + Hud.myName();
		});

		// -- socket

		if (!initOnce) {

			socket.on('game-init', function(data) {
				Messages.alert(data.msg, data.fadeAway);
			});

			socket.on('game-end', function(data) {
				scene.draw(data.boardStatus, data.playersStatus, data.clock);
				if (data.winner == null) {
					Messages.alert('... Draw ...');
				} else {
					Messages.alert('Winner: ' + data.winner + '!');
				}
			});

			socket.on('game-update', function(data) {
				scene.draw(data.boardStatus, data.playersStatus);
			});

			'up,down,left,right,spacebar'.split(',').forEach(function(el) {
				Controller.on(el, function() {
					socket.emit('game-' + el, {
						username: username.val(),
						code: roomCode.val()
					});
				});
			});

			socket.on('whole-game-end', function(data) {
				scene.draw(data.boardStatus, data.playersStatus, data.clock);
				playAgainForm.show();
				Messages.alert(data.globalWinner + ' won 3 games!');
			});

			initOnce = true;

		}
	};

	scene.shutdown = function() {
		playAgainForm.hide();
		gameSceneContainer.hide();
		'up,down,left,right,spacebar'.split(',').forEach(function(el) {
			Controller.off(el);
		});
	};

	return scene;
}();