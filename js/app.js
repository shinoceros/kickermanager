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
])
.config(function($stateProvider, $urlRouterProvider, $httpProvider) {
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
			url: '/login/:redirect',
			templateUrl: 'partials/login.html',
			resolve: {
				check: function(AuthService) {
					return AuthService.check();
				}
			},
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
		});

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
		});
		
	$httpProvider.interceptors.push(function($q, $injector) {
		return {
			'responseError': function(response) {
				if (response.status === 401) {
					$injector.get('$state').go('anon.login');
				}
				return $q.reject(response);
			}
		};
	});
})
.run(function($rootScope, $state, AuthService) {
	FastClick.attach(document.body);

	$rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams) {

		//console.log('$stateChangeStart: ' + fromState.name + ' => ' + toState.name);

		// invalid state definition
		if (!('data' in toState) || !('access' in toState.data)) {
			event.preventDefault();
			return;
		}
 		if (!AuthService.authorize(toState.data.access) && toState.name !== 'anon.login') {
			event.preventDefault();
			$state.go('anon.login', {redirect: toState.name});
			return;
		}
	});
});