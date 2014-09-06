<?php
	include_once('dbconfig.php');
	include_once('functions.php');
	
	class DB
	{
		private $mysqli;
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
		}

		//************************ PUBLIC METHODS ****************************

		public function GetPlayers($method = 'default')
		{
			$query = "SELECT `id`, `name`, `active` FROM `players`";
			return $this->FillResultArray($query, $method);
		}

		public function GetSettings()
		{
			$query = "SELECT `key`, `type`, `value` FROM `settings`";
	
			$result = $this->mysqli->query($query);
			$resultArray = array();
			while ($row = $result->fetch_array(MYSQLI_ASSOC))
			{
				$resultArray[$row['key']] = ($row['type'] == 'int' ? intval($row['value']) : $row['value']);
			}
			$result->free();
			
			return $resultArray;
		}

		public function GetMatchesForSeason($season)
		{
			$query = sprintf(
			"SELECT id, f1, b1, f2, b2, goals1, goals2, deltaelo, timestamp, season FROM matches
			WHERE season = %d
			ORDER BY timestamp ASC", $season);
			
			return $this->FillResultArray($query);
		}		
		
		public function GetRanking($season, $method = 'default')
		{
			$settings = $this->GetSettings();
			// avg (score), count(*)
			$query = "SELECT
						p.id,
						p.name,
						".$settings['baseELO']." + SUM(m.deltaelo) AS elo,
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

			return $this->FillResultArray($query, $method);
		}
		
		public function GetHistory($from, $to)
		{
			$query = sprintf(
				"SELECT id, f1, b1, f2, b2, goals1, goals2, deltaelo, timestamp FROM matches m
				WHERE DATE(timestamp) >= '%s' AND DATE(timestamp) <= '%s'
				ORDER BY timestamp ASC",
			$from, $to);
			
			return $this->FillResultArray($query);
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
			$resultArray = array();
			$settings = $this->GetSettings();
			$elo = $settings['baseELO'];
			while ($row = $result->fetch_array(MYSQLI_ASSOC))
			{
				$elo += $row['elo'];
				$resultArray[] = array($row['date'], $elo);
			}
			$result->free();
			return $resultArray;
		}
		
		public function GetStatsForRange($from, $to)
		{
			$query = sprintf(
			"SELECT
				p.id,
				sum(m.deltaelo) AS deltaelo,
				COUNT(*) AS total,
				SUM(IF(owngoals > oppgoals, 1, 0)) AS wins,
				SUM(owngoals) - SUM(oppgoals) AS goaldiff
				FROM players p
				LEFT JOIN (
				SELECT f1 AS id, goals1 AS owngoals, goals2 AS oppgoals, deltaelo, timestamp FROM matches
				UNION
				SELECT b1 AS id, goals1 AS owngoals, goals2 AS oppgoals, deltaelo, timestamp FROM matches
				UNION
				SELECT f2 AS id, goals2 AS owngoals, goals1 AS oppgoals, (-1 * deltaelo) AS deltaelo, timestamp FROM matches
				UNION
				SELECT b2 AS id, goals2 AS owngoals, goals1 AS oppgoals, (-1 * deltaelo) AS deltaelo, timestamp FROM matches
				) AS m ON p.id = m.id
				WHERE DATE(timestamp) >= '%s' AND DATE(timestamp) <= '%s'
				GROUP BY (p.id)",
			$from, $to);
			
			return $this->FillResultArray($query);
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
		
		public function UpdatePlayer($player)
		{
			$query = sprintf("UPDATE `players` SET `active` = %d WHERE `id` = %d",
						$player['active'],
						$player['id']);
			$result = $this->mysqli->query($query);
			if (1 != $this->mysqli->affected_rows)
			{
				throw new Exception('Spieler existiert nicht!');
			}
			return $player;
		}

		public function UpdateMatch($match)
		{
			// get data of match to be updated
			$query = sprintf("SELECT * FROM `matches` WHERE `id` = %d", $match['id']);
			$res = $this->FillResultArray($query);
			$matchToUpdate = $res[0];
		
			// update match in DB
			$query = sprintf("UPDATE `matches` SET `f1` = %d, `b1` = %d, `f2` = %d, `b2` = %d, `goals1` = %d, `goals2` = %d WHERE id = %d",
						$match['f1'],
						$match['b1'],
						$match['f2'],
						$match['b2'],
						$match['goals1'],
						$match['goals2'],
						$match['id']);
			$this->mysqli->query($query);

			// update elos of subsequent matches
			$this->UpdateDeltaELOForMatches($matchToUpdate['season'], $matchToUpdate['timestamp']);
		}

		public function DeleteMatch($matchId)
		{
			// get data of match to be deleted
			$query = sprintf("SELECT * FROM `matches` WHERE `id` = %d", $matchId);
			$res = $this->FillResultArray($query);
			$matchToDelete = $res[0];

			// delete match from DB
			$query = sprintf("DELETE FROM `matches` WHERE id = %d LIMIT 1",
						$matchId);
			$this->mysqli->query($query);

			// update elos of subsequent matches
			$this->UpdateDeltaELOForMatches($matchToDelete['season'], $matchToDelete['timestamp']);
		}
		
		//************************ PRIVATE METHODS ***************************
		
		private function FillResultArray($query, $method = 'default')
		{
			$resultArray = array();
			$stm = $this->mysqli->prepare($query) or trigger_error($this->mysqli->error);
			$stm->execute() or trigger_error($this->mysqli->error);
			$res = $stm->get_result();
			$stm->close();
			if ($method == 'index')
			{
				for ($resultArray = array(); $row = $res->fetch_assoc(); $resultArray[array_shift($row)] = $row);
			}
			else
			{
				for ($resultArray = array(); $row = $res->fetch_assoc(); $resultArray[] = $row);
			}
			$res->free();
			return $resultArray;
		}
		
		private function UpdateDeltaELOForMatches($season, $fromTimestamp)
		{
			$settings = $this->GetSettings();
			$players = $this->GetPlayers('index');
			$matches = $this->GetMatchesForSeason($season);

			// reset all players ELO to initial value
			foreach ($players as &$p)
			{
				$p['elo'] = $settings['baseELO'];
			}
			// calc ELO for whole season
			foreach ($matches as $m) {
				$deltaelo = calcDeltaELO(
					$players[$m['f1']]['elo'],
					$players[$m['b1']]['elo'],
					$players[$m['f2']]['elo'],
					$players[$m['b2']]['elo'],
					(int)$m['goals1'],
					(int)$m['goals2']
				);
				if ($m['timestamp'] >= $fromTimestamp) {
					$query = sprintf("UPDATE `matches` SET deltaelo = %f WHERE id = %d", $deltaelo, $m['id']);
					$this->mysqli->query($query);
				}
				
				$players[$m['f1']]['elo'] += $deltaelo;
				$players[$m['b1']]['elo'] += $deltaelo;
				$players[$m['f2']]['elo'] -= $deltaelo;
				$players[$m['b2']]['elo'] -= $deltaelo;
			}
		}
	}
?>