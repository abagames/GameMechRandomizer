/// <reference path="../../typings/lodash/lodash.d.ts" />
/// <reference path="../../typings/matter/matter-js.d.ts" />
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
    RandomFalls.onLoad();
};
var RandomFalls;
(function (RandomFalls) {
    var gsu;
    var mgu;
    var gsms;
    var random;
    function onLoad() {
        gsu = new GmrSampleUtil({
            Player: {
                properties: GmrSampleMatter.Actor.properties,
                buttonNum: 3
            },
            Ball: {
                properties: GmrSampleMatter.Actor.properties,
                buttonNum: 3
            },
            World: {
                properties: [
                    ['world.gravity.x', -1, 1],
                    ['world.gravity.y', 0, 2]
                ],
                buttonNum: 1
            }
        }, {
            initEvaluation: initEvaluation,
            updateEvaluation: updateEvaluation,
            initPlay: initPlay,
            updatePlay: updatePlay
        }, new GmrSampleMatter.Screen());
        gsms = gsu.screen;
        mgu = gsu.getMyGameUtil();
        random = mgu.random();
        gsu.evolve();
    }
    RandomFalls.onLoad = onLoad;
    var gamesForEvaluation;
    var gamesForPlay;
    function initEvaluation() {
        _.forEach(gamesForEvaluation, function (g) { return g.clear(); });
        gamesForEvaluation = null;
        var gmr = gsu.getGameMechRandomizerForEvaluation();
        var sei = gmr.addEvaluationType(GameMechRandomizer.EvaluationType.SmartOperation);
        var dei = gmr.addEvaluationType(GameMechRandomizer.EvaluationType.DullOperation);
        gamesForEvaluation = [
            new Game(GameType.EvalSmart, gmr, sei),
            new Game(GameType.EvalDull, gmr, dei)];
    }
    function initPlay() {
        gamesForPlay = null;
        var gmr = gsu.getGameMechRandomizerForPlay();
        gamesForPlay = [new Game(GameType.Play, gmr)];
    }
    function updateEvaluation() {
        _.forEach(gamesForEvaluation, function (g) { return g.update(); });
    }
    function updatePlay() {
        _.forEach(gamesForPlay, function (g) { return g.update(); });
        if (mgu.keyboard.consumePressed('r')) {
            gsu.goToNextGenerations();
            gsu.evolve();
        }
    }
    var Game = (function () {
        function Game(type, gmr, evaluationIndex) {
            var _this = this;
            if (evaluationIndex === void 0) { evaluationIndex = null; }
            this.type = type;
            this.gmr = gmr;
            this.evaluationIndex = evaluationIndex;
            this.actors = [];
            if (type === GameType.Play) {
                this.engine = gsms.engineForPlay;
            }
            else {
                this.engine = gsms.getEngineForEvaluation();
            }
            this.actors = [new Player(this)];
            Matter.Events.on(this.engine, 'collisionStart', function (e) {
                _.forEach(e.pairs, function (p) {
                    var ba = p.bodyA;
                    var bb = p.bodyB;
                    if (ba.isStatic === false && bb.isStatic === false &&
                        (ba.id === _this.player.body.id || bb.id === _this.player.body.id)) {
                        var bid = ba.id;
                        if (bid === _this.player.body.id) {
                            bid = bb.id;
                        }
                        _this.removeBall(bid);
                    }
                });
            });
            var ground = Matter.Bodies.rectangle(50, 100, 88, 10, { isStatic: true });
            var lwall = Matter.Bodies.rectangle(0, 50, 10, 88, { isStatic: true });
            var rwall = Matter.Bodies.rectangle(100, 50, 10, 88, { isStatic: true });
            Matter.World.add(this.engine.world, [ground, lwall, rwall]);
        }
        Game.prototype.update = function () {
            gsms.updateEngine(this.engine);
            if (random.f() < 0.02) {
                this.actors.push(new Ball(this));
            }
            mgu.updateActors(this.actors);
        };
        Game.prototype.removeBall = function (bodyId) {
            var _this = this;
            mgu.getActors(Ball, this.actors).forEach(function (a) {
                if (a.body.id === bodyId) {
                    a.isRemoving = true;
                    _this.player.hit();
                }
            });
        };
        Game.prototype.clear = function () {
            gsms.clearEngine(this.engine);
        };
        return Game;
    })();
    var GameType;
    (function (GameType) {
        GameType[GameType["Play"] = 0] = "Play";
        GameType[GameType["EvalSmart"] = 1] = "EvalSmart";
        GameType[GameType["EvalDull"] = 2] = "EvalDull";
    })(GameType || (GameType = {}));
    var World = (function () {
        function World(game) {
            this.game = game;
            this.world = game.engine.world;
            this.gmrActor = game.gmr.actor(this);
            this.gmrActor.setAutoPressing({ isAlways: true }, 0);
        }
        World.prototype.update = function () {
            this.gmrActor.update();
        };
        return World;
    })();
    var Player = (function (_super) {
        __extends(Player, _super);
        function Player(game) {
            _super.call(this, game.engine);
            this.game = game;
            this.hitTicks = 0;
            this.body = Matter.Bodies.circle(50, 60, 5);
            this.body.render.fillStyle = '#dd9';
            this.resetColor();
            game.player = this;
            Matter.World.add(game.engine.world, [this.body]);
            this.gmrActor = game.gmr.actor(this);
            this.gmrActor.setEvaluationIndex(this.game.evaluationIndex);
            if (this.game.type === GameType.EvalSmart) {
                this.gmrActor.setAutoPressing({ changingProbability: 0.1 }, 0);
                this.gmrActor.setAutoPressing({ changingProbability: 0.1 }, 1);
            }
            this.gmrActor.setAutoPressing({ isAlways: true }, 2);
        }
        Player.prototype.resetColor = function () {
            this.body.render.strokeStyle = '#772';
        };
        Player.prototype.update = function () {
            if (this.game.type === GameType.Play) {
                if (mgu.stick().x > 0) {
                    this.applyingForce.x += 0.0001;
                    this.gmrActor.setPressing(0);
                }
                if (mgu.stick().x < 0) {
                    this.applyingForce.x -= 0.0001;
                    this.gmrActor.setPressing(1);
                }
            }
            if (this.hitTicks > 0) {
                this.hitTicks--;
                if (this.hitTicks <= 0) {
                    this.resetColor();
                }
            }
            if (_super.prototype.update.call(this) === false) {
                this.gmrActor.teachFitness(-10000);
                return false;
            }
        };
        Player.prototype.hit = function () {
            this.gmrActor.teachDeath();
            this.hitTicks = 30;
            this.body.render.strokeStyle = '#ff2';
        };
        return Player;
    })(GmrSampleMatter.Actor);
    var Ball = (function (_super) {
        __extends(Ball, _super);
        function Ball(game) {
            _super.call(this, game.engine);
            this.game = game;
            this.body = Matter.Bodies.circle(random.f(80, 20), -10, random.f(10, 5));
            Matter.World.add(game.engine.world, [this.body]);
            this.gmrActor = game.gmr.actor(this);
            this.gmrActor.setEvaluationIndex(this.game.evaluationIndex);
            this.gmrActor.setAutoPressing({ changingProbability: 0.1 }, 0);
            this.gmrActor.setAutoPressing({ changingProbability: 0.1 }, 1);
            this.gmrActor.setAutoPressing({ isAlways: true }, 2);
        }
        Ball.prototype.update = function () {
            if (this.ticks > 80) {
                if (this.ticks === 83) {
                    this.gmrActor.teachFitness(10);
                }
                if (this.ticks > 120) {
                    this.isRemoving = true;
                }
                this.applyingForce.y -= 0.001;
            }
            if (_super.prototype.update.call(this) === false) {
                return false;
            }
        };
        return Ball;
    })(GmrSampleMatter.Actor);
})(RandomFalls || (RandomFalls = {}));
//# sourceMappingURL=RandomFalls.js.map