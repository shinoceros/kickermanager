'use strict';

var kickermanagerApp = angular.module('kickermanagerApp', [
	'ui.bootstrap',
	'ngRoute',
	'kickermanagerControllers',
	'kickermanagerServices',
	'kickermanagerFilters',
	'angular-loading-bar',
	'highcharts-ng'
]);

kickermanagerApp.directive('ngReallyClick', [function() {
	return {
		restrict: 'A',
		link: function(scope, element, attrs) {
			element.bind('click', function() {
				var message = attrs.ngReallyMessage;
				if (message && confirm(message)) {
					scope.$apply(attrs.ngReallyClick);
				}
			});
		}
	}
}]);

kickermanagerApp.config(['$routeProvider', 
  function($routeProvider) {
    $routeProvider.
      when('/match', {templateUrl: 'partials/match.html', controller: 'MatchCtrl'}).
      when('/ranking', {templateUrl: 'partials/ranking.html', controller: 'RankingCtrl'}).
      when('/statistics', {templateUrl: 'partials/statistics.html', controller: 'StatisticsCtrl'}).
      when('/playersetup', {templateUrl: 'partials/playersetup.html', controller: 'PlayerSetupCtrl'}).
      when('/administration', {templateUrl: 'partials/configuration.html', controller: 'AdministrationCtrl'}).
      otherwise({redirectTo: '/match'});
}]);
