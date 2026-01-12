<<<<<<< HEAD
# InfoViz
=======
# 2025-fide

International Chess Federation (FIDE) ratings for standard chess game


## Content

* **data/** the data in [tsv](https://en.wikipedia.org/wiki/Tab-separated_values).
	* **players.tsv**   players details
	* **ratings.tsv**   player's ratings (1 to many)
	* **titles.tsv**    player's titles (1 to many)
	* **countries.tsv** country codes used by FIDE
	* **iso3.tsv**      country codes used by ISO and regions
	* **filter.py**     a script to extract smaller data sets
* **viz/** sample visualisations
* **vendor/** vendorized d3 v7.8.5 library

## Data structure

The attributes present in the **players** table are:

* **id**          a unique id for character (465877 values)
* **name**        player's name
* **fed**         player's chess federation (FIDE country code)
* **sex**         {'M', 'F'}
* **birthyear**   birthyear ('%Y' time format)
* **max_rating**  maximum [ELO](https://en.wikipedia.org/wiki/Elo_rating_system) rating achieved
* **month**       month of achievement for max_rating ('%Y-%m' time format)

The attributes present in the **ratings** (1 to many, 5173071 records) table are:

* **id**      reference to a player
* **month**   month fot the rating ('%Y-%m' time format)
* **rating**  ELO rating for that month
* **games**   number of games played that month

The attributes present in the **titles** (1 to many, 27318 records) table are:

* **id**      reference to a player
* **month**   month for the rating ('%Y-%m' time format)
* **title**   [FIDE title](https://en.wikipedia.org/wiki/FIDE_titles) acquired that month

The attributes present in the **countries** table are:

* **#country**  name of the country in english
* **ioc**       FIDE country code (can be matched against the player's fed attribute)
* **alpha3**    the [ISO 3166-1 alpha-3](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-3) country code (can be used as a key for lookup into the iso3 dataset)

The attributes present in the **iso3** table are:

* **#alpha3**   the [ISO 3166-1 alpha-3](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-3) country code (156 values)
* **country**   name of the country in english
* **subregion** world subregion (~sub continent)
* **region**    world region (~continent)

## Smaller data sets

The **data/** folder contains a **filter.py** script to extract smaller datasets for testing.

	Usage: ./filter.py [-hc:e:g:y:] <suffix>
		-h  --help             print this help message then exit
		-c  --country <XXX>    keep players from country <XXX> (defaults to )
		-e  --elo [min]-[max]  keep players with highest ELO between <min> and <max> (defaults to 1000-3000)
		-g  --gender [M|F]     keep players matching gender (defaults to )
		-y  --year [min]-[max] keep players with birthyear between <min> and <max> (defaults to 1900-2025)
		<suffix>               use 'xxx-<suffix>.tsv' filenames for output

A small dataset of ~1000 players (consisting of the U20 girls from France) and a medium dataset of ~2000 players (max ELO rating >= 2200) have been extracted using:

	./filter.py -y 2005- -g F -c FRA small
	./filter.py -e 2200+ medium

* **data/**
	* **players-small.tsv** excerpt of players with ~1000 players (U20 girls from France)
	* **ratings-small.tsv** excerpt of ratings for the players-small data set
	* **players-medium.tsv** excerpt of players with ~20000 players (max ELO rating >= 2200)
	* **ratings-medium.tsv** excerpt of ratings for the players-small data set


## Sample visualizations

* **viz/0-top20.html** a HTML list of the top 20 players [D3.js](https://d3js.org/)
* **viz/1-player.html** a line chart of the evolution of ELO rating for a given player
* more to come
>>>>>>> 8dbe401 (first baseline)
