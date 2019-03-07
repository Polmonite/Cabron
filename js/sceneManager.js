SceneManager = function() {
	let sceneManager = {};

	let protected = {};

	protected.currScene = null;
	protected.init = false;

	sceneManager.init = function() {
		if (protected.init) {
			return;
		}
		welcomeSceneContainer.removeClass('hidden').hide();
		waitingSceneContainer.removeClass('hidden').hide();
		gameSceneContainer.removeClass('hidden').hide();
		protected.init = true;
	};

	sceneManager.setup = function(sceneName) {
		if (sceneName === 'welcome') {
			WelcomeScene.setup();
		} else if (sceneName === 'waiting') {
			WaitingScene.setup();
		} else if (sceneName === 'game') {
			GameScene.setup();
		}
	};

	sceneManager.shutdown = function(sceneName) {
		if (sceneName !== 'welcome') {
			WelcomeScene.shutdown();
		}
		if (sceneName !== 'waiting') {
			WaitingScene.shutdown();
		}
		if (sceneName !== 'game') {
			GameScene.shutdown();
		}
	};

	sceneManager.switchScene = function(sceneName) {
		sceneManager.init();
		sceneManager.shutdown(sceneName);
		sceneManager.setup(sceneName);
		protected.currScene = sceneName;
		console.log(protected.currScene);
	};

	sceneManager.currScene = function() {
		return protected.currScene;
	};

	sceneManager.isScene = function(sceneName) {
		return sceneManager.currScene() === sceneName;
	};

	return sceneManager;
}();