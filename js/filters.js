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
