/// <reference path="../../typings/lodash/lodash.d.ts" />
/// <reference path="../../typings/snap.svg/snapsvg.d.ts" />
/// <reference path="../../typings/SAT/SAT.d.ts" />
/// <reference path="../../typings/GIFCaptureCanvas/GifCaptureCanvas.d.ts" />
/// <reference path="MyGameUtil.ts" />
/// <reference path="GmrSampleUtil.ts" />
/// <reference path="../GameMechRandomizer.ts" />

window.onload = () => {
	RandomSpikes.onLoad();
}

namespace RandomSpikes {
	var gsu: GmrSampleUtil;
	var mgu: MyGameUtil;
	var random: MyGameUtil.Random;

	export function onLoad() {
		gsu = new GmrSampleUtil({
			PlayerBall: {
				properties: [
					['pos.x', 0, 60],
					['pos.y', 10, 90],
					['vel.x', -2, 2],
					['vel.y', -2, 2],
					'gravity',
					'bounce',
					['scale.x', 0.5, 2],
					['scale.y', 0.5, 2]
				],
				buttonNum: 2
			},
			EnemyBall: {
				properties: [
					'pos.x',
					['pos.y', 10, 90],
					['vel.x', -2, 2],
					['vel.y', -2, 2],
					'gravity',
					'bounce',
					['scale.x', 0.5, 3],
					['scale.y', 0.5, 3]
				],
				buttonNum: 3
			}
		}, {
				initEvaluation: initEvaluation,
				updateEvaluation: updateEvaluation,
				initPlay: initPlay,
				updatePlay: updatePlay
			});
		mgu = gsu.getMyGameUtil();
		random = mgu.random();
		gsu.evolve();
	}

	var gamesForEvaluation: Game[];
	var gamesForPlay: Game[];
	var pathfoundGamesForEvaluation: Game[];
	var pathfoundGamesForPlay: Game[];

	function initEvaluation() {
		gamesForEvaluation = pathfoundGamesForEvaluation = null;
		pathfoundGamesForEvaluation = [];
		var gmr = gsu.getGameMechRandomizerForEvaluation();
		gamesForEvaluation = [new Game(GameType.EvalPathfinding, gmr)];
		var sei = gmr.addEvaluationType
			(GameMechRandomizer.EvaluationType.SmartOperation);
		gamesForEvaluation.push(
			new Game(GameType.EvalSmart, gmr, sei));
		_.times(3, () => {
			var dei = gmr.addEvaluationType
				(GameMechRandomizer.EvaluationType.DullOperation);
			gamesForEvaluation.push(
				new Game(GameType.EvalDull, gmr, dei));
		});
	}

	function initPlay() {
		gamesForPlay = pathfoundGamesForPlay = null;
		pathfoundGamesForPlay = [];
		var gmr = gsu.getGameMechRandomizerForPlay();
		gamesForPlay = [
			new Game(GameType.PlayPathfinding, gmr),
			new Game(GameType.Play, gmr)
		];
	}

	function updateEvaluation() {
		_.forEach(gamesForEvaluation, (g) => g.update());
	}

	function updatePlay() {
		_.forEach(gamesForPlay, (g) => g.update());
		if (mgu.keyboard.consumePressed('r')) {
			gsu.goToNextGenerations();
			gsu.evolve();
		}
	}

	class Game {
		actors = [];
		pathfoundGames: Game[];

		constructor(public type: GameType,
			public gmr: GameMechRandomizer,
			public evaluationIndex: number = null) {
			var ballType = (this.type === GameType.Play ?
				BallType.Player : BallType.PlayerAuto);
			this.actors = [new Ball(this, ballType, random.i(0x7fffffff))];
			if (GameType.isPlay(this.type)) {
				this.pathfoundGames = pathfoundGamesForPlay;
			} else {
				this.pathfoundGames = pathfoundGamesForEvaluation;
			}
			if (!GameType.isPathfinding(this.type)) {
				this.pathfoundGames.push(this);
			}
			if (this.type === GameType.Play) {
				_.times(6, (i) => {
					this.actors.push(new Wall(i * 20, 20 - 2.5));
					this.actors.push(new Wall(i * 20, 80 + 2.5));
				});
			}
		}

		update() {
			if (GameType.isPathfinding(this.type) && random.f() < 0.05) {
				this.actors.push
					(new Ball(this, BallType.EnemyForPathfinding,
						random.i(0x7fffffff)));
			}
			mgu.updateActors(this.actors);
		}

		scroll(x: number) {
			_.forEach(mgu.getActors(Ball, this.actors), (a) => {
				a.pos.x += x;
			})
			_.forEach(mgu.getActors(Wall, this.actors), (a) => {
				a.pos.x += x;
			})
		}

		sendBallToPathfoundGames(randomSeed: number) {
			_.forEach(this.pathfoundGames, (g) => {
				g.actors.push(new Ball(g, BallType.Enemy, randomSeed));
			})
		}
	}

	enum GameType {
		Play,
		PlayPathfinding,
		EvalSmart,
		EvalDull,
		EvalPathfinding
	}

	namespace GameType {
		export function isPathfinding(type: GameType) {
			return type === GameType.PlayPathfinding ||
				type === GameType.EvalPathfinding;
		}

		export function isPlay(type: GameType) {
			return type === GameType.Play ||
				type === GameType.PlayPathfinding;
		}
	}

	class Ball extends GmrSampleUtil.Actor {
		gravity = 0;
		bounce = 0;
		baseScale = 1;
		hitTicks = 0;

		constructor(public game: Game, public type: BallType,
			public randomSeed: number = null) {
			super();
			if (BallType.isPlayer(this.type)) {
				this.pos = new SAT.Vector(30, 50);
				this.vel = new SAT.Vector(1, 0);
				this.gmrActor = this.game.gmr.actor(this, 'PlayerBall', randomSeed);
				this.gmrActor.setEvaluationIndex(game.evaluationIndex);
			} else {
				var random = mgu.random(randomSeed);
				this.pos = new SAT.Vector(110, random.f(80, 20));
				this.vel = new SAT.Vector(-1, 0);
				this.gmrActor = this.game.gmr.actor(this, 'EnemyBall', randomSeed);
			}
			this.gmrActor.setAutoPressing({isAlways: true}, 0);
			if (this.type === BallType.PlayerAuto) {
				var pp = null;
				if (this.game.type === GameType.EvalDull) {
					switch (this.game.evaluationIndex) {
						case 2:
							pp = {isAlways: true};
							break;
						case 3:
							pp = {changingProbability: 1};
							break;
					}
				} else {
					pp = {changingProbability: 0.05};
				}
				if (pp != null){
					this.gmrActor.setAutoPressing(pp, 1);
				}
				if (GameType.isPathfinding(this.game.type)) {
					this.baseScale = 1.5;
				}
			}
			if (!BallType.isPlayer(this.type)) {
				this.gmrActor.setAutoPressing({changingProbability: 0.025}, 1);
				this.gmrActor.setAutoPressing({changingProbability: 0.05}, 2);
			}
			if (this.game.type == GameType.Play) {
				var fillColor = (BallType.isPlayer(this.type) ? '#ee7' : '#e7e');
				var strokeColor = (BallType.isPlayer(this.type) ? '#772' : '#727');
				var attrParams = {
					fill: fillColor,
					stroke: strokeColor, strokeWidth: 2,
				};
				this.svg = (<any>gsu.snap.rect(-5, -5, 10, 10, 2).
					transform(`t${this.pos.x},${this.pos.y}`)).
					attr(attrParams);
			}
		}

		update() {
			if (this.type === BallType.Player && mgu.keyboard.isPressed('z')) {
				this.gmrActor.setPressing(1);
			}
			if (this.type === BallType.PlayerAuto && this.ticks < 8) {
				this.gmrActor.setPressing(1, this.ticks % 2 === 0);
			}
			this.vel.y += this.gravity;
			var hh = this.scale.y * 10 / 2;
			if (this.pos.y >= 80 - hh) {
				this.pos.y = 80 - hh;
				if (this.vel.y > 0) {
					this.vel.y *= this.bounce;
				}
			}
			if (this.pos.y <= 20 + hh) {
				this.pos.y = 20 + hh;
				if (this.vel.y < 0) {
					this.vel.y *= this.bounce;
				}
			}
			if (!BallType.isPlayer(this.type)) {
				if (Math.abs(this.ppos.x - this.pos.x) > 2) {
					this.gmrActor.teachFitness(-1);
				}
				if (Math.abs(this.ppos.y - this.pos.y) > 2) {
					this.gmrActor.teachFitness(-1);
				}
			}
			var sx = this.scale.x * this.baseScale;
			var sy = this.scale.y * this.baseScale;
			this.collider = new SAT.Box
				(new SAT.Vector(this.pos.x - 5 * sx, this.pos.y - 5 * sy),
				10 * sx, 10 * sy).toPolygon();
			if (BallType.isPlayer(this.type)) {
				if (this.pos.x > 30) {
					this.game.scroll((30 - this.pos.x) * 0.1);
				}
				_.forEach(mgu.getActors(Ball, this.game.actors), (a: Ball) => {
					if (!BallType.isPlayer(a.type) &&
						SAT.testPolygonPolygon(this.collider, a.collider)) {
						a.isRemoving = true;
						if (a.ticks < 10) {
							this.gmrActor.teachFitness(-10);
						}
						this.gmrActor.teachDeath();
						if (this.svg != null) {
							this.svg.attr({ stroke: '#ff2' });
							this.hitTicks = 30;
						}
					}
				});
				if (this.hitTicks > 0) {
					this.hitTicks--;
					if (this.hitTicks <= 0) {
						this.svg.attr({ stroke: '#772' });
					}
				}
			} else {
				if (this.type === BallType.EnemyForPathfinding) {
					if (this.ticks > 120) {
						this.isRemoving = true;
						this.game.sendBallToPathfoundGames(this.randomSeed);
					}
				} else {
					if (this.pos.x < -10 || this.pos.x > 120) {
						this.isRemoving = true;
					}
				}
			}
			if (super.update() === false) {
				return false;
			}
		}
	}

	enum BallType {
		Player,
		PlayerAuto,
		Enemy,
		EnemyForPathfinding
	}

	namespace BallType {
		export function isPlayer(type: BallType) {
			return type === BallType.Player || type === BallType.PlayerAuto;
		}
	}

	class Wall {
		pos: SAT.Vector;
		svg: Snap.Element = null;

		constructor(x: number, y: number) {
			this.pos = new SAT.Vector(x, y);
			var attrParams = {
				fill: '#7ee',
				stroke: '#277', strokeWidth: 1,
			};
			this.svg = (<any>gsu.snap.rect(-10, -2.5, 20, 5, 1).
				transform(`t${this.pos.x},${this.pos.y}`)).
				attr(attrParams);
		}

		update() {
			this.pos.x = mgu.wrap(this.pos.x, -10, 110);
			this.svg.transform
				(`t${Math.floor(this.pos.x * 100) / 100},${Math.floor(this.pos.y * 100) / 100}`);
		}
	}
}
