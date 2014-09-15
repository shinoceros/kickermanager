<html>
<body>
<?php
	/* vim: set expandtab tabstop=4 shiftwidth=4 softtabstop=4: */

	/**
	 * This file is used to setup or update the database by usig the database configuration.
	 *
	 * TODO: Implement functions for specific update scenarios.
	 * This software is distributed under the terms of the GNU General Public License.
	 *
	 * PHP version 5
	 *
	 * LICENSE: Free Software Foundation’s GNU General Public License
	 *
	 * @category   Database
	 * @package    N/A
	 * @author     Campus77
	 * @author     Shinoceros
	 * @copyright  2014
	 * @license    http://www.gnu.org/licenses/gpl.txt
	 * @version    GIT: $Id$
	 */
 
	ini_set('max_execution_time', 900);
	include('api/dbconfig.php');
	include('api/functions.php');

	class DatabaseSettings
	{
	var $db = NULL;
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

	function exitOnError($errMsg)
	{
		if ($this->db)
		{
			echo "\n<pre><b>" . $errMsg . $this->db->error . "<b></pre>\n";
			$this->db->close();
			$this->db = NULL;
		}
		else
		{
			echo "\n<pre><b>" . $errMsg . "<b></pre>\n";
		}

		die ("script terminated ;-(");
	}

	// ========================================================================

	function __destruct()
	{
		if ($this->db)
		{
			$this->db->close();
		}
	}

	// ========================================================================

	function checkTable($tableName) 
	{
		$result = $this->db->query("SHOW TABLES LIKE '" . $tableName . "'");
	    if (!$result)
	    {
			$this->exitOnError("SHOW " . $tableName . " failed: ");
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

		if (!$result)
		{
			$this->exitOnError("SELECT - FROM failed: ");
		}

		if ($field = $result->fetch_object())
	    {
			$currentVersion = $field->current;
	    }
	    else
	    {
			$this->exitOnError("fetch_object failed: ");
		}

	    $result->close();

		return $currentVersion;
	}

	// =======================================================================

	private function AssignPINs()
	{
		echo "<pre><b>ASSIGN PINs:</b> ";
		$newPin = array();

		if ($result=$this->db->query("SELECT * FROM players WHERE pwd_hash IS NULL"))
		{
			while($row = $result->fetch_array(MYSQLI_ASSOC))
			{
				$newPin[$row['name']] = $this->GenerateRandomPin();
				$tmpHash = md5($newPin[$row['name']]);
				$userId = $row['id'];
				$this->db->query("UPDATE players SET pwd_hash=IFNULL(pwd_hash, '$tmpHash') WHERE id='$userId'");
			}
			$result->free();
		}
		else
		{
			$this->exitOnError("<pre><b>UPDATE DB:</b> Update of table players failed: <pre>");
		}

		if (count($newPin) > 0)
		{
			print_r($newPin);
			echo " ... done</pre>";
			//TODO: Notify user about new pin. Maybe using swiftmailer.org (https://github.com/swiftmailer/swiftmailer.git)
		}
		else
		{
			echo "... nothing to do</pre> ";
		}
	}

	// =======================================================================

	private function GenerateRandomPin() 
	{
		$arrayChars = range(0, 9);
		shuffle($arrayChars);
		$sarrayChars = array_slice($arrayChars, 0, 5);
    		return implode( $sarrayChars );
	}

	// =======================================================================

	private function updateVersion2()
	{
		if ($this->getCurrentVersion() < 2)
		{
			echo "<pre><b>UPDATE DB:</b> Upgrade database to Vs. 2.</pre>";

			if (!$this->db->query("ALTER TABLE `players` ADD pwd_hash varchar(32), ADD role ENUM('user', 'admin')"))
			{
				$this->exitOnError("Update of table players failed: ");
			}
			else
			{
				echo "<pre><b>UPDATE DB:</b> Update of table players done</pre>";
			}

			// finally set version to 2
			if (!$this->db->query("UPDATE version SET current=2"))
			{
				$this->exitOnError("Update of table players failed: ");
			}
		}
		else
		{
			echo "<pre><b>UPDATE DB:</b> Database has already version 2!</pre>";
		}
	}

	// ========================================================================

	public function AddAdmin()
	{
		$query = "SELECT * FROM players WHERE name = 'admin'";
		$result = $this->db->query($query);
		if (0 != $result->num_rows)
		{
			$admin = $result->fetch_object();
			if (is_null($admin->pwd_hash))
			{
				echo ("Spieler $admin->name existiert bereits; braucht aber noch 'nen PIN!");
			}
			else
			{
				echo ("Spieler $admin->name existiert bereits; hat sogar schon 'nen PIN!");
			}
			$result->free();

		}
		else
		{
			$result->free();
			echo ("Füge neuen admin hinzu.");
			$query = "INSERT INTO players (name, active, role) VALUES ('admin', 1, 'admin')";
			$result = $this->db->query($query);
		}
		return;
	}

	// ========================================================================

	function update()
	{
		// upgrade structure 
		$this->updateVersion2();

		// add admin
		$this->AddAdmin();

		// generate new PINs for all users.
		$this->AssignPINs();
	}

	// ========================================================================

	function setup() 
	{
		$startTime = microtime(true); 
		echo "<pre>";
		// db init
		try
		{
			$this->db = @new mysqli(DBConfig::$host, DBConfig::$user, DBConfig::$password);

			if ($cerr = $this->db->connect_errno)
			{
				$this->db = NULL;
				$this->exitOnError("mysqli connect failed: " . $cerr);
			}
			else
			{
				echo "Database connected.\n";
			}
		}
		catch (Exception $e)
		{
    		$this->exitOnError("Exception abgefangen: " . $e->getMessage());
		}

		// Make DBConfig::$db the current database if possible
		$existsDB = $this->db->select_db(DBConfig::$db);

		// test is databse as specified in db config exists. If not, create db.
		if (!$existsDB) 
		{
			echo "DB '" . DBConfig::$db . "' is not present\n";
			// If we couldn't, then it either doesn't exist, or we can't see it.
		    $sql = 'CREATE DATABASE ' . DBConfig::$db;

		    $res = $this->db->query($sql);
		    if (!$res) 
		    {
				$this->exitOnError("CREATE DATABASE failed: ");
		    }
		    else
			{
				echo "CREATE DATABASE OK\n";
			}

	    		if (!$this->db->select_db(DBConfig::$db))
			{
				$this->exitOnError("SELECT DATABASE failed: ");
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
				$this->exitOnError("CREATE version failed: ");
			}

			if (!$this->db->query("INSERT INTO `version` (`current`) VALUES (1);"))
			{
				$this->exitOnError("INSERT version failed: ");
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
				$this->exitOnError("Query players failed: ");
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
				$this->exitOnError("Query matches failed: ");
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
				$this->exitOnError("Query settings failed: ");
			}
	
			if (!$this->db->query("INSERT INTO `settings` (`key`, `type`, `value`) VALUES
			  ('currentSeason', 'int', '1'),
			  ('baseELO', 'int', '$this->baseELO'),
			  ('maxGoals', 'int', '$this->maxGoals');"))
			{
				$this->exitOnError("INSERT settings failed: ");
			}
			else
			{
				echo "<li>settings done</li>";
			}
		}

		echo "</ul><b>Setup finished in " . sprintf("%.1f", (microtime(true) - $startTime))." seconds." . "</b><br />";		
	}
}
	$db_settings = new DatabaseSettings();
	$db_settings->setup();
	$db_settings->update();
?>
</body>
</html>
