GameMechRandomizer
======================

Toward an infinite random awful action games generator

### Demos

* [Random Spikes](http://abagames.sakura.ne.jp/15/GameMechRandomizer/app/sample/RandomSpikes.html)

* [Random Ships](http://abagames.sakura.ne.jp/15/GameMechRandomizer/app/sample/RandomShips.html)

### Basic mechanism

* Randomize properties of actors in games and use them as seed entities of a [genetic algorithm](https://en.wikipedia.org/wiki/Genetic_algorithm)
* Entities are selected according to the fitness of each game
* The fitness shows the extent how the game is playable
* The fitness is evaluated by two AI players, one is smart and one is dull
* The fitness becomes higher when the smart AI player dies fewer times relative to the dull AI player

** The mechanism is heavily inspired by [Mechanic Miner: Reflection-Driven Game Mechanic Discovery and Level Design](http://ccg.doc.gold.ac.uk/papers/cook_evogames13.pdf)

** The detailed expression is in comments of [RandomShips.ts](https://github.com/abagames/GameMechRandomizer/blob/master/src/sample/RandomShips.ts)

### Acknowledgement

[genetic.js](http://subprotocol.com/system/genetic-js.html) /
[xorshift](https://github.com/AndreasMadsen/xorshift) /
[lz-string](http://pieroxy.net/blog/pages/lz-string/index.html) /
[lodash](https://lodash.com/) /
[animation-frame](https://github.com/kof/animation-frame) /
[game-keyboard](https://github.com/ericlathrop/game-keyboard) /
[sat-js](https://github.com/jriecken/sat-js) /
[Snap.svg](http://snapsvg.io/)

License
----------
MIT
