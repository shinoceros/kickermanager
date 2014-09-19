'use strict';

var kmApp = angular.module('kmApp', [
	'ui.bootstrap',
	'ui.router',
	'kmControllers',
	'kmServices',
	'kmFilters',
	'kmDirectives',
	'angular-loading-bar',
	'highcharts-ng'
]);

kmApp.config(function($stateProvider, $urlRouterProvider) {
	$urlRouterProvider.otherwise("/match");

	var access = routingConfig.accessLevels;
	
	// anonymous routes
	$stateProvider
		.state('anon', {
			abstract: true,
			template: '<ui-view/>',
			data: {
				access: access.anon
			}
		})
		.state('anon.login', {
			url: '/login',
			templateUrl: 'partials/login.html',
			controller: 'LoginCtrl'
		});
		
	// user routes
	$stateProvider
		.state('user', {
			abstract: true,
			template: '<ui-view/>',
			data: {
				access: access.user
			}
		})
		.state('user.match', {
			url: '/match',
			templateUrl: 'partials/match.html',
			controller: 'MatchCtrl'
		})
		.state('user.ranking', {
			url: '/ranking',
			templateUrl: 'partials/ranking.html',
			controller: 'RankingCtrl'
		})
		.state('user.statistics', {
			url: '/statistics',
			templateUrl: 'partials/statistics.html',
			controller: 'StatisticsCtrl'
		})
		.state('user.statistics.elotrend', {
			url: '/elotrend',
			templateUrl: 'partials/statistics.elotrend.html',
			controller: 'StatisticsCtrl'
		})
		.state('user.playersetup', {
			url: '/playersetup',
			templateUrl: 'partials/playersetup.html',
			controller: 'PlayerSetupCtrl'
		})

	// admin routes
	$stateProvider
		.state('admin' , {
			abstract: true,
			template: '<ui-view/>',
			data: {
				access: access.admin
			}
		})
		.state('admin.administration', {
			url: '/administration',
			templateUrl: 'partials/administration.html',
			controller: 'AdministrationCtrl'
		})
});

kmApp.run(function($rootScope, $state, AuthService) {
	FastClick.attach(document.body);

	$rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams) {
		//console.log('$stateChangeStart: ' + fromState.name + ' => ' + toState.name);

		if (!('data' in toState) || !('access' in toState.data)) {
			$rootScope.error = "Access undefined for this state";
			event.preventDefault();
		}
		else if (!AuthService.authorize(toState.data.access)) {
			$rootScope.error = "Seems like you tried accessing a route you don't have access to...";
			event.preventDefault();
			if (fromState.url === '^') {
				if (AuthService.isLoggedIn()) {
					$state.go('user.match');
				} else {
					$rootScope.error = null;
					$state.go('anon.login');
				}
			}
		}
	});
 
/*  	$rootScope.$on('$stateChangeError', function(event, toState, toParams, fromState, fromParams, error) {
		console.log('$stateChangeError: ' + fromState.name + ' => ' + toState.name);
	});
 */});