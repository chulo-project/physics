/**
 * Experiment module for the simulation.
 * Handles the core physics calculations, animations, and experiment logic.
 * 
 * This module manages:
 * - Flywheel rotation animations
 * - Physics calculations for moment of inertia
 * - String and weight animations
 * - Rotation counter and timing
 * - Experiment state management
 * 
 * Usage:
 *   - This file is loaded after CreateJS, AngularJS, and view.js.
 *   - Functions are called from Angular controllers and directives.
 *   - Relies on global variables and functions defined in view.js and user_controller.js.
 * 
 * Dependencies:
 *   - CreateJS (for animation and drawing)
 *   - AngularJS (for scope and UI updates)
 *   - temp_scope (set in user_controller.js for cross-file scope access)
 */

(function () {
    'use strict';

    // Declare all globals used by the simulation logic
    var no_of_wound, mass_of_rings, diameter_of_axle, mass_of_flywheel, diameter_of_flywheel;
    var rotation, rolling, string_intrl, time_slots, time_slot_indx, speed_correction, rotation_speed, wheel_rotation_speed;
    var reset_flag, temp_scope, tick, stage, container, weight_container, weight_container_temp, thread_anim_object, long_string, wound, line_mask, weight_obj, string_x_pos, iteration, x_decrement, moment_of_inertia_of_flywheel, rotation_decimal, last_rotation_angle, final_rotation, clr_string_intrl;

    // Create namespace
    window.FlywheelExperiment = window.FlywheelExperiment || {};

    // Private variables
    let autoClockControlEnabled = false;
    let stopwatchStarted = false;
    let stopwatchStopped = false;
    let observedResult = null; // Store the real experimental result
    let originalScope = null; // Store the original scope for UI updates

    /**
     * Starts or pauses the rotation of the flywheel.
     * Initiates the experiment by calculating physics parameters and starting animations.
     * 
     * @param {Object} scope - Angular scope object for UI updates
     */
    function releaseHold(scope) {
        // Store the original scope for UI updates
        originalScope = scope;
        
        // Synchronize global variables with UI/namespace values
        no_of_wound = FlywheelView.no_of_wound = scope.no_of_wound;
        mass_of_rings = FlywheelView.mass_of_rings = scope.mass_of_rings;
        diameter_of_axle = FlywheelView.diameter_of_axle = scope.axle_diameter;
        mass_of_flywheel = FlywheelView.mass_of_flywheel = scope.mass_of_fly_wheel;
        diameter_of_flywheel = FlywheelView.diameter_of_flywheel = scope.dia_of_fly_wheel;
        
        // Disable controls during experiment
        scope.control_disable = true;
        if (typeof temp_scope !== 'undefined' && temp_scope) {
            temp_scope.btn_disabled = true;
        }
        FlywheelView.reset_flag = false;

        // Reset stopwatch states
        stopwatchStarted = false;
        stopwatchStopped = false;

        // Control stopwatch buttons based on auto clock control setting
        if (autoClockControlEnabled) {
            // Disable manual stopwatch control when auto control is enabled
            if (typeof window.disableStopwatchButtons === 'function') {
                window.disableStopwatchButtons();
            }
            // Reset stopwatch to ensure clean timing measurement
            resetWatch();
        } else {
            // Enable manual stopwatch control when auto control is disabled
            if (typeof window.enableStopwatchButtons === 'function') {
                window.enableStopwatchButtons();
            }
        }

        // Start timer updates
        FlywheelView.tick = setInterval(() => { FlywheelView.updateTimer(); }, 200);

        // Calculate physics parameters
        calculations();

        // Initialize experiment on first run
        if (!FlywheelView.rolling) {
            // Ensure total_rotation is properly set before calculations
            FlywheelView.total_rotation = FlywheelView.no_of_wound * 360;
            preCalculation(scope);
            FlywheelView.string_intrl = FlywheelView.time_slots[0] / 200;
            // Draw initial string for current number of windings
            drawLongString(385 + (FlywheelView.no_of_wound - 1) * 3);
            // Start from the correct Y position based on number of windings (string length)
            releaseWound(556 - (FlywheelView.no_of_wound - 1) * 30);
        }

        // Ensure weight container is properly positioned for current number of wounds
        FlywheelView.weight_container.y = (FlywheelView.no_of_wound - 1) * 30 * -1;
        FlywheelView.weight_container.x = (FlywheelView.no_of_wound - 1) * 3;
        FlywheelView.line_mask.y = FlywheelView.weight_obj.y;

        // Set rotation speed and start animations
        FlywheelView.rotation_speed = FlywheelView.wheel_rotation_speed = FlywheelView.time_slots[FlywheelView.rotation] / 4;
        wheelRolling();
        lineRotation();
        digitRotation();
        // Don't start stopwatch here - it will start when thread detaches
        woundRelease(FlywheelView.time_slots[FlywheelView.rotation]);

        // Update UI with calculated values
        scope.mInertia_lbl = _("Wait for experiment to finish");
        scope.mInertia_val = "";
        FlywheelView.rolling = true;

        // Disable start experiment button when experiment starts
        if (typeof window.disableStartExperimentBtn === 'function') {
            window.disableStartExperimentBtn();
        }

        // Disable auto clock control button when experiment starts
        if (typeof window.disableAutoClockControlBtn === 'function') {
            window.disableAutoClockControlBtn();
        }
    }

    /**
     * Executes the rotation animation of the flywheel.
     * Function to execute the rotation of fly wheel
     */
    function wheelRolling() {
        createjs.Tween.get(FlywheelView.getChildName("texture")).to({ y: 310 }, FlywheelView.rotation_speed * FlywheelView.speed_correction).call(() => { FlywheelView.getChildName("texture").y = -231; });
        createjs.Tween.get(FlywheelView.getChildName("texture_1")).to({ y: -54 }, FlywheelView.rotation_speed * FlywheelView.speed_correction).call(() => {
            createjs.Tween.get(FlywheelView.getChildName("texture_1")).to({ y: 132 }, FlywheelView.rotation_speed * FlywheelView.speed_correction).call(() => {
                createjs.Tween.get(FlywheelView.getChildName("texture_1")).to({ y: 310 }, FlywheelView.rotation_speed * FlywheelView.speed_correction).call(() => { FlywheelView.getChildName("texture_1").y = -231; });
                createjs.Tween.get(FlywheelView.getChildName("texture")).to({ y: -54 }, FlywheelView.rotation_speed * FlywheelView.speed_correction).call(() => {
                    createjs.Tween.get(FlywheelView.getChildName("texture")).to({ y: 132 }, FlywheelView.rotation_speed * FlywheelView.speed_correction).call(() => {
                        wheelRolling();
                    });
                });
            });
        });
    }

    /**
     * Executes the final rotation of the flywheel with partial rotation support.
     * Handles the last rotation which may be less than a full 360 degrees.
     */
    function wheelRollingEnd() {
        const wheelToMove = (FlywheelView.last_rotation_angle * 3.6);

        if (wheelToMove <= 180) {
            // Simple case: less than half rotation
            createjs.Tween.get(FlywheelView.getChildName("texture"))
                .to({ y: 130 + wheelToMove }, FlywheelView.rotation_speed);
            createjs.Tween.get(FlywheelView.getChildName("texture_1"))
                .to({ y: -230 + wheelToMove }, FlywheelView.rotation_speed);
        } else {
            // Complex case: more than half rotation
            const lastTimeSlot = FlywheelView.time_slots[FlywheelView.time_slots.length - 2];
            createjs.Tween.get(FlywheelView.getChildName("texture"))
                .to({ y: 310 }, (lastTimeSlot / wheelToMove) * 180)
                .call(() => { FlywheelView.getChildName("texture").y = -231; });

            createjs.Tween.get(FlywheelView.getChildName("texture_1"))
                .to({ y: -54 }, (lastTimeSlot / wheelToMove) * 180)
                .call(() => {
                    createjs.Tween.get(FlywheelView.getChildName("texture_1"))
                        .to({ y: wheelToMove - 234 }, lastTimeSlot - (lastTimeSlot / wheelToMove) * 180);
                });
        }
    }

    /**
     * Draws a reference line over the flywheel for visual tracking.
     * Creates a visual indicator to track rotation progress.
     */
    function drawLine() {
        FlywheelView.drawLine();
    }

    /**
     * Animates the reference line rotation to track flywheel progress.
     * Handles the complete rotation cycle including partial final rotations.
     */
    function lineRotation() {
        createjs.Tween.get(FlywheelView.getChildName("line"))
            .to({ y: 270 }, FlywheelView.rotation_speed * 3)
            .call(() => {
                // Reposition line for final quarter rotation
                FlywheelView.getChildName("line").y = -90;

                createjs.Tween.get(FlywheelView.getChildName("line"))
                    .to({ y: 0 }, FlywheelView.rotation_speed)
                    .call(() => {
                        FlywheelView.rotation++;

                        // Handle string release for current rotation
                        if (FlywheelView.rotation < FlywheelView.no_of_wound) {
                            FlywheelView.wound.graphics.clear();
                            FlywheelView.iteration = 0;
                            FlywheelView.x_decrement = 0;
                            FlywheelView.string_intrl = FlywheelView.time_slots[FlywheelView.rotation] / 200;
                            releaseWound(556 - (FlywheelView.no_of_wound - FlywheelView.rotation - 1) * 30);
                        }

                        // Redraw remaining wounds
                        FlywheelView.wound.graphics.clear();
                        for (let i = 385; i <= 385 + (FlywheelView.no_of_wound - FlywheelView.rotation - 2) * 3; i += 3) {
                            FlywheelView.wound.graphics.setStrokeStyle(1)
                                .beginStroke("#fdfdfd")
                                .moveTo(i, 215)
                                .lineTo(i, 230);
                            FlywheelView.wound.graphics.endStroke();
                        }

                        // Handle weight release when all rotations complete
                        if (FlywheelView.rotation === FlywheelView.no_of_wound) {
                            clearTimeout(FlywheelView.clr_string_intrl);
                            FlywheelView.stage.update();
                            FlywheelView.long_string.graphics.alpha = 0;
                            FlywheelView.stage.getChildByName("weights").alpha = 1;
                            FlywheelView.weights_anim_clr = createjs.Tween.get(FlywheelView.stage.getChildByName("weights"))
                                .to({ y: 624 }, 50);
                            FlywheelView.thread_anim_clr = setInterval(() => { threadRotationAnimation(); }, 30);
                            FlywheelView.stage.getChildByName("weight_container").alpha = 0;
                        }

                        // Update rotation counter display
                        FlywheelView.rotation_decimal = 0;
                        FlywheelView.getChildName("hundred").text = parseInt(FlywheelView.rotation / 100);
                        FlywheelView.getChildName("ten").text = FlywheelView.rotation < 100 ?
                            parseInt(FlywheelView.rotation / 10) : parseInt(FlywheelView.rotation / 10) % 10;
                        FlywheelView.getChildName("one").text = FlywheelView.rotation % 10;

                        // Continue or end rotation sequence
                        if (FlywheelView.rotation < FlywheelView.time_slots.length - 2) {
                            FlywheelView.rotation_speed = FlywheelView.wheel_rotation_speed = FlywheelView.time_slots[FlywheelView.rotation] / 4;
                            lineRotation();
                        } else {
                            // Handle final rotation
                            FlywheelView.final_rotation = true;
                            if (FlywheelView.last_rotation_angle * 3.6 > 270) {
                                FlywheelView.rotation_speed = FlywheelView.wheel_rotation_speed = FlywheelView.time_slots[FlywheelView.rotation] / 4;
                            } else {
                                FlywheelView.rotation_speed = FlywheelView.time_slots[FlywheelView.rotation];
                                FlywheelView.wheel_rotation_speed = FlywheelView.time_slots[FlywheelView.rotation] + (100 - FlywheelView.last_rotation_angle) * 5;
                            }

                            if (FlywheelView.last_rotation_angle !== 0) {
                                createjs.Tween.removeTweens(FlywheelView.getChildName("texture"));
                                createjs.Tween.removeTweens(FlywheelView.getChildName("texture_1"));
                                FlywheelView.getChildName("texture").y = 130;
                                FlywheelView.getChildName("texture_1").y = -231;
                                wheelRollingEnd();
                                lastLineRotation(FlywheelView.last_rotation_angle * 3.6);
                            } else {
                                endOfCounter();
                            }
                        }

                        // Release wound for current rotation
                        if (FlywheelView.rotation < FlywheelView.no_of_wound) {
                            woundRelease(FlywheelView.time_slots[FlywheelView.rotation]);
                        }
                    });
            });
    }

    /**
     * Handles the final partial rotation of the reference line.
     * 
     * @param {number} linePos - The final position for the line in pixels
     */
    function lastLineRotation(linePos) {
        const baseTime = FlywheelView.rotation_speed / 90;

        if (linePos > 270) {
            // Complex case: line needs to wrap around
            const partDistance = linePos - 270;
            const calculatedTime = partDistance * baseTime;
            const finalPosition = partDistance - 90;

            createjs.Tween.get(FlywheelView.getChildName("line"))
                .to({ y: 270 }, FlywheelView.rotation_speed * 3)
                .call(() => {
                    FlywheelView.getChildName("line").y = -90;
                    createjs.Tween.get(FlywheelView.getChildName("line"))
                        .to({ y: finalPosition }, calculatedTime)
                        .call(() => {
                            endOfCounter();
                        });
                });
        } else {
            // Simple case: direct movement to final position
            createjs.Tween.get(FlywheelView.getChildName("line"))
                .to({ y: linePos }, FlywheelView.rotation_speed)
                .call(() => {
                    endOfCounter();
                });
        }
    }

    /**
     * Ends the rotation counter and stops all animations.
     * Cleans up timers and event listeners when experiment completes.
     */
    function endOfCounter() {
        createjs.Tween.removeAllTweens();
        clearTimeout(FlywheelView.rotation_in);

        // Stop stopwatch when rotation counter becomes stable
        // Only if auto clock control is enabled
        if (stopwatchStarted && !stopwatchStopped && autoClockControlEnabled) {
            pauseWatch();
            stopwatchStopped = true;
        }

        // Calculate and display the real experimental moment of inertia
        if (originalScope) {
            calculateObservedMomentOfInertia(originalScope);
        } else if (typeof temp_scope !== 'undefined' && temp_scope) {
            calculateObservedMomentOfInertia(temp_scope);
        }

        // Enable start experiment button when experiment ends
        if (typeof window.enableStartExperimentBtn === 'function') {
            window.enableStartExperimentBtn();
        }

        // Enable auto clock control button when experiment ends
        if (typeof window.enableAutoClockControlBtn === 'function') {
            window.enableAutoClockControlBtn();
        }
        
        // Update the UI using the appropriate scope
        if (originalScope && originalScope.$apply) {
            originalScope.$apply();
        } else if (typeof temp_scope !== 'undefined' && temp_scope && temp_scope.$apply) {
            temp_scope.$apply();
        }
    }

    /**
     * Updates the rotation counter display and height indicator.
     * Handles the decimal counter animation and height calculations.
     */
    function digitRotation() {
        if (FlywheelView.reset_flag) return;
        FlywheelView.rotation_decimal < 99 ? FlywheelView.rotation_decimal++ : FlywheelView.rotation_decimal = 0;

        // Update decimal counter display
        FlywheelView.getChildName("decimal_one").text = parseInt(FlywheelView.rotation_decimal / 10);
        FlywheelView.getChildName("decimal_ten").text = FlywheelView.rotation_decimal % 10;

        // Calculate and display height
        const height = (FlywheelView.no_of_wound - FlywheelView.rotation) * 2 - (parseFloat((FlywheelView.rotation_decimal / 50).toFixed(1)));
        if (FlywheelView.rotation < FlywheelView.no_of_wound) {
            FlywheelView.getChildName("height_txt").text = height.toFixed(1) + "cm";
        } else if (FlywheelView.rotation === FlywheelView.no_of_wound) {
            FlywheelView.getChildName("height_txt").text = "0.0cm";
            // Start stopwatch when thread detaches from axle (height becomes 0.0cm)
            // Only if auto clock control is enabled
            if (!stopwatchStarted && autoClockControlEnabled) {
                startWatch(FlywheelView.stage);
                stopwatchStarted = true;
            }
        }

        if (typeof window.updatePauseBtnState === 'function') window.updatePauseBtnState();

        // Determine rotation count for timing
        let rotCount = 100;
        if (FlywheelView.last_rotation_angle * 3.6 < 270 && FlywheelView.final_rotation) {
            rotCount = FlywheelView.last_rotation_angle;
            FlywheelView.rotation_speed = FlywheelView.wheel_rotation_speed = FlywheelView.time_slots[FlywheelView.rotation] / 4;
        }

        FlywheelView.rotation_in = setTimeout(() => { digitRotation(); }, (FlywheelView.rotation_speed * 4) / rotCount);
    }

    /**
     * Animates the thread rotation during weight fall.
     * Handles the visual animation of the falling thread.
     */
    function threadRotationAnimation() {
        if (FlywheelView.reset_flag) return;
        FlywheelView.long_string.graphics.clear();
        FlywheelView.thread_anim_frame++;

        if (FlywheelView.thread_anim_frame <= 21) {
            FlywheelView.thread_anim_object.visible = true;
            FlywheelView.thread_anim_object.x = FlywheelView.thread_anim_object.x - FlywheelView.thread_anim_width;
        } else {
            FlywheelView.thread_anim_frame = 22;
            clearInterval(FlywheelView.thread_anim_clr);
            if (FlywheelView.mass_of_rings > 0) {
                const radius = FlywheelView.diameter_of_axle / 200;
                const mass = FlywheelView.mass_of_rings / 1000;
                FlywheelView.alpha = (radius * mass * FlywheelView.gravity) / FlywheelView.moment_of_inertia_of_flywheel;
                FlywheelView.alpha = (FlywheelView.alpha * 180) / 3.14;
            } else {
                FlywheelView.alpha = -10;
            }
        }
    }

    /**
     * Creates a wound mark on the axle at the specified position.
     * 
     * @param {number} xPos - X coordinate for the wound mark
     */
    function generateWound(xPos) {
        FlywheelView.wound.graphics.setStrokeStyle(1)
            .beginStroke("#fdfdfd")
            .moveTo(xPos, 215)
            .lineTo(xPos, 230);
        FlywheelView.wound.graphics.endStroke();
        FlywheelView.container.addChild(FlywheelView.wound);
        FlywheelView.stage.update();
    }

    /**
     * Draws the long string from the axle to the weight.
     * 
     * @param {number} xPos - X coordinate for the string starting point
     */
    function drawLongString(xPos) {
        FlywheelView.long_string.graphics.clear();
        const stringLength = 556 - ((xPos - 385) / 3) * 30;
        FlywheelView.long_string.graphics.setStrokeStyle(1)
            .beginStroke("#fdfdfd")
            .moveTo(xPos, 215)
            .lineTo(xPos, stringLength);
        FlywheelView.stage.update();
    }

    /**
     * Animates the release of the wound string from the axle.
     * Creates a gradual unwinding effect.
     * 
     * @param {number} yPos - Y position (string length) for string release
     */
    function releaseWound(yPos) {
        if (FlywheelView.reset_flag) return;
        FlywheelView.string_x_pos = yPos + 0.3;
        const xPoint = 385 + (FlywheelView.no_of_wound - FlywheelView.rotation - 1) * 3;
        FlywheelView.x_decrement += 0.03;
        FlywheelView.iteration++;

        FlywheelView.long_string.graphics.clear();
        FlywheelView.long_string.graphics.setStrokeStyle(1)
            .beginStroke("#fdfdfd")
            .moveTo(xPoint - FlywheelView.x_decrement, 215)
            .lineTo(xPoint - FlywheelView.x_decrement, FlywheelView.string_x_pos + 50);
        FlywheelView.stage.update();

        if (FlywheelView.iteration !== 100 && FlywheelView.rotation < FlywheelView.no_of_wound) {
            FlywheelView.clr_string_intrl = setTimeout(() => {
                if (!FlywheelView.reset_flag) {
                    releaseWound(FlywheelView.string_x_pos);
                }
            }, FlywheelView.string_intrl);
        } else {
            clearTimeout(FlywheelView.clr_string_intrl);
            FlywheelView.iteration = 0;
        }
    }

    /**
     * Animates the weight release from the axle.
     * 
     * @param {number} speed - Animation speed for the weight movement
     */
    function woundRelease(speed) {
        const stringLength = 556 + ((FlywheelView.weight_container.x - 385) / 3) * 30;
        createjs.Tween.get(FlywheelView.weight_container)
            .to({ y: FlywheelView.weight_container.y + 30, x: FlywheelView.weight_container.x - 3 }, speed);
        createjs.Tween.get(FlywheelView.line_mask)
            .to({ y: FlywheelView.weight_container.y + 30 }, speed);
    }

    /**
     * Updates the UI when the number of wounds changes.
     * Redraws wound marks and adjusts weight positioning.
     * 
     * @param {Object} scope - Angular scope object
     */
    function noOfWoundsChange(scope) {
        // Synchronize global variables with FlywheelView namespace
        no_of_wound = scope.no_of_wound;
        FlywheelView.no_of_wound = scope.no_of_wound;

        FlywheelView.total_rotation = FlywheelView.no_of_wound * 360;
        FlywheelView.wound.graphics.clear();

        // Draw wound marks
        for (let i = 385; i < 385 + (scope.no_of_wound - 1) * 3; i += 3) {
            generateWound(i);
        }

        // Update string and weight positioning
        drawLongString(385 + (scope.no_of_wound - 1) * 3);
        FlywheelView.weight_container.y = (scope.no_of_wound - 1) * 30 * -1;
        FlywheelView.weight_container.x = (scope.no_of_wound - 1) * 3;
        FlywheelView.line_mask.y = FlywheelView.weight_obj.y;

        // Update height display
        FlywheelView.getChildName("height_txt").text = (FlywheelView.no_of_wound < 5 ? '0' : '') + FlywheelView.no_of_wound * 2 + "cm";
        FlywheelView.stage.update();
    }

    /**
     * Updates the UI when the mass of rings changes.
     * Shows/hides weight objects based on selected mass.
     * 
     * @param {Object} scope - Angular scope object
     */
    function massOfRingsChange(scope) {
        // Synchronize global variables with FlywheelView namespace
        mass_of_rings = scope.mass_of_rings;
        FlywheelView.mass_of_rings = scope.mass_of_rings;

        const weight = scope.mass_of_rings / 100;

        // Hide weights above selected mass
        for (let i = weight + 2; i <= 10; i += 2) {
            FlywheelView.weight_container.getChildByName("weight_" + i).alpha = 0;
            FlywheelView.weight_container_temp.getChildByName("weights_" + i).alpha = 0;
        }

        // Show weights up to selected mass
        for (let j = 4; j <= weight; j += 2) {
            FlywheelView.weight_container.getChildByName("weight_" + j).alpha = 1;
            FlywheelView.weight_container_temp.getChildByName("weights_" + j).alpha = 1;
        }

        FlywheelView.stage.update();
    }

    /**
     * Calculates the angular acceleration and moment of inertia.
     * Performs the core physics calculations for the experiment.
     */
    function calculations() {
        const radius = FlywheelView.diameter_of_axle / 200;
        const mass = FlywheelView.mass_of_rings / 1000;

        FlywheelView.moment_of_inertia_of_flywheel = (FlywheelView.mass_of_flywheel * Math.pow((FlywheelView.diameter_of_flywheel / 200), 2)) / 2;
        FlywheelView.alpha = (radius * mass * FlywheelView.gravity) / FlywheelView.moment_of_inertia_of_flywheel;
        FlywheelView.alpha = (FlywheelView.alpha * 180) / 3.14;
    }

    /**
     * Pre-calculates time slots for each rotation.
     * Determines the timing for each complete rotation of the flywheel.
     * 
     * @param {Object} scope - Angular scope object
     */
    function preCalculation(scope) {
        let time = 0;
        let angularDis = 0;
        let preRot = 0;
        let numberOfRot = 0;
        let firstFlag = true;
        let angularVelo = 0;
        const tempTimeSlots = [];

        do {
            time = time + FlywheelView.INTERVAL;
            angularDis = angularDis + angularVelo * FlywheelView.INTERVAL + 0.5 * FlywheelView.alpha * Math.pow(FlywheelView.INTERVAL, 2);
            preRot = parseInt(numberOfRot);
            numberOfRot = angularDis / 360;

            if (angularDis >= FlywheelView.total_rotation) {
                if (firstFlag) {
                    firstFlag = false;
                } else {
                    FlywheelView.alpha = -10;
                }
            }

            angularVelo = angularVelo + FlywheelView.alpha * FlywheelView.INTERVAL < 0 ? 0 : angularVelo + FlywheelView.alpha * FlywheelView.INTERVAL;

            if (parseInt(numberOfRot) > preRot) {
                tempTimeSlots[FlywheelView.time_slot_indx] = parseInt(time.toFixed(1)) * 1000 +
                    ((parseFloat(time.toFixed(1)) * 10) % 10) * 100;
                FlywheelView.time_slot_indx++;
            }

            if (angularVelo === 0) {
                tempTimeSlots[tempTimeSlots.length] = parseInt(time.toFixed(1)) * 1000 +
                    ((parseFloat(time.toFixed(1)) * 10) % 10) * 100;

                FlywheelView.time_slots[0] = tempTimeSlots[0];
                for (let i = 0; i < tempTimeSlots.length; i++) {
                    FlywheelView.time_slots[i + 1] = tempTimeSlots[i + 1] - tempTimeSlots[i];
                }

                scope.mInertia_val = FlywheelView.moment_of_inertia_of_flywheel.toFixed(4) + " " + _("kg⋅m²");
                FlywheelView.last_rotation_angle = parseFloat((numberOfRot % 1).toFixed(2)) * 100;
            }
        } while (angularVelo > 0);
    }

    /**
     * Resets all experiment functionality and UI to initial state.
     * Clears all animations, timers, and resets visual elements.
     * Preserves user settings in dropdown controls.
     * 
     * @param {Object} scope - Angular scope object for UI updates
     */
    function resetExperimentPreserveSettings(scope) {
        // Set reset flag first to prevent ghost updates
        FlywheelView.reset_flag = true;
        
        // Reset stopwatch states
        stopwatchStarted = false;
        stopwatchStopped = false;
        
        // Reset original scope
        originalScope = null;

        // Re-enable stopwatch buttons after reset
        if (typeof window.enableStopwatchButtons === 'function') {
            window.enableStopwatchButtons();
        }

        // Re-enable start experiment button after reset
        if (typeof window.enableStartExperimentBtn === 'function') {
            window.enableStartExperimentBtn();
        }

        // Re-enable auto clock control button after reset
        if (typeof window.enableAutoClockControlBtn === 'function') {
            window.enableAutoClockControlBtn();
        }

        // Reset UI state
        scope.release_hold_txt = FlywheelView.btn_lbls[0];
        scope.control_disable = false;
        if (typeof temp_scope !== 'undefined' && temp_scope) {
            temp_scope.btn_disabled = false;
        }

        // Clear all animations and timers
        createjs.Tween.removeAllTweens();
        clearTimeout(FlywheelView.rotation_in);
        clearInterval(FlywheelView.tick);
        clearTimeout(FlywheelView.clr_string_intrl);
        clearInterval(FlywheelView.thread_anim_clr);

        // Reset animation objects
        FlywheelView.thread_anim_object.visible = false;
        FlywheelView.thread_anim_object.x = 298;
        FlywheelView.wound.graphics.clear();

        // Reset only experiment-specific variables (preserve user settings)
        FlywheelView.iteration = 0;
        FlywheelView.rotation_speed = FlywheelView.wheel_rotation_speed = 33600 / 4;
        FlywheelView.speed_correction = 2.0001;
        FlywheelView.thread_anim_frame = 0;
        FlywheelView.time_slots = [];
        FlywheelView.time_slot_indx = 0;
        FlywheelView.rotation = 0;
        FlywheelView.rotation_decimal = 0;
        FlywheelView.thread_anim_width = 199.869;
        FlywheelView.string_x_pos = 0;
        FlywheelView.x_decrement = 0;
        FlywheelView.rolling = false;
        FlywheelView.INTERVAL = 0.2;
        FlywheelView.total_rotation = FlywheelView.no_of_wound * 360; // Use current user setting
        FlywheelView.angular_velocity = 0;
        FlywheelView.angular_distance = 0;
        FlywheelView.number_of_rotation = 0;
        FlywheelView.final_rotation = false;

        // Recalculate physics based on current user settings
        calculations();

        // Reset visual elements
        FlywheelView.weight_obj.alpha = 1;
        FlywheelView.weight_obj.y = 0;
        FlywheelView.weight_obj.x = 0;
        FlywheelView.getChildName("texture").y = 130;
        FlywheelView.getChildName("texture_1").y = -231;
        FlywheelView.stage.getChildByName("weights").alpha = 0;

        // Reset thread animation object
        FlywheelView.thread_anim_object.visible = false;
        FlywheelView.thread_anim_object.x = 298;

        // Reset weight container to initial position first
        FlywheelView.weight_container.y = 0;
        FlywheelView.weight_container.x = 0;

        // Reset line mask position
        FlywheelView.line_mask.y = 0;

        // Reset counter display
        FlywheelView.getChildName("decimal_one").text = "0";
        FlywheelView.getChildName("decimal_ten").text = "0";
        FlywheelView.getChildName("hundred").text = 0;
        FlywheelView.getChildName("ten").text = 0;
        FlywheelView.getChildName("one").text = 0;
        FlywheelView.getChildName("line").y = 0;

        // Reset physics display
        scope.mInertia_lbl = _("First start experiment..!");
        scope.mInertia_val = "";
        observedResult = null; // Reset observed result
        resetWatch();

        // Redraw wound marks for current number of wounds
        for (let i = 385; i < 385 + (scope.no_of_wound - 1) * 3; i += 3) {
            generateWound(i);
        }

        // Update weight positioning based on current settings
        FlywheelView.weight_container.y = (scope.no_of_wound - 1) * 30 * -1;
        FlywheelView.weight_container.x = (scope.no_of_wound - 1) * 3;
        FlywheelView.line_mask.y = FlywheelView.weight_obj.y;

        // Update height display based on current number of wounds
        FlywheelView.getChildName("height_txt").text = (FlywheelView.no_of_wound < 5 ? '0' : '') + FlywheelView.no_of_wound * 2 + "cm";

        // Update weight visibility based on current mass of rings setting
        massOfRingsChange(scope);

        FlywheelView.stage.update();
    }

    /**
     * Resets all experiment functionality and UI to initial state.
     * Clears all animations, timers, and resets visual elements.
     * Resets all user settings to default values.
     * 
     * @param {Object} scope - Angular scope object for UI updates
     */
    function resetExperiment(scope) {
        // Set reset flag first to prevent ghost updates
        FlywheelView.reset_flag = true;
        
        // Reset stopwatch states
        stopwatchStarted = false;
        stopwatchStopped = false;
        
        // Reset original scope
        originalScope = null;

        // Re-enable stopwatch buttons after reset
        if (typeof window.enableStopwatchButtons === 'function') {
            window.enableStopwatchButtons();
        }

        // Re-enable start experiment button after reset
        if (typeof window.enableStartExperimentBtn === 'function') {
            window.enableStartExperimentBtn();
        }

        // Re-enable auto clock control button after reset
        if (typeof window.enableAutoClockControlBtn === 'function') {
            window.enableAutoClockControlBtn();
        }

        // Reset UI state
        scope.release_hold_txt = FlywheelView.btn_lbls[0];
        scope.Enviornment = scope;
        scope.control_disable = false;
        if (typeof temp_scope !== 'undefined' && temp_scope) {
            temp_scope.btn_disabled = false;
        }

        // Clear all animations and timers
        createjs.Tween.removeAllTweens();
        clearTimeout(FlywheelView.rotation_in);
        clearInterval(FlywheelView.tick);
        clearTimeout(FlywheelView.clr_string_intrl);
        clearInterval(FlywheelView.thread_anim_clr);

        // Reset animation objects
        FlywheelView.thread_anim_object.x = 298;
        FlywheelView.wound.graphics.clear();

        // Reset variables and controls (this resets all user settings to defaults)
        FlywheelView.iteration = 0;
        FlywheelView.initialisationOfImages();
        FlywheelView.initialisationOfControls(scope);
        FlywheelView.initialisationOfVariables();

        // Reset visual elements
        FlywheelView.weight_obj.alpha = 1;
        FlywheelView.weight_obj.y = 0;
        FlywheelView.weight_obj.x = 0;
        FlywheelView.getChildName("texture").y = 130;
        FlywheelView.getChildName("texture_1").y = -231;
        FlywheelView.stage.getChildByName("weights").alpha = 0;

        // Reset counter display
        FlywheelView.getChildName("decimal_one").text = "0";
        FlywheelView.getChildName("decimal_ten").text = "0";
        FlywheelView.getChildName("hundred").text = 0;
        FlywheelView.getChildName("ten").text = 0;
        FlywheelView.getChildName("one").text = 0;
        FlywheelView.rotation_decimal = 0;
        FlywheelView.getChildName("line").y = 0;

        // Reset physics display
        scope.mInertia_lbl = _("First start experiment..!");
        scope.mInertia_val = "";
        observedResult = null; // Reset observed result
        resetWatch();

        // Redraw initial string and update stage
        drawLongString(385);
        FlywheelView.stage.update();
    }

    /**
     * Toggles auto clock control functionality.
     */
    function toggleAutoClockControl() {
        autoClockControlEnabled = !autoClockControlEnabled;
    }

    /**
     * Calculates the real experimental moment of inertia using observed data.
     * Uses the formula: I = (m(2gh/omega - r²))/(1+n₁/n₂)
     * 
     * @param {Object} scope - Angular scope object for UI updates
     */
    function calculateObservedMomentOfInertia(scope) {
        // Get the lap time from stopwatch (in seconds)
        const lapTime = getLapTime(); // We need to implement this function

        if (lapTime === null || lapTime <= 0) {
            scope.mInertia_lbl = _("Moment of Inertia of Flywheel: ");
            scope.mInertia_val = "Error: No valid timing data";
            return;
        }

        // Extract parameters
        const m = FlywheelView.mass_of_flywheel; // mass of flywheel
        const g = FlywheelView.gravity; // gravity
        const r = FlywheelView.diameter_of_axle / 200; // radius of axle (convert from cm to m)
        const n1 = FlywheelView.no_of_wound; // number of cord windings

        // Calculate n2 = rotation + rotation_decimal - n1
        const n2 = FlywheelView.rotation + (FlywheelView.rotation_decimal / 100) - n1;

        // Calculate h = 2πr·n₁ (height fall before leaving flywheel)
        const h = 2 * Math.PI * r * n1;

        // Calculate omega = (4π·n₂)/t (angular velocity)
        const omega = (4 * Math.PI * n2) / lapTime;

        // Calculate moment of inertia using the formula: I = (m(2gh/omega - r²))/(1+n₁/n₂)
        const numerator = m * (2 * g * h / omega - Math.pow(r, 2));
        const denominator = 1 + n1 / n2;
        const momentOfInertia = numerator / denominator;

        // Store the observed result
        observedResult = momentOfInertia;

        // Update UI
        scope.mInertia_lbl = _("Moment of Inertia of Flywheel: ");
        scope.mInertia_val = momentOfInertia.toFixed(4) + " " + _("kg⋅m²");
    }

    /**
     * Gets the lap time from the stopwatch in seconds.
     * 
     * @returns {number|null} Lap time in seconds or null if not available
     */
    function getLapTime() {
        // Get the stopwatch time in seconds
        if (typeof window.getStopwatchTime === 'function') {
            const time = window.getStopwatchTime();
            return time > 0 ? time : null;
        }
        return null;
    }

    // Public API - expose only what's needed
    FlywheelExperiment.releaseHold = releaseHold;
    FlywheelExperiment.wheelRolling = wheelRolling;
    FlywheelExperiment.wheelRollingEnd = wheelRollingEnd;
    FlywheelExperiment.drawLine = drawLine;
    FlywheelExperiment.lineRotation = lineRotation;
    FlywheelExperiment.lastLineRotation = lastLineRotation;
    FlywheelExperiment.endOfCounter = endOfCounter;
    FlywheelExperiment.digitRotation = digitRotation;
    FlywheelExperiment.threadRotationAnimation = threadRotationAnimation;
    FlywheelExperiment.generateWound = generateWound;
    FlywheelExperiment.drawLongString = drawLongString;
    FlywheelExperiment.releaseWound = releaseWound;
    FlywheelExperiment.woundRelease = woundRelease;
    FlywheelExperiment.noOfWoundsChange = noOfWoundsChange;
    FlywheelExperiment.massOfRingsChange = massOfRingsChange;
    FlywheelExperiment.calculations = calculations;
    FlywheelExperiment.preCalculation = preCalculation;
    FlywheelExperiment.resetExperiment = resetExperiment;
    FlywheelExperiment.toggleAutoClockControl = toggleAutoClockControl;
    FlywheelExperiment.resetExperimentPreserveSettings = resetExperimentPreserveSettings;
    FlywheelExperiment.calculateObservedMomentOfInertia = calculateObservedMomentOfInertia;
    FlywheelExperiment.getLapTime = getLapTime;
    
    // Function to set temp_scope for proper initialization
    FlywheelExperiment.setTempScope = function(scope) {
        temp_scope = scope;
    };

    // Expose auto clock control state getter/setter
    Object.defineProperty(FlywheelExperiment, 'autoClockControlEnabled', {
        get: () => autoClockControlEnabled,
        set: (value) => { autoClockControlEnabled = value; }
    });

    // Expose observed result getter
    Object.defineProperty(FlywheelExperiment, 'observedResult', {
        get: () => observedResult,
        set: (value) => { observedResult = value; }
    });

})();
