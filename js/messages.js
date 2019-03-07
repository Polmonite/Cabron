Messages = function() {
	let msgs = {};

	msgs.hide = function() {
		waitingMsgsBoard.hide();
		return msgs;
	};

	msgs.show = function() {
		waitingMsgsBoard.show();
		return msgs;
	};

	msgs.add = function(msg, player) {
		if (!!player) {
			let playerNum = player.playerNum;
			let username = player.username;
			waitingMsgsBoard.append('<li class="player-msg player-' + playerNum + '">' + username + ': ' + msg + '</li>');
		} else {
			waitingMsgsBoard.append('<li class="player-msg"> -- ' + msg + '</li>');
		}
		return msgs;
	};

	msgs.clear = function() {
		waitingMsgsBoard.children('li').remove();
		return msgs;
	};

	msgs.alert = function(msg, fade) {
		boardMsg.text(msg);
		boardMsg.show();

		if (!!fade) {
			boardMsg.fadeOut(2500);
		}
	};

	return msgs;
}();