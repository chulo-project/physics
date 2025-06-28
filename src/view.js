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

(function() {
    'use strict';
    
    // Create namespace
    window.FlywheelView = window.FlywheelView || {};
    
    // =====================
    // Global Variables (still needed for CreateJS integration)
    // =====================

    // Canvas and CreateJS
    var stage, exp_canvas, queue, stage_width, stage_height, tick;
    var container, weight_container, weight_container_temp;
    var thread_anim_object, thread_anim_rect = new createjs.Shape();
    var long_string = new createjs.Shape();

    // UI State and Labels
    var btn_lbls, time_slots, time_slot_indx;
    var play_event, reset_flag, final_rotation;
    var helpArray, cm;

    // Physics and Animation
    var rotation_speed, speed_correction;
    var line, rotation_in, thread_anim_frame, thread_anim_width;
    var wound, thread_anim_clr, weights_anim_clr;
    var alpha, gravity, mass_of_flywheel, diameter_of_flywheel, mass_of_rings, diameter_of_axle, no_of_wound;
    var rolling, INTERVAL, angular_velocity, angular_distance, total_rotation, number_of_rotation, clr_string_intrl, string_intrl;
    var line_mask, weight_obj, string_x_pos, iteration, x_decrement, moment_of_inertia_of_flywheel;
    var rotation, rotation_decimal, last_rotation_angle, wheel_rotation_speed;

    // =====================
    // Angular Directive
    // =====================

    angular
        .module('users')
        .directive("experiment", directiveFunction);

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

                // Create the button bar container
                var buttonBar = document.createElement('div');
                buttonBar.style.cssText = 'display: flex; gap: 10px; margin: 10px 0; justify-content: center; align-items: center; flex-wrap: wrap;';
                
                // Create Start Experiment button
                var startExperimentBtn = document.createElement('button');
                startExperimentBtn.textContent = 'Start Experiment'; // Placeholder text
                startExperimentBtn.style.cssText = 'padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; transition: all 0.3s ease;';
                startExperimentBtn.onmouseover = function() { this.style.background = '#45a049'; };
                startExperimentBtn.onmouseout = function() { this.style.background = '#4CAF50'; };
                
                // Create Auto Clock Control button
                var autoClockControlBtn = document.createElement('button');
                autoClockControlBtn.innerHTML = '<span style="display: inline-block; width: 160px; white-space: nowrap;">Auto Clock Control: OFF</span>'; // Placeholder text
                autoClockControlBtn.style.cssText = 'padding: 10px 20px; background: #2196F3; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; transition: all 0.3s ease;';
                autoClockControlBtn.onmouseover = function() { this.style.background = '#1976D2'; };
                autoClockControlBtn.onmouseout = function() { this.style.background = '#2196F3'; };
                
                // Create Quick Reset button
                var quickResetBtn = document.createElement('button');
                quickResetBtn.textContent = 'Quick Reset'; // Placeholder text
                quickResetBtn.style.cssText = 'padding: 10px 20px; background: #f44336; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; transition: all 0.3s ease;';
                quickResetBtn.onmouseover = function() { this.style.background = '#d32f2f'; };
                quickResetBtn.onmouseout = function() { this.style.background = '#f44336'; };
                
                // Function to update button text when language loads
                function updateButtonText() {
                    if (window._) {
                        startExperimentBtn.textContent = _('Start Experiment');
                        autoClockControlBtn.innerHTML = '<span style="display: inline-block; width: 160px; white-space: nowrap;">' + _('Auto Clock Control') + ': ' + _('OFF') + '</span>';
                        quickResetBtn.textContent = _('Quick Reset');
                    }
                }
                
                // Set up language loaded callback
                window.onLanguageLoaded = function() {
                    updateButtonText();
                    // Also update the auto clock control button state after translations are loaded
                    setAutoClockControlBtnState();
                };
                
                // Also try to update immediately in case language is already loaded
                setTimeout(function() {
                    updateButtonText();
                    setAutoClockControlBtnState();
                }, 100);

                // Helper to update pause button state based on auto clock control and height
                function updatePauseBtnState() {
                    var heightTxt = getChildName("height_txt").text;
                    // Only auto-pause if auto clock control is enabled and height is not 0.0cm
                    if (window.FlywheelExperiment && window.FlywheelExperiment.autoClockControlEnabled && heightTxt !== '0.0cm') {
                        // This would be where auto-pause logic would go if needed
                        // Currently the stopwatch is controlled by the experiment timing
                    }
                }
                window.updatePauseBtnState = updatePauseBtnState;

                function setAutoClockControlBtnState() {
                    // Only set button state if translations are loaded
                    if (!window.translations || Object.keys(window.translations).length === 0) {
                        return;
                    }
                    var state = (window.FlywheelExperiment && window.FlywheelExperiment.autoClockControlEnabled) ? _("ON") : _("OFF");
                    autoClockControlBtn.innerHTML = '<span style="display: inline-block; width: 160px; white-space: nowrap;">' + _("Auto Clock Control") + ': ' + state + '</span>';
                }

                autoClockControlBtn.onclick = function() {
                    if (window.FlywheelExperiment) {
                        window.FlywheelExperiment.toggleAutoClockControl();
                        setAutoClockControlBtnState();
                    }
                };

                startExperimentBtn.onclick = function() {
                    if (window.angular && angular.element) {
                        var ngScope = angular.element(document.body).scope();
                        if (ngScope && window.FlywheelExperiment) {
                            ngScope.$apply(function() { 
                                // If experiment has already been run (rolling is true), do soft reset first
                                if (window.FlywheelView && window.FlywheelView.rolling) {
                                    window.FlywheelExperiment.resetExperimentPreserveSettings(ngScope);
                                }
                                // Start the experiment
                                window.FlywheelExperiment.releaseHold(ngScope); 
                            });
                        }
                    }
                };

                quickResetBtn.onclick = function() {
                    if (window.angular && angular.element) {
                        var ngScope = angular.element(document.body).scope();
                        if (ngScope && window.FlywheelExperiment) {
                            ngScope.$apply(function() { 
                                window.FlywheelExperiment.resetExperimentPreserveSettings(ngScope); 
                            });
                        }
                    }
                };

                // Add buttons to the page
                buttonBar.appendChild(startExperimentBtn);
                buttonBar.appendChild(autoClockControlBtn);
                buttonBar.appendChild(quickResetBtn);
                
                // Functions to control start experiment button state
                function disableStartExperimentBtn() {
                    startExperimentBtn.disabled = true;
                    startExperimentBtn.style.background = '#9E9E9E';
                    startExperimentBtn.style.cursor = 'not-allowed';
                    startExperimentBtn.style.opacity = '0.6';
                }
                
                function enableStartExperimentBtn() {
                    startExperimentBtn.disabled = false;
                    startExperimentBtn.style.background = '#4CAF50';
                    startExperimentBtn.style.cursor = 'pointer';
                    startExperimentBtn.style.opacity = '1';
                }
                
                // Functions to control auto clock control button state
                function disableAutoClockControlBtn() {
                    autoClockControlBtn.disabled = true;
                    autoClockControlBtn.style.background = '#9E9E9E';
                    autoClockControlBtn.style.cursor = 'not-allowed';
                    autoClockControlBtn.style.opacity = '0.6';
                }
                
                function enableAutoClockControlBtn() {
                    autoClockControlBtn.disabled = false;
                    autoClockControlBtn.style.background = '#2196F3';
                    autoClockControlBtn.style.cursor = 'pointer';
                    autoClockControlBtn.style.opacity = '1';
                }
                
                // Expose these functions globally so they can be called from experiment.js
                window.disableStartExperimentBtn = disableStartExperimentBtn;
                window.enableStartExperimentBtn = enableStartExperimentBtn;
                window.disableAutoClockControlBtn = disableAutoClockControlBtn;
                window.enableAutoClockControlBtn = enableAutoClockControlBtn;
                
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
        FlywheelExperiment.massOfRingsChange(scope);
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
        FlywheelExperiment.drawLongString(385);
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

    /**
     * Draws a reference line over the flywheel for visual tracking.
     * Creates a visual indicator to track rotation progress.
     */
    function drawLine() {
        line = new createjs.Shape();
        line.graphics.setStrokeStyle(2)
            .beginStroke("#ADCEE8")
            .moveTo(320, 225)
            .lineTo(380, 225);
        line.graphics.endStroke();
        line.name = "line";
        container.addChild(line);
        stage.update();
    }

    // Public API - expose only what's needed
    FlywheelView.updateTimer = updateTimer;
    FlywheelView.setText = setText;
    FlywheelView.loadImages = loadImages;
    FlywheelView.getChildName = getChildName;
    FlywheelView.initialisationOfControls = initialisationOfControls;
    FlywheelView.initialisationOfVariables = initialisationOfVariables;
    FlywheelView.initialisationOfImages = initialisationOfImages;
    FlywheelView.drawLine = drawLine;
    
    // Expose shared variables that experiment functions need
    Object.defineProperty(FlywheelView, 'long_string', {
        get: () => long_string,
        set: (value) => { long_string = value; }
    });
    
    Object.defineProperty(FlywheelView, 'stage', {
        get: () => stage,
        set: (value) => { stage = value; }
    });
    
    Object.defineProperty(FlywheelView, 'weight_container', {
        get: () => weight_container,
        set: (value) => { weight_container = value; }
    });
    
    Object.defineProperty(FlywheelView, 'weight_container_temp', {
        get: () => weight_container_temp,
        set: (value) => { weight_container_temp = value; }
    });
    
    Object.defineProperty(FlywheelView, 'container', {
        get: () => container,
        set: (value) => { container = value; }
    });
    
    Object.defineProperty(FlywheelView, 'weight_obj', {
        get: () => weight_obj,
        set: (value) => { weight_obj = value; }
    });
    
    Object.defineProperty(FlywheelView, 'line_mask', {
        get: () => line_mask,
        set: (value) => { line_mask = value; }
    });
    
    Object.defineProperty(FlywheelView, 'wound', {
        get: () => wound,
        set: (value) => { wound = value; }
    });
    
    Object.defineProperty(FlywheelView, 'thread_anim_object', {
        get: () => thread_anim_object,
        set: (value) => { thread_anim_object = value; }
    });
    
    Object.defineProperty(FlywheelView, 'helpArray', {
        get: () => helpArray,
        set: (value) => { helpArray = value; }
    });
    
    Object.defineProperty(FlywheelView, 'cm', {
        get: () => cm,
        set: (value) => { cm = value; }
    });
    
    Object.defineProperty(FlywheelView, 'btn_lbls', {
        get: () => btn_lbls,
        set: (value) => { btn_lbls = value; }
    });
    
    // Expose critical experiment variables
    Object.defineProperty(FlywheelView, 'reset_flag', {
        get: () => reset_flag,
        set: (value) => { reset_flag = value; }
    });
    
    Object.defineProperty(FlywheelView, 'rolling', {
        get: () => rolling,
        set: (value) => { rolling = value; }
    });
    
    Object.defineProperty(FlywheelView, 'rotation', {
        get: () => rotation,
        set: (value) => { rotation = value; }
    });
    
    Object.defineProperty(FlywheelView, 'rotation_decimal', {
        get: () => rotation_decimal,
        set: (value) => { rotation_decimal = value; }
    });
    
    Object.defineProperty(FlywheelView, 'no_of_wound', {
        get: () => no_of_wound,
        set: (value) => { no_of_wound = value; }
    });
    
    Object.defineProperty(FlywheelView, 'time_slots', {
        get: () => time_slots,
        set: (value) => { time_slots = value; }
    });
    
    Object.defineProperty(FlywheelView, 'moment_of_inertia_of_flywheel', {
        get: () => moment_of_inertia_of_flywheel,
        set: (value) => { moment_of_inertia_of_flywheel = value; }
    });
    
    Object.defineProperty(FlywheelView, 'tick', {
        get: () => tick,
        set: (value) => { tick = value; }
    });
    
    Object.defineProperty(FlywheelView, 'string_intrl', {
        get: () => string_intrl,
        set: (value) => { string_intrl = value; }
    });
    
    Object.defineProperty(FlywheelView, 'rotation_in', {
        get: () => rotation_in,
        set: (value) => { rotation_in = value; }
    });
    
    Object.defineProperty(FlywheelView, 'clr_string_intrl', {
        get: () => clr_string_intrl,
        set: (value) => { clr_string_intrl = value; }
    });
    
    Object.defineProperty(FlywheelView, 'thread_anim_clr', {
        get: () => thread_anim_clr,
        set: (value) => { thread_anim_clr = value; }
    });
    
    Object.defineProperty(FlywheelView, 'iteration', {
        get: () => iteration,
        set: (value) => { iteration = value; }
    });
    
    Object.defineProperty(FlywheelView, 'x_decrement', {
        get: () => x_decrement,
        set: (value) => { x_decrement = value; }
    });
    
    Object.defineProperty(FlywheelView, 'string_x_pos', {
        get: () => string_x_pos,
        set: (value) => { string_x_pos = value; }
    });
    
    Object.defineProperty(FlywheelView, 'final_rotation', {
        get: () => final_rotation,
        set: (value) => { final_rotation = value; }
    });
    
    Object.defineProperty(FlywheelView, 'last_rotation_angle', {
        get: () => last_rotation_angle,
        set: (value) => { last_rotation_angle = value; }
    });
    
    Object.defineProperty(FlywheelView, 'rotation_speed', {
        get: () => rotation_speed,
        set: (value) => { rotation_speed = value; }
    });
    
    Object.defineProperty(FlywheelView, 'wheel_rotation_speed', {
        get: () => wheel_rotation_speed,
        set: (value) => { wheel_rotation_speed = value; }
    });
    
    Object.defineProperty(FlywheelView, 'speed_correction', {
        get: () => speed_correction,
        set: (value) => { speed_correction = value; }
    });

    // Expose physics variables
    Object.defineProperty(FlywheelView, 'diameter_of_axle', {
        get: () => diameter_of_axle,
        set: (value) => { diameter_of_axle = value; }
    });
    
    Object.defineProperty(FlywheelView, 'mass_of_flywheel', {
        get: () => mass_of_flywheel,
        set: (value) => { mass_of_flywheel = value; }
    });
    
    Object.defineProperty(FlywheelView, 'diameter_of_flywheel', {
        get: () => diameter_of_flywheel,
        set: (value) => { diameter_of_flywheel = value; }
    });
    
    Object.defineProperty(FlywheelView, 'mass_of_rings', {
        get: () => mass_of_rings,
        set: (value) => { mass_of_rings = value; }
    });
    
    Object.defineProperty(FlywheelView, 'gravity', {
        get: () => gravity,
        set: (value) => { gravity = value; }
    });
    
    Object.defineProperty(FlywheelView, 'alpha', {
        get: () => alpha,
        set: (value) => { alpha = value; }
    });

    // Expose remaining critical variables
    Object.defineProperty(FlywheelView, 'INTERVAL', {
        get: () => INTERVAL,
        set: (value) => { INTERVAL = value; }
    });
    
    Object.defineProperty(FlywheelView, 'total_rotation', {
        get: () => total_rotation,
        set: (value) => { total_rotation = value; }
    });
    
    Object.defineProperty(FlywheelView, 'angular_velocity', {
        get: () => angular_velocity,
        set: (value) => { angular_velocity = value; }
    });
    
    Object.defineProperty(FlywheelView, 'angular_distance', {
        get: () => angular_distance,
        set: (value) => { angular_distance = value; }
    });
    
    Object.defineProperty(FlywheelView, 'number_of_rotation', {
        get: () => number_of_rotation,
        set: (value) => { number_of_rotation = value; }
    });
    
    Object.defineProperty(FlywheelView, 'time_slot_indx', {
        get: () => time_slot_indx,
        set: (value) => { time_slot_indx = value; }
    });
    
    Object.defineProperty(FlywheelView, 'thread_anim_frame', {
        get: () => thread_anim_frame,
        set: (value) => { thread_anim_frame = value; }
    });
    
    Object.defineProperty(FlywheelView, 'thread_anim_width', {
        get: () => thread_anim_width,
        set: (value) => { thread_anim_width = value; }
    });
    
    Object.defineProperty(FlywheelView, 'weights_anim_clr', {
        get: () => weights_anim_clr,
        set: (value) => { weights_anim_clr = value; }
    });
    
    Object.defineProperty(FlywheelView, 'play_event', {
        get: () => play_event,
        set: (value) => { play_event = value; }
    });

    // Expose initialization functions
    FlywheelView.initialisationOfImages = initialisationOfImages;
    FlywheelView.initialisationOfControls = initialisationOfControls;
    FlywheelView.initialisationOfVariables = initialisationOfVariables;

})();
