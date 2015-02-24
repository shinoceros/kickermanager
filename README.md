# Kickermanager

## Introduction
<img align="right" src="https://github.com/shinoceros/kickermanager/blob/master/doc/screenshot1.png"/>
Kickermanager is a small web application for table soccer (a.k.a. foosball) enthusiasts who want to keep track of their results. Features include user management, a basic role system, score submitting, an ELO based ranking system, ranking tables, multiple seasons as well as player and match statistics.

Currently the UI is only in German, English localization might be added in future releases.
<br clear="all">

## Authors
* Andre Meyer
* Andreas Koch
* Michael Koch
* Marcel Daneyko

## Requirements
The following setup is well tested on a daily basis:
* Apache
* PHP
* MySQL >= 5.4 (native drivers required)
* JavaScript

## Installation
* extract release zip archive to target folder
* adjust path setting in api/.htaccess if necessary
* copy api/dbconfig.php.example to api/dbconfig.php and adjust db connection settings
* run http://server/setup.php

## Technologies
Kickermanager uses the following core technologies:
* AngularJS
* UI-Router
* Bootstrap
* Slim Framework
