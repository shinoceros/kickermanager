var kmServices = angular.module('kmServices', ['ngResource']);

kmServices.factory('Settings', function($resource) {
	return $resource('api/settings');
});

kmServices.factory('Ranking', function($resource) {
	return $resource('api/ranking?nocache=' + (new Date()).getTime());
});

kmServices.factory('Player', function($resource) {
	return $resource('api/player/:playerId', {}, {
		query:	{method:'GET', params: {playerId: ''}, isArray: true},
		post:	{method:'POST'},
		update:	{method:'PUT', params: {playerId: '@playerId'}}
	});
});

kmServices.factory('Match', function($resource) {
	return $resource('api/match/:matchId', {}, {
		post:	{method:'POST'},
		update:	{method:'PUT', params: {matchId: '@matchId'}},
		remove:	{method:'DELETE', params: {matchId: '@matchId'}}
	});
});

kmServices.factory('History', function($resource) {
	return $resource('api/history/:type/:param1/:param2');
});

kmServices.factory('Statistic', function($resource) {
	return $resource('api/stats/:type/:param?nocache=' + (new Date()).getTime());
});

kmServices.factory('Admin', function($resource) {
	return $resource('api/admin/:action', {}, {
		login:	{method:'POST', params: {action: 'login'}},
		logout:	{method:'POST', params: {action: 'logout'}},
		check:	{method:'GET', params: {action: 'check'}}
	});
});
