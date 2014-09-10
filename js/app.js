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
		.state('login', {
			url: '/login',
			templateUrl: 'partials/login.html',
			controller: 'LoginCtrl',
			requiresAuth: false
		})
		.state('match', {
			url: '/match',
			templateUrl: 'partials/match.html',
			controller: 'MatchCtrl',
			requiresAuth: true
		})
		.state('ranking', {
			url: '/ranking',
			templateUrl: 'partials/ranking.html',
			controller: 'RankingCtrl',
			requiresAuth: true
		})
		.state('statistics', {
			url: '/statistics',
			templateUrl: 'partials/statistics.html',
			controller: 'StatisticsCtrl',
			requiresAuth: true
		})
		.state('statistics.elotrend', {
			url: '/elotrend',
			templateUrl: 'partials/statistics.elotrend.html',
			controller: 'StatisticsCtrl',
			requiresAuth: true
		})
		.state('playersetup', {
			url: '/playersetup',
			templateUrl: 'partials/playersetup.html',
			controller: 'PlayerSetupCtrl',
			requiresAuth: true
		})
		.state('administration', {
			url: '/administration',
			templateUrl: 'partials/administration.html',
			controller: 'AdministrationCtrl',
			requiresAuth: true
		})
});

kmApp.run(function($rootScope, $state, AuthService) {
	FastClick.attach(document.body);
	$rootScope.$on('$stateChangeStart', function (ev, to, toParams, from, fromParams) {
		// if route requires auth and user is not logged in
		if (to.requiresAuth && !AuthService.isLoggedIn()) {
			// redirect back to login
//			ev.preventDefault();
//			$state.go('login');
		}
/*		else if (routeAdmin($location.url()) && !RoleService.validateRoleAdmin(SessionService.currentUser)) {
			// redirect back to login
			ev.preventDefault();
			$state.go('error');
		}
 */	});
});