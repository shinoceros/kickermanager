<html>
<body>
<?php
	ini_set('max_execution_time', 900);
	include('api/dbconfig.php');
	include('api/functions.php');

	// data source settings
	$GAMES_URL = "http://ratok.selfhost.eu:8080/Kicker/games.xml";
	$PLAYERS_URL = "http://ratok.selfhost.eu:8080/Kicker/players.xml";
	
	$baseELO = 1200.0;
	$maxGoals = 6;
	
	// ========================================================================
	
	$startTime = microtime(true); 

	// load input data	
	echo "<pre>";
	$inputGames = file_get_contents($GAMES_URL);

	$xml = simplexml_load_string($inputGames);
	$json = json_encode($xml);
	$inputGames = json_decode($json, TRUE);

	$inputPlayers = file_get_contents($PLAYERS_URL);

	$xml = simplexml_load_string($inputPlayers);
	$json = json_encode($xml);
	$inputPlayers = json_decode($json, TRUE);

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
	  ('currentSeason', 'int', '5'),
	  ('baseELO', 'int', '$baseELO'),
	  ('maxGoals', 'int', '$maxGoals');");
	
	function conv($input)
	{
		$a = $input;
		$a = str_replace('ue', 'ü', $a);
		return iconv("UTF-8", "ISO-8859-1//TRANSLIT", $a);
	}
	
	function convDate($input)
	{
		if (preg_match("/^(\\d{4})\\.(\\d{2})\\.(\\d{2})\\/(\\d{2}:\\d{2}:\\d{2})/", $input, $matches))
		{
			return sprintf("%s-%s-%s %s", $matches[1], $matches[2], $matches[3], $matches[4]);
		}
		die ("preg_match failed for $input\n");
	}
	
	// 1. store players in db
	$query = "INSERT INTO players (name, active) VALUES (?,?)";
	$stmt = mysqli_prepare($db, $query);
	$playersdb = array();
	foreach ($inputPlayers['player'] as $p)
	{
		$name = conv($p['name']);
		$active = (array_key_exists('active', $p) ? (($p['active'] == "true") ? 1 : 0) : 0);
		mysqli_stmt_bind_param($stmt, "si", $name, $active);
		mysqli_stmt_execute($stmt);
		$playersdb[$name] = array('id' => $db->insert_id, 'elo' => 0);
	}
	
	// 2. store matches in db
	$query = "INSERT INTO matches (f1, b1, f2, b2, goals1, goals2, deltaelo, timestamp, season) VALUES ";
	$c = 0;
	$skippedDuplicatePlayer = array();
	$skippedInvalidScore = array();
	$values= array();
	foreach ($inputGames as $season => $seasonMatches)
	{
		if (preg_match("/season(\\d+)/", $season, $m))
		{
			$seasonId = $m[1];
			// skip 1st season -> data crappy
			if ($seasonId == 1) continue;
		}
		else
		{
			die ("Error: could not retrieve season id");
		}
		// reset all players ELO to initial value
		foreach ($playersdb as &$p)
		{
			$p['elo'] = $baseELO;
		}
		// iterate over current seasons's matches
		foreach ($seasonMatches['game'] as $match)
		{
			$timestamp = convDate($match['timestamp']);
			$namep1 = conv($match['player1']);
			$namep2 = conv($match['player2']);
			$namep3 = conv($match['player3']);
			$namep4 = conv($match['player4']);
			$deltaelo = calcDeltaELO(
				$playersdb[$namep1]['elo'],
				$playersdb[$namep2]['elo'],
				$playersdb[$namep3]['elo'],
				$playersdb[$namep4]['elo'],
				(int)$match['goals1'],
				(int)$match['goals2']
			);
			
			if (count(array_unique(array($namep1, $namep2, $namep3, $namep4))) != 4) {
				$skippedDuplicatePlayer[] = "Season $seasonId, $timestamp, $namep1 - $namep2 vs. $namep3 - $namep4, ".(int)$match['goals1']." : ".(int)$match['goals2'];
				continue;
			}
			
			if (!(($match['goals1'] == $maxGoals) xor ($match['goals2'] == $maxGoals)))
			{
				$skippedInvalidScore[] = "Season $seasonId, $timestamp, $namep1 - $namep2 vs. $namep3 - $namep4, ".(int)$match['goals1']." : ".(int)$match['goals2'];
				continue;				
			}
			

			$values[] .= sprintf("(%d, %d, %d, %d, %d, %d, %f, '%s', %d)",
				$playersdb[$namep1]['id'],
				$playersdb[$namep2]['id'],
				$playersdb[$namep3]['id'],
				$playersdb[$namep4]['id'],
				$match['goals1'],
				$match['goals2'],
				$deltaelo,
				$timestamp,
				$seasonId
			);
			$playersdb[$namep1]['elo'] += $deltaelo;
			$playersdb[$namep2]['elo'] += $deltaelo;
			$playersdb[$namep3]['elo'] -= $deltaelo;
			$playersdb[$namep4]['elo'] -= $deltaelo;

			$c++;
		}
	}
	
	$query .= implode(", ", $values);
	mysqli_query($db, $query);
	
	echo count($playersdb)." players added.\n\n";
	echo "$c matches added.\n\n";
	echo count($skippedDuplicatePlayer)." matches skipped (duplicate players in match):\n".implode("\n", $skippedDuplicatePlayer)."\n\n";
	echo count($skippedInvalidScore)." matches skipped (invalid score in match):\n".implode("\n", $skippedInvalidScore)."\n\n";
	echo "Script executed in ".sprintf("%.1f", (microtime(true) - $startTime))." seconds.";

	echo "</pre>";
?>
</body>
</html>