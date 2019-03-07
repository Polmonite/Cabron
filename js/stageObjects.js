jQuery(function() {
	window.socket = io();

	// general elements
	window.body = jQuery('body');
	window.wrapper = jQuery('#wrapper');
	window.hudElement = jQuery('#hud');

	window.gameTitle = jQuery('#game-title');

	window.templates = jQuery('#templates');
	window.playerHudTemplate = templates.find('#player-hud-template');

	window.muteBtn = jQuery('#mute-btn');

	// scenes
	window.scenes = jQuery('#welcome,#waiting,#game');
	window.welcomeSceneContainer = jQuery('#welcome');
	window.waitingSceneContainer = jQuery('#waiting');
	window.gameSceneContainer = jQuery('#game');

	// form elements
	window.roomForm = jQuery('#room-form');
	window.roomFormFields = window.roomForm.find('#username,#room-code');
	window.roomFormButtons = window.roomForm.find('#join-room,#create-room');
	window.username = jQuery('#username');
	window.roomCode = jQuery('#room-code');
	window.joinRoom = jQuery('#join-room');
	window.createRoom = jQuery('#create-room');
	window.startGame = jQuery('#start-game');
	window.addAi = jQuery('#add-ai');
	window.cancel = jQuery('#cancel');
	window.playAgainForm = jQuery('#play-again-form');
	window.playAgain = playAgainForm.find('#play-again');

	// -- waiting scene elements
	window.waitingMsgsBoard = jQuery('#waiting-messages');
	window.roomName = jQuery('#room-name');

	// -- game scene elements
	window.boardContainer = jQuery('#board');
	window.boardContainerTBody = window.boardContainer.find('tbody');
	window.boardContainerTHead = window.boardContainer.find('thead').children('tr');
	window.boardContainerTFoot = window.boardContainer.find('tfoot').children('tr');

	window.boardMsg = jQuery('#board-msg');

	// create board
	const boardSize = {
		min: 0,
		max: 99
	};

	const colSpan = 10;

	for (let x = boardSize.min; x <= (boardSize.max / colSpan); ++x) {
		window.boardContainerTHead.append('<th id="col-' + x + '" colspan="' + colSpan + '"></th>');
		window.boardContainerTFoot.append('<td id="row-' + x + '" colspan="' + colSpan + '"></td>');
	}

	for (let x = boardSize.min; x <= boardSize.max; ++x) {
		let tr = jQuery('<tr>');
		for (let y = boardSize.min; y <= boardSize.max; ++y) {
			tr.append('<td id="cell-' + y + '-' + x + '" class="cell" data-x="' + x + '" data-y="' + y + '" data-xy="' + y + '-' + x + '"></td>');
		}
		window.boardContainerTBody.append(tr);
	}

	window.boardCells = window.boardContainer.find('.cell');
	window.board = {};
	window.boardCells.each(function(_index, rawCell) {
		let cell = jQuery(rawCell);
		window.board[cell.attr('data-xy')] = cell;
	});

	window.glowCols = {};
	window.boardContainerTHead.children('th').each(function(_index, rawCol) {
		let col = jQuery(rawCol);
		window.glowCols[col.attr('id')] = col;
	});
	window.glowRows = {};
	window.boardContainerTFoot.children('td').each(function(_index, rawRow) {
		let row = jQuery(rawRow);
		window.glowRows[row.attr('id')] = row;
	});
});