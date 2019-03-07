Hud = function() {
	let hud = {};

	let protected = {};

	protected.players = [];
	protected.me = null;

	hud.numPlayers = function() {
		return protected.players.length;
	};

	hud.getPlayerHud = function(num) {
		return hudElement.find('#player-hud-' + num);
	};

	hud.setPlayerStatus = function(num, status) {
		let playerHud = hud.getPlayerHud(num);
		if (status === 'hit') {
			if (!playerHud.is('.hit')) {
				Audio.playSound('goat', 1);
			}
			playerHud.addClass('hit');
		} else if (status === 'dead') {
			// playerHud.addClass('dead');
			playerHud.addClass('hit');
		} else {
			// playerHud.removeClass('hit').removeClass('dead');
			playerHud.removeClass('hit');
		}
	};

	hud.setPlayerTurbos = function(num, turbos) {
		hud.getPlayerHud(num).attr('data-turbos', turbos);
	};

	hud.setPlayerWins = function(num, wins) {
		hud.getPlayerHud(num).attr('data-wins', wins);
	};

	hud.addPlayer = function(player, username) {
		protected.players.push({
			player: player,
			username: username
		});

		let playerId = 'player-hud-' + player;

		if (hudElement.find('#' + playerId).length > 0) {
			return;
		}

		if (hud.numPlayers() > 4) {
			throw("Max number of players reached");
		}

		let playerHud = playerHudTemplate.clone();
		playerHud.attr('id', playerId);
		playerHud.attr('data-player', player);
		playerHud.find('.name').text(username);
		hudElement.append(playerHud);
	};

	hud.me = function(playerNum) {
		playerNum = playerNum|0;
		if (playerNum >= 0 && playerNum < 4) {
			hudElement.find('#player-hud-' + playerNum).addClass('me');
		}
		protected.me = playerNum;
	};

	hud.myName = function() {
		return hudElement.find('#player-hud-' + protected.me + ' .name').text();
	};

	hud.refreshPlayers = function(players) {
		hudElement.children().remove();
		protected.players.length = 0;
		for (let i in players) {
			Hud.addPlayer(players[i].player, players[i].username);
		}

		if (protected.me != null) {
			hud.me(protected.me);
		}
	};

	hud.clear = function() {
		hud.refreshPlayers([]);
		protected.me = null;
	};

	return hud;
}();