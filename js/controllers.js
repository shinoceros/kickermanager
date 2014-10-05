'use strict';

/* Controllers */

angular
.module('kmControllers', [])
.controller('PageCtrl', function ($scope, $state, AuthService) {
	$scope.tabs = [
		{ link : 'user.match', label : 'Spiel', icon: 'edit' },
		{ link : 'user.ranking', label : 'Tabelle', icon: 'trophy' },
		{ link : 'user.statistics', label : 'Statistik', icon: 'bar-chart-o' },
		{ link : 'user.settings', label : 'Einstellungen', icon: 'cog' },
		{ link : 'admin.main', label : 'Administration', icon: 'wrench' }
	];
	
	angular.forEach($scope.tabs, function(item, idx) {
		item.show = false;
	});
    
	$scope.isCollapsed = true;
	
	$scope.collapse = function() {
		$scope.isCollapsed = true;
	}
	
	$scope.$on('setTitle', function(event, title) {
		event.stopPropagation();
		$scope.title = title;
	});
	
	$scope.loggedIn = false;
	
	$scope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams) {
		angular.forEach($scope.tabs, function(tab, idx) {
			tab.show = AuthService.authorize($state.get(tab.link).data.access);
		});
		$scope.loggedIn = AuthService.isLoggedIn();
	});
	
	$scope.logout = function() {
		AuthService.logout().then(function success() {
			$state.go('anon.login');
		});
	}
})
.controller('LoginCtrl', function($scope, $state, $stateParams, $timeout, Player, StorageService, AuthService) {
	if (AuthService.isLoggedIn()) {
		$state.go($stateParams.redirect || 'user.match');
	}
	$scope.$emit('setTitle', '');
	$scope.user = null;
	$scope.pin = '';
	$scope.maxDigits = 5;
	$scope.loading = false;
	
	$scope.colorLed = 'default';
	
	// fetch all players
	Player.query().$promise.then(
		function (data) {
			$scope.players = data;
			// try to get last logged in user from local storage
			var storedUserId = StorageService.get('userid');
			if (angular.isNumber(storedUserId)) {
				for (var i in data) {
					if (data[i].id == storedUserId) {
						$scope.user = data[i];
					}
				}
			}
		}
	);
	
	$scope.$watch('pin', function(newVal, oldVal) {
		if ($scope.user !== null && $scope.pin.length == $scope.maxDigits) {
			$scope.login();
		}
	});
	
	$scope.login = function() {
		$scope.loading = true;
		AuthService.login($scope.user.id, $scope.pin).then( function(isSuccess) {
			$scope.colorLed = (isSuccess ? 'green' : 'red');
			$timeout(function() {
				$scope.advance(isSuccess);
			}, 1500);
		});
	}
	
	$scope.advance = function(isSuccess) {
		$scope.pin = '';
		$scope.loading = false;
		$scope.colorLed = 'default';
		if (isSuccess) {
			$state.go($stateParams.redirect || 'user.match');
		}	
	}
})
.controller('RankingCtrl', function($scope, Ranking, SessionService) {
	$scope.$emit('setTitle', 'Tabelle');
	$scope.rankingMode = 'total';
	
	$scope.loadRanking = function() {
		$scope.ranking = Ranking.query({mode: $scope.rankingMode});
	}

	$scope.loadRanking();
	
	$scope.onChangeRankingMode = function() {
		$scope.loadRanking();
	}

	$scope.players = null;
	
	$scope.hasPlayed = function(r) {
		return r.total > 0;
	}

	$scope.isCurrentUserId = function(id) {
		return (id == SessionService.currentUser.id);
	}

	$scope.needsExercise = function(gamesPlayed) {
		//@ANDY: Value shall be taken from database' options table.
		var exerciseLimit = 10;
		return (gamesPlayed < exerciseLimit);
	}

})
.controller('MatchCtrl', function($scope, $http, $filter, $sce, Match, Settings, History, Statistic, Player, SessionService) {
	$scope.$emit('setTitle', 'Spiel eintragen');
	$scope.goals = ['*', '*'];
	$scope.players = new Array();
	$scope.listModes = [
		{ id: 0, label: 'Ergebnisse', type: 'results', data: null },
		{ id: 1, label: 'Tag',        type: 'stats',   data: null },
		{ id: 2, label: 'Woche',      type: 'stats',   data: null }
	];

	angular.forEach($scope.listModes, function(listMode) {
		listMode.label = $sce.trustAsHtml(listMode.label);
	});
	
	$scope.currentListMode = { item: $scope.listModes[0] };
	
	$scope.loadData = function() {
		var d = $filter('date')(new Date(), 'yyyy-MM-dd');
		$scope.listModes[0].data = History.query({type: 'date', param1: d})
		$scope.listModes[1].data = Statistic.query({type: 'day', param: d})
		$scope.listModes[2].data = Statistic.query({type: 'week', param: d});
	}
	
	Settings.get().$promise.then(function(response) {
		$scope.settings = response;
		$scope.resetCtrl();
	});

	$scope.loadPlayers = function() {
		Player.query().$promise.then(function(response) {
			// index array for faster access
			for (var i in response) {
				$scope.players[response[i].id] = response[i];
			}
			$scope.loadData();
		});
	}

	$scope.loadPlayers();

	$scope.resetCtrl = function() {
		$scope.submitting = false;
		$scope.selectedPlayer = [null, null, null, null];
		$scope.goals = [$scope.settings.maxGoals, $scope.settings.maxGoals];
		$scope.invalidPlayer = [false, false, false, false];
		$scope.invalidGoals = false;
		$scope.validated = false;
	}
	
	$scope.hasDuplicate = function(p) {
		var c = 0;
		for (var i in $scope.selectedPlayer) {
			c = c + ($scope.selectedPlayer[i] === p ? 1 : 0);
		}
		return c > 1;
	}
	
	$scope.validateForm = function(force) {

		// skip validation if not forced (on submitting) and not validated
		if (!force && !$scope.validated)
		{
			return true;
		}
			
		for (var i = 0; i < $scope.selectedPlayer.length; ++i)
		{
			var p = $scope.selectedPlayer[i];
			$scope.invalidPlayer[i] = (p === null || $scope.hasDuplicate(p));
		}
		var isMax0 = ($scope.goals[0] == $scope.settings.maxGoals);
		var isMax1 = ($scope.goals[1] == $scope.settings.maxGoals);
		$scope.invalidGoals = (isMax0 && isMax1) || (!isMax0 && !isMax1);
		
		$scope.validated = true;
		return ($scope.invalidPlayer.indexOf(true) == -1) && (!$scope.invalidGoals);
	}
	
	$scope.submitForm = function() {
		$scope.submitting = true;
		
		// all valid
		if ($scope.validateForm(true))
		{
			Match.post({
				f1: $scope.selectedPlayer[0].id,
				b1: $scope.selectedPlayer[1].id,
				f2: $scope.selectedPlayer[2].id,
				b2: $scope.selectedPlayer[3].id,
				goals1: $scope.goals[0],
				goals2: $scope.goals[1]
			}).$promise.then(function(success) {
				$scope.resetCtrl();
				$scope.loadData();
			});
		}
		$scope.submitting = false;
	};
	
	$scope.isCurrentUserId = function(id) {
		return (id == SessionService.currentUser.id);
	}
})
.controller('UserSettingsCtrl', function($scope) {
	$scope.$emit('setTitle', 'Einstellungen');
	
})
.controller('UserChangePwCtrl', function($scope) {
	$scope.$emit('setTitle', 'Passwort ändern');
	
})
.controller('StatisticsCtrl', function($scope, $http, Settings, Player, Statistic, $filter) {
	$scope.$emit('setTitle', 'Statistik');

	Settings.get().$promise.then(function(response) {
		$scope.settings = response;

		$scope.chartConfig = {
			options: {
				chart: { type: 'line' },
				colors: ['#7cb5ec', '#f7a35c'],
				title: { text: 'ELO-Trend' },
				tooltip: {
					dateTimeLabelFormats: {day:"%d.%m.%Y"},
					pointFormat: "ELO: {point.y:.1f}"
				},
				xAxis: {
					type: 'datetime',
					dateTimeLabelFormats: {
						month: '%d.%m.',
						year: '%b'
					},
					title: {
						text: 'Datum'
					}
				},
				yAxis: {
					title: {
						text: 'ELO'
					},
					plotLines: [{
						color: 'red',
						width: 2,
						value: $scope.settings.baseELO
					}]
				},
				plotOptions: {
					line: {
						marker: {
							radius: 0,
							lineWidth: 0
								}
							}
						}
			}
		};
	});
		
	Player.query().$promise.then(function(response) {
		$scope.players = $filter('active')(response);
	});
	
	$scope.player1 = null;
	$scope.player2 = null;
	
	$scope.loadData = function() {
		if ($scope.player1 != null) {
			var playerString = "" + $scope.player1;
			if ($scope.player2 != null) {
				var playerString = playerString + "," + $scope.player2;
			}
			Statistic.query({type:'elotrend', param:playerString}).$promise.then(function(response) {
				// convert date strings for highcharts
				for (var s in response) {
					for (var d in response[s].data) {
						var parts = response[s].data[d][0].split('-');
						response[s].data[d][0] = Date.UTC(parts[0], parts[1]-1, parts[2]);
					}
				}
				$scope.chartConfig.series = response;
			});
		}
	}
})
.controller('AdminMainCtrl', function($scope) {
	$scope.$emit('setTitle', 'Administration');
})
.controller('AdminPlayerSetupCtrl', function($scope, $sce, Admin, Player, PopupService) {
	$scope.$emit('setTitle', 'Spieler verwalten');
	$scope.selectedPlayer = null;
	$scope.updating = false;

	$scope.addPlayer = function() {
		Admin.addPlayer({name: $scope.newplayer}).$promise.then(
			function (response) {
				var msg = 'Spieler <b>' + response.name + '</b> erfolgreich hinzugefügt.<br>Pin: <b>' + response.pin + '</b>';
				PopupService.open(PopupService.TYPE.PT_SUCCESS, msg);
				$scope.newplayer = "";
				$scope.loadPlayers();
			},
			function (response) {
				if (response.data.error) {
					PopupService.open(PopupService.TYPE.PT_ERROR, response.data.error.text);
				}
			}
		);
	}
	$scope.loadPlayers = function() {
		$scope.players = Player.query();
	};
	$scope.loadPlayers();
	
	$scope.updatePlayer = function() {
		$scope.updating = true;
		Admin.updatePlayer({id: $scope.selectedPlayer.id, active: $scope.selectedPlayer.active, role: $scope.selectedPlayer.role}).$promise.then(
			function(success) {
				$scope.updating = false;
			},
			function(error) {
				$scope.updating = false;
			}
		);
	}
	$scope.resetPin = function() {
		Admin.resetPin({id: $scope.selectedPlayer.id}).$promise.then(
			function (response) {
				var name = '';
				angular.forEach($scope.players, function(item) {
					name = (item.id == response.id ? item.name : name);
				});
				var msg = 'Neuer Pin  für ' + name + ': <b>' + response.pin + '</b>';
				PopupService.open(PopupService.TYPE.PT_SUCCESS, msg);
			},
			function (response) {
				if (response.data.error) {
					PopupService.open(PopupService.TYPE.PT_ERROR, response.data.error.text);
				}
			}
		)
	}
})
.controller('AdminMatchEditCtrl', function($scope, $filter, Player, Admin, History) {
	$scope.$emit('setTitle', 'Ergebnisse bearbeiten');
	
	$scope.players = new Array();
	$scope.date = new Date();
		
	$scope.loadPlayers = function() {
		Player.query().$promise.then(function(response) {
			// index array for faster access
			angular.forEach(response, function(value, idx) {
				$scope.players[value.id] = value;
			});
			$scope.loadMatches();
		});
	};

	$scope.loadMatches = function() {
		History.query({type: 'date', param1: $filter('date')($scope.date, 'yyyy-MM-dd')}).$promise.then(function(response) {
			$scope.history = response;
		});
	};
	
	$scope.prevDate = function() {
		$scope.date.setDate($scope.date.getDate() - 1);
		$scope.loadMatches();
	}
	
	$scope.nextDate = function() {
		$scope.date.setDate($scope.date.getDate() + 1);
		$scope.loadMatches();
	}

	$scope.editMatch = function(match) {
		console.log(match);
	};

	$scope.deleteMatch = function(match) {
		Admin.deleteMatch({id: match.id}).$promise.then(
			function(success) {
				$scope.loadMatches();
			},
			function (error) {
				console.log(error);
			}
		);
	};
	
	$scope.loadPlayers();
})
.controller('PopupCtrl', function($scope, $modalInstance, $sce, content) {

	$scope.content = content;
	
	$scope.trust = function(text) {
		return $sce.trustAsHtml(text);
	}
	
	$scope.onClose = function() {
		$modalInstance.close();
	}

	$scope.onDismiss = function() {
		$modalInstance.dismiss();
	}

});
