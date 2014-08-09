<?php
	require 'Slim/Slim.php';
	include ('functions.php');

	ini_set('max_execution_time', 900);
	date_default_timezone_set("Europe/Berlin");
	
	\Slim\Slim::registerAutoloader();

	$app = new \Slim\Slim();
	$app->response->headers->set('Content-Type', 'application/json');
	
	function HandleError($e)
	{
		global $app;
		$msg = '{"error":{"text": "'. $e->getMessage() .'"}}';
		$app->halt(400, $msg);
		exit;
	}
	
	// setup routes
	
	// GET routes
	$app->get('/history/:type', function ($type) {
		try {
			switch($type) {
				case 'today':
					$from = $to = date('Y-m-d');
					break;
				default:
					throw new Exception("Unknown type: ".$type);
			}
			$db = DB::GetInstance();
			$history = $db->GetHistory($from, $to);
			echo json_encode_utf8($history);
		} catch(Exception $e) {
			HandleError($e);
		}
	});
	
	$app->get('/stats/:type/:param', function ($type, $param) {
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
					throw new Exception("Unknown type: ".$type);
			}
			echo json_encode_utf8($stats);
		} catch(Exception $e) {
			HandleError($e);
		}
	});
	
	$app->get('/ranking(/:season)', function ($season = -1) {
		try {
			$db = DB::GetInstance();
			$settings = $db->GetSettings();
			// default value: use current season
			if (-1 == $season) {
				$season = $settings['currentSeason'];
			}
			// TODO: für alle seasons verfügbar machen
			$results = $db->GetRanking($season);
			header('Content-Type: application/json');
			echo json_encode_utf8($results);
		} catch(Exception $e) {
			HandleError($e);
		}
	})->conditions(array('season' => '-?\d'));
	
	// get all players
	$app->get('/player', function () {
		try {
			$db = DB::GetInstance();
			$players = $db->GetPlayers();
			echo json_encode_utf8($players);
		} catch(Exception $e) {
			HandleError($e);
		}
	});
	
	$app->get('/settings', function () {
		try {
			$db = DB::GetInstance();
			$settings = $db->GetSettings();
			echo json_encode_utf8($settings);
		} catch(Exception $e) {
			HandleError($e);
		}
	});
	
	$app->get('/', function() use ($app) {
		$app->halt(401);
	});

	// POST routes
	// add match result
	$app->post('/match', function() use ($app) {
		$request = $app->request();
		$match = json_decode($request->getBody(), true);
		try {
			$db = DB::GetInstance();
			$settings = $db->GetSettings();
			$r = $db->GetRanking($settings['currentSeason'], 'index');
			// if ids of players can not be found in ranking table they haven't played -> use base elo as input elo
			$eloIn = array(
				array_key_exists($match['f1'], $r) ? $r[$match['f1']]['elo'] : $settings['baseELO'],
				array_key_exists($match['b1'], $r) ? $r[$match['b1']]['elo'] : $settings['baseELO'],
				array_key_exists($match['f2'], $r) ? $r[$match['f2']]['elo'] : $settings['baseELO'],
				array_key_exists($match['b2'], $r) ? $r[$match['b2']]['elo'] : $settings['baseELO']
			);
			$match['deltaelo'] = calcDeltaELO(
				$eloIn[0],
				$eloIn[1],
				$eloIn[2],
				$eloIn[3],
				$match['goals1'],
				$match['goals2']
			);
			$match['id'] = $db->AddMatch($match);
			echo json_encode_utf8($match, true);
		} catch(Exception $e) {
			HandleError($e);
		}
	});
	
	// add new player
	$app->post('/player', function() use ($app) {
		$request = $app->request();
		$player = json_decode($request->getBody(), true);
		try {
			$db = DB::GetInstance();
			$player['id'] = $db->AddPlayer($player);
			echo json_encode_utf8($player, true);
		} catch(Exception $e) {
			HandleError($e);
		}
	});

	// run
	$app->run();
	exit;

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