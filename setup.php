<html>
<body>
<?php
	ini_set('max_execution_time', 900);
	include('api/dbconfig.php');
	include('api/functions.php');
	$baseELO = 1200.0;
	$maxGoals = 6;
	
	// ========================================================================
	
	$startTime = microtime(true); 
	echo "<pre>";
	// db init
	$db = mysqli_connect(DBConfig::$host, DBConfig::$user, DBConfig::$password, DBConfig::$db, 3306);
	if (mysqli_connect_error())
	{
		die ("MySQL connection error");
	}

	// db setup
	mysqli_query($db, "DROP TABLE IF EXISTS `matches` ;");
	mysqli_query($db, "DROP TABLE IF EXISTS `players` ;");
	mysqli_query($db, "DROP TABLE IF EXISTS `settings` ;");

	mysqli_query($db, "CREATE TABLE `players` (
		`id` int(11) NOT NULL AUTO_INCREMENT,
		`name` varchar(50) COLLATE latin1_german1_ci NOT NULL,
		`active` boolean NOT NULL,
		PRIMARY KEY (`id`)
		) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_german1_ci AUTO_INCREMENT=1 ;");
		
	mysqli_query($db, "CREATE TABLE `matches` (
	  `id` int(11) NOT NULL AUTO_INCREMENT,
	  `f1` int(11) NOT NULL,
	  `b1` int(11) NOT NULL,
	  `f2` int(11) NOT NULL,
	  `b2` int(11) NOT NULL,
	  `goals1` int(11) NOT NULL,
	  `goals2` int(11) NOT NULL,
	  `deltaelo` DOUBLE NOT NULL,
	  `timestamp` datetime NOT NULL,
	  `season` int(11) NOT NULL,
	  PRIMARY KEY (`id`),
	  INDEX (f1),
	  INDEX (b1),
	  INDEX (f2),
	  INDEX (b2),
	  FOREIGN KEY (f1) REFERENCES players(id),
	  FOREIGN KEY (b1) REFERENCES players(id),
	  FOREIGN KEY (f2) REFERENCES players(id),
	  FOREIGN KEY (b2) REFERENCES players(id)
	) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_german1_ci AUTO_INCREMENT=1 ;");
	
	mysqli_query($db, "CREATE TABLE `settings` (
	  `key` varchar(50) COLLATE latin1_german1_ci NOT NULL,
	  `type` varchar(10) COLLATE latin1_german1_ci NOT NULL,
	  `value` varchar(50) COLLATE latin1_german1_ci NOT NULL,
	  PRIMARY KEY (`key`)
	) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_german1_ci;");
	
	mysqli_query($db, "INSERT INTO `settings` (`key`, `type`, `value`) VALUES
	  ('currentSeason', 'int', '1'),
	  ('baseELO', 'int', '$baseELO'),
	  ('maxGoals', 'int', '$maxGoals');");
	
	
	echo "Script executed in ".sprintf("%.1f", (microtime(true) - $startTime))." seconds.";
	echo "</pre>";
?>
</body>
</html>