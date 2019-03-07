var app = require('express')();
var fs = require('fs');
var http = require('http').Server(app);
var io = require('socket.io')(http);

const CLOCK_SPEED = 20;
const TURBO_DURATION = 25;

const SMALL_PAUSE = 1000;
const MEDIUM_PAUSE = 2500;
const BIG_PAUSE = 5000;

const MAX_ROOMS = 10;

const AI_RANDOM_TURBO_PERC = 98;

const speeds = {
	NORMAL: 4,
	FAST: 2,
	VERY_FAST: 2
};
const validSpeeds = 'NORMAL|FAST|VERY_FAST'.split('|');
const validDirections = 'up,down,left,right'.split(',');
const oppositeDirections = {
	up: 'down',
	down: 'up',
	left: 'right',
	right: 'left'
};

const boardSize = {
	min: 0,
	max: 99
};

var randomInt = function(min, max) {
	return Math.random() * (max - min) + min;
};

var randFromArray = function(arr) {
	return arr[Math.floor(Math.random() * arr.length)];
};

var _uuid = 0;
function uuid() {
	_uuid -= 1;
	return 'u' + _uuid;
};

var randomNames = [ 'Vivienne', 'Arwood', 'Thu', 'Galindez', 'Charles', 'Kindred', 'Mercy', 'Forgey', 'Florencio', 'Bowser', 'Karine', 'Orndorff', 'Hermila', 'Chenoweth', 'Erik', 'Stager', 'Nickole', 'Binger', 'Tonya', 'Grossman', 'Lavada', 'Cauley', 'Matilda', 'Kenney', 'Elmo', 'Braham', 'Mabel', 'Arenas', 'Delila', 'Melancon', 'Lincoln', 'Reaux', 'Roman', 'Hix', 'Nicol', 'Harley', 'Marcellus', 'Portalatin', 'Jody', 'Ragon', 'Dwana', 'Mcclurg', 'Domingo', 'Dever', 'Hung', 'Brumsey', 'Trish', 'Janson', 'Wanetta', 'Galle', 'Harvey', 'Maziarz', 'Kelvin', 'Lariviere', 'Willow', 'Batty', 'Crissy', 'Dannenberg', 'Malisa', 'Linson', 'Nichelle', 'Klinge', 'Carleen', 'Vicknair', 'Lulu', 'Bess', 'Elin', 'Wiliams', 'Luther', 'Irick', 'Jordan', 'Rivas', 'Wenona', 'Torian', 'Yuonne', 'Lasky', 'Reagan', 'Doby', 'Anja', 'Faller', 'Ayanna', 'Rondon', 'Latricia', 'Hershberger', 'Lorie', 'Escareno', 'Nakisha', 'Dileo', 'Milagros', 'Jenks', 'Sau', 'Berlanga', 'Robt', 'Oberholtzer', 'Ha', 'Riddell', 'Angela', 'Olinger', 'Gillian', 'Kulas' ];
function randomName() {
	return randFromArray(randomNames);
}

function getXY(coords, direction) {
	let xy = coords.split('-').map(function(el) {
		return el|0;
	});

	return {
		x: xy[0],
		y: xy[1]
	};
};

async function sleep(ms) {
	return new Promise(function(r) {
		return setTimeout(r, ms);
	});
};

var AI = {

	manhattan: function(coords1, coords2) {
		return Math.abs(coords1.x - coords2.x) + Math.abs(coords1.y - coords2.y);
	},
	nearestPlayer: function(currPlayer, currCoords, players) {
		let nearest = [];
		for (let i in players) {
			let otherPlayer = players[i];
			if (otherPlayer.playerNum() == currPlayer.playerNum()) {
				continue;
			}
			if (!otherPlayer.alive() || otherPlayer.head() == null) {
				continue;
			}
			nearest.push({
				player: otherPlayer,
				distance: AI.manhattan(currCoords, getXY(otherPlayer.head()))
			});
		}

		nearest = nearest.sort(function(a, b) {
			return a.distance - b.distance
		});
		nearest = nearest.filter(function(el) {
			return el.distance == nearest[0].distance;
		});

		return randFromArray(nearest);
	},
	neighbours: function(coords, room, exclude) {
		let newCoords = [
			{ x: coords.x + 1, y: coords.y },
			{ x: coords.x - 1, y: coords.y },
			{ x: coords.x, y: coords.y + 1 },
			{ x: coords.x, y: coords.y - 1 }
		];

		let realNewCoords = [];

		for (let i in newCoords) {
			if (exclude.indexOf(newCoords[i].x + '-' + newCoords[i].y) >= 0
					|| newCoords[i].y < 0
					|| newCoords[i].x < 0
					|| newCoords[i].y > boardSize.max
					|| newCoords[i].x > boardSize.max
					|| !room.cellIsEmpty(newCoords[i])) {
				continue;
			}
			realNewCoords.push(newCoords[i]);
		}
		return realNewCoords;
	},
	candidateCellCoords: function(currPlayer, room) {
		let cellsPoints = [
			{ dir: 'up', val: 0, coords: null },
			{ dir: 'down', val: 0, coords: null },
			{ dir: 'left', val: 0, coords: null },
			{ dir: 'right', val: 0, coords: null }
		];
		for (let j = 0; j < cellsPoints.length; ++j) {
			let cellCoords = getXY(currPlayer.head());
			let dir = cellsPoints[j].dir;
			switch (dir) {
				case 'up':
					cellCoords.y -= 1;
					break;
				case 'down':
					cellCoords.y += 1;
					break;
				case 'left':
					cellCoords.x -= 1;
					break;
				case 'right':
					cellCoords.x += 1;
					break;
			}
			cellsPoints[j].coords = cellCoords;
			if (cellCoords.y < 0 || cellCoords.x < 0 || cellCoords.y > boardSize.max || cellCoords.x > boardSize.max || !room.cellIsEmpty(cellCoords)) {
				cellsPoints[j].val = -1;
			}
		}
		return cellsPoints;
	},
	floodfill: function(coords, room, maxDepth) {
		let score = 0;
		let depth = 0;
		let listOfCoords = [ coords ];
		let exclude = [];
		while (depth < maxDepth) {
			let newListOfCoords = [];
			for (let i in listOfCoords) {
				let currCoords = listOfCoords[i];
				exclude.push(currCoords.x + '-' + currCoords.y);
				let n = AI.neighbours(currCoords, room, exclude);
				newListOfCoords = newListOfCoords.concat(n);
				score += n.length;
			}
			depth += 1;
		}

		return score;
	},

	_behavioursNames: [
		'hunter',
		'floodfill',
		// 'runner',
		// 'random'
	],
	_floodfillDepth: 30,

	_behaviours: {
		hunter: function(currPlayer, room) {
			let currCoords = getXY(currPlayer.head());
			let cellsPoints = AI.candidateCellCoords(currPlayer, room);
			let players = room.getPlayers();

			let nearest = AI.nearestPlayer(currPlayer, currCoords, players);

			for (let i in cellsPoints) {
				if (cellsPoints[i].val == -1) {
					continue;
				}

				cellsPoints[i].val = AI.manhattan(
					cellsPoints[i].coords,
					getXY(nearest.player.head())
				);
			}

			let candidates = cellsPoints.filter(function(el) {
				return el.val > 0;
			});
			candidates = candidates.sort(function(a, b) {
				return a.val - b.val;
			});
			candidates = candidates.filter(function(el) {
				return el.val == candidates[0].val;
			});
			if (candidates.length > 0) {
				let newDir = randFromArray(candidates).dir;

				currPlayer.setDirection(currPlayer.setDirection(newDir));
			}
		},
		runner: function(currPlayer, room) {
			let currCoords = getXY(currPlayer.head());
			let cellsPoints = AI.candidateCellCoords(currPlayer, room);
			let players = room.getPlayers();

			let nearest = AI.nearestPlayer(currPlayer, currCoords, players);

			for (let i in cellsPoints) {
				if (cellsPoints[i].val == -1) {
					continue;
				}

				cellsPoints[i].val = AI.manhattan(
					cellsPoints[i].coords,
					getXY(nearest.player.head())
				);
			}

			let candidates = cellsPoints.filter(function(el) {
				return el.val >= 0;
			});
			candidates = candidates.sort(function(a, b) {
				return a.val - b.val;
			});
			candidates = candidates.reverse();
			candidates = candidates.filter(function(el) {
				return el.val == candidates[0].val;
			});

			if (candidates.length > 0) {
				let newDir = randFromArray(candidates).dir;

				currPlayer.setDirection(currPlayer.setDirection(newDir));
			}
		},
		random: function(currPlayer, room) {
			let cellsPoints = AI.candidateCellCoords(currPlayer, room);

			let candidates = cellsPoints.filter(function(el) {
				return el.val >= 0;
			});

			if (candidates.length > 0) {
				let newDir = randFromArray(candidates).dir;

				currPlayer.setDirection(currPlayer.setDirection(newDir));
			}
		},
		floodfill: function(currPlayer, room) {
			let cellsPoints = AI.candidateCellCoords(currPlayer, room);

			let candidates = cellsPoints.filter(function(el) {
				return el.val >= 0;
			});

			for (let i in candidates) {
				let candidate = candidates[i];
				candidate.val = AI.floodfill(candidate.coords, room, AI._floodfillDepth);
			}

			candidates = candidates.sort(function(a, b) {
				return a.val - b.val;
			});

			// candidates = candidates.reverse();
			candidates = candidates.filter(function(el) {
				return el.val == candidates[0].val;
			});

			if (candidates.length > 0) {
				let newDir = randFromArray(candidates).dir;

				currPlayer.setDirection(currPlayer.setDirection(newDir));
			}
		}
	}

};

var PlayersRef = {};

var PlayerModel = function(playerNum, username, socket, admin, ai) {
	let head = null;
	ai = ai || false;
	if (playerNum == 0) {
		head = boardSize.min + '-' + boardSize.min;
		direction = 'right';
	} else if (playerNum == 1) {
		head = boardSize.max + '-' + boardSize.max;
		direction = 'left';
	} else if (playerNum == 2) {
		head = boardSize.min + '-' + boardSize.max;
		direction = 'up';
	// } else if (playerNum == 3) {
	} else {
		head = boardSize.max + '-' + boardSize.min;
		direction = 'down';
	}

	let behaviour = null;
	if (ai) {
		behaviour = randFromArray(AI._behavioursNames);
	}

	let protected = {
		_playerNum: playerNum,
		_username: username,
		_admin: admin,
		_socket: socket,
		_alive: false,
		_wins: 0,
		_turbos: 3,
		_turboClock: 0,
		_head: head,
		_resetHead: head,
		_lastHead: head,
		_direction: direction,
		_resetDirection: direction,
		_room: null,
		_speed: 'NORMAL',
		_tail: [],
		_oldTail: [],
		_ai: ai,
		_behaviour: behaviour // only for AI
	};

	let _player = {};

	Object.keys(protected).forEach(function(getter) {
		_player[getter.replace('_', '')] = function() {
			return protected[getter];
		};
	});

	_player.nextCoords = function(coords, direction) {
		let { x, y } = getXY(coords);

		y += (direction === 'down')
			? 1
			: (direction === 'up')
				? -1
				: 0;
		x += (direction === 'right')
			? 1
			: (direction === 'left')
				? -1
				: 0;

		return x + '-' + y;
	};

	_player.getSpeed = function() {
		return speeds[_player.speed()];
	};

	_player.setSpeed = function(speed, force) {
		force = force || false;
		if (validSpeeds.indexOf(speed) >= 0) {
			protected._speed = speed;
		}
	};

	_player.setDirection = function(direction) {
		if (validDirections.indexOf(direction) >= 0 && oppositeDirections[protected._direction] !== direction) {
			protected._direction = direction;
		}
	};

	_player.turbo = function() {
		if (!_player.alive() || _player.turbos() <= 0 || _player.turboClock() > 0) {
			return;
		}
		protected._turbos -= 1;
		protected._turboClock = TURBO_DURATION;
		_player.setSpeed('FAST');
	};

	_player.isUsingTurbo = function() {
		return protected._turboClock > 0;
	};

	// a player is exploding while he is not alive and its head it's still not
	// null; it means that its tail is retreating
	_player.isExploding = function() {
		return !_player.alive() && _player.head() != null;
	};

	_player.die = function() {
		if (!protected._alive) {
			return;
		}
		console.log('[-] ... ' + _player.playerNum() + ' ' + _player.username() + ' dieded ... ');
		protected._alive = false;
		_player.setSpeed('VERY_FAST');
	};

	_player.check = function(players) {
		let head = _player.head();
		if (head == null) {
			return false;
		}
		let { x, y } = getXY(head);

		let outOfBoundaries = (x < boardSize.min)
			|| (x > boardSize.max)
			|| (y < boardSize.min)
			|| (y > boardSize.max);
		
		if (outOfBoundaries) {
			_player.die();
			return false;
		}

		for (let i in players) {
			let otherPlayer = players[i];

			if (otherPlayer.playerNum() !== _player.playerNum() && _player.head() == otherPlayer.head()) {
				_player.die();
				return false;
			}

			let tail = otherPlayer.tail();
			for (let j in tail) {
				if (_player.head() == tail[j]) {
					_player.die();
					return false;
				}
			}
		}

		return true;
	};

	_player.think = function(room) {
		AI._behaviours[_player.behaviour()](_player, room);
	};

	_player.update = function(clock, room) {
		let speed = (!room.hasHumanPlayersAlive())
			? _player.getSpeed()
			: 1;
		let move = clock % speed;
		if (move != 0) {
			return false; // as in 'not moved'
		}

		if (_player.ai() && _player.alive()) {
			_player.think(room);
			// random turbo: {AI_RANDOM_TURBO_PERC}% of not using it
			if (_player.turbos() > 0 && _player.turboClock() <= 0 && randomInt(0, 100) > AI_RANDOM_TURBO_PERC) {
				_player.turbo();
			}
		}

		if (protected._turboClock > 0) {
			protected._turboClock -= 1;
			if (protected._turboClock <= 0) {
				_player.setSpeed('NORMAL');
			}
		}

		if (!_player.alive()) {
			if (_player.tail().length > 0) {
				protected._oldTail.push(protected._tail.pop());
				return true; // as in 'moved' (tail is retreating)
			} else if (_player.head() != null) {
				protected._head = null;
				return true; // as in 'moved' (head has exploded)
			} else {
				return false; // as in 'not moved'
			}
		}

		protected._lastHead = _player.head();
		protected._tail.unshift(_player.lastHead());
		protected._head = _player.nextCoords(_player.head(), _player.direction());

		return true; // as in 'moved' (head is moving)
	};

	_player.init = function() {
		protected._alive = true;
		protected._turbos = 3;
		protected._tail.length = 0;
		protected._speed = 'NORMAL';
		protected._head = protected._resetHead;
		protected._oldTail.length = 0;
		protected._direction = protected._resetDirection;
	};

	_player.win = function() {
		protected._wins += 1;
	};

	_player.setRoom = function(room) {
		protected._room = room;
	};

	return _player;
};

var RoomModel = function(code, username, admin, socket) {
	let _room = {
		_code: code,
		_players: [],
		_round: 0,
		_gameStarted: false,
		_gameEnded: false,
		_lastActivity: null,
	};

	let adminPlayer = new PlayerModel(
		_room._players.length,
		username,
		socket,
		true
	);

	_room._players.push(adminPlayer);

	let r = {};

	socket.join(_room._code, function() {
		console.log('>> id: ', socket.id);
		io.to(socket.id).emit(
			'room-created',
			{
				code: _room._code,
				player: adminPlayer.playerNum(),
				username: adminPlayer.username(),
				msg: 'Room created; waiting...'
			}
		);
	});

	adminPlayer.setRoom(r);

	r.boardStatus = function() {
		let board = {};

		for (let i in _room._players) {
			let player = _room._players[i];

			let head = player.head();
			let isAlive = player.alive();
			let playerNum = player.playerNum();
			let direction = player.direction();

			if (head == null) {
				board[player.lastHead()] = {
					head: true,
					exploding: false,
					alive: isAlive,
					playerNum: playerNum
				};
				continue;
			}

			let tail = player.tail();
			let oldTail = player.oldTail();

			board[head] = {
				head: true,
				exploding: player.isExploding(),
				alive: isAlive,
				usingTurbo: player.isUsingTurbo(),
				playerNum: playerNum
			};

			board[tail[0]] = {
				head: false,
				alive: isAlive,
				playerNum: playerNum
			};

			board[oldTail[oldTail.length - 1]] = {
				clean: true
			};
		}

		return board;
	};

	r.playersStatus = function() {
		let players = [];

		for (let i in _room._players) {
			let player = _room._players[i];
			players.push({
				alive: player.alive(),
				exploding: player.isExploding(),
				playerNum: player.playerNum(),
				turbos: player.turbos(),
				wins: player.wins(),
				usingTurbo: player.isUsingTurbo()
			});
		}

		return players;
	};

	r.checkUsername = function(username) {
		for (let i in _room._players) {
			if (_room._players[i].username() == username) {
				return false;
			}
		}
		return true;
	};

	r.join = function(username, socket, ai) {
		if (r.getPlayers().length >= 4) {
			io.to(socket.id).emit('room-msg', { msg: 'Max number of players reached in `' + _room._code + '`' });
			return;
		}

		if (!r.checkUsername(username) && !ai) {
			io.to(socket.id).emit('room-msg', { msg: 'Username already in use in room `' + _room._code + '`' });
			return;
		}

		let player = new PlayerModel(
			_room._players.length,
			username,
			socket,
			false,
			ai
		);

		player.setRoom(r);

		PlayersRef[socket.id] = {
			player: player,
			room: r
		};

		_room._players.push(player);
		socket.join(_room._code, function() {
			console.log('>> id|code: ', socket.id, _room._code);
			io.to(_room._code).emit(
				'room-joined',
				{
					code: _room._code,
					players: _room._players.map(function(playerLoop) {
						return {
							player: playerLoop.playerNum(),
							username: playerLoop.username()
						};
					}),
					player: player.playerNum(),
					username: player.username(),
					msg: player.username() + ' joined the room!'
				}
			);
		});
	};

	r.removePlayer = function(id) {
		for (let i = 0; i < _room._players.length; ++i) {
			if (_room._players[i].socket().id == id) {
				_room._players.splice(i, 1);
				return;
			}
		}
	};

	r.getPlayers = function() {
		return _room._players;
	};

	r.hasHumanPlayersAlive = function() {
		let players = r.getPlayers();
		for (let i in players) {
			if (!players[i].ai() && !players[i].alive()) {
				return true;
			}
		}
		return false;
	};

	r.hasHumanPlayers = function() {
		let players = r.getPlayers();
		for (let i in players) {
			if (!players[i].ai()) {
				return true;
			}
		}
		return false;
	};

	r.getPlayer = function(id) {
		for (let i in _room._players) {
			if (_room._players[i].socket().id == id) {
				return _room._players[i];
			}
		}
		return null;
	};

	r.isEmpty = function() {
		return _room._players.length == 0;
	};

	r.exit = function(socket) {
		let player = r.getPlayer(socket.id);
		if (_room._gameStarted && !_room._gameEnded) {
			if (player != null) {
				player.die();
			}
		}
		if (player != null) {
			r.removePlayer(socket.id);
			socket.leave(_room._code, function() {
				io.to(_room._code).emit(
					'room-exit',
					{
						players: _room._players.map(function(playerLoop) {
							return {
								player: playerLoop.playerNum(),
								username: playerLoop.username()
							};
						}),
						player: player.playerNum(),
						username: player.username(),
						msg: player.username() + ' exited the room...'
					}
				);
			});
		}
		Rooms.cleanUp();
	};

	r.cellIsEmpty = function(coords) {
		let strCoords = coords.x + '-' + coords.y;
		for (let i in _room._players) {
			let player = _room._players[i];

			let head = player.head();
			if (head == null) {
				head = player.lastHead();
				if (head == null) {
					head = {
						x: -1,
						y: -1
					};
				}
			}

			if (strCoords == head.x) {
				return false;
			}

			let tail = player.tail();

			for (let j in tail) {
				if (strCoords == tail[j]) {
					return false;
				}
			}
		}
		return true;
	};

	r.hasPlayer = function(username) {
		for (let i in _room.players) {
			if (_room.players[i].username() == username) {
				return true;
			}
		}
		return false;
	};

	r.hasStarted = function() {
		return _room._gameStarted;
	};

	r.globalWinner = function() {
		for (let i in _room._players) {
			if (_room._players[i].wins() >= 3) {
				return _room._players[i];
			}
		}
		return null;
	};

	r.endGame = async function() {
		// check for winner
		let winner = null;
		for (let i in _room._players) {
			if (_room._players[i].alive()) {
				winner = _room._players[i];
			}
		}

		let resp = {
			boardStatus: r.boardStatus(),
			playersStatus: r.playersStatus()
		};

		if (winner != null) {
			winner.win();
			resp.winner = winner.username();
		}

		io.to(_room._code).emit(
			'game-end',
			resp
		);

		await sleep(MEDIUM_PAUSE);

		let globalWinner = r.globalWinner();

		if (globalWinner == null) {
			r.startGame();
		} else {
			io.to(_room._code).emit(
				'whole-game-end',
				{
					boardStatus: r.boardStatus(),
					playersStatus: r.playersStatus(),
					globalWinner: globalWinner.username()
				}
			);
		}
	};

	r.gameLoop = function(clock) {
		setTimeout(function() {
			// update positions
			for (let i in _room._players) {
				_room._players[i].update(clock, r);
			}

			// check for dead players
			for (let i in _room._players) {
				_room._players[i].check(_room._players);
			}

			// check for game end
			let alives = 0;
			for (let i in _room._players) {
				alives += (_room._players[i].alive() ? 1 : 0);
			}

			if (alives <= 1) {
				_room._gameEnded = true;
			}

			io.to(_room._code).emit(
				'game-update',
				{
					boardStatus: r.boardStatus(),
					playersStatus: r.playersStatus(),
					clock: clock
				}
			);

			// next iteration, pal
			if (!_room._gameEnded) {
				r.gameLoop(clock + 1);
			} else {
				r.endGame();
			}
		}, CLOCK_SPEED);
	};

	r.forceQuit = function() {
		_room._gameEnded = true;
	};

	r.startGame = async function() {
		_room._gameStarted = false;
		_room._gameEnded = false;
		_room._round += 1;

		for (let i in _room._players) {
			_room._players[i].init();
		}

		// let's start
		io.to(_room._code).emit('game-begin', { board: r.boardStatus() });

		await sleep(MEDIUM_PAUSE);

		// Round #
		io.to(_room._code).emit('game-init', { msg: 'Round ' + _room._round });

		await sleep(SMALL_PAUSE);

		// on your marks...
		// io.to(_room._code).emit('game-init', { msg: 'On your marks...' });

		// await sleep(SMALL_PAUSE);

		// 3...
		io.to(_room._code).emit('game-init', { msg: '3...' });

		await sleep(SMALL_PAUSE);

		// 2...
		io.to(_room._code).emit('game-init', { msg: '2...' });

		await sleep(SMALL_PAUSE);

		// 1...
		io.to(_room._code).emit('game-init', { msg: '1...' });

		await sleep(SMALL_PAUSE);

		// GO!
		io.to(_room._code).emit('game-init', { msg: 'GO!', fadeAway: true });

		_room._gameStarted = true;

		// game loop
		r.gameLoop(1);
	};

	PlayersRef[socket.id] = {
		player: adminPlayer,
		room: r
	};

	return r;
};

var Rooms = function() {

	let _registry = {};

	let r = {};

	r.hasRoom = function(code) {
		return (typeof _registry[code] != 'undefined');
	};

	r.getRoom = function(code) {
		if (!r.hasRoom(code)) {
			return null;
		}

		return _registry[code];
	};

	r.cleanUp = function() {
		for (let i in _registry) {
			if (_registry[i].isEmpty() || !_registry[i].hasHumanPlayers()) {
				_registry[i].forceQuit();
				delete _registry[i];
			}
		}
	};

	r.create = function(code, username, socket) {
		r.cleanUp();

		if (Object.keys(_registry).length >= MAX_ROOMS) {
			io.to(socket.id).emit('room-msg', { msg: 'Too many rooms; wait a little...' });
			return;
		}

		if (r.hasRoom(code)) {
			socket.join(code, function() {
				io.to(socket.id).emit('room-msg', { msg: 'Room already exists; try another name' });
			});
			return;
		}

		_registry[code] = new RoomModel(code, username, true, socket);
	};

	r.join = function(code, username, socket) {
		r.cleanUp();
		let room = r.getRoom(code);

		let ai = false;

		if (socket == null) {
			// if socket is null, this player is AI controlled;
			// we implement it through a fake socket object that does nothing
			socket = {
				id: uuid(),
				join: function(doNothing, callback) {
					callback();
				},
				leave: function(doNothing, callback) {
					callback();
				}
			};
			username = randomName();
			while (room.hasPlayer(username)) {
				username = randomName();
			}
			ai = true;
		}

		if (room == null) {
			socket.join(code, function() {
				io.to(socket.id).emit('room-msg', { msg: 'Room `' + code + '` does not exist; click `Create` if you want to create a new one' });
			});
			return;
		}

		if (room.hasStarted()) {
			socket.join(code, function() {
				io.to(socket.id).emit('room-msg', { msg: 'Room `' + code + '` has already started playing; select or create a new room' });
			});
			return;
		}

		if (room.hasPlayer(username)) {
			socket.join(code, function() {
				io.to(socket.id).emit('room-msg', { msg: 'Room `' + code + '` already has a player named `' + username + '`; choose another name' });
			});
			return;
		}

		room.join(username, socket, ai);
	};

	r.startGame = function(code) {
		let room = r.getRoom(code);

		if (room.hasStarted()) {
			return;
		}

		room.startGame();
	};

	r.list = function() {
		let roomsList = [];
		for (let i in _registry) {
			let players = _registry[i].getPlayers().map(function(p) {
				let ai = '<span title="' + (p.ai() ? 'AI' : 'Goat Player') + '">'
					+ (p.ai() ? '🤖' : '🐐')
					+ '</span>';
				let alive = '<span title="' + (!_registry[i]._gameStarted ? 'Waiting...' : (p.alive() ? 'Alive' : 'Dead')) + '">'
					+ (!_registry[i]._gameStarted ? '⏳' : (p.alive() ? '❤️' : '💔'))
					+ '</span>';
				let wins = '<span title="Wins: ' + p.wins() + '">'
					+ '✅' + p.wins()
					+ '</span>';
				let turbos = '<span title="Turbos: ' + p.turbos() + '">'
					+ '🔥' + p.turbos()
					+ '</span>';

				return ai
					+ '&nbsp;|&nbsp;&nbsp;'
					+ alive
					+ '&nbsp;|&nbsp;'
					+ wins
					+ '&nbsp;|&nbsp;'
					+ turbos
					+ '&nbsp;|&nbsp;'
					+ '<span style="' + (p.ai() ? 'color:grey;' : '') + '">'
					+ p.username()
					+ '</span>';
			});
			
			roomsList.push({
				name: i,
				players: players.join('<br/>'),
				notes: ''
			});
		}
		return roomsList;
	};

	return r;
}();

app.get('/assets/*', function(req, res) {
  res.sendFile(req.path.replace('/', ''), { root: __dirname });
});

app.get('/css/*', function(req, res) {
  res.sendFile(req.path.replace('/', ''), { root: __dirname });
});

app.get('/js/*', function(req, res) {
  res.sendFile(req.path.replace('/', ''), { root: __dirname });
});

app.get('/monitor', function(req, res) {
	res.sendFile('monitor.html', { root: __dirname });
});

app.get('/monitoring', function(req, res) {
	res.json({
		rooms: Rooms.list()
	});
});

app.get('/', function(req, res) {
  res.sendFile('index.html', { root: __dirname });
});

http.listen(4567, function() {
  console.log('listening on *:4567');
});

let exitRoom = function(socket) {
	if (typeof PlayersRef[socket.id] != 'undefined') {
  	if (PlayersRef[socket.id].room !== null) {
  		PlayersRef[socket.id].room.exit(socket);
  	}
	}
};

// socket.io
io.on('connection', function(socket) {
  console.log('a user connected');

  socket.on('disconnect', function() {
  	exitRoom(socket);
    console.log('user disconnected');
  });

	socket.on('create-room', function(data) {
  	console.log('create-room: ', data);
  	Rooms.create(data.code.toUpperCase(), data.username.toUpperCase(), socket);
  });

  socket.on('join-room', function(data) {
  	console.log('join-room: ', data);
  	Rooms.join(data.code.toUpperCase(), data.username.toUpperCase(), socket);
  });

  socket.on('exit-room', function(data) {
  	console.log('exit-room: ', data);
  	exitRoom(socket);
  });

  socket.on('add-ai', function(data) {
  	console.log('add-ai: ', data);
  	Rooms.join(data.code.toUpperCase(), null, null);
  });

  socket.on('start-game', function(data) {
  	console.log('start-game: ', data);
  	Rooms.startGame(data.code.toUpperCase());
  });

  validDirections.forEach(function(el) {
  	socket.on('game-' + el, function(data) {
		console.log('game-' + el, data);
  		let playerRef = PlayersRef[socket.id];
  		if (!playerRef.room) {
  			return;
  		}
  		if (!playerRef.room.hasStarted()) {
				return;
  		}
  		playerRef.player.setDirection(el);
  	});
	});

  socket.on('game-spacebar', function(data) {
		console.log('game-spacebar', data);
		let playerRef = PlayersRef[socket.id];
		playerRef.player.turbo();
	});
});