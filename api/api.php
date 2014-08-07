<?php
	require 'Slim/Slim.php';
	include ('functions.php');

	ini_set('max_execution_time', 900);
	date_default_timezone_set("Europe/Berlin");
	
	\Slim\Slim::registerAutoloader();

	$app = new \Slim\Slim();

	// setup routes
	$app->post('/match',			'addMatch');
	$app->get('/history/:type',	    'getHistory');
	
	
	$app->get('/stats/:type/:param',	  'getStats');
	$app->get('/ranking',			'getRanking');
	$app->get('/players',			'getPlayers');
	$app->get('/settings',			'getSettings');
	
	$app->get('/test',				'test');
	
	$app->get('/', function() { echo "nix da";});

	// run
	$app->run();
	exit;

	function test()
	{
	}
	
	function addMatch()
	{
		global $app;
		$request = $app->request();
		$match = json_decode($request->getBody(), true);
		try {
			$db = DB::GetInstance();
			$settings = $db->GetSettings();
			$r = $db->GetRanking($settings['currentSeason'], 'index');
			$match['deltaelo'] = calcDeltaELO(
				$r[$match['f1']]['elo'],
				$r[$match['b1']]['elo'],
				$r[$match['f2']]['elo'],
				$r[$match['b2']]['elo'],
				$match['goals1'],
				$match['goals2']
			);
			$match['id'] = $db->AddMatch($match);
			echo json_encode_utf8($match, true);
		} catch(Exception $e) {
			echo '{"error":{"text": "'. $e->getMessage() .'"}}';
		}
	}

	function getStats($type, $param)
	{
		try {
			$db = DB::GetInstance();
			switch($type) {
				case 'daily':
					if ($param == 'today') $param = date('Y-m-d');
					$stats = $db->GetStatsDaily($param);
					break;
				case 'elotrend':
					$playersDB = $db->GetPlayers('index');
					$settings = $db->GetSettings();
					
					$players = explode(',', $param);
					$stats = array();
					foreach ($players as $p) {
						$stats[] = array('name' => $playersDB[$p]['name'], 'data' => $db->GetELOTrendFor($p, $settings['currentSeason']));
					}
					break;
				default:
					throw ("Unknown type: ".$type);
			}
			echo json_encode_utf8($stats);
		} catch(Exception $e) {
			echo '{"error":{"text": "'. $e->getMessage() .'"}}';
		}
	}
	
	function getHistory($type)
	{
		try {
			switch($type) {
				case 'today':
					$from = $to = date('Y-m-d');
					break;
				default:
					throw ("Unknown type: ".$type);
			}
			$db = DB::GetInstance();
			$history = $db->GetHistory($from, $to);
			echo json_encode_utf8($history);
		} catch(Exception $e) {
			echo '{"error":{"text": "'. $e->getMessage() .'"}}';
		}
	}
	
	function getRanking()
	{
		$db = DB::GetInstance();
		// TODO: für alle seasons verfügbar machen
		$results = $db->GetRanking(5);
		header('Content-Type: application/json');
		echo json_encode_utf8($results);
	}

	function getSettings()
	{
		try {
			$db = DB::GetInstance();
			$settings = $db->GetSettings();
			echo json_encode_utf8($settings);
		} catch(Exception $e) {
			echo '{"error":{"text": "'. $e->getMessage() .'"}}';
		}
	}
	
	function getPlayers()
	{
		try {
			$db = DB::GetInstance();
			$players = $db->GetActivePlayers();
			echo json_encode_utf8($players);
		} catch(Exception $e) {
			echo '{"error":{"text": "'. $e->getMessage() .'"}}';
		}
	}

	function json_encode_utf8(&$data)
	{
		array_walk_recursive($data, 'encode_items');
		return json_encode($data);
	}

	function encode_items(&$item, $key)
	{
		if (is_string($item))
		{
			$item = utf8_encode($item);
		}
	}
?>