<?php
	require 'Slim/Slim.php';
	include ('functions.php');
	include ('authmanager.php');

	ini_set('max_execution_time', 900);
	date_default_timezone_set("Europe/Berlin");

	session_start();
	$am = new AuthManager();
	
	\Slim\Slim::registerAutoloader();

	$app = new \Slim\Slim();
	$app->response->headers->set('Content-Type', 'application/json');
	
	$app->hook('slim.before.dispatch', function() use ($app, &$am) {
		$route = $app->request->getPathInfo();
		$method = $app->request->getMethod();
		
		// check if route requires auth
 		if ($am->requiresAuthentication($route, $method) && !$am->IsAuthenticated()) {
			$app->halt(401);
		}

		// check if route requires admin role
 		if ($am->requiresAdminRole($route) && !$am->isAdmin()) {
			$app->halt(401);
		}

	});
	
	function HandleError($e)
	{
		global $app;
		$msg = '{"error":{"text": "'. $e->getMessage() .'"}}';
		$app->halt(400, $msg);
		exit;
	}

	// GET routes
	$app->get('/history/:type(/:param1(/:param2))', function ($type, $param1 = '', $param2 = '') {
		try {
			$regexDate = '/^\\d{4}-\\d{2}-\\d{2}$/';
			$valid = false;
			if ($type == 'today') {
				$from = $to = date('Y-m-d');
				$valid = true;
			}
			else if ($type == 'date') {
				if (preg_match($regexDate, $param1) && $param2 == '') {
					$from = $to = $param1;
					$valid = true;
				}
			}
			else if ($type == 'range') {
				if (preg_match($regexDate, $param1) && preg_match($regexDate, $param2)) {
					if ($param1 < $param2) {
						$from = $param1;
						$to = $param2;
						$valid = true;
					}
				}
			}

			if (!$valid) {
					throw new Exception("Invalid request");
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
				case 'day':
					if ($param == 'today') $param = date('Y-m-d');
					$stats = $db->GetStatsForRange($param, $param);
					break;
				case 'week':
					// determine Mon and Sun of current date
					$date = date_create_from_format('Y-m-d', $param);
					$dow = $date->format('N');
					$mon = $date->modify((1 - $dow).' day')->format('Y-m-d');
					$sun = $date->modify('+6 day')->format('Y-m-d');
					$stats = $db->GetStatsForRange($mon, $sun);
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
	
	$app->get('/ranking/:mode(/:season)', function ($mode, $season = -1) {
		try {
			$db = DB::GetInstance();
			$settings = $db->GetSettings();
			// default value: use current season
			if (-1 == $season) {
				$season = $settings['currentSeason'];
			}
			$results = $db->GetRanking($mode, $season);
			header('Content-Type: application/json');
			echo json_encode_utf8($results);
		} catch(Exception $e) {
			HandleError($e);
		}
	})->conditions(array('season' => '-?\d+'));
	
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
			$r = $db->GetRanking('total', $settings['currentSeason'], 'index');
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
	
	// login / logout
	$app->post('/auth/:action', function($action) use ($app, $am) {
		$request = $app->request();

		switch($action) {
			case 'login':
				$cred = json_decode($request->getBody(), true);
				if ($am->login($cred['userId'], $cred['pin'])) {
					$user = $am->getUserData();
					echo json_encode_utf8($user);
				}
				else {
					$app->halt(401);
				}
				break;
			case 'logout':
				$am->logout();
				break;
		}
	})->conditions(array('action' => '(login|logout)'));

	// check session
	$app->get('/auth/check', function() use ($app, $am) {
		if ($am->isAuthenticated()) {
			$userData = $am->getUserData();
			$userData['result'] = true;
		}
		else {
			$userData = array('result' => false);
		}
		echo json_encode_utf8($userData);
	});

	// change PIN
	$app->post('/usersettings/changepin', function() use ($app, $am) {
		$request = $app->request();
		$userData = $am->getUserData();
		$data = json_decode($request->getBody(), true);
		try {
			$db = DB::GetInstance();
			$db->ChangeUserPin($userData['id'], $data['oldpin'], $data['newpin']);
		} catch(Exception $e) {
			HandleError($e);
		}
	});
	
	// ADMIN ROUTES

	// add new player
	$app->post('/admin/player', function() use ($app) {
		$request = $app->request();
		$player = json_decode($request->getBody(), true);
		try {
			$db = DB::GetInstance();
			$db->AddPlayer($player);
			echo json_encode_utf8($player, true);
		} catch(Exception $e) {
			HandleError($e);
		}
	});

	// update player
	$app->put('/admin/player', function () use ($app) {
		$request = $app->request();
		$player = json_decode($request->getBody(), true);
		try {
			$db = DB::GetInstance();
			$db->UpdatePlayer($player);
			echo json_encode_utf8($player);
		} catch(Exception $e) {
			HandleError($e);
		}
	});

	// reset user pin
	$app->get('/admin/player/:userid/resetpin', function ($userid) {
		try {
			$db = DB::GetInstance();
			$user = array('id' => $userid);
			$db->ResetUserPin($user);
			echo json_encode_utf8($user);
		} catch(Exception $e) {
			HandleError($e);
		}
	});

	// start new season
	$app->get('/admin/game/startnewseason', function () {
		try {
			$db = DB::GetInstance();
			$db->StartNewSeason();
		} catch(Exception $e) {
			HandleError($e);
		}
	});
	
	// update match
	$app->put('/admin/match', function() use ($app) {
		try {
			$request = $app->request();
			$match = json_decode($request->getBody(), true);
			$db = DB::GetInstance();
			$db->UpdateMatch($match);
		} catch(Exception $e) {
			HandleError($e);
		}
	});

	// delete match
	$app->delete('/admin/match/:matchId', function($matchId) {
		try {
			$db = DB::GetInstance();
			$db->DeleteMatch($matchId);
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