<?php
	$titre = file_get_contents('http://futuradios.eu/externe/titrage/hits/titre.txt');
	$titre = iconv('Windows-1252', 'UTF-8', $titre);
	echo str_replace('[LANCÉ]', '', $titre);
?>
