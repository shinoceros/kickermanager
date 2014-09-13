'use strict';

/* Controllers */

var kmControllers = angular.module('kmControllers', []);

kmControllers.controller('PageCtrl', function ($scope) {
	$scope.tabs = [
		{ link : 'match', label : 'Spiel', icon: 'edit' },
		{ link : 'ranking', label : 'Tabelle', icon: 'trophy' },
		{ link : 'statistics', label : 'Statistik', icon: 'bar-chart-o' },
		{ link : 'playersetup', label : 'Spieler', icon: 'user' },
		{ link : 'administration', label : 'Administration', icon: 'cog' }
	]; 
    
	$scope.isCollapsed = true;
	
	$scope.collapse = function() {
		$scope.isCollapsed = true;
	}
	
	$scope.$on('setTitle', function(event, title) {
		event.stopPropagation();
		$scope.title = title;
	});
});

kmControllers.controller('LoginCtrl', function($scope, $state, $sce, $timeout, Player, StorageService, AuthService) {
	$scope.msg = '';
	$scope.user = null;
	$scope.pass = '';
	$scope.maxDigits = 5;
	$scope.blocked = false;
	
	$scope.codeLeds = [];
	$scope.colorLed = 'default';
	
	for (var i = 0; i < $scope.maxDigits; ++i) {
		$scope.codeLeds.push({id: i, on: false});
	}
		
	$scope.keys = [
		{code: '1', label: '1'},
		{code: '2', label: '2'},
		{code: '3', label: '3'},
		{code: '4', label: '4'},
		{code: '5', label: '5'},
		{code: '6', label: '6'},
		{code: '7', label: '7'},
		{code: '8', label: '8'},
		{code: '9', label: '9'},
		{code: 'X', label: '<i class="fa fa-times"></i>'},
		{code: '0', label: '0'},
		{code: 'B', label: '<i class="fa fa-chevron-left"></i>'}
	];
	for (var i in $scope.keys) {
		$scope.keys[i].label = $sce.trustAsHtml($scope.keys[i].label);
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
	
	$scope.onKeyClick = function(keyCode) {
		if (keyCode == 'X') {
			$scope.pass = '';
		}
		else if (keyCode == 'B') {
			if ($scope.pass.length > 0) {
				$scope.pass = $scope.pass.substring(0, $scope.pass.length - 1);
			}
		}
		else {
			if ($scope.pass.length < $scope.maxDigits) {
				$scope.pass += keyCode;
			}
		}
		$scope.checkLoginInfo();
	}
	
	$scope.$watch('pass', function(newVal, oldVal) {
		for (var i in $scope.codeLeds) {
			$scope.codeLeds[i].on = (i < newVal.length);
		}
	});
	
	$scope.checkLoginInfo = function() {
		if ($scope.user !== null && $scope.pass.length == $scope.maxDigits) {
			$scope.login();
		}
	}
	
	$scope.login = function() {
		$scope.blocked = true;
		// TODO: only for test purposes, later: store user id only if login successful
		StorageService.set('userid', $scope.user.id);
		AuthService.login($scope.user.name, $scope.pass).then( function(success) {
			$scope.colorLed = (success ? 'green' : 'red');
			$timeout(function() {
				$scope.advance(success);
			}, 1500);
		});
	}
	
	$scope.advance = function(success) {
		$scope.pass = '';
		$scope.blocked = false;
		$scope.colorLed = 'default';
		if (success) {
			$state.go('match');
		}	
	}
});

kmControllers.controller('RankingCtrl', function($scope, Ranking) {
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

	$scope.isUserLoggedIn = function(userName) {
		//@ANDY: get current user name
		var loggedOnUser = 'XXXX';
		return (userName === loggedOnUser);
	}
	$scope.needsExercise = function(gamesPlayed) {
		//@ANDY: Value shall be taken from database' options table.
		var exerciseLimit = 10;
		return (gamesPlayed < exerciseLimit);
	}

});

kmControllers.controller('MatchCtrl', function($scope, $http, $filter, Match, Settings, History, Statistic, Player) {
	$scope.$emit('setTitle', 'Spiel eintragen');
	$scope.goals = ['*', '*'];
	$scope.players = new Array();

	$scope.eloMode = 'day';
	$scope.eloOffset = 0;
	$scope.dateFormatted = "";
	
	$scope.getDate = function() {
		var d = new Date();
		var factor = ($scope.eloMode == 'week' ? 7 : 1);
		d.setDate(d.getDate() + $scope.eloOffset * factor);
		return d;
	}
	
	$scope.loadHistory = function() {
		$scope.history = History.query({type:'today'});
	}

	$scope.loadStats = function() {
		var d = $scope.getDate();
		$scope.dateFormatted = $filter('stats')(d, $scope.eloOffset, $scope.eloMode);
		$scope.stats = Statistic.query({type: $scope.eloMode, param: $filter('date')(d, 'yyyy-MM-dd')});
	}
	
	Settings.get().$promise.then(function(response) {
		$scope.settings = response;
		$scope.resetCtrl();
	});

	$scope.onChangeEloMode = function() {
		$scope.eloOffset = 0;
		$scope.loadStats();
	}
	
	$scope.changeDate = function(offset) {
		$scope.eloOffset += offset;
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
	
	$scope.isUserLoggedIn = function(userName) {
		//@ANDY: get current user name
		var loggedOnUser = 'XXXX';
		return (userName === loggedOnUser);
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

kmControllers.controller('AdministrationCtrl', function($scope, $filter, Admin, Player, Match, History) {
	$scope.$emit('setTitle', 'Administration');
	
	$scope.checked = false;
	$scope.authed = false;
	$scope.players = new Array();
	$scope.date = new Date();
	$scope.user = '';
	$scope.pw = '';
	
	$scope.init = function() {
		if ($scope.authed) {
			$scope.loadPlayers();
		}
	};
	
	// first check if we are logged in
	Admin.check().$promise.then(function(response) {
		$scope.checked = true;
		if (response.check) {
			$scope.authed = true;
			$scope.init();
		}
	});
	
	$scope.login = function() {
		Admin.login({user: $scope.user, pw: $scope.pw}).$promise.then(
			function (success) {
				$scope.authed = true;
				$scope.init();
			},
			function (error) {
				$scope.user = '';
				$scope.pw = '';
				$scope.authed = false;
			}
		);
	};

	$scope.logout = function() {
		Admin.logout({}).$promise.then(
			function (success) {
				$scope.user = '';
				$scope.pw = '';
				$scope.authed = false;
			},
			function (error) {
				$scope.user = '';
				$scope.pw = '';
				$scope.authed = false;
			}
		);
	};

	$scope.loadPlayers = function() {
		Player.query().$promise.then(function(response) {
			// index array for faster access
			for (var i in response) {
				$scope.players[response[i].id] = response[i];
			}
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
});