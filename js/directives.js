angular.module('kmDirectives', [])
.directive('kmKeypad', function() {
	return {
		restrict: 'E',
		require: '^ngModel',
		scope: {
			pin: '=ngModel' ,
			locked: '=ngDisabled',
			size: '='
		},
		replace: true,
		templateUrl: 'partials/keypad.html',
		controller: function($scope, $sce) {
			$scope.keys = [
				{code: '1', label: '1'},
				{code: '2', label: '2'},
				{code: '3', label: '3'},
				{code: '4', label: '4'},
				{code: '5', label: '5'},
				{code: '6', label: '6'},
				{code: '7', label: '7'},
				{code: '8', label: '8'},
				{code: '9', label: '9'},
				{code: 'X', label: '<i class="fa fa-times"></i>'},
				{code: '0', label: '0'},
				{code: 'B', label: '<i class="fa fa-chevron-left"></i>'}
			];
			for (var i in $scope.keys) {
				$scope.keys[i].label = $sce.trustAsHtml($scope.keys[i].label);
			}
			$scope.onKeyPress = function(keyCode) {
				if (keyCode == 'X') {
					$scope.pin = '';
				}
				else if (keyCode == 'B') {
					if ($scope.pin.length > 0) {
						$scope.pin = $scope.pin.substring(0, $scope.pin.length - 1);
					}
				}
				else {
					if ($scope.pin.length < $scope.size) {
						$scope.pin += keyCode;
					}
				}
			}
		},
		link: function(scope, iElement, iAttrs, ctrl) {	
		}
	}
})
.directive('kmLedbar', function() {
	return {
		restrict: 'E',
		scope: {
			size: '=',
			count: '=',
			color: '='
		},
		replace: true,
		templateUrl: 'partials/ledbar.html',
		controller: function($scope) {
			$scope.leds = [];
			for (var i = 0; i < $scope.size; ++i) {
				$scope.leds.push({id: i, on: false});
			}
		},
		link: function(scope, iElement, iAttrs, ctrl) {
			scope.$watch('count', function(newVal, oldVal) {
				angular.forEach(scope.leds, function(led, idx) {
					led.on = (idx < newVal);
				});
			});
		}
	}
})
.directive('kmLoading', function() {
	return {
		restrict: 'E',
		replace: true,
		templateUrl: 'partials/loading.html',
		link: function(scope, iElement, iAttrs, ctrl) {
		}
	}
})
;
