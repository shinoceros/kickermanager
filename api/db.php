<?php
	include_once('dbconfig.php');
	
	class DB
	{
		private $mysqli;
		private $resultArray;
		private static $self = NULL;
		
		public static function GetInstance()
		{
			if (NULL == self::$self)
			{
				self::$self = new DB(DBConfig::$host, DBConfig::$user, DBConfig::$password, DBConfig::$db);
			}
			return self::$self;
		}

		public static function DestroyInstance()
		{
			if (NULL != self::$self) {
				if(self::$self->mysqli) {
					self::$self->mysqli->close();
				}
				self::$self->mysqli = NULL;
			}
			self::$self = NULL;
		}
		
		private function __construct($server, $username, $password, $database)
		{
			$this->mysqli = new mysqli($server, $username, $password);
			if ($this->mysqli->connect_error) {
				throw('Connect Error (' . $this->mysqli->connect_errno . ') '. $this->mysqli->connect_error);
			}

			$this->mysqli->select_db($database);
			$this->resultArray = null;
		}

		//************************ PUBLIC METHODS ****************************

		public function GetPlayers($method = 'default')
		{
			$query = "SELECT `id`, `name`, `active` FROM `players` ORDER BY `name` ASC";
			$this->FillResultArray($query, $method);
			return $this->resultArray;
		}

		public function GetSettings()
		{
			$query = "SELECT `key`, `type`, `value` FROM `settings`";
	
			$result = $this->mysqli->query($query);
			$this->resultArray = array();
			while ($row = $result->fetch_array(MYSQLI_ASSOC))
			{
				$this->resultArray[$row['key']] = ($row['type'] == 'int' ? intval($row['value']) : $row['value']);
			}
			$result->free();
			
			return $this->resultArray;
		}

		public function GetMatchesForSeason($season)
		{
			$query = sprintf(
			"SELECT id, f1, b1, f2, b2, goals1, goals2, deltaelo, timestamp, season FROM matches
			WHERE season = %d
			ORDER BY timestamp ASC", $season);
			
			$this->FillResultArray($query);
			return $this->resultArray;
		}		
		
		public function GetRanking($season, $method = 'default')
		{
			// avg (score), count(*)
			$query = "SELECT
						p.id,
						p.name,
						1200 + SUM(m.deltaelo) AS elo,
						COUNT(*) AS total,
						SUM(IF(owngoals > oppgoals, 1, 0)) AS wins,
						SUM(owngoals) - SUM(oppgoals) AS goaldiff,
						SUM(IF(owngoals > oppgoals, 1, 0))/ COUNT(*) AS winrate
						FROM players p
						LEFT JOIN (
							SELECT f1 AS pos, goals1 AS owngoals, goals2 AS oppgoals, deltaelo, season FROM matches
							UNION
							SELECT b1 AS pos, goals1 AS owngoals, goals2 AS oppgoals, deltaelo, season FROM matches
							UNION
							SELECT f2 AS pos, goals2 AS owngoals, goals1 AS oppgoals, (-1 * deltaelo) AS deltaelo, season FROM matches
							UNION
							SELECT b2 AS pos, goals2 AS owngoals, goals1 AS oppgoals, (-1 * deltaelo) AS deltaelo, season FROM matches
						) AS m ON p.id = m.pos
 						WHERE m.season = $season
						GROUP BY p.id";

			$this->FillResultArray($query, $method);
			return $this->resultArray;
		}
		
		public function GetHistory($from, $to)
		{
			$query = sprintf(
			"SELECT p1.name AS f1, p2.name AS b1, p3.name AS f2, p4.name AS b2, goals1, goals2, deltaelo, timestamp FROM matches m
			LEFT JOIN players AS p1 ON p1.id = m.f1
			LEFT JOIN players AS p2 ON p2.id = m.b1
			LEFT JOIN players AS p3 ON p3.id = m.f2
			LEFT JOIN players AS p4 ON p4.id = m.b2
			WHERE DATE(timestamp) >= '%s' AND DATE(timestamp) <= '%s'
			ORDER BY timestamp ASC", $from, $to);
			
			$this->FillResultArray($query);
			return $this->resultArray;
		}
		
		public function GetELOTrendFor($pid, $season)
		{
			$query = "SELECT
						DATE(m.timestamp) AS date,
						sum(m.deltaelo) AS elo
						FROM players p
						LEFT JOIN (
							SELECT f1 AS pos, deltaelo, timestamp, season FROM matches
							UNION
							SELECT b1 AS pos, deltaelo, timestamp, season FROM matches
							UNION
							SELECT f2 AS pos, (-1 * deltaelo) AS deltaelo, timestamp, season FROM matches
							UNION
							SELECT b2 AS pos, (-1 * deltaelo) AS deltaelo, timestamp, season FROM matches
						) AS m ON p.id = m.pos
 						WHERE p.id = $pid AND season = $season
						GROUP BY DATE(m.timestamp)";

			$result = $this->mysqli->query($query);
			$this->resultArray = array();
			$elo = 1200.0;
			while ($row = $result->fetch_array(MYSQLI_ASSOC))
			{
				$elo += $row['elo'];
				$this->resultArray[] = array($row['date'], $elo);
			}
			$result->free();
			return $this->resultArray;
		}
		
		public function GetStatsDaily($date)
		{
			$query = sprintf(
			"SELECT
				p.id,
				p.name,
				sum(m.deltaelo) AS deltaelo,
				COUNT(*) AS total,
				SUM(IF(owngoals > oppgoals, 1, 0)) AS wins,
				SUM(owngoals) - SUM(oppgoals) AS goaldiff
				FROM players p
				LEFT JOIN (
				SELECT f1 AS pos, goals1 AS owngoals, goals2 AS oppgoals, deltaelo, timestamp FROM matches
				UNION
				SELECT b1 AS pos, goals1 AS owngoals, goals2 AS oppgoals, deltaelo, timestamp FROM matches
				UNION
				SELECT f2 AS pos, goals2 AS owngoals, goals1 AS oppgoals, (-1 * deltaelo) AS deltaelo, timestamp FROM matches
				UNION
				SELECT b2 AS pos, goals2 AS owngoals, goals1 AS oppgoals, (-1 * deltaelo) AS deltaelo, timestamp FROM matches
				) AS m ON p.id = m.pos
				WHERE DATE(timestamp) = '%s'
				GROUP BY (p.id)"
			, $date);
			
			$this->FillResultArray($query);
			return $this->resultArray;
		}

		public function AddMatch($match)
		{
			$settings = $this->GetSettings();
			$query = sprintf("INSERT INTO `matches` (`f1`, `b1`, `f2`, `b2`, `goals1`, `goals2`,`deltaelo`, `timestamp`, `season`) VALUES (%d, %d, %d, %d, %d, %d, %f, NOW(), %d)",
						$match['f1'],
						$match['b1'],
						$match['f2'],
						$match['b2'],
						$match['goals1'],
						$match['goals2'],
						$match['deltaelo'],
						$settings['currentSeason']);
			$result = $this->mysqli->query($query);
			return $this->mysqli->insert_id;
		}
		
		public function AddPlayer($player)
		{
			$query = sprintf("SELECT * FROM `players` WHERE `name` = '%s'",
						$player['name']);
			$result = $this->mysqli->query($query);
			if (0 != $result->num_rows)
			{
				throw new Exception('Spieler '.$player['name'].' existiert bereits!');
			}
			$query = sprintf("INSERT INTO `players` (`name`, `active`) VALUES ('%s', 1)",
						$player['name']);
			$result = $this->mysqli->query($query);
			return $this->mysqli->insert_id;
		}
		
		public function UpdateMatch($match)
		{
			$query = sprintf("UPDATE `matches` SET `f1` = %d, `b1` = %d, `f2` = %d, `b2` = %d, `goals1` = %d, `goals2` = %d, `deltaelo` = %f, `timestamp` = '%s', `season` = %d
							WHERE id = %d",
						$match['f1'],
						$match['b1'],
						$match['f2'],
						$match['b2'],
						$match['goals1'],
						$match['goals2'],
						$match['deltaelo'],
						$match['timestamp'],
						$match['season'],
						$match['id']);
			$result = $this->mysqli->query($query);
		}
		
		//************************ PRIVATE METHODS ***************************
		
		private function FillResultArray($query, $method = 'default')
		{
			$stm = $this->mysqli->prepare($query) or trigger_error($this->mysqli->error);
			$stm->execute() or trigger_error($this->mysqli->error);
			$res = $stm->get_result();
			$stm->close();
			if ($method == 'index')
			{
				for ($this->resultArray = array(); $row = $res->fetch_assoc(); $this->resultArray[array_shift($row)] = $row);
			}
			else
			{
				for ($this->resultArray = array(); $row = $res->fetch_assoc(); $this->resultArray[] = $row);
			}
			$res->free();
		}
	}
?>