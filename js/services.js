var kickermanagerServices = angular.module('kickermanagerServices', ['ngResource']);

kickermanagerServices.factory('Ranking', function($resource) {
	return $resource('api/ranking?nocache=' + (new Date()).getTime());
});

kickermanagerServices.factory('Player', function($resource) {
	return $resource('api/player?nocache=' + (new Date()).getTime());
});

kickermanagerServices.factory('Match', function($resource) {
	return $resource('api/match');
});

kickermanagerServices.factory('History', function($resource) {
	return $resource('api/history/:type?nocache=' + (new Date()).getTime());
});

kickermanagerServices.factory('Statistic', function($resource) {
	return $resource('api/stats/:type/:param?nocache=' + (new Date()).getTime());
});
