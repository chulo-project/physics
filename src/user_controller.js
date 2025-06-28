/**
 * User Controller for the Angular Material Simulation App.
 * Handles user interactions, UI state management, and experiment controls.
 * 
 * Usage:
 *   <body ng-app="starterApp" ng-controller="UserController as ul">
 *   This controller manages UI and experiment state for the virtual lab.
 * 
 * Dependencies:
 *   - experiment.js (for massOfRingsChange, noOfWoundsChange, releaseHold, resetExperiment)
 *   - FBAngular module
 *   - Angular Material
 */

let temp_scope;

(function () {
    angular
        .module('users', ['FBAngular'])
        .controller('UserController', [
            '$mdSidenav', '$mdBottomSheet', '$log', '$q', '$scope', '$element', 'Fullscreen', '$mdToast', '$animate',
            UserController
        ]);

    /**
     * Main Controller for the Angular Material Starter App
     * @param {Object} $mdSidenav - Angular Material sidenav service
     * @param {Object} $mdBottomSheet - Angular Material bottom sheet service
     * @param {Object} $log - Angular logging service
     * @param {Object} $q - Angular promise service
     * @param {Object} $scope - Angular scope object
     * @param {Object} $element - Angular element object
     * @param {Object} Fullscreen - Fullscreen service
     * @param {Object} $mdToast - Angular Material toast service
     * @param {Object} $animate - Angular animation service
     * @constructor
     */
    function UserController($mdSidenav, $mdBottomSheet, $log, $q, $scope, $element, Fullscreen, $mdToast, $animate) {
        temp_scope = $scope;
        
        // Toast position configuration
        $scope.toastPosition = {
            bottom: true,
            top: false,
            left: true,
            right: false
        };
        
        /**
         * Toggles the right sidenav.
         * @param {Event} ev - Click event
         */
        $scope.toggleSidenav = (ev) => {
            $mdSidenav('right').toggle();
        };
        
        /**
         * Gets the current toast position as a string.
         * @returns {string} Space-separated position classes
         */
        $scope.getToastPosition = () => {
            return Object.keys($scope.toastPosition)
                .filter((pos) => $scope.toastPosition[pos])
                .join(' ');
        };
        
        /**
         * Shows a series of help toasts for the experiment.
         */
        $scope.showActionToast = () => {
            const toast = $mdToast.simple()
                .content(FlywheelView.helpArray[2])
                .action(FlywheelView.helpArray[0])
                .hideDelay(15000)
                .highlightAction(false)
                .position($scope.getToastPosition());

            const toast1 = $mdToast.simple()
                .content(FlywheelView.helpArray[3])
                .action(FlywheelView.helpArray[0])
                .hideDelay(15000)
                .highlightAction(false)
                .position($scope.getToastPosition());

            const toast2 = $mdToast.simple()
                .content(FlywheelView.helpArray[4])
                .action(FlywheelView.helpArray[0])
                .hideDelay(15000)
                .highlightAction(false)
                .position($scope.getToastPosition());

            const toast3 = $mdToast.simple()
                .content(FlywheelView.helpArray[5])
                .action(FlywheelView.helpArray[0])
                .hideDelay(15000)
                .highlightAction(false)
                .position($scope.getToastPosition());

            const toast4 = $mdToast.simple()
                .content(FlywheelView.helpArray[6])
                .action(FlywheelView.helpArray[1])
                .hideDelay(15000)
                .highlightAction(false)
                .position($scope.getToastPosition());

            // Chain the toasts sequentially
            $mdToast.show(toast).then(() => {
                $mdToast.show(toast1).then(() => {
                    $mdToast.show(toast2).then(() => {
                        $mdToast.show(toast3).then(() => {
                            $mdToast.show(toast4).then(() => {
                                // All toasts completed
                            });
                        });
                    });
                });
            });
        };

        const self = this;
        self.selected = null;
        self.users = [];
        self.toggleList = toggleUsersList;

        // UI state variables
        $scope.showValue = true; /*  It hides the 'Result' tab */
        $scope.showVariables = false; /*  I hides the 'Variables' tab */
        $scope.isActive = true;
        $scope.isActive1 = true;

        /**
         * Toggles fullscreen mode for the experiment.
         */
        $scope.goFullscreen = () => {
            /*  Full screen */
            if (Fullscreen.isEnabled()) {
                Fullscreen.cancel();
            } else {
                Fullscreen.all();
            }
            /*  Set Full screen to a specific element (bad practice) */
            /*  Full screen.enable( document.getElementById('img') ) */
        };

        /**
         * Toggles the result tab visibility.
         */
        $scope.toggle = () => {
            $scope.showValue = !$scope.showValue;
            $scope.isActive = !$scope.isActive;
        };

        /**
         * Toggles the variables tab visibility.
         */
        $scope.toggle1 = () => {
            $scope.showVariables = !$scope.showVariables;
            $scope.isActive1 = !$scope.isActive1;
        };

        /**
         * Updates the environment selection.
         * Function for changing the drop down list
         */
        $scope.changeEnviornment = () => {
            g = $scope.Enviornment;
        };

        /**
         * Updates the mass of flywheel.
         * Function for changing the slider mass of flywheel
         */
        $scope.massOfWheel = () => {
            mass_of_flywheel = $scope.mass_of_fly_wheel;
        };

        /**
         * Updates the diameter of flywheel.
         * Function for changing the slider diameter of flywheel
         */
        $scope.diameterOfWheel = () => {
            diameter_of_flywheel = $scope.dia_of_fly_wheel;
        };

        /**
         * Updates the mass of rings and triggers UI update.
         * Function for the slider mass of rings
         */
        $scope.massOfRings = () => {
            mass_of_rings = $scope.mass_of_rings;
            FlywheelExperiment.massOfRingsChange($scope); /*  Function defined in experiment.js file */
        };

        /**
         * Updates the diameter of axle.
         * Function for the slider diameter of axle
         */
        $scope.diameterOfAxle = () => {
            diameter_of_axle = $scope.axle_diameter;
        };

        /**
         * Updates the number of wounds and triggers UI update.
         * Function for the slider no of wounds of chord
         */
        $scope.noOfWounds = () => {
            no_of_wound = $scope.no_of_wound;
            FlywheelExperiment.noOfWoundsChange($scope); /*  Function defined in experiment.js file */
        };

        /**
         * Starts or pauses the flywheel experiment.
         * Function for the button release/hold wheel
         */
        $scope.releaseHoldWheel = () => {
            FlywheelExperiment.releaseHold($scope); /*  Function defined in experiment.js file */
        };

        /**
         * Resets the experiment to initial state.
         * Function for resetting the experiment
         */
        $scope.resetExp = () => {
            FlywheelExperiment.resetExperiment($scope); /*  Function defined in experiment.js file */
        };

        /**
         * Toggles the users list sidenav.
         * First hide the bottom sheet IF visible, then
         * hide or Show the 'left' sideNav area
         */
        function toggleUsersList() {
            $mdSidenav('right').toggle();
        }
    }
})();
