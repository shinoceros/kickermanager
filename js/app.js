'use strict';

var kmApp = angular.module('kmApp', [
	'ui.bootstrap',
	'ui.router',
	'kmControllers',
	'kmServices',
	'kmFilters',
	'angular-loading-bar',
	'highcharts-ng'
]);

kmApp.directive('ngReallyClick', [function() {
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

kmApp.config(function($stateProvider, $urlRouterProvider) {
	$urlRouterProvider.otherwise("/match");

	$stateProvider
		.state('match', {
			url: '/match',
			templateUrl: 'partials/match.html',
			controller: 'MatchCtrl'
		})
		.state('ranking', {
			url: '/ranking',
			templateUrl: 'partials/ranking.html',
			controller: 'RankingCtrl'
		})
		.state('statistics', {
			url: '/statistics',
			templateUrl: 'partials/statistics.html',
			controller: 'StatisticsCtrl'
		})
		.state('statistics.elotrend', {
			url: '/elotrend',
			templateUrl: 'partials/statistics.elotrend.html',
			controller: 'StatisticsCtrl'
		})
		.state('playersetup', {
			url: '/playersetup',
			templateUrl: 'partials/playersetup.html',
			controller: 'PlayerSetupCtrl'
		})
		.state('administration', {
			url: '/administration',
			templateUrl: 'partials/administration.html',
			controller: 'AdministrationCtrl'
		})
});
