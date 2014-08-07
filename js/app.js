'use strict';

var kickermanagerApp = angular.module('kickermanagerApp', [
	'ui.bootstrap.collapse',
	'ngRoute',
	'kickermanagerControllers',
	'kickermanagerServices',
	'kickermanagerFilters',
	'angular-loading-bar',
	'highcharts-ng'
]);

kickermanagerApp.config(['$routeProvider', 
  function($routeProvider) {
    $routeProvider.
      when('/match', {templateUrl: 'partials/match.html', controller: 'MatchCtrl'}).
      when('/ranking', {templateUrl: 'partials/ranking.html', controller: 'RankingCtrl'}).
      when('/statistics', {templateUrl: 'partials/statistics.html', controller: 'StatisticsCtrl'}).
      when('/playersetup', {templateUrl: 'partials/playersetup.html', controller: 'PlayerSetupCtrl'}).
      when('/configuration', {templateUrl: 'partials/configuration.html', controller: 'ConfigurationCtrl'}).
      otherwise({redirectTo: '/match'});
}]);
