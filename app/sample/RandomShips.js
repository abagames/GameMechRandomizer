/// <reference path="../../typings/lodash/lodash.d.ts" />
/// <reference path="../../typings/snap.svg/snapsvg.d.ts" />
/// <reference path="../../typings/SAT/SAT.d.ts" />
/// <reference path="MyGameUtil.ts" />
/// <reference path="GmrSampleUtil.ts" />
/// <reference path="GmrSampleScreen.ts" />
/// <reference path="../GameMechRandomizer.ts" />
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
window.onload = function () {
    RandomShips.onLoad();
};
var RandomShips;
(function (RandomShips) {
    var gsu;
    var mgu;
    var random;
    function onLoad() {
        /*
         * cretate a GmrSampleUtil instance
         *  - GmrSampleUtil and GameMechRandomizer change properties of actors in
         *    games when the button is pressed
         *  - changing patterns are created randomly and these patterns evolve
         *    with a genetic algorithm
         *  - patterns are selected according to the fitness of each game
         *  - fitness shows the extent how the game is playable
         *  - fitness is evaluated by two AI players, one is smart and one is dull
         *  - fitness becomes higher when the smart AI player dies fewer times
         *    relative to the dull AI player
         */
        gsu = new GmrSampleUtil({
            // define actors whose properties are changed by the GmrSampleUtil instance
            // actor name
            PlayerShip: {
                // changed properties
                properties: [
                    // [property name, min value, max value]
                    ['pos.x', 10, 90],
                    ['pos.y', 10, 90],
                    ['vel.x', -2, 2],
                    ['vel.y', -2, 2],
                    ['speed', -2, 2],
                    ['shotSpeed', -4, 4],
                ],
                // a number of buttons that activate the changing operation
                buttonNum: 2
            },
            EnemyShip: {
                properties: [
                    ['pos.x', -20, 120],
                    ['pos.y', -20, 120],
                    ['vel.x', -2, 2],
                    ['vel.y', -2, 2],
                    ['speed', -2, 2],
                    ['shotSpeed', -2, 2],
                ],
                buttonNum: 3
            },
            PlayerShot: {
                properties: [
                    ['pos.x', 0, 100],
                    ['pos.y', 0, 100],
                    ['vel.x', -4, 4],
                    ['vel.y', -4, 4],
                ],
                buttonNum: 1
            },
            EnemyShot: {
                properties: [
                    ['pos.x', 0, 100],
                    ['pos.y', 0, 100],
                    ['vel.x', -2, 2],
                    ['vel.y', -2, 2],
                ],
                buttonNum: 1
            }
        }, {
            // define functions
            initEvaluation: initEvaluation,
            updateEvaluation: updateEvaluation,
            initPlay: initPlay,
            updatePlay: updatePlay
        }, new GmrSampleSnap.Screen());
        mgu = gsu.getMyGameUtil();
        random = mgu.random();
        gsu.evolve();
    }
    RandomShips.onLoad = onLoad;
    var gamesForEvaluation;
    var gamesForPlay;
    // initialize games to evaluate a fitness with AI players
    function initEvaluation() {
        gamesForEvaluation = null;
        var gmr = gsu.getGameMechRandomizerForEvaluation();
        var sei = gmr.addEvaluationType(GameMechRandomizer.EvaluationType.SmartOperation);
        var dei = gmr.addEvaluationType(GameMechRandomizer.EvaluationType.DullOperation);
        gamesForEvaluation = [
            new Game(GameType.EvalSmart, gmr, sei),
            new Game(GameType.EvalDull, gmr, dei)];
    }
    // initialize the game for a human player
    function initPlay() {
        gamesForPlay = null;
        var gmr = gsu.getGameMechRandomizerForPlay();
        gamesForPlay = [new Game(GameType.Play, gmr)];
    }
    // update games for an evaluation
    function updateEvaluation() {
        _.forEach(gamesForEvaluation, function (g) { return g.update(); });
    }
    // update the game for a play
    function updatePlay() {
        _.forEach(gamesForPlay, function (g) { return g.update(); });
        if (mgu.keyboard.consumePressed('r')) {
            gsu.goToNextGenerations();
            gsu.evolve();
        }
    }
    /*
     * implement a Game class to manage actors
     */
    var Game = (function () {
        function Game(type, gmr, evaluationIndex) {
            if (evaluationIndex === void 0) { evaluationIndex = null; }
            this.type = type;
            this.gmr = gmr;
            this.evaluationIndex = evaluationIndex;
            this.actors = [];
            this.actors = [new Ship(this)];
        }
        Game.prototype.update = function () {
            if (random.f() < 0.02) {
                this.actors.push(new Ship(this, true));
            }
            mgu.updateActors(this.actors);
        };
        return Game;
    })();
    /*
     * games have 3 types
     *  - Play: played by a human player
     *  - EvalSmart: played by a smart AI player
     *  - EvalDull: played by a dull AI player
     *
     * a fitness value is calculated according to a difference between
     * numbers of a player's death in 'EvalSmart' and 'EvalDull' type game
     *  - 'EvalSmart' death <  'EvalDull' death: plus fitness
     *  - 'EvalSmart' death >= 'EvalDull' death: minus fitness
     */
    var GameType;
    (function (GameType) {
        GameType[GameType["Play"] = 0] = "Play";
        GameType[GameType["EvalSmart"] = 1] = "EvalSmart";
        GameType[GameType["EvalDull"] = 2] = "EvalDull";
    })(GameType || (GameType = {}));
    /*
     * implement actors
     */
    var playerShip;
    var Ship = (function (_super) {
        __extends(Ship, _super);
        function Ship(game, isEnemy) {
            if (isEnemy === void 0) { isEnemy = false; }
            _super.call(this);
            this.game = game;
            this.isEnemy = isEnemy;
            this.speed = 2;
            this.wasPressing = false;
            this.hitTicks = 0;
            if (this.isEnemy) {
                this.pos = new SAT.Vector(random.f(90, 10), -10);
                this.vel = new SAT.Vector(0, 1);
                // assign a GameMechRandomizer.Actor with the specific actor name
                //  - properties of this instance are changed when a button is pressed
                this.gmrActor = this.game.gmr.actor(this, 'EnemyShip');
                this.gmrActor.setEvaluationIndex(game.evaluationIndex);
                this.shotSpeed = 1.5;
            }
            else {
                this.pos = new SAT.Vector(50, 70);
                this.vel = new SAT.Vector();
                this.gmrActor = this.game.gmr.actor(this, 'PlayerShip');
                this.gmrActor.setEvaluationIndex(game.evaluationIndex);
                this.shotSpeed = 3;
                playerShip = this;
            }
            this.ppos = this.pos.clone();
            // set an auto pressing pattern of a changing operation button
            // (button 0 is always pressed)
            this.gmrActor.setAutoPressing({ isAlways: true }, 0);
            if (this.isEnemy) {
                // (button 1 switches the status of pressing by the probability 0.01)
                this.gmrActor.setAutoPressing({ changingProbability: 0.01 }, 1);
                this.gmrActor.setAutoPressing({ changingProbability: 0.005 }, 2);
            }
            else {
                if (this.game.type !== GameType.Play) {
                    this.gmrActor.setAutoPressing({ changingProbability: 0.1 }, 1);
                }
            }
            if (this.game.type === GameType.Play) {
                var fillColor = (isEnemy ? '#e7e' : '#ee7');
                var strokeColor = (isEnemy ? '#727' : '#772');
                var attrParams = {
                    fill: fillColor,
                    stroke: strokeColor, strokeWidth: 2,
                };
                this.svg = gsu.screen.snap.rect(-5, -5, 10, 10, 2).
                    transform("t" + this.pos.x + "," + this.pos.y).
                    attr(attrParams);
            }
        }
        Ship.prototype.update = function () {
            if (this.isEnemy) {
                this.updateEnemy();
            }
            else {
                this.updatePlayer();
            }
            if (this.gmrActor.isPressing(1)) {
                if (!this.wasPressing) {
                    this.wasPressing = true;
                    if (this.isEnemy) {
                        this.fireEnemy();
                    }
                    else {
                        this.firePlayer();
                    }
                }
            }
            else {
                this.wasPressing = false;
            }
            if (Math.abs(this.ppos.x - this.pos.x) > 2) {
                // teach a minus fitness value when the actor behaves improperly
                // (e.g. the actor moves too fast)
                this.gmrActor.teachFitness(-1);
            }
            if (Math.abs(this.ppos.y - this.pos.y) > 2) {
                this.gmrActor.teachFitness(-1);
            }
            this.collider = new SAT.Box(new SAT.Vector(this.pos.x - 5, this.pos.y - 5), 10, 10).toPolygon();
            if (_super.prototype.update.call(this) === false) {
                return false;
            }
        };
        Ship.prototype.updateEnemy = function () {
            var _this = this;
            if (!this.pos.isIn(20, 0, 100, 0, 100)) {
                if (this.ticks < 30) {
                    this.gmrActor.teachFitness(-10);
                }
                this.isRemoving = true;
            }
            if (this.ticks > 300) {
                this.isRemoving = true;
                this.gmrActor.teachFitness(-10);
            }
            _.forEach(mgu.getActors(Shot, this.game.actors), function (a) {
                if (!a.isEnemy && SAT.testPolygonPolygon(_this.collider, a.collider)) {
                    a.isRemoving = true;
                    _this.isRemoving = true;
                    // teach a plus fitness value when the actor behaves properly
                    // (e.g. the actor destroies the enemy)
                    _this.gmrActor.teachFitness(10);
                }
            });
        };
        Ship.prototype.fireEnemy = function () {
            var v = new SAT.Vector();
            v.moveAngle(this.pos.angleTo(playerShip.pos), this.shotSpeed);
            this.game.actors.push(new Shot(this.game, this.pos, v, true));
        };
        Ship.prototype.updatePlayer = function () {
            var _this = this;
            switch (this.game.type) {
                // 'Play' type game is controlled by a player 
                case GameType.Play:
                    if (mgu.keyboard.isPressed('z')) {
                        this.gmrActor.setPressing(1);
                    }
                    this.pos.add(mgu.stick().mul(this.speed));
                    break;
                // 'EvalSmart' type game is controlled by a smart AI player
                case GameType.EvalSmart:
                    // (trace the 8 figure path to avoid incoming shots)
                    var tx = Math.sin(this.ticks * 0.02) * 30 + 50;
                    var ty = Math.sin(this.ticks * 0.04) * 20 + 70;
                    this.pos.moveTo(new SAT.Vector(tx, ty), this.speed);
                    break;
                // 'EvalDull' type game is controlled by a dull AI player
                case GameType.EvalDull:
                    // (move randomly)
                    this.pos.moveAngle(random.f(360), this.speed);
                    break;
            }
            this.pos.clamp(0, 100, 0, 100);
            _.forEach(mgu.getActors(Shot, this.game.actors), function (a) {
                if (a.isEnemy && SAT.testPolygonPolygon(_this.collider, a.collider)) {
                    a.isRemoving = true;
                    if (a.ticks < 10) {
                        _this.gmrActor.teachFitness(-10);
                    }
                    // call teachDeath() function when the player dies
                    //  - the fitness value is calculated according to
                    //    a difference between numbers of death in
                    //    'EvalSmart' and 'EvalDull' type game
                    //    ('EvalSmart' death <  'EvalDull' death: plus fitness)
                    //    ('EvalSmart' death >= 'EvalDull' death: minus fitness)
                    _this.gmrActor.teachDeath();
                    if (_this.svg != null) {
                        _this.svg.attr({ stroke: '#ff2' });
                        _this.hitTicks = 30;
                    }
                }
            });
            if (this.hitTicks > 0) {
                this.hitTicks--;
                if (this.hitTicks <= 0) {
                    this.svg.attr({ stroke: '#772' });
                }
            }
        };
        Ship.prototype.firePlayer = function () {
            var v = new SAT.Vector();
            v.moveAngle(0, this.shotSpeed);
            this.game.actors.push(new Shot(this.game, this.pos, v, false));
        };
        return Ship;
    })(GmrSampleSnap.Actor);
    var Shot = (function (_super) {
        __extends(Shot, _super);
        function Shot(game, pos, vel, isEnemy) {
            if (isEnemy === void 0) { isEnemy = false; }
            _super.call(this);
            this.game = game;
            this.isEnemy = isEnemy;
            this.pos = new SAT.Vector().copy(pos);
            this.vel = new SAT.Vector().copy(vel);
            if (isEnemy) {
                this.gmrActor = this.game.gmr.actor(this, 'EnemyShot');
            }
            else {
                this.gmrActor = this.game.gmr.actor(this, 'PlayerShot');
            }
            this.gmrActor.setEvaluationIndex(game.evaluationIndex);
            this.gmrActor.setAutoPressing({ isAlways: true }, 0);
            if (this.game.type === GameType.Play) {
                var fillColor = (isEnemy ? '#e7e' : '#ee7');
                var strokeColor = (isEnemy ? '#727' : '#772');
                var attrParams = {
                    fill: fillColor,
                    stroke: strokeColor, strokeWidth: 1,
                };
                this.svg = gsu.screen.snap.rect(-2.5, -2.5, 5, 5, 1).
                    transform("t" + this.pos.x + "," + this.pos.y).
                    attr(attrParams);
            }
        }
        Shot.prototype.update = function () {
            if (!this.pos.isIn(0, 0, 100, 0, 100)) {
                this.isRemoving = true;
            }
            if (this.ticks > 300) {
                this.isRemoving = true;
                this.gmrActor.teachFitness(-10);
            }
            this.collider = new SAT.Box(new SAT.Vector(this.pos.x - 2.5, this.pos.y - 2.5), 5, 5).toPolygon();
            if (_super.prototype.update.call(this) === false) {
                return false;
            }
        };
        return Shot;
    })(GmrSampleSnap.Actor);
})(RandomShips || (RandomShips = {}));
//# sourceMappingURL=RandomShips.js.map