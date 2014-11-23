var kmServices = angular.module('kmServices', ['ngResource', 'ngStorage'])
.factory('Settings', function($resource) {
	return $resource('api/settings');
})
.factory('Ranking', function($resource) {
	return $resource('api/ranking/:mode', {}, {
		query:	{method:'GET', params: {mode: '@mode'}, isArray: true}
	});
})
.factory('Player', function($resource) {
	return $resource('api/player/:playerId', {}, {
		query:	{method:'GET', params: {playerId: ''}, isArray: true},
		post:	{method:'POST'},
		update:	{method:'PUT', params: {playerId: '@playerId'}}
	});
})
.factory('Admin', function($resource) {
	return $resource('api/admin/:cat/:id/:func', {}, {
		addPlayer:		{method:'POST',   params: {cat: 'player'}},
		updatePlayer:	{method:'PUT',    params: {cat: 'player'}},
		resetPin:		{method:'GET',    params: {cat: 'player', func: 'resetpin'}},
		updateMatch:	{method:'PUT',    params: {cat: 'match'}},
		deleteMatch:	{method:'DELETE', params: {cat: 'match'}},
		startNewSeason:	{method:'GET',    params: {cat: 'game', func: 'startnewseason'}}
	});
})
.factory('Match', function($resource) {
	return $resource('api/match/:matchId', {}, {
		post:	{method:'POST'}
	});
})
.factory('History', function($resource) {
	return $resource('api/history/:type/:param1/:param2');
})
.factory('Statistic', function($resource) {
	return $resource('api/stats/:type/:param');
})
.factory('UserSettings', function($resource, $q) {
	var _r = $resource('api/usersettings/:action', {}, {
		changePin: {method:'POST', params: {action: 'changepin'}}
	});
	return {
		changePin: function(oldPin, newPin) {
			var deferred = $q.defer();
			var p = deferred.promise;
			
 			_r.changePin({oldpin: oldPin, newpin: newPin}).$promise.then(
				function success(res) {
					deferred.resolve();
				},
				function error(res) {
					deferred.reject(res.data.error.text);
				}
			);
			return p;
		}
	}
})
.factory('AuthService', function($resource, $q, SessionService, StorageService) {

	var accessLevels = routingConfig.accessLevels
		, userRoles = routingConfig.userRoles;

	var _r = $resource('api/auth/:action', {}, {
		login:	   {method:'POST', params: {action: 'login'}},
		logout:	   {method:'POST', params: {action: 'logout'}},
		check:     {method:'GET',  params: {action: 'check'}}
	});
	
	return {
		authorize: function(accessLevel) {
			role = SessionService.currentUser.role;
			return accessLevel.bitMask & role.bitMask;
		},
		isLoggedIn: function() {
			return (SessionService.currentUser.id !== null);
		},
		login: function(userId, pin) {
			var deferred = $q.defer();
			var p = deferred.promise;
			
 			_r.login({userId: userId, pin: pin}).$promise.then(
				function success(res) {
					SessionService.currentUser = {id: res.id, name: res.name, role: userRoles[res.role]};
					StorageService.set('userid', res.id);
					deferred.resolve({authed: true});
				},
				function error(res) {
					SessionService.currentUser = {id: null, name: null, role: userRoles.public};
					deferred.resolve({authed: false, delay: res.data.delay});
				}
			);
			return p;
		},
		logout: function() {
			var deferred = $q.defer();
			var p = deferred.promise;
			_r.logout().$promise.then(function success(res) {
				deferred.resolve();
			},
			function error(res) {
				deferred.resolve();
			});
			SessionService.currentUser = {id: null, name: null, role: userRoles.public};
			return p;
		},
		check: function() {
			var deferred = $q.defer();
			var p = deferred.promise;
			_r.check().$promise.then(function success(res) {
				if (res.result) {
					SessionService.currentUser = {id: res.id, name: res.name, role: userRoles[res.role]};
					deferred.resolve(true);
				}
				else {
					SessionService.currentUser = {id: null, name: null, role: userRoles.public};
					deferred.resolve(false);
				}
			});
			return p;
		}
	}
})
.factory('SessionService', function() {
	return {
		currentUser: {
			id: null,
			name: null,
			role: routingConfig.userRoles.public
		}
	};
})
.factory('StorageService', function($localStorage) {
	var ls = $localStorage;
	return {
		get: function (key) {
			return ls[key];
		},
		
		set: function (key, value) {
			ls[key] = value;
		},
		
		delete: function(key) {
			delete ls[key];
		}
	}
})
.factory('PopupService', function($modal) {

	var _type = {
		PT_SUCCESS: 0,
		PT_ERROR:   1,
		PT_SELECT:  2,
		PT_WARNING: 3
	};
	
	var _createContent = function(type, msg) {
		var c = {
			dialogClass: '',
			iconClass: '',
			buttonClass: '',
			closeLabel: '',
			dismissLabel: '',
			msg: msg
		};
		switch (type) {
			case _type.PT_ERROR:
				c.dialogClass  = 'alert-danger';
				c.iconClass    = 'fa-warning';
				c.buttonClass  = 'btn-danger';
				c.closeLabel   = 'OK';
				c.dismissLabel = '';
				break;
			case _type.PT_SUCCESS:
				c.dialogClass  = 'alert-success';
				c.iconClass    = 'fa-check';
				c.buttonClass  = 'btn-success';
				c.closeLabel   = 'OK';
				c.dismissLabel = '';
				break;
			case _type.PT_SELECT:
				c.dialogClass  = 'alert-warning';
				c.iconClass    = 'fa-question';
				c.buttonClass  = 'btn-warning';
				c.closeLabel   = 'Ja';
				c.dismissLabel = 'Nein';
				break;
			case _type.PT_WARNING:
				c.dialogClass  = 'alert-warning';
				c.iconClass    = 'fa-warning';
				c.buttonClass  = 'btn-warning';
				c.closeLabel   = 'OK';
				c.dismissLabel = '';
				break;
		}
		return c;
	}
	
	return {
		TYPE: _type,
		open: function(type, msg) {
			var modalOptions = {
				templateUrl: 'partials/modal.message.html',
				controller: function($scope, $modalInstance, $sce) {
					$scope.content = _createContent(type, msg);
					$scope.trust = function(text) {
						return $sce.trustAsHtml(text);
					}
					$scope.onClose = function() {
						$modalInstance.close();
					}
					$scope.onDismiss = function() {
						$modalInstance.dismiss();
					}
				},
				size: 'sm',
			};
			return $modal.open(modalOptions).result;
		}
	}
})
.factory('ErrorLookupSvc', function() {
	var _errorMap = [
		{ c: 'E_INVALID_OLD_PIN',    t: 'Alte PIN ung&uuml;ltig.'},
		{ c: 'E_USER_NAME_TAKEN',    t: 'Name bereits vergeben.'},
		{ c: 'E_INVALID_USER_ID',    t: 'User ID ung&uuml;ltig.'},
		{ c: 'E_TRIVIAL_NEW_PIN',    t: 'Neue PIN zu trivial. Nochmal!'}
	];
	return {
		toText: function(errorCode) {
			var text = errorCode;
			angular.forEach(_errorMap, function(item) {
				if (errorCode == item.c) {
					text = item.t;
				}
			});
			return text;
		}
	}
});