'use strict';

var kmApp = angular.module('kmApp', [
	'ui.bootstrap',
	'ui.router',
	'ngAnimate',
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
		.state('user.settings', {
			url: '/usersettings',
			templateUrl: 'partials/user.settings.html',
			controller: 'UserSettingsCtrl'
		})
		.state('user.changepin', {
			url: '/changepin',
			templateUrl: 'partials/user.changepin.html',
			controller: 'UserChangePinCtrl'
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
		});

	// admin routes
	$stateProvider
		.state('admin' , {
			abstract: true,
			url: '/admin',
			template: '<ui-view/>',
			data: {
				access: access.admin
			}
		})
		.state('admin.main', {
			url: '/',
			templateUrl: 'partials/admin.main.html',
			controller: 'AdminMainCtrl'
		})
		.state('admin.gamesetup', {
			url: '/gamesetup',
			templateUrl: 'partials/admin.gamesetup.html',
			controller: 'AdminGameSetupCtrl'
		})
		.state('admin.playersetup', {
			url: '/playersetup',
			templateUrl: 'partials/admin.playersetup.html',
			controller: 'AdminPlayerSetupCtrl'
		})
		.state('admin.matchedit', {
			url: '/matchedit',
			templateUrl: 'partials/admin.matchedit.html',
			controller: 'AdminMatchEditCtrl'
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