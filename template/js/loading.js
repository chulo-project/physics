/**
 * LoadingProgress - createjs-based visual loading indicator.
 * 
 * @param {createjs.Stage} stage - The createjs stage to render the loading progress.
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * 
 * Usage:
 *   const stage = new createjs.Stage("canvasId");
 *   const loader = new createjs.LoadQueue();
 *   const progress = new LoadingProgress(stage, 700, 700);
 *   progress.attachToQueue(loader);
 *   loader.loadManifest([...]);
 */
class LoadingProgress {
	constructor(stage, width, height) {
		this.stage = stage;

		this.progressText = new createjs.Text("", "16px Arial", "#000000");
		this.progressText.textAlign = "center";
		this.progressText.textBaseline = "middle";
		this.progressText.x = width / 2;
		this.progressText.y = height / 2;

		stage.addChild(this.progressText);
		stage.update();
	}

	/**
	 * Binds this progress bar to a createjs.LoadQueue.
	 * @param {createjs.LoadQueue} queue - The load queue to observe
	 */
	attachToQueue(queue) {
		queue.on("progress", () => {
			this.handleProgress(queue);
		});
	}

	/**
	 * Handles updates from the load queue's progress event.
	 * @param {createjs.LoadQueue} queue 
	 */
	handleProgress(queue) {
		if (!this.progressText) return;

		const percent = Math.floor(queue.progress * 100);
		this.progressText.text = percent < 100 ? `${percent} % Loaded` : "";
		this.stage.update();
	}
}

// Expose class to global scope for backward compatibility
window.LoadingProgress = LoadingProgress;
