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

/**
 * Starts or pauses the rotation of the flywheel.
 * Initiates the experiment by calculating physics parameters and starting animations.
 * 
 * @param {Object} scope - Angular scope object for UI updates
 */
function releaseHold(scope) {
    // Disable controls during experiment
    scope.control_disable = true;
    temp_scope.btn_disabled = true;
    reset_flag = false;
    
    // Start timer updates
    tick = setInterval(() => { updateTimer(); }, 200);
    
    // Calculate physics parameters
    calculations();
    
    // Initialize experiment on first run
    if (!rolling) {
        preCalculation(scope);
        string_intrl = time_slots[0] / 200;
        releaseWound(556 - (no_of_wound - 1) * 30);
    }
    
    // Set rotation speed and start animations
    rotation_speed = wheel_rotation_speed = time_slots[rotation] / 4;
    wheelRolling();
    lineRotation();
    digitRotation();
    startWatch(stage);
    woundRelease(time_slots[rotation]);
    
    // Update UI with calculated values
    scope.mInertia_lbl = _("Moment of Inertia of Flywheel: ");
    scope.mInertia_val = moment_of_inertia_of_flywheel.toFixed(4);
    rolling = true;
}

/**
 * Executes the rotation animation of the flywheel.
 * Function to execute the rotation of fly wheel
 */
function wheelRolling() {
    createjs.Tween.get(getChildName("texture")).to({ y: 310 }, rotation_speed * speed_correction).call(() => { getChildName("texture").y = -231; });
    createjs.Tween.get(getChildName("texture_1")).to({ y: -54 }, rotation_speed * speed_correction).call(() => {
        createjs.Tween.get(getChildName("texture_1")).to({ y: 132 }, rotation_speed * speed_correction).call(() => {
            createjs.Tween.get(getChildName("texture_1")).to({ y: 310 }, rotation_speed * speed_correction).call(() => { getChildName("texture_1").y = -231; });
            createjs.Tween.get(getChildName("texture")).to({ y: -54 }, rotation_speed * speed_correction).call(() => {
                createjs.Tween.get(getChildName("texture")).to({ y: 132 }, rotation_speed * speed_correction).call(() => {
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
    const wheelToMove = (last_rotation_angle * 3.6);
    
    if (wheelToMove <= 180) {
        // Simple case: less than half rotation
        createjs.Tween.get(getChildName("texture"))
            .to({ y: 130 + wheelToMove }, rotation_speed);
        createjs.Tween.get(getChildName("texture_1"))
            .to({ y: -230 + wheelToMove }, rotation_speed);
    } else {
        // Complex case: more than half rotation
        const lastTimeSlot = time_slots[time_slots.length - 2];
        createjs.Tween.get(getChildName("texture"))
            .to({ y: 310 }, (lastTimeSlot / wheelToMove) * 180)
            .call(() => { getChildName("texture").y = -231; });
        
        createjs.Tween.get(getChildName("texture_1"))
            .to({ y: -54 }, (lastTimeSlot / wheelToMove) * 180)
            .call(() => {
                createjs.Tween.get(getChildName("texture_1"))
                    .to({ y: wheelToMove - 234 }, lastTimeSlot - (lastTimeSlot / wheelToMove) * 180);
            });
    }
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

/**
 * Animates the reference line rotation to track flywheel progress.
 * Handles the complete rotation cycle including partial final rotations.
 */
function lineRotation() {
    createjs.Tween.get(getChildName("line"))
        .to({ y: 270 }, rotation_speed * 3)
        .call(() => {
            // Reposition line for final quarter rotation
            getChildName("line").y = -90;
            
            createjs.Tween.get(getChildName("line"))
                .to({ y: 0 }, rotation_speed)
                .call(() => {
                    rotation++;
                    
                    // Handle string release for current rotation
                    if (rotation < no_of_wound) {
                        wound.graphics.clear();
                        iteration = 0;
                        x_decrement = 0;
                        string_intrl = time_slots[rotation] / 200;
                        releaseWound(556 - (no_of_wound - rotation - 1) * 30);
                    }
                    
                    // Redraw remaining wounds
                    wound.graphics.clear();
                    for (let i = 385; i <= 385 + (no_of_wound - rotation - 2) * 3; i += 3) {
                        wound.graphics.setStrokeStyle(1)
                            .beginStroke("#fdfdfd")
                            .moveTo(i, 215)
                            .lineTo(i, 230);
                        wound.graphics.endStroke();
                    }
                    
                    // Handle weight release when all rotations complete
                    if (rotation === no_of_wound) {
                        clearTimeout(clr_string_intrl);
                        stage.update();
                        long_string.graphics.alpha = 0;
                        stage.getChildByName("weights").alpha = 1;
                        weights_anim_clr = createjs.Tween.get(stage.getChildByName("weights"))
                            .to({ y: 624 }, 50);
                        thread_anim_clr = setInterval(() => { threadRotationAnimation(); }, 30);
                        stage.getChildByName("weight_container").alpha = 0;
                    }
                    
                    // Update rotation counter display
                    rotation_decimal = 0;
                    getChildName("hundred").text = parseInt(rotation / 100);
                    getChildName("ten").text = rotation < 100 ? 
                        parseInt(rotation / 10) : parseInt(rotation / 10) % 10;
                    getChildName("one").text = rotation % 10;
                    
                    // Continue or end rotation sequence
                    if (rotation < time_slots.length - 2) {
                        rotation_speed = wheel_rotation_speed = time_slots[rotation] / 4;
                        lineRotation();
                    } else {
                        // Handle final rotation
                        final_rotation = true;
                        if (last_rotation_angle * 3.6 > 270) {
                            rotation_speed = wheel_rotation_speed = time_slots[rotation] / 4;
                        } else {
                            rotation_speed = time_slots[rotation];
                            wheel_rotation_speed = time_slots[rotation] + (100 - last_rotation_angle) * 5;
                        }
                        
                        if (last_rotation_angle !== 0) {
                            createjs.Tween.removeTweens(getChildName("texture"));
                            createjs.Tween.removeTweens(getChildName("texture_1"));
                            getChildName("texture").y = 130;
                            getChildName("texture_1").y = -231;
                            wheelRollingEnd();
                            lastLineRotation(last_rotation_angle * 3.6);
                        } else {
                            endOfCounter();
                        }
                    }
                    
                    // Release wound for current rotation
                    if (rotation < no_of_wound) {
                        woundRelease(time_slots[rotation]);
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
    const baseTime = rotation_speed / 90;
    
    if (linePos > 270) {
        // Complex case: line needs to wrap around
        const partDistance = linePos - 270;
        const calculatedTime = partDistance * baseTime;
        const finalPosition = partDistance - 90;
        
        createjs.Tween.get(getChildName("line"))
            .to({ y: 270 }, rotation_speed * 3)
            .call(() => {
                getChildName("line").y = -90;
                createjs.Tween.get(getChildName("line"))
                    .to({ y: finalPosition }, calculatedTime)
                    .call(() => {
                        endOfCounter();
                    });
            });
    } else {
        // Simple case: direct movement to final position
        createjs.Tween.get(getChildName("line"))
            .to({ y: linePos }, rotation_speed)
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
    clearTimeout(rotation_in);
    
    if (clockContainer.getChildByName("play").hasEventListener("click")) {
        clockContainer.getChildByName("play").off("click", listener_play);
        clockContainer.getChildByName("play").off("click", play_event);
    }
    
    temp_scope.$apply();
}

/**
 * Updates the rotation counter display and height indicator.
 * Handles the decimal counter animation and height calculations.
 */
function digitRotation() {
    if (reset_flag) return;
    rotation_decimal < 99 ? rotation_decimal++ : rotation_decimal = 0;
    
    // Update decimal counter display
    getChildName("decimal_one").text = parseInt(rotation_decimal / 10);
    getChildName("decimal_ten").text = rotation_decimal % 10;
    
    // Calculate and display height
    const height = (no_of_wound - rotation) * 2 - (parseFloat((rotation_decimal / 50).toFixed(1)));
    if (rotation < no_of_wound) {
        getChildName("height_txt").text = height.toFixed(1) + "cm";
    } else if (rotation === no_of_wound) {
        getChildName("height_txt").text = "0.0cm";
        // Auto time pause logic
        if (autoTimePauseEnabled) {
            pauseWatch();
        }
    }
    
    if (typeof window.updatePauseBtnState === 'function') window.updatePauseBtnState();
    
    // Determine rotation count for timing
    let rotCount = 100;
    if (last_rotation_angle * 3.6 < 270 && final_rotation) {
        rotCount = last_rotation_angle;
        rotation_speed = time_slots[rotation] / 4;
    }
    
    rotation_in = setTimeout(() => { digitRotation(); }, (rotation_speed * 4) / rotCount);
}

/**
 * Animates the thread rotation during weight fall.
 * Handles the visual animation of the falling thread.
 */
function threadRotationAnimation() {
    if (reset_flag) return;
    long_string.graphics.clear();
    thread_anim_frame++;
    
    if (thread_anim_frame <= 21) {
        thread_anim_object.visible = true;
        thread_anim_object.x = thread_anim_object.x - thread_anim_width;
    } else {
        thread_anim_frame = 22;
        clearInterval(thread_anim_clr);
        angular_acceleration = -10;
    }
}

/**
 * Creates a wound mark on the axle at the specified position.
 * 
 * @param {number} xPos - X coordinate for the wound mark
 */
function generateWound(xPos) {
    wound.graphics.setStrokeStyle(1)
        .beginStroke("#fdfdfd")
        .moveTo(xPos, 215)
        .lineTo(xPos, 230);
    wound.graphics.endStroke();
    container.addChild(wound);
    stage.update();
}

/**
 * Draws the long string from the axle to the weight.
 * 
 * @param {number} xPos - X coordinate for the string starting point
 */
function drawLongString(xPos) {
    long_string.graphics.clear();
    const stringLength = 556 - ((xPos - 385) / 3) * 30;
    long_string.graphics.setStrokeStyle(1)
        .beginStroke("#fdfdfd")
        .moveTo(xPos, 215)
        .lineTo(xPos, stringLength);
    stage.update();
}

/**
 * Animates the release of the wound string from the axle.
 * Creates a gradual unwinding effect.
 * 
 * @param {number} xPos - Current position for string release
 */
function releaseWound(xPos) {
    if (reset_flag) return;
    string_x_pos = xPos + 0.3;
    const xPoint = 385 + (no_of_wound - rotation - 1) * 3;
    x_decrement += 0.03;
    iteration++;
    
    long_string.graphics.clear();
    const stringLength = 556 - ((string_x_pos - 385) / 3) * 30;
    long_string.graphics.setStrokeStyle(1)
        .beginStroke("#fdfdfd")
        .moveTo(xPoint - x_decrement, 215)
        .lineTo(xPoint - x_decrement, string_x_pos + 50);
    stage.update();
    
    if (iteration !== 100 && rotation < no_of_wound) {
        clr_string_intrl = setTimeout(() => { 
            if (!reset_flag) { 
                releaseWound(string_x_pos); 
            } 
        }, string_intrl);
    } else {
        clearTimeout(clr_string_intrl);
        iteration = 0;
    }
}

/**
 * Animates the weight release from the axle.
 * 
 * @param {number} speed - Animation speed for the weight movement
 */
function woundRelease(speed) {
    const stringLength = 556 + ((weight_obj.x - 385) / 3) * 30;
    createjs.Tween.get(weight_obj)
        .to({ y: weight_obj.y + 30, x: weight_obj.x - 3 }, speed);
    createjs.Tween.get(line_mask)
        .to({ y: weight_obj.y + 30 }, speed);
}

/**
 * Updates the UI when the number of wounds changes.
 * Redraws wound marks and adjusts weight positioning.
 * 
 * @param {Object} scope - Angular scope object
 */
function noOfWoundsChange(scope) {
    total_rotation = no_of_wound * 360;
    wound.graphics.clear();
    
    // Draw wound marks
    for (let i = 385; i < 385 + (scope.no_of_wound - 1) * 3; i += 3) {
        generateWound(i);
    }
    
    // Update string and weight positioning
    drawLongString(385 + (scope.no_of_wound - 1) * 3);
    weight_container.y = (scope.no_of_wound - 1) * 30 * -1;
    weight_container.x = (scope.no_of_wound - 1) * 3;
    line_mask.y = weight_obj.y;
    
    // Update height display
    getChildName("height_txt").text = (no_of_wound < 5 ? '0' : '') + no_of_wound * 2 + "cm";
    stage.update();
}

/**
 * Updates the UI when the mass of rings changes.
 * Shows/hides weight objects based on selected mass.
 * 
 * @param {Object} scope - Angular scope object
 */
function massOfRingsChange(scope) {
    const weight = scope.mass_of_rings / 100;
    
    // Hide weights above selected mass
    for (let i = weight + 2; i <= 10; i += 2) {
        weight_container.getChildByName("weight_" + i).alpha = 0;
        weight_container_temp.getChildByName("weights_" + i).alpha = 0;
    }
    
    // Show weights up to selected mass
    for (let j = 4; j <= weight; j += 2) {
        weight_container.getChildByName("weight_" + j).alpha = 1;
        weight_container_temp.getChildByName("weights_" + j).alpha = 1;
    }
    
    stage.update();
}

/**
 * Calculates the angular acceleration and moment of inertia.
 * Performs the core physics calculations for the experiment.
 */
function calculations() {
    const radius = diameter_of_axle / 200;
    const mass = mass_of_rings / 1000;
    
    moment_of_inertia_of_flywheel = (mass_of_flywheel * Math.pow((diameter_of_flywheel / 200), 2)) / 2;
    alpha = (radius * mass * gravity) / moment_of_inertia_of_flywheel;
    alpha = (alpha * 180) / 3.14;
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
        time = time + INTERVAL;
        angularDis = angularDis + angularVelo * INTERVAL + 0.5 * alpha * Math.pow(INTERVAL, 2);
        preRot = parseInt(numberOfRot);
        numberOfRot = angularDis / 360;
        
        if (angularDis >= total_rotation) {
            if (firstFlag) {
                firstFlag = false;
            } else {
                alpha = -10;
            }
        }
        
        angularVelo = angularVelo + alpha * INTERVAL < 0 ? 0 : angularVelo + alpha * INTERVAL;
        
        if (parseInt(numberOfRot) > preRot) {
            tempTimeSlots[time_slot_indx] = parseInt(time.toFixed(1)) * 1000 + 
                ((parseFloat(time.toFixed(1)) * 10) % 10) * 100;
            time_slot_indx++;
        }
        
        if (angularVelo === 0) {
            tempTimeSlots[tempTimeSlots.length] = parseInt(time.toFixed(1)) * 1000 + 
                ((parseFloat(time.toFixed(1)) * 10) % 10) * 100;
            
            time_slots[0] = tempTimeSlots[0];
            for (let i = 0; i < tempTimeSlots.length; i++) {
                time_slots[i + 1] = tempTimeSlots[i + 1] - tempTimeSlots[i];
            }
            
            scope.mInertia_val = moment_of_inertia_of_flywheel.toFixed(4);
            last_rotation_angle = parseFloat((numberOfRot % 1).toFixed(2)) * 100;
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
    reset_flag = true;
    
    // Reset UI state
    scope.release_hold_txt = btn_lbls[0];
    scope.control_disable = false;
    
    // Clear all animations and timers
    createjs.Tween.removeAllTweens();
    clearTimeout(rotation_in);
    clearInterval(tick);
    clearTimeout(clr_string_intrl);
    clearInterval(thread_anim_clr);
    
    // Reset animation objects
    thread_anim_object.visible = false;
    thread_anim_object.x = 298;
    wound.graphics.clear();
    
    // Reset only experiment-specific variables (preserve user settings)
    iteration = 0;
    rotation_speed = wheel_rotation_speed = 33600 / 4;
    speed_correction = 2.0001;
    thread_anim_frame = 0;
    time_slots = [];
    time_slot_indx = 0;
    rotation = 0;
    rotation_decimal = 0;
    thread_anim_width = 199.869;
    string_x_pos = 0;
    x_decrement = 0;
    rolling = false;
    INTERVAL = 0.2;
    total_rotation = no_of_wound * 360; // Use current user setting
    angular_velocity = 0;
    angular_distance = 0;
    number_of_rotation = 0;
    final_rotation = false;
    
    // Recalculate physics based on current user settings
    calculations();
    
    // Reset visual elements
    weight_obj.alpha = 1;
    weight_obj.y = 0;
    weight_obj.x = 0;
    getChildName("texture").y = 130;
    getChildName("texture_1").y = -231;
    stage.getChildByName("weights").alpha = 0;
    
    // Reset thread animation object
    thread_anim_object.visible = false;
    thread_anim_object.x = 298;
    
    // Reset weight container to initial position first
    weight_container.y = 0;
    weight_container.x = 0;
    
    // Reset line mask position
    line_mask.y = 0;
    
    // Reset counter display
    getChildName("decimal_one").text = "0";
    getChildName("decimal_ten").text = "0";
    getChildName("hundred").text = 0;
    getChildName("ten").text = 0;
    getChildName("one").text = 0;
    getChildName("line").y = 0;
    
    // Reset physics display
    scope.mInertia_lbl = _("First start experiment..!");
    scope.mInertia_val = "";
    resetWatch();
    
    // Redraw string and wound marks based on current user settings
    drawLongString(385 + (scope.no_of_wound - 1) * 3);
    
    // Redraw wound marks for current number of wounds
    for (let i = 385; i < 385 + (scope.no_of_wound - 1) * 3; i += 3) {
        generateWound(i);
    }
    
    // Update weight positioning based on current settings
    weight_container.y = (scope.no_of_wound - 1) * 30 * -1;
    weight_container.x = (scope.no_of_wound - 1) * 3;
    line_mask.y = weight_obj.y;
    
    // Update height display based on current number of wounds
    getChildName("height_txt").text = (no_of_wound < 5 ? '0' : '') + no_of_wound * 2 + "cm";
    
    // Update weight visibility based on current mass of rings setting
    massOfRingsChange(scope);
    
    stage.update();
    
    // Reattach play button event listener
    if (!clockContainer.getChildByName("play").hasEventListener("click")) {
        play_event = clockContainer.getChildByName("play").on("click", () => {
            releaseHold(scope);
            scope.$apply();
        });
    }
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
    reset_flag = true;
    
    // Reset UI state
    scope.release_hold_txt = btn_lbls[0];
    scope.Enviornment = scope;
    scope.control_disable = false;
    
    // Clear all animations and timers
    createjs.Tween.removeAllTweens();
    clearTimeout(rotation_in);
    clearInterval(tick);
    clearTimeout(clr_string_intrl);
    clearInterval(thread_anim_clr);
    
    // Reset animation objects
    thread_anim_object.x = 298;
    wound.graphics.clear();
    
    // Reset variables and controls (this resets all user settings to defaults)
    iteration = 0;
    initialisationOfImages();
    initialisationOfControls(scope);
    initialisationOfVariables();
    
    // Reset visual elements
    weight_obj.alpha = 1;
    weight_obj.y = 0;
    weight_obj.x = 0;
    getChildName("texture").y = 130;
    getChildName("texture_1").y = -231;
    stage.getChildByName("weights").alpha = 0;
    
    // Reset counter display
    getChildName("decimal_one").text = "0";
    getChildName("decimal_ten").text = "0";
    getChildName("hundred").text = 0;
    getChildName("ten").text = 0;
    getChildName("one").text = 0;
    rotation_decimal = 0;
    getChildName("line").y = 0;
    
    // Reset physics display
    scope.mInertia_lbl = _("First start experiment..!");
    scope.mInertia_val = "";
    resetWatch();
    
    // Redraw initial string and update stage
    drawLongString(385);
    stage.update();
    
    // Reattach play button event listener
    if (!clockContainer.getChildByName("play").hasEventListener("click")) {
        play_event = clockContainer.getChildByName("play").on("click", () => {
            releaseHold(scope);
            scope.$apply();
        });
    }
}

// Global variable to enable/disable auto time pause
var autoTimePauseEnabled = false;

// Call this function to toggle auto time pause
function toggleAutoTimePause() {
    autoTimePauseEnabled = !autoTimePauseEnabled;
}

// Expose reset functions globally
window.resetExperimentPreserveSettings = resetExperimentPreserveSettings;
