/*
 * View module for the simulation.
 * Handles the initialization and rendering of the experiment UI, including the canvas,
 * controls, and localization. Integrates with CreateJS for drawing and AngularJS for data
 * binding and UI logic.
 *
 * Major responsibilities:
 * - Canvas and stage setup
 * - UI control initialization
 * - Localization and translation
 * - Utility functions for drawing and updating UI
 * 
 * Usage:
 *   - This file is loaded after CreateJS and AngularJS.
 *   - The <canvas id="demoCanvas"> element is required in the HTML.
 *   - The Angular directive "experiment" is used on the canvas element.
 * 
 * Dependencies:
 *   - CreateJS (for stage, containers, bitmaps, etc.)
 *   - AngularJS (for directive and scope)
 *   - Functions like massOfRingsChange must be defined globally (see experiment.js).
 */

// =====================
// Global Variables
// =====================

// Canvas and CreateJS
var stage, exp_canvas, queue, stage_width, stage_height, tick;
var container, weight_container, weight_container_temp;
var thread_anim_object, thread_anim_rect = new createjs.Shape();
var long_string = new createjs.Shape();

// UI State and Labels
var btn_lbls, time_slots, time_slot_indx;
var play_event, reset_flag, final_rotation;

// Physics and Animation
var rotation_speed, speed_correction;
var line, rotation_in, thread_anim_frame, thread_anim_width;
var wound, thread_anim_clr;
var alpha, gravity, mass_of_flywheel, diameter_of_flywheel, mass_of_rings, diameter_of_axle, no_of_wound;
var rolling, INTERVAL, angular_velocity, angular_distance, total_rotation, number_of_rotation, clr_string_intrl;
var line_mask, weight_obj, string_x_pos, iteration, x_decrement, moment_of_inertia_of_flywheel;
var rotation, rotation_decimal, last_rotation_angle, wheel_rotation_speed;

// =====================
// Angular Directive
// =====================

(function () {
    angular
        .module('users')
        .directive("experiment", directiveFunction)
})();

/**
 * Angular directive for experiment canvas and UI.
 * Handles initialization, image preloading, and attaches utility functions to the scope.
 */
function directiveFunction() {
    return {
        restrict: "A",
        link: function (scope, element, attrs) {
            // --- Canvas Sizing and Setup ---
            var experiment = true;
            if (element[0].width > element[0].height) {
                element[0].width = element[0].height;
                element[0].height = element[0].height;
            } else {
                element[0].width = element[0].width;
                element[0].height = element[0].width;
            }
            if (element[0].offsetWidth > element[0].offsetHeight) {
                element[0].offsetWidth = element[0].offsetHeight;
            } else {
                element[0].offsetWidth = element[0].offsetWidth;
                element[0].offsetHeight = element[0].offsetWidth;
            }
            exp_canvas = document.getElementById("demoCanvas");
            exp_canvas.width = element[0].width;
            exp_canvas.height = element[0].height;
            stage = new createjs.Stage("demoCanvas");
            queue = new createjs.LoadQueue(true);
            queue.installPlugin(createjs.Sound);
            var loadingProgress = new LoadingProgress(stage, exp_canvas.width, exp_canvas.height);
            loadingProgress.attachToQueue(queue);
            queue.on("complete", handleComplete, this);
            queue.loadManifest([
                { id: "background", src: "./images/background.png", type: createjs.LoadQueue.IMAGE },
                { id: "texture", src: "./images/texture.png", type: createjs.LoadQueue.IMAGE },
                { id: "light_gradient", src: "./images/light_gradient.png", type: createjs.LoadQueue.IMAGE },
                { id: "scale", src: "./images/scale.svg", type: createjs.LoadQueue.IMAGE },
                { id: "weight_with_hook", src: "./images/weight_with_hook.svg", type: createjs.LoadQueue.IMAGE },
                { id: "weight", src: "./images/weight.svg", type: createjs.LoadQueue.IMAGE },
                { id: "thread_falling_anim", src: "./images/thread_falling_anim.svg", type: createjs.LoadQueue.IMAGE },
                { id: "popup_height", src: "./images/popup_height.svg", type: createjs.LoadQueue.IMAGE }
            ]);
            stage.enableDOMEvents(true);
            stage.enableMouseOver();
            tick = setInterval(updateTimer, 100);
            container = new createjs.Container();
            container.name = "container";
            stage.addChild(container);
            weight_container = new createjs.Container();
            weight_container.name = "weight_container";
            stage.addChild(weight_container);
            weight_container_temp = new createjs.Container();
            weight_container_temp.name = "weights";
            stage.addChild(weight_container_temp);

            // Ensure smooth animation regardless of stopwatch state
            if (window.stageUpdateInterval) clearInterval(window.stageUpdateInterval);
            window.stageUpdateInterval = setInterval(function () { stage.update(); }, 16); // ~60 FPS

            // --- Add Auto Time Pause Button ---
            var buttonBar = document.createElement('div');
            buttonBar.style.display = 'flex';
            buttonBar.style.flexWrap = 'wrap';
            buttonBar.style.gap = '10px';
            buttonBar.style.justifyContent = 'center';
            buttonBar.style.alignItems = 'center';
            buttonBar.style.margin = '10px 0';

            var autoPauseBtn = document.createElement('button');
            autoPauseBtn.id = 'autoTimePauseBtn';
            autoPauseBtn.style.padding = '8px 16px';
            autoPauseBtn.style.fontSize = '1em';
            autoPauseBtn.style.cursor = 'pointer';
            autoPauseBtn.innerText = 'Auto Time Pause: OFF';

            var quickResetBtn = document.createElement('button');
            quickResetBtn.id = 'quickResetBtn';
            quickResetBtn.style.padding = '8px 16px';
            quickResetBtn.style.fontSize = '1em';
            quickResetBtn.style.cursor = 'pointer';
            quickResetBtn.innerText = 'Reset';
            quickResetBtn.style.background = '#f44336';
            quickResetBtn.style.color = '#fff';
            quickResetBtn.style.border = 'none';
            quickResetBtn.style.borderRadius = '4px';
            quickResetBtn.style.transition = 'background 0.2s';
            quickResetBtn.onmouseover = function() { quickResetBtn.style.background = '#d32f2f'; };
            quickResetBtn.onmouseout = function() { quickResetBtn.style.background = '#f44336'; };

            // Helper to update pause button state based on auto time pause and height
            function updatePauseBtnState() {
                var pauseBtn = clockContainer?.getChildByName && clockContainer.getChildByName('pause');
                var heightTxtObj = container?.getChildByName && container.getChildByName('height_txt');
                var heightTxt = heightTxtObj ? heightTxtObj.text : '';
                if (window.autoTimePauseEnabled && heightTxt !== '0.0cm') {
                    if (pauseBtn) {
                        pauseBtn.mouseEnabled = false;
                        pauseBtn.cursor = 'not-allowed';
                    }
                } else {
                    if (pauseBtn) {
                        pauseBtn.mouseEnabled = true;
                        pauseBtn.cursor = 'pointer';
                    }
                }
            }
            window.updatePauseBtnState = updatePauseBtnState;

            // Use a fixed-width span for ON/OFF so text doesn't shift
            function setAutoPauseBtnState() {
                var state = window.autoTimePauseEnabled ? 'ON' : 'OFF';
                autoPauseBtn.innerHTML = 'Auto Time Pause: <span style="display:inline-block;width:2em;text-align:center;">' + state + '</span>';
            }
            setAutoPauseBtnState();

            autoPauseBtn.onclick = function() {
                toggleAutoTimePause();
                setAutoPauseBtnState();
                updatePauseBtnState();
            };
            quickResetBtn.onclick = function() {
                if (window.angular && angular.element) {
                    var ngScope = angular.element(document.body).scope();
                    if (ngScope && window.resetExperimentPreserveSettings) {
                        ngScope.$apply(function() { 
                            window.resetExperimentPreserveSettings(ngScope); 
                        });
                    }
                }
            };
            buttonBar.appendChild(autoPauseBtn);
            buttonBar.appendChild(quickResetBtn);
            // Place below the iframe if present, else after the canvas
            var iframe = document.querySelector('iframe');
            if (iframe && iframe.parentNode) {
                iframe.parentNode.insertBefore(buttonBar, iframe.nextSibling);
            } else {
                var canvasElem = document.getElementById('demoCanvas');
                if (canvasElem && canvasElem.parentNode) {
                    canvasElem.parentNode.insertBefore(buttonBar, canvasElem.nextSibling);
                } else {
                    document.body.appendChild(buttonBar);
                }
            }
            window.toggleAutoTimePause = function() {
                autoTimePauseEnabled = !autoTimePauseEnabled;
                setAutoPauseBtnState();
                updatePauseBtnState();
            };

            /**
             * Handles all image preloading and initial UI setup after resources are loaded.
             */
            function handleComplete() {
                loadImages(queue.getResult("texture"), "texture", 318, 130, "", 0, container, 1);
                loadImages(queue.getResult("texture"), "texture_1", 318, -231, "", 0, container, 1);
                loadImages(queue.getResult("light_gradient"), "light_gradient", 327, 130, "", 0, container, 1);
                drawLine();
                loadImages(queue.getResult("background"), "background", 0, 0, "", 0, container, 1);
                loadImages(queue.getResult("weight_with_hook"), "weight_with_hook", 369, 553, "", 0, weight_container, 1);
                loadImages(queue.getResult("weight"), "weight_4", 370.5, 592, "", 0, weight_container, 1);
                loadImages(queue.getResult("weight"), "weight_6", 370.5, 584, "", 0, weight_container, 1);
                loadImages(queue.getResult("weight"), "weight_8", 370.5, 576, "", 0, weight_container, 1);
                loadImages(queue.getResult("weight"), "weight_10", 370.5, 568, "", 0, weight_container, 1);
                container.addChild(long_string);
                loadImages(queue.getResult("thread_falling_anim"), "thread_falling_anim", 298, 230, "", 0, container, 1);
                loadImages(queue.getResult("weight"), "weights_4", 0, 24, "", 0, weight_container_temp, 1);
                loadImages(queue.getResult("weight"), "weights_6", 0, 16, "", 0, weight_container_temp, 1);
                loadImages(queue.getResult("weight"), "weights_8", 0, 8, "", 0, weight_container_temp, 1);
                loadImages(queue.getResult("weight"), "weights_10", 0, 0, "", 0, weight_container_temp, 1);
                loadImages(queue.getResult("scale"), "scale", 430, 483, "", 0, container, 1);
                loadImages(queue.getResult("popup_height"), "popup_height", 470, 610, "", 0, container, 1);
                setText("hundred", 120, 231, 0, "white", 2, container);
                setText("ten", 142, 231, 0, "white", 2, container);
                setText("one", 164, 231, 0, "white", 2, container);
                setText("period", 186, 231, ".", "white", 2, container);
                setText("decimal_one", 201, 231, 0, "white", 2, container);
                setText("decimal_ten", 223, 231, 0, "white", 2, container);
                setText("height_txt", 485, 629, '02cm', "black", 1.1, container);
                initialisationOfVariables();
                initialisationOfControls(scope);
                thread_anim_rect.graphics.beginStroke("").drawRect(320, 200, 180, 490);
                initialisationOfImages();
                translationLabels();
                createStopwatch(stage, 20, 500, 1);
                stage.update();
                setTimeout(function () { clearInterval(tick) }, 200);
                play_event = clockContainer.getChildByName("play").on("click", function () {
                    releaseHold(scope);
                    scope.$apply();
                });
                clockContainer.getChildByName("reset").on("click", function () {
                    resetWatch();
                    stage.update();
                });
            }

            /**
             * Loads all translation strings and sets up scope labels and arrays for localization.
             */
            function translationLabels() {
                helpArray = [_("Next"), _("Close"), _("help1"), _("help2"), _("help3"), _("help4"), _("help5")];
                scope.heading = _("Moment of Inertia of Flywheel");
                scope.variables = _("Variables");
                scope.result = _("Result");
                scope.copyright = _("copyright");
                scope.choose_enviornment = _("Choose Environment:");
                cm = _(" cm");
                scope.kg = _("kg");
                scope.cm = cm;
                scope.gm = _("gm");
                scope.earth = _("Earth, g=9.8m/s");
                scope.mass_of_fly_wheel_lbl = _("Mass of fly wheel:");
                scope.dia_of_fly_wheel_lbl = _("Diameter of fly wheel:");
                scope.mass_of_rings_lbl = _("Mass of rings:");
                scope.axle_diameter_lbl = _("Diameter of axle:");
                scope.no_of_wound_lbl = _("No. of wound of chord:");
                scope.mInertia_lbl = _("First start experiment..!");
                scope.mInertia_val = "";
                btn_lbls = [_("Release fly wheel"), _("Hold fly wheel")];
                scope.release_hold_txt = btn_lbls[0];
                scope.reset = _("Reset");
                scope.enviornment_array = [{
                    enviornment: _('Earth, g=9.8m/s'),
                    type: 9.8
                }, {
                    enviornment: _('Moon, g=1.63m/s'),
                    type: 1.63
                }, {
                    enviornment: _('Uranus, g=10.5m/s'),
                    type: 10.5
                }, {
                    enviornment: _('Saturn, g=11.08m/s'),
                    type: 11.08
                }, {
                    enviornment: _('Jupiter, g=25.95m/s'),
                    type: 25.95
                }];
                scope.$apply();
            }
        }
    }
}

// =====================
// Utility and Helper Functions
// =====================

/**
 * Updates the CreateJS stage at a regular interval.
 */
function updateTimer() {
    stage.update();
}

/**
 * Adds a text object to the stage and container.
 * @param {string} name - Name of the text object
 * @param {number} textX - X position
 * @param {number} textY - Y position
 * @param {string|number} value - Text value
 * @param {string} color - Text color
 * @param {number} fontSize - Font size
 * @param {Object} container - CreateJS container
 */
function setText(name, textX, textY, value, color, fontSize, container) {
    var text = new createjs.Text(value, + fontSize + "em Tahoma, Geneva, sans-serif", color);
    text.x = textX;
    text.y = textY;
    text.textBaseline = "alphabetic";
    text.name = name;
    text.text = value;
    text.color = color;
    stage.addChild(thread_anim_rect);
    container.addChild(text);
    stage.update();
}

/**
 * Adds an image to the stage and container.
 * @param {Object} image - Image object
 * @param {string} name - Name for the bitmap
 * @param {number} xPos - X position
 * @param {number} yPos - Y position
 * @param {string} cursor - Cursor style
 * @param {number} rot - Rotation
 * @param {Object} container - CreateJS container
 * @param {number} scale - Scale factor
 */
function loadImages(image, name, xPos, yPos, cursor, rot, container, scale) {
    var _bitmap = new createjs.Bitmap(image).set({});
    _bitmap.x = xPos;
    _bitmap.y = yPos;
    _bitmap.scaleX = _bitmap.scaleY = scale;
    _bitmap.name = name;
    _bitmap.alpha = 1;
    _bitmap.rotation = rot;
    _bitmap.cursor = cursor;
    if (name == "thread_falling_anim") {
        _bitmap.mask = thread_anim_rect;
    }
    container.addChild(_bitmap);
    stage.update();
}

/**
 * Returns a child object from the main container by name.
 * @param {string} chldName - Name of the child
 * @returns {Object} - The child object
 */
function getChildName(chldName) {
    return container.getChildByName(chldName);
}

/**
 * Initializes UI control values on the Angular scope.
 * @param {Object} scope - Angular scope
 */
function initialisationOfControls(scope) {
    scope.mass_of_fly_wheel = 5;
    scope.dia_of_fly_wheel = 10;
    scope.mass_of_rings = 200;
    scope.axle_diameter = 2;
    scope.no_of_wound = 1;
    massOfRingsChange(scope);
    scope.control_disable = false;
    scope.btn_disabled = false;
    scope.mInertia_val = 0.0063;
}

/**
 * Initializes global simulation variables.
 */
function initialisationOfVariables() {
    gravity = 9.8;
    mass_of_flywheel = 5;
    diameter_of_flywheel = 10;
    mass_of_rings = 200;
    diameter_of_axle = 2;
    no_of_wound = 1;
    rotation_speed = wheel_rotation_speed = 33600 / 4;
    speed_correction = 2.0001;
    thread_anim_frame = 0;
    time_slots = [];
    time_slot_indx = 0;
    line_mask = new createjs.Shape();
    line_mask.name = "line_mask";
    rotation = 0;
    rotation_decimal = 0;
    line_mask.graphics.drawRect(300, 0, 200, 555);
    line_mask.y = 0;
    long_string.mask = line_mask;
    thread_anim_width = 199.869;
    wound = new createjs.Shape();
    string_x_pos = 0;
    iteration = 0;
    x_decrement = 0;
    drawLongString(385);
    rolling = false;
    INTERVAL = 0.2;
    total_rotation = 360;
    angular_velocity = 0;
    angular_distance = 0;
    number_of_rotation = 0;
    final_rotation = false;
    getChildName("height_txt").text = "02cm";
}

/**
 * Initializes image and bitmap objects for the simulation.
 */
function initialisationOfImages() {
    thread_anim_object = getChildName("thread_falling_anim");
    weight_obj = stage.getChildByName("weight_container");
    thread_anim_object.visible = false;
    stage.getChildByName("weights").x = 366.5;
    stage.getChildByName("weights").y = 600;
    stage.getChildByName("weights").alpha = 0;
}
