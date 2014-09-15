<?php
	include_once ('db.php');

	class AuthManager {

		private $userData = null;

		function __construct() {
			$this->getSessionData();
			if ($this->userData === null) {
				$this->resetSessionData();
			}
		}

		public function requiresAuthentication($route, $method)
		{
			// TODO: make this fancier
			$required = true;
			$publicRoutes = array(
				'/auth/login' => 'POST',
				'/player' => 'GET'
			);
			foreach ($publicRoutes as $r => $m) {
				$reg = "/^".str_replace("/", "\\/", $r)."(\\/.*?)?$/";
				if (preg_match($reg, $route) && $method == $m) {
					$required = false;
					break;
				}
			}
			return $required;
		}

		public function getUserData() {
			return $this->userData;
		}

		public function isAuthenticated() {
			$this->getSessionData();
			return ($this->userData['id'] !== null);
		}

		public function login($userId, $pin) {
			$db = DB::GetInstance();
			$userinfo = $db->checkCredentials($userId, $pin);

			if ($userinfo !== null) {
				$this->userData['id'] = $userinfo['id'];
				$this->userData['name'] = $userinfo['name'];
				$this->userData['role'] = $userinfo['role'];
				$this->setSessionData();
				return true;
			}
			else {
				$this->resetSessionData();
				return false;
			}
		}

		public function logout() {
			$this->resetSessionData();
		}

		private function resetSessionData()
		{
			$this->userData = array(
				'id' => null,
				'name' => null,
				'role' => null
			);
			$this->setSessionData();
		}

		private function getSessionData()
		{
			global $_SESSION;
			$this->userData = (array_key_exists('userData', $_SESSION) ? $_SESSION['userData'] : null);
		}

		private function setSessionData()
		{
			global $_SESSION;
			$_SESSION['userData'] = $this->userData;
		}
	}
?>