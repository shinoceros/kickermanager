<html>
<body>
<?php
	ini_set('max_execution_time', 900);
	include('api/dbconfig.php');
	include('api/functions.php');
	
	class DatacaseSettings
	{
	
	var $db;
	var $baseELO = 1200.0;
	var $maxGoals = 6;

	var $addTableVersion = false;
	var $addTableSettings = false;
	var $addTablePlayers = false;
	var $addTableMatches = false;
	
	// ========================================================================
	
	function __construct()
	{
	}
	
	// ========================================================================
	
	function __destruct()
	{
		$this->db->close();
	}
	
	// ========================================================================
	
	function checkTable($tableName) 
	{
  		$result = $this->db->query("SHOW TABLES LIKE '" . $tableName . "'");
	    	if (!$result)
	    	{
			$this->db->close();
	        	die ("SHOW " . $tableName . " failed : " . mysql_error());
	    	}
		
	    	$total_num_rows = $result->num_rows;
	    	$result->close();
		
		return ($total_num_rows == 0);
	}
	
	// ========================================================================
	
	function getCurrentVersion()
	{
		$currentVersion = 1;
		
		$result = $this->db->query("SELECT current FROM version", MYSQLI_USE_RESULT);
		
	    	if ($field = $result->fetch_object())
	    	{			
			$currentVersion = $field->current;
	    	}
		
	    	$result->close();
		
		return $currentVersion;
	}
	
	// ========================================================================
	
	function update($targetVersion)
	{
		if ($this->getCurrentVersion() < $targetVersion)
		{
			//TODO: implement update scenario
		}
		else
		{
			print "<pre><b>UPDATE DB:</b> Database is up to date!</pre>";
		}
	}
	
	// ========================================================================
	
	function setup() 
	{
		$startTime = microtime(true); 
		echo "<pre>";
		// db init // DBConfig::$db, 3306
		$this->db = mysqli_connect(DBConfig::$host, DBConfig::$user, DBConfig::$password);
		if (mysqli_connect_error())
		{
			die ("MySQL connection error"  . mysql_error());
		}
	
		// Make DBConfig::$db the current database if possible
		$existsDB = $this->db->select_db(DBConfig::$db);
	
		// test is databse as specified in db config exists. If not, create db.
		if (!$existsDB) 
		{
			echo "DB " . DBConfig::$db . " is not present\n";
		    	// If we couldn't, then it either doesn't exist, or we can't see it.
		    	$sql = 'CREATE DATABASE ' . DBConfig::$db;

		    	$res = $this->db->query($sql);
		    	if (!$res) 
		    	{
				echo "CREATE DATABASE FAILED\n";
		    		$this->db->close();
		        	die ('Error creating database: ' . mysql_error());
		    	}
			else
			{
				echo "CREATE DATABASE OK\n";
			}
	    
		    	if (!$this->db->select_db(DBConfig::$db))
		    	{
				echo "SELECT DATABASE FAILED\n";
		    	}
			else
			{
				$this->addTableVersion = true;
				$this->addTableSettings = true;
				$this->addTablePlayers = true;	
				$this->addTableMatches = true;
				echo "SELECT DATABASE OK\n";
			}
		}
		else // database exists, tables too?
		{
		    $this->addTableVersion = $this->checkTable("version");
		    $this->addTableSettings = $this->checkTable("settings");
		    $this->addTablePlayers = $this->checkTable("players");
		    $this->addTableMatches = $this->checkTable("matches");
		}

		if ($this->addTableVersion)
		{
		        echo "<br /><b>Setup started</b><br /><ul>";
		   	// db setup	
			if (!$this->db->query("CREATE TABLE IF NOT EXISTS `version` ( `current` int(11) NOT NULL ) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_german1_ci"))
			{
				$this->db->close();
				die ("CREATE version failed" . mysql_error());
			}
			
			if (!$this->db->query("INSERT INTO `version` (`current`) VALUES (1);"))
			{
				$this->db->close();
				die ("INSERT version failed" . mysql_error());
			}
			else
			{
				echo "<li>version done</li>";
			}
		}
	
		if ($this->addTablePlayers)
		{	
			if (!$this->db->query("CREATE TABLE IF NOT EXISTS `players` (
				`id` int(11) NOT NULL AUTO_INCREMENT,
				`name` varchar(50) COLLATE latin1_german1_ci NOT NULL,
				`active` boolean NOT NULL,
				PRIMARY KEY (`id`)
				) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_german1_ci AUTO_INCREMENT=1 ;"))
			{
				$this->db->close();
				die ("Query players failed" . mysql_error());
			}
			else
			{
				echo "<li>players done</li>";
			}
		}
	
		if ($this->addTableMatches)
		{		
			if (!$this->db->query("CREATE TABLE IF NOT EXISTS `matches` (
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
			) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_german1_ci AUTO_INCREMENT=1 ;"))
			{
				$this->db->close();
				die ("Query matches failed" . mysql_error());
			}
			else
			{
				echo "<li>matches done</li>";
			}
		}
	
		if ($this->addTableSettings)
		{
			if (!$this->db->query("CREATE TABLE IF NOT EXISTS `settings` (
			  `key` varchar(50) COLLATE latin1_german1_ci NOT NULL,
			  `type` varchar(10) COLLATE latin1_german1_ci NOT NULL,
			  `value` varchar(50) COLLATE latin1_german1_ci NOT NULL,
			  PRIMARY KEY (`key`)
			) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_german1_ci;"))
			{
				$this->db->close();
				die ("Query settings failed" . mysql_error());
			}
	
			if (!$this->db->query("INSERT INTO `settings` (`key`, `type`, `value`) VALUES
			  ('currentSeason', 'int', '1'),
			  ('baseELO', 'int', '$this->baseELO'),
			  ('maxGoals', 'int', '$this->maxGoals');"))
			{
				$this->db->close();
				die ("INSERT failed" . mysql_error());
			}
			else
			{
				echo "<li>settings done</li>";
			}
		}

		echo "</ul><b>Setup finished in " . sprintf("%.1f", (microtime(true) - $startTime))." seconds." . "</b><br />";		
	}
}
	$db_settings = new DatacaseSettings();
	$db_settings->setup();
	$db_settings->update(1);
?>
</body>
</html>
