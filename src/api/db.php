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
			$this->mysqli->set_charset('utf8');
		}

		//************************ PUBLIC METHODS ****************************

		public function GetPlayers($method = 'default')
		{
			$query = "SELECT `id`, `name`, `active`, `role` FROM `players`";
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


		public function GetRanking($mode, $season, $method = 'default')
		{
			$settings = $this->GetSettings();

			$f1_subselect = "SELECT f1 AS pos, goals1 AS owngoals, goals2 AS oppgoals, deltaelo, season FROM matches";
			$b1_subselect = "SELECT b1 AS pos, goals1 AS owngoals, goals2 AS oppgoals, deltaelo, season FROM matches";
			$f2_subselect = "SELECT f2 AS pos, goals2 AS owngoals, goals1 AS oppgoals, (-1 * deltaelo) AS deltaelo, season FROM matches";
			$b2_subselect = "SELECT b2 AS pos, goals2 AS owngoals, goals1 AS oppgoals, (-1 * deltaelo) AS deltaelo, season FROM matches";

			$subselects = array();

			switch ($mode) {
				case 'attacker':
					$subselects[] = $f1_subselect;
					$subselects[] = $f2_subselect;
					break;
				case 'defender':
					$subselects[] = $b1_subselect;
					$subselects[] = $b2_subselect;
					break;
				case 'total':
					$subselects[] = $f1_subselect;
					$subselects[] = $f2_subselect;
					$subselects[] = $b1_subselect;
					$subselects[] = $b2_subselect;
					break;
				default:
					break;
			}

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
						LEFT JOIN (".implode(" UNION ALL ", $subselects).")
						AS m ON p.id = m.pos
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
							UNION ALL
							SELECT b1 AS pos, deltaelo, timestamp, season FROM matches
							UNION ALL
							SELECT f2 AS pos, (-1 * deltaelo) AS deltaelo, timestamp, season FROM matches
							UNION ALL
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
				UNION ALL
				SELECT b1 AS id, goals1 AS owngoals, goals2 AS oppgoals, deltaelo, timestamp FROM matches
				UNION ALL
				SELECT f2 AS id, goals2 AS owngoals, goals1 AS oppgoals, (-1 * deltaelo) AS deltaelo, timestamp FROM matches
				UNION ALL
				SELECT b2 AS id, goals2 AS owngoals, goals1 AS oppgoals, (-1 * deltaelo) AS deltaelo, timestamp FROM matches
				) AS m ON p.id = m.id
				WHERE DATE(timestamp) >= STR_TO_DATE('%s', '%Y-%m-%d') AND DATE(timestamp) <= STR_TO_DATE('%s', '%Y-%m-%d')
				GROUP BY (p.id)",
			$from, $to);

			return $this->FillResultArray($query);
		}

		public function checkCredentials($userId, $pin)
		{
			$query = sprintf("SELECT id, name, role FROM players WHERE id = %d AND pwd_hash = '%s'", $userId, md5($pin));
			$res = $this->FillResultArray($query);
			if (count($res) == 1) {
				return $res[0];
			}
			return null;
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

		public function AddPlayer(&$player)
		{
			$query = sprintf("SELECT * FROM `players` WHERE `name` = '%s'",
						$player['name']);
			$result = $this->mysqli->query($query);
			if (0 != $result->num_rows)
			{
				throw new Exception('E_USER_NAME_TAKEN');
			}
			// CREATE
			$pin = GenerateRandomPin();
			$query = sprintf("INSERT INTO `players` (`name`, `active`, `pwd_hash`, `role`) VALUES ('%s', 1, MD5(%s), 'user')",
						$player['name'],
						$pin);
			$this->mysqli->query($query);
			// update player info
			$player['id'] = $this->mysqli->insert_id;
			$player['pin'] = $pin;
		}
		
		public function ResetUserPin(&$user)
		{
			$pin = GenerateRandomPin();
			$query = sprintf("UPDATE `players` SET `pwd_hash` = '%s' WHERE `id` = %d", md5($pin), $user['id']);
			$this->mysqli->query($query);
			
			if (0 == $this->mysqli->affected_rows)
			{
				throw new Exception('E_INVALID_USER_ID');
			}
			$user['pin'] = $pin;
		}

		public function ChangeUserPin($userId, $oldPin, $newPin)
		{
			// check if old pin valid
			$query = sprintf("SELECT * FROM `players` WHERE `id` = %d AND `pwd_hash` = '%s'",
				$userId, md5($oldPin));
			$res = $this->mysqli->query($query);
			if (0 == $res->num_rows)
			{
				throw new Exception('E_INVALID_OLD_PIN');
			}

			if (IsPinTrivial($newPin))
			{
				throw new Exception('E_TRIVIAL_NEW_PIN');
			}
		
			$query = sprintf("UPDATE `players` SET `pwd_hash` = '%s' WHERE `id` = %d AND `pwd_hash` = '%s'",
				md5($newPin), $userId, md5($oldPin));
			$this->mysqli->query($query);
			
			if (0 == $this->mysqli->affected_rows)
			{
				throw new Exception('E_INTERNAL');
			}
		}
		
		public function UpdatePlayer(&$player)
		{
			$query = sprintf("UPDATE `players` SET `active` = %d, `role` = '%s' WHERE `id` = %d",
						$player['active'],
						$player['role'],
						$player['id']);
			$this->mysqli->query($query);
			if (0 == $this->mysqli->affected_rows)
			{
				throw new Exception('E_INVALID_USER_ID');
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

		public function StartNewSeason()
		{
			$query = "UPDATE `settings` SET `value` = `value` + 1 WHERE `key` = \"currentSeason\"";
			$this->mysqli->query($query);
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
