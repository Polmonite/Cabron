Controller = function() {
	let controller = {};

	const validEvents = 'up,down,left,right,spacebar'.split(',');

	let protected = {};

	protected.events = {};
	protected.lastPressedEventName = null;
	protected.lastPressed = null;
	protected.pressTime = null;
	protected.quickMove = false;
	protected.quickMoveWait = 200;
	protected.setup = false;

	let isValidEvent = function(eventName) {
		return validEvents.indexOf(eventName) >= 0;
	};

	// add event handler to event
	controller.on = function(eventName, handler) {
		if (!isValidEvent(eventName)) {
			throw("Invalid event " + eventName);
		}

		if (typeof handler !== 'function') {
			throw(eventName + " handler must be a function; " + (typeof handler) + " passed");
		}

		if (typeof protected.events[eventName] === 'undefined') {
			protected.events[eventName] = [];
		}

		protected.events[eventName].push(handler);
	};
	// remove ALL event handlers from event
	controller.off = function(eventName, handler) {
		if (!isValidEvent(eventName)) {
			throw("Invalid event " + eventName);
		}
		protected.events[eventName] = [];
	};
	// trigger event handlers
	controller.trigger = function(eventName, ...args) {
		if (!isValidEvent(eventName)) {
			throw("Invalid event " + eventName);
		}
		if (typeof protected.events[eventName] !== 'undefined') {
			for (let i in protected.events[eventName]) {
				protected.events[eventName][i](args);
			}
		}
	};

	// setup
	controller.setup = function() {
		if (protected.setup) {
			return;
		}
		jQuery(window).on('keydown', function(e) {
			let eventName = '';
			let key = e.keyCode || e.which;
			switch (key) {
				case 32:
					eventName = 'spacebar';
					break;

				case 38:
					eventName = 'up';
					break;

				case 40:
					eventName = 'down';
					break;

				case 39:
					eventName = 'right';
					break;

				case 37:
					eventName = 'left';
					break;
			}

			if (eventName) {
				controller.trigger(eventName);
				protected.lastPressedEventName = eventName;
				protected.lastPressed = key;
				protected.pressTime = Date.now();
				protected.quickMove = false;
			}
		});
		jQuery(window).on('keyup', function(e) {
			if ((e.keyCode || e.which) == protected.lastPressed) {
				protected.lastPressedEventName = null;
				protected.lastPressed = null;
				protected.pressTime = null;
			}
		});
		jQuery(window).on('keypress', function(e) {
			if ((e.keyCode || e.which) == protected.lastPressed) {
				if (protected.quickMove && (Date.now() - protected.pressTime) >= protected.quickMoveWait) {
					controller.trigger(protected.lastPressedEventName);
				} else if (!protected.quickMove && (Date.now() - protected.pressTime) >= (protected.quickMoveWait * 4)) {
					controller.trigger(protected.lastPressedEventName);
				}
			}
		});
		protected.setup = true;
	};

	return controller;
}();