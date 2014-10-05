<?php
	/* vim: set expandtab tabstop=4 shiftwidth=4 softtabstop=4: */

	/**
	 * This file is used to calculate the scores based on goals and team ELO.
	 *
	 * This software is distributed under the terms of the GNU General Public License.
	 *
	 * PHP version 5
	 *
	 * LICENSE: Free Software Foundation’s GNU General Public License
	 *
	 * @category   Algorithms
	 * @package    N/A
	 * @author     Campus77
	 * @author     Shinoceros
	 * @copyright  2014
	 * @license    http://www.gnu.org/licenses/gpl.txt
	 * @version    GIT: $Id$
	 * @remark     calcDeltaELO: no negative elo possible, final score depends on goal difference.
	 * @remark     calcDeltaELO_OLD: negative elo possible.
	 */
	 
	include ('db.php');
	
	//ELO_OLD
	function calcDeltaELO_OLD($elof1, $elob1, $elof2, $elob2, $goals1, $goals2)
	{
		$goaldifference = $goals1 - $goals2;

		//score
		$maxGoals = max($goals1, $goals2);
		if ($maxGoals <= 0)
		{
			$maxGoals = 1;
		}
		$scoreteam1 = 0.5 + (double)$goaldifference / ((double)$maxGoals * 2.0);
			
		//ELO
		$eloteam1 = ($elof1 + $elob1) / 2.0;
		$eloteam2 = ($elof2 + $elob2) / 2.0;

		$elodifference = $eloteam2 - $eloteam1;
		if ($elodifference > 400) $elodifference = 400;
		if ($elodifference < -400) $elodifference = -400;
		
		$expectedscoreteam1 = 1.0 / (1.0 + pow(10, ($elodifference) / 400));
		$k = 10.0;
		$deltaelo = $k * ($scoreteam1 - $expectedscoreteam1);
		return $deltaelo;
	}
   	
  	function calcDeltaELO($elof1, $elob1, $elof2, $elob2, $goals1, $goals2)
	{	
		$maxPoints = 10.0;
		$goalDifference = $goals1 - $goals2;

		// team-ELO
		$eloTeam1 = 0.5 * ($elof1 + $elob1);
		$eloTeam2 = 0.5 * ($elof2 + $elob2);

		$eloDifference = $eloTeam2 - $eloTeam1;
		if ($eloDifference > 400.0) $eloDifference = 400.0;
		if ($eloDifference < -400.0) $eloDifference = -400.0;
		
		$winningProbability = 1.0 / (1.0 + pow(10, ($eloDifference) / 400.0));
      
		$goalFactor = $goalDifference / 6.0;
		
		if($goalFactor < 0.0)
		{
			$deltaElo = $maxPoints * ($goalFactor) * ($winningProbability);
		}
		else
		{
			$deltaElo = $maxPoints * ($goalFactor) * (1.0 - $winningProbability);
		}
      
		return $deltaElo;
	}
	
	function GenerateRandomPin() 
	{
		$arrayChars = range(0, 9);
		shuffle($arrayChars);
		$sarrayChars = array_slice($arrayChars, 0, 5);
    	return implode($sarrayChars);
	}

?>