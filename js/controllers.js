'use strict';

/* Controllers */

angular
.module('kmControllers', [])
.controller('PageCtrl', function ($scope, $state, $sce, AuthService) {
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
		$scope.title = $sce.trustAsHtml(title);
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
.controller('UserChangePinCtrl', function($scope, $state, $sce, UserSettings, PopupService) {
	$scope.$emit('setTitle', 'Passwort &auml;ndern');

	$scope.states = [
		{ msg: 'Alte PIN eingeben', pin: '' },
		{ msg: 'Neue PIN eingeben', pin: '' },
		{ msg: 'Neue PIN wiederholen', pin: '' }
	];
	angular.forEach($scope.states, function(item) {
		item.msg = $sce.trustAsHtml(item.msg);
	});
	$scope.maxDigits = 5;
	$scope.loading = false;
	$scope.colorLed = 'default';

	$scope.resetPins = function() {
		angular.forEach($scope.states, function(item) {
			item.pin = '';
		});
		$scope.stateIdx = 0;
		$scope.current = $scope.states[$scope.stateIdx];
	}
	$scope.resetPins();
	
	$scope.$watch('current.pin', function(newVal, oldVal) {
		// max digits entered
		if (newVal.length == $scope.maxDigits) {
			$scope.stateIdx++;
			// last state?
			if ($scope.stateIdx >= $scope.states.length) {
				// do both new pins differ?
				if  ($scope.states[1].pin != $scope.states[2].pin) {
					PopupService.open(PopupService.TYPE.PT_ERROR, 'Wiederholung fehlerhaft. Nochmal!');
					$scope.resetPins();
				}
				// are old and new pin equal?
				else if  ($scope.states[0].pin == $scope.states[1].pin) {
					PopupService.open(PopupService.TYPE.PT_ERROR, 'Alte und neue PIN sind identisch. Nochmal!');
					$scope.resetPins();
				}
				else {
					UserSettings.changePin($scope.states[0].pin, $scope.states[1].pin).then(
						function success() {
							PopupService.open(PopupService.TYPE.PT_SUCCESS, 'PIN ge&auml;ndert.').then(
								function() {
									$state.go('^.settings');
								}
							);
						},
						function error(msg) {
							PopupService.open(PopupService.TYPE.PT_ERROR, msg);
						}
					);
				}
			}
			else {
				$scope.current = $scope.states[$scope.stateIdx];
			}
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
.controller('AdminGameSetupCtrl', function($scope, Settings, Admin, PopupService) {
	$scope.$emit('setTitle', 'Spieloptionen');
	$scope.settings = Settings.get();
	
	$scope.startNewSeason = function() {
		PopupService.open(PopupService.TYPE.PT_SELECT, 'Neue Saison jetzt starten?').then(
			function() {
				Admin.startNewSeason().$promise.then(
					function (response) {
						var msg = 'Neue Saison gestartet! Yeah!';
						PopupService.open(PopupService.TYPE.PT_SUCCESS, msg);
						$scope.settings = Settings.get();
					},
					function (response) {
						if (response.data.error) {
							PopupService.open(PopupService.TYPE.PT_ERROR, response.data.error.text);
						}
					}
				)
			}
		);
	}
})
.controller('AdminPlayerSetupCtrl', function($scope, $sce, Admin, Player, PopupService) {
	$scope.$emit('setTitle', 'Spieler verwalten');
	$scope.selectedPlayer = null;
	$scope.updating = false;

	$scope.addPlayer = function() {
		Admin.addPlayer({name: $scope.newplayer}).$promise.then(
			function (response) {
				var msg = 'Spieler <b>' + response.name + '</b> hinzugef&uuml;gt. Pin: <b>' + response.pin + '</b>';
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
		var name = $scope.selectedPlayer.name;
		PopupService.open(PopupService.TYPE.PT_SELECT, 'Soll die PIN f&uuml;r <b>' + name + '</b> wirklich ge&auml;ndert werden?').then(
			function() {
				Admin.resetPin({id: $scope.selectedPlayer.id}).$promise.then(
					function (response) {
						var msg = 'Neuer Pin f&uuml;r ' + name + ': <b>' + response.pin + '</b>';
						PopupService.open(PopupService.TYPE.PT_SUCCESS, msg);
					},
					function (response) {
						if (response.data.error) {
							PopupService.open(PopupService.TYPE.PT_ERROR, response.data.error.text);
						}
					}
				)
			}
		);
	}
})
.controller('AdminMatchEditCtrl', function($scope, $filter, Player, Admin, History, PopupService) {
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
		PopupService.open(PopupService.TYPE.PT_SELECT, 'Soll das Ergebnis wirklich gel&ouml;scht werden?').then(
			function() {
				Admin.deleteMatch({id: match.id}).$promise.then(
					function(success) {
						$scope.loadMatches();
					},
					function (error) {
						console.log(error);
					}
				);
			}
		)
	};

	$scope.loadPlayers();
});