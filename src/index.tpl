<!DOCTYPE html>
<html lang="en" ng-app="kmApp">
	<head>
		<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
		<meta http-equiv="Content-Type" content="text/html; charset=iso-8859-1">
		<!-- @if production=false -->
		<script src="js/angular/1.3.13/angular.js"></script>
		<script src="js/angular/1.3.13/angular-resource.js"></script>
		<script src="js/angular/1.3.13/angular-animate.js"></script>
		<script src="js/angular-ui-router/angular-ui-router-0.2.13.js"></script>
		<script src="js/ui-bootstrap/ui-bootstrap-tpls-0.12.1.js"></script>
		<script src="js/highcharts/standalone-framework-4.1.1.js"></script>
		<script src="js/highcharts/highcharts-4.1.1.js"></script>
		<script src="js/highcharts/highcharts-ng-0.0.7.js"></script>
		<script src="js/kickermanager/app.js"></script>
		<script src="js/kickermanager/controllers.js"></script>
		<script src="js/kickermanager/services.js"></script>
		<script src="js/kickermanager/filters.js"></script>
		<script src="js/kickermanager/directives.js"></script>
		<script src="js/kickermanager/routingConfig.js"></script>
		<script src="js/other/loading-bar-0.7.0.js"></script>
		<script src="js/other/fastclick.js"></script>
		<script src="js/other/ngStorage.js"></script>
		<!-- @endif -->
		<!-- @if production=true -->
		<script src="js/<!-- @echo TARGET.JS -->"></script>
		<!-- @endif -->

		<!-- @if production=false -->
		<link rel="stylesheet" href="css/bootstrap.min.css">
		<link rel="stylesheet" href="css/kickermanager.css">
		<link rel="stylesheet" href="css/loading-bar-0.7.0.css">
		<link rel="stylesheet" href="css/font-awesome.min.css">
		<!-- @endif -->
		<!-- @if production=true -->
		<link rel="stylesheet" href="css/<!-- @echo TARGET.CSS -->">
		<!-- @endif -->
		<title>Kickerrunde</title>
	</head>
	<body ng-controller="PageCtrl">
		<!-- NAVBAR -->
		<nav class="navbar navbar-inverse navbar-fixed-top" role="navigation">
			<div class="container-fluid">
				<div class="navbar-header">
					<button class="navbar-toggle btn btn-primary" type="button" ng-click="isCollapsed = !isCollapsed">
					<span class="sr-only">Toggle navigation</span>
					<i class="fa fa-bars"></i>
					</button>
					<span class="navbar-brand" >&nbsp;&nbsp;&nbsp;&nbsp;Kickerrunde</span>
				</div>
				<div collapse="isCollapsed" class="navbar-collapse">
					<ul class="nav navbar-nav navbar-left">
						<!--  ui-sref-active="active" -->
						<li ng-repeat="tab in tabs"><a ui-sref="{{tab.link}}" ng-if="tab.show" ng-click="collapse()">
							<i class="fa fa-{{tab.icon}}"></i> {{tab.label}}</a>
						</li>
					</ul>
					<ul class="nav navbar-nav navbar-right">
						<li><a ui-sref="user.logout" ng-if="loggedIn" ng-click="collapse(); logout()">
							<i class="fa fa-power-off"></i> Logout</a>
						</li>
					</ul>
				</div><!-- /.nav-collapse -->
			</div><!-- /.container-fluid -->
		</nav>

		<div style="max-width: 800px; margin: auto;">
			<div class="text-center">
				<h3 ng-bind-html="title"></h3>
			</div>
			<div ui-view></div>
		</div>
	</body>
</html>
