/**
 * Stopwatch functionality using CreateJS and modern JavaScript.
 * Provides timer controls for the simulation.
 * 
 * This module handles:
 * - Timer display and controls
 * - Start/pause/reset functionality
 * - Time calculations and formatting
 * - Integration with CreateJS stage
 * 
 * Usage:
 *   createStopwatch(stage, x, y, interval);
 *   startWatch(stage);
 *   pauseWatch();
 *   resetWatch();
 * 
 * Requires CreateJS to be loaded globally.
 */

/**
 * Stopwatch class for managing timer functionality.
 * Handles all timer operations including display, controls, and time calculations.
 */
class Stopwatch {
	constructor() {
		// Configuration and state variables
		this.rate = 1; // Rate change depends upon the value from the experiment
		this.clockContainer = null;
		this.now = 0;
		this.startAt = 0;
		this.lapTime = 0; // Time on the clock when last stopped in milliseconds
		this.stopWatchTimer = null;
		this.pauseFlag = true;
		this.hour = 0;
		this.minute = 0;
		this.second = 0;
		this.millisecond = 0;
		this.milli = 0;
		this.totalTime = 0;
		this.timeArray = [];
		this.listenerPlay = null;
		this.listenerPause = null;
	}

	/**
	 * Creates a stopwatch component on the CreateJS stage.
	 * @param {createjs.Stage} stage - The CreateJS stage to add the stopwatch to
	 * @param {number} x - X position of the stopwatch
	 * @param {number} y - Y position of the stopwatch  
	 * @param {number} interval - Update interval in milliseconds (0.1 to 1.0)
	 */
	create(stage, x, y, interval) {
		// Rate configuration - clock interval runs between 1 ms and 0.1ms
		this.rate = interval <= 0 ? 0.1 : (interval > 1 ? 1 : interval);
		
		// Create container
		this.clockContainer = new createjs.Container();
		this.clockContainer.name = "container";
		stage.addChild(this.clockContainer);
		
		// Load stopwatch images
		this.loadStopwatchImage("bg", "./template/assets/images/stopwatch.svg", x, y);
		this.loadStopwatchImage("play", "./template/assets/images/play.svg", x + 100, y + 95);
		this.loadStopwatchImage("pause", "./template/assets/images/stop.svg", x + 100, y + 95);
		this.loadStopwatchImage("reset", "./template/assets/images/reset.svg", x + 140, y + 95);
		
		this.getName("pause").visible = false;
		
		// Create text elements for time display
		this.setText("stopWatchHr", x + 66, y + 73);
		this.setText("stopWatchMin", x + 100, y + 73);
		this.setText("stopWatchSec", x + 135, y + 73);
		this.setText("stopWatchmilli", x + 170, y + 73);
		
		this.initializeText("00", "00", "00", "000", stage);
		
		// Set up event listeners
		this.listenerPlay = this.clockContainer.getChildByName("play").on("click", () => this.startWatch(stage));
		this.listenerPause = this.clockContainer.getChildByName("pause").on("click", () => this.pauseWatch());
		this.clockContainer.getChildByName("reset").on("click", () => this.resetWatch());
		
		stage.update();
	}

	/**
	 * Loads stopwatch images and adds them to the container.
	 * @param {string} name - Image name/identifier
	 * @param {string} src - Image source path
	 * @param {number} xPos - X position
	 * @param {number} yPos - Y position
	 */
	loadStopwatchImage(name, src, xPos, yPos) {
		const image = new Image();
		image.src = src;
		const bitmap = new createjs.Bitmap(image).set({});
		bitmap.x = xPos;
		bitmap.y = yPos;
		bitmap.name = name;
		if (name === "play" || name === "pause" || name === "reset") {
			bitmap.cursor = "pointer";
		}
		this.clockContainer.addChild(bitmap);
	}

	/**
	 * Creates text elements for the stopwatch display.
	 * @param {string} name - Text element name
	 * @param {number} textX - X position
	 * @param {number} textY - Y position
	 */
	setText(name, textX, textY) {
		const text = new createjs.Text();
		text.x = textX;
		text.y = textY;
		text.textBaseline = "alphabetic";
		text.name = name;
		text.font = "1.8em digiface";
		text.color = "#000000";
		this.clockContainer.addChild(text);
	}

	/**
	 * Returns a child element of the clock container by name.
	 * @param {string} childName - Child element name
	 * @returns {createjs.DisplayObject} The child element or null if not found
	 */
	getName(childName) {
		return this.clockContainer.getChildByName(childName);
	}

	/**
	 * Initializes the stopwatch text display with formatted time values.
	 * @param {string} hr - Hours display (00-99)
	 * @param {string} min - Minutes display (00-59)
	 * @param {string} sec - Seconds display (00-59)
	 * @param {string} milli - Milliseconds display (000-999)
	 * @param {createjs.Stage} stage - The CreateJS stage
	 */
	initializeText(hr, min, sec, milli, stage) {
		this.clockContainer.getChildByName("stopWatchmilli").text = milli;
		this.clockContainer.getChildByName("stopWatchSec").text = sec;
		this.clockContainer.getChildByName("stopWatchMin").text = min;
		this.clockContainer.getChildByName("stopWatchHr").text = hr;
		stage.update();
	}

	/**
	 * Pads a number with leading zeros to specified length.
	 * @param {number} num - Number to pad
	 * @param {number} size - Target length
	 * @returns {string} Padded number string
	 */
	pad(num, size) {
		const s = "0000" + num;
		return s.substring(s.length - size);
	}

	/**
	 * Shows the stopwatch and starts timing.
	 * Updates the display and begins the timer interval.
	 * @param {createjs.Stage} stage - The CreateJS stage
	 */
	showWatch(stage) {
		// Initialize the time
		this.getName("play").visible = false;
		this.getName("pause").visible = true;
		this.now = Date.now();
		this.startAt = this.startAt ? this.startAt : this.now;
		this.startStopWatch(stage); // Start the watch
	}

	/**
	 * Updates the stopwatch display with current time.
	 * Calculates elapsed time and formats it for display.
	 * @param {createjs.Stage} stage - The CreateJS stage
	 */
	startStopWatch(stage) {
		// Calculate duration
		this.milli = (this.lapTime + (this.startAt ? (this.now - this.startAt) / this.rate : 0));
		const milliDisp = this.lapTime + (this.startAt ? (this.now - this.startAt) : 0);
		let h = 0, m = 0, s = 0, ms = 0;
		
		// Finding hour, min, sec from the millisecond
		h = Math.floor(this.milli / (60 * 60 * (1000)));
		this.milli = this.milli % (60 * 60 * (1000));
		m = Math.floor(this.milli / (60 * (1000)));
		this.milli = this.milli % (60 * (1000));
		s = Math.floor(this.milli / (1000));
		ms = this.milli % (1000);

		this.second = this.pad(s, 2);
		this.minute = this.pad(m, 2);
		this.hour = this.pad(h, 2);

		this.millisecond = this.pad(milliDisp, 3);
		this.timeArray.push(this.totalTime);
		this.totalTime = (Number(this.hour) * 60 * 60) + (Number(this.minute) * 60) + (Number(this.second));
		this.initializeText(this.hour, this.minute, this.second, this.millisecond, stage);
	}

	/**
	 * Starts the stopwatch timer.
	 * Only starts if currently paused to prevent multiple intervals.
	 * @param {createjs.Stage} stage - The CreateJS stage
	 */
	startWatch(stage) {
		if (this.pauseFlag) {
			this.pauseFlag = false;
			this.stopWatchTimer = setInterval(() => this.showWatch(stage), this.rate);
			stage.update();
		}
	}

	/**
	 * Pauses or stops the stopwatch.
	 * Updates elapsed time and stops the timer interval.
	 */
	pauseWatch() {
		this.getName("play").visible = true;
		this.getName("pause").visible = false;
		// If running, update elapsed time otherwise keep it
		this.lapTime = this.startAt ? this.lapTime + (this.now - this.startAt) / this.rate : this.lapTime;
		this.startAt = 0; // Paused
		clearInterval(this.stopWatchTimer);
		this.pauseFlag = true;
		// Note: stage.update() would need stage reference - handled by caller
	}

	/**
	 * Resets the stopwatch to initial state.
	 * Clears all time values and pauses the timer.
	 */
	resetWatch() {
		this.pauseWatch();
		this.lapTime = 0;
		// Visually reset the display to 00:00:00:000
		if (this.clockContainer && this.clockContainer.getStage) {
			const stage = this.clockContainer.getStage();
			this.initializeText("00", "00", "00", "000", stage);
		}
	}

	/**
	 * Removes clock from the stage.
	 * @param {createjs.Stage} stage - The CreateJS stage
	 */
	removeClock(stage) {
		stage.removeChild(this.clockContainer);
	}

	/**
	 * Adds clock to the stage.
	 * @param {createjs.Stage} stage - The CreateJS stage
	 */
	showClock(stage) {
		stage.addChild(this.clockContainer);
	}
}

// Create global instance for backward compatibility
const stopwatch = new Stopwatch();

// Expose only the methods that are actually used by other files
window.createStopwatch = (stage, x, y, interval) => stopwatch.create(stage, x, y, interval);
window.startWatch = (stage) => stopwatch.startWatch(stage);
window.pauseWatch = () => stopwatch.pauseWatch();
window.resetWatch = () => stopwatch.resetWatch();

// Expose container and listeners for backward compatibility
Object.defineProperty(window, 'clockContainer', {
    get: () => stopwatch.clockContainer,
    set: (value) => { stopwatch.clockContainer = value; }
});

Object.defineProperty(window, 'listener_play', {
    get: () => stopwatch.listenerPlay,
    set: (value) => { stopwatch.listenerPlay = value; }
});

Object.defineProperty(window, 'listener_pause', {
    get: () => stopwatch.listenerPause,
    set: (value) => { stopwatch.listenerPause = value; }
});
