'use strict';

/* Controllers */

var kmControllers = angular.module('kmControllers', []);

kmControllers.controller('PageCtrl', function ($scope, $state, AuthService) {
	$scope.tabs = [
		{ link : 'user.match', label : 'Spiel', icon: 'edit' },
		{ link : 'user.ranking', label : 'Tabelle', icon: 'trophy' },
		{ link : 'user.statistics', label : 'Statistik', icon: 'bar-chart-o' },
		{ link : 'user.playersetup', label : 'Spieler', icon: 'user' },
		{ link : 'admin.administration', label : 'Administration', icon: 'cog' }
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
});

kmControllers.controller('LoginCtrl', function($scope, $state, $sce, $timeout, Player, StorageService, AuthService) {
	$scope.$emit('setTitle', '');
	$scope.user = null;
	$scope.pin = '';
	$scope.maxDigits = 5;
	$scope.locked = false;
	
	$scope.codeLeds = [];
	$scope.colorLed = 'default';
	
	for (var i = 0; i < $scope.maxDigits; ++i) {
		$scope.codeLeds.push({id: i, on: false});
	}
		
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
		for (var i in $scope.codeLeds) {
			$scope.codeLeds[i].on = (i < newVal.length);
		}
	});
	
	$scope.login = function() {
		$scope.locked = true;
		// TODO: only for test purposes, later: store user id only if login successful
		StorageService.set('userid', $scope.user.id);
		AuthService.login($scope.user.id, $scope.pin).then( function(isSuccess) {
			$scope.colorLed = (isSuccess ? 'green' : 'red');
			$timeout(function() {
				$scope.advance(isSuccess);
			}, 1500);
		});
	}
	
	$scope.advance = function(isSuccess) {
		$scope.pin = '';
		$scope.locked = false;
		$scope.colorLed = 'default';
		if (isSuccess) {
			$state.go('user.match');
		}	
	}
});

kmControllers.controller('RankingCtrl', function($scope, Ranking, SessionService) {
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

});

kmControllers.controller('MatchCtrl', function($scope, $http, $filter, Match, Settings, History, Statistic, Player, SessionService) {
	$scope.$emit('setTitle', 'Spiel eintragen');
	$scope.goals = ['*', '*'];
	$scope.players = new Array();

	$scope.statsMode = 'day';
	$scope.dateOffset = 0;
	$scope.dateFormatted = "";
	
	$scope.getDate = function() {
		var d = new Date();
		var factor = ($scope.statsMode == 'week' ? 7 : 1);
		d.setDate(d.getDate() + $scope.dateOffset * factor);
		return d;
	}
	
	$scope.loadHistory = function() {
		$scope.history = History.query({type:'today'});
	}

	$scope.loadStats = function() {
		var d = $scope.getDate();
		$scope.dateFormatted = $filter('stats')(d, $scope.dateOffset, $scope.statsMode);
		$scope.stats = Statistic.query({type: $scope.statsMode, param: $filter('date')(d, 'yyyy-MM-dd')});
	}
	
	Settings.get().$promise.then(function(response) {
		$scope.settings = response;
		$scope.resetCtrl();
	});

	$scope.onChangeStatsMode = function() {
		$scope.dateOffset = 0;
		$scope.loadStats();
	}
	
	$scope.addDateOffset = function(offset) {
		var newDateOffset = $scope.dateOffset + offset;
		// don't show future stats (which wouldn't make sense), show reload instead
		if (newDateOffset <= 0) {
			$scope.dateOffset = newDateOffset;
		}
		$scope.loadStats();
	}

	$scope.loadPlayers = function() {
		Player.query().$promise.then(function(response) {
			// index array for faster access
			for (var i in response) {
				$scope.players[response[i].id] = response[i];
			}
			$scope.loadHistory();
			$scope.loadStats();
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
				$scope.loadHistory();
				$scope.loadStats();
			});
		}
		$scope.submitting = false;
	};
	
	$scope.isCurrentUserId = function(id) {
		return (id == SessionService.currentUser.id);
	}
});

kmControllers.controller('StatisticsCtrl', function($scope, $http, Settings, Player, Statistic, $filter) {
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
});

kmControllers.controller('PlayerSetupCtrl', function($scope, Player) {
	$scope.$emit('setTitle', 'Spielerverwaltung');
	$scope.selectedPlayer = null;
	$scope.updating = false;
	$scope.result = { text: '', error: false, icon: '' }

	$scope.addPlayer = function() {
		Player.save({name: $scope.newplayer}).$promise.then(
			function (response) {
				$scope.result = {text: 'Spieler ' + response.name + ' erfolgreich hinzugefügt.', error: false }
				$scope.newplayer = "";
				$scope.loadPlayers();
			},
			function (response) {
				if (response.data.error) {
					$scope.result = {text: response.data.error.text, error: true }
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
		Player.update({id: $scope.selectedPlayer.id, active: $scope.selectedPlayer.active}).$promise.then(
			function(success) {
				$scope.updating = false;
			},
			function(error) {
				console.log(error);
				$scope.updating = false;
			}
		);
	}
});

kmControllers.controller('AdministrationCtrl', function($scope, $filter, Player, Match, History) {
	$scope.$emit('setTitle', 'Administration');
	
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
		Match.remove({matchId: match.id}).$promise.then(
			function(success) {
				$scope.loadMatches();
			},
			function (error) {
				console.log(error);
			}
		);
	};
	
	$scope.loadPlayers();
});