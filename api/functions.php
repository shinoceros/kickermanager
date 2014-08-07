<?php
	include ('db.php');

	//ELO
	function calcDeltaELO($elof1, $elob1, $elof2, $elob2, $goals1, $goals2)
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
	?>