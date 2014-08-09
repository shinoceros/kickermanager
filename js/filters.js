'use strict';

/* Controllers */

var kickermanagerFilters = angular.module('kickermanagerFilters', []);

kickermanagerFilters.filter('float', function() {
	return function(input, size) {
		return input.toFixed(size);
	}
});

kickermanagerFilters.filter('abs', function() {
	return function(input) {
		return Math.abs(input);
	}
});

kickermanagerFilters.filter('percent', function() {
	return function(input, size) {
		var f = 100 * input;
		return f.toFixed(size) + "%";
	}
});

kickermanagerFilters.filter('active', function() {
	return function (players) {
		var filtered = [];
		for (var i in players) {
			if (players[i].active == 1) {
				filtered.push(players[i]);
			}
		}
		return filtered;
	};
});