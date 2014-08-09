'use strict';

/* Controllers */

var kickermanagerControllers = angular.module('kickermanagerControllers', []);

kickermanagerControllers.controller('PageCtrl', function ($scope, $location) {
	$scope.tabs = [
		{ link : '#/match', label : 'Spiel', icon: 'edit' },
		{ link : '#/ranking', label : 'Tabelle', icon: 'trophy' },
		{ link : '#/statistics', label : 'Statistik', icon: 'bar-chart-o' },
		{ link : '#/playersetup', label : 'Spieler', icon: 'user' },
		{ link : '#/configuration', label : 'Konfiguration', icon: 'cog' }
	]; 
    
	$scope.isCollapsed = true;
	
	$scope.$on('setTitle', function(event, title) {
		event.stopPropagation();
		$scope.title = title;
	});
	
	$scope.selectedTab = $scope.tabs[0];    
	$scope.setSelectedTab = function(tab) {
		$scope.selectedTab = tab;
		$scope.isCollapsed = true;
	}
  
	$scope.tabClass = function(tab) {
		if ($scope.selectedTab == tab) {
			return "active";
		} else {
			return "";
		}
	}
});

kickermanagerControllers.controller('RankingCtrl', function($scope, Ranking) {
	$scope.$emit('setTitle', 'Tabelle');
	$scope.ranking = Ranking.query();
	
	$scope.hasPlayed = function(r) {
		return r.total > 0;
	}	
});

kickermanagerControllers.controller('MatchCtrl', function($scope, $http, $filter, Match, History, Statistic, Player) {
	$scope.$emit('setTitle', 'Spiel eintragen');
	$scope.goals = ['*', '*'];
	
	$scope.loadHistory = function() {
		$scope.history = History.query({type:'today'});
	}

	$scope.loadDailyStats = function() {
		$scope.dailyStats = Statistic.query({type:'daily', param:'today'});
	}
	
	$http.get("api/settings").success(function(response) {
		$scope.settings = response;
		$scope.$emit('setTitle', 'Spiel eintragen - Saison ' + $scope.settings.currentSeason);
		$scope.resetCtrl();
	});

	Player.query().$promise.then(function(response) {
		$scope.players = $filter('active')(response);
	});

	$scope.loadHistory();
	$scope.loadDailyStats();

	$scope.resetCtrl = function() {
		$scope.submitting = false;
		$scope.selectedPlayer = [null, null, null, null];
		$scope.goals = [$scope.settings.maxGoals, $scope.settings.maxGoals];
		$scope.invalidPlayer = [false, false, false, false];
		$scope.invalidGoals = false;
		$scope.validated = false;
	}
	
	$scope.hasDuplicate = function(pId) {
		return $scope.selectedPlayer.indexOf(pId) != $scope.selectedPlayer.lastIndexOf(pId);
	}
	
	$scope.validateForm = function(force) {

		// skip validation if not forced (on submitting) and not validated
		if (!force && !$scope.validated)
		{
			return true;
		}
			
		for (var i = 0; i < $scope.selectedPlayer.length; ++i)
		{
			var pId = $scope.selectedPlayer[i];
			$scope.invalidPlayer[i] = (pId == null || $scope.hasDuplicate(pId));
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
			Match.save({
				f1: $scope.selectedPlayer[0],
				b1: $scope.selectedPlayer[1],
				f2: $scope.selectedPlayer[2],
				b2: $scope.selectedPlayer[3],
				goals1: $scope.goals[0],
				goals2: $scope.goals[1]
			}).$promise.then(function(data) {
				$scope.resetCtrl();
				$scope.loadHistory();
				$scope.loadDailyStats();
			});
		}
		$scope.submitting = false;
	};
});

kickermanagerControllers.controller('StatisticsCtrl', function($scope, $http, Player, Statistic, $filter) {
	$scope.$emit('setTitle', 'Statistik');

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
						value: 1200.0
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

kickermanagerControllers.controller('PlayerSetupCtrl', function($scope, Player) {
	$scope.$emit('setTitle', 'Spielerverwaltung');
	$scope.result = { text: '', error: false, icon: '' }
	$scope.addPlayer = function() {
		Player.save({name: $scope.newplayer}).$promise.then(
			function (response) {
				$scope.result = {text: 'Spieler ' + response.name + ' erfolgreich hinzugefügt.', error: false }
			},
			function (response) {
				if (response.data.error) {
					$scope.result = {text: response.data.error.text, error: true }
				}
			}
		);
	}

});

kickermanagerControllers.controller('ConfigurationCtrl', function($scope) {
	$scope.$emit('setTitle', 'Configuration');
});
