var kmServices = angular.module('kmServices', ['ngResource', 'ngStorage']);

kmServices.factory('Settings', function($resource) {
	return $resource('api/settings');
});

kmServices.factory('Ranking', function($resource) {
	return $resource('api/ranking/:mode?nocache=' + (new Date()).getTime(), {}, {
		query:	{method:'GET', params: {mode: '@mode'}, isArray: true}
	});
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

kmServices.factory('AuthService', function($resource, $q, SessionService) {
	var _loggedIn = false;
	var _r = $resource('api/auth/:action', {}, {
		login:	{method:'POST', params: {action: 'login'}},
		logout:	{method:'POST', params: {action: 'logout'}},
		check:  {method:'GET',  params: {action: 'check'}}
	});
	
	return {
		isLoggedIn: function() {
			return _loggedIn;
		},
		login: function(userId, pin) {
			var deferred = $q.defer();
			var p = deferred.promise;
			
 			_r.login({userId: userId, pin: pin}).$promise.then(function success(res) {
				_loggedIn = true;
				SessionService.currentUser = res;
				deferred.resolve(true);
			},
			function error(res) {
				_loggedIn = false;
				SessionService.currentUser = {id: null, name: null, role: null};
				deferred.resolve(false);
			});
			return p;
		},
		logout: function() {
			_r.logout();
			_loggedIn = false;
			SessionService.currentUser = {id: null, name: null, role: null};
		}
	}
});

kmServices.factory('SessionService', function() {
	return {
		currentUser: {
			id: null,
			name: null,
			role: null
		}
	};
});

kmServices.factory('StorageService', function($localStorage) {
	var ls = $localStorage;
	return {
		get: function (key) {
			return ls[key];
		},
		
		set: function (key, value) {
			ls[key] = value;
		}
	}
});