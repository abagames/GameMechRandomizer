/// <reference path="../../typings/lodash/lodash.d.ts" />
/// <reference path="../../typings/matter/matter-js.d.ts" />
/// <reference path="MyGameUtil.ts" />
/// <reference path="GmrSampleUtil.ts" />
/// <reference path="GmrSampleScreen.ts" />
/// <reference path="../GameMechRandomizer.ts" />

window.onload = () => {
	RandomFalls.onLoad();
}

namespace RandomFalls {
	var gsu: GmrSampleUtil;
	var mgu: MyGameUtil;
	var gsms: GmrSampleMatter.Screen;
	var random: MyGameUtil.Random;

	export function onLoad() {
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
			},
			new GmrSampleMatter.Screen());
		gsms = <GmrSampleMatter.Screen>gsu.screen;
		mgu = gsu.getMyGameUtil();
		random = mgu.random();
		gsu.evolve();
	}

	var gamesForEvaluation: Game[];
	var gamesForPlay: Game[];

	function initEvaluation() {
		_.forEach(gamesForEvaluation, (g) => g.clear());
		gamesForEvaluation = null;
		var gmr = gsu.getGameMechRandomizerForEvaluation();
		var sei = gmr.addEvaluationType
			(GameMechRandomizer.EvaluationType.SmartOperation);
		var dei = gmr.addEvaluationType
			(GameMechRandomizer.EvaluationType.DullOperation);
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
		engine: Matter.Engine;
		player: Player;

		constructor(public type: GameType,
			public gmr: GameMechRandomizer,
			public evaluationIndex: number = null) {
			if (type === GameType.Play) {
				this.engine = gsms.engineForPlay;
			} else {
				this.engine = gsms.getEngineForEvaluation();
			}
			this.actors = [new Player(this)];
			Matter.Events.on(this.engine, 'collisionStart', (e) => {
				_.forEach(e.pairs, (p: any) => {
					var ba = p.bodyA;
					var bb = p.bodyB;
					if (ba.isStatic === false && bb.isStatic === false &&
						(ba.id === this.player.body.id || bb.id === this.player.body.id)) {
						var bid = ba.id;
						if (bid === this.player.body.id) {
							bid = bb.id;
						}
						this.removeBall(bid);
					}
				});
			});
			var ground = Matter.Bodies.rectangle(50, 100, 88, 10, { isStatic: true });
			var lwall = Matter.Bodies.rectangle(0, 50, 10, 88, { isStatic: true });
			var rwall = Matter.Bodies.rectangle(100, 50, 10, 88, { isStatic: true });
			Matter.World.add(this.engine.world, [ground, lwall, rwall]);
		}

		update() {
			gsms.updateEngine(this.engine);
			if (random.f() < 0.02) {
				this.actors.push(new Ball(this));
			}
			mgu.updateActors(this.actors);
		}

		removeBall(bodyId: number) {
			mgu.getActors(Ball, this.actors).forEach((a: Ball) => {
				if (a.body.id === bodyId) {
					a.isRemoving = true;
					this.player.hit();
				}
			});
		}

		clear() {
			gsms.clearEngine(this.engine);
		}
	}

	enum GameType {
		Play,
		EvalSmart,
		EvalDull
	}

	class World {
		world: Matter.World;
		gmrActor: GameMechRandomizer.Actor;

		constructor(public game: Game) {
			this.world = game.engine.world;
			this.gmrActor = game.gmr.actor(this);
			this.gmrActor.setAutoPressing({ isAlways: true }, 0);
		}

		update() {
			this.gmrActor.update();
		}
	}

	class Player extends GmrSampleMatter.Actor {
		hitTicks = 0;

		constructor(public game: Game) {
			super(game.engine);
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

		resetColor() {
			this.body.render.strokeStyle = '#772';
		}

		update() {
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
			if (super.update() === false) {
				this.gmrActor.teachFitness(-10000);
				return false;
			}
		}

		hit() {
			this.gmrActor.teachDeath();
			this.hitTicks = 30;
			this.body.render.strokeStyle = '#ff2';
		}
	}

	class Ball extends GmrSampleMatter.Actor {
		constructor(public game: Game) {
			super(game.engine);
			this.body = Matter.Bodies.circle(random.f(80, 20), -10, random.f(10, 5));
			Matter.World.add(game.engine.world, [this.body]);
			this.gmrActor = game.gmr.actor(this);
			this.gmrActor.setEvaluationIndex(this.game.evaluationIndex);
			this.gmrActor.setAutoPressing({ changingProbability: 0.1 }, 0);
			this.gmrActor.setAutoPressing({ changingProbability: 0.1 }, 1);
			this.gmrActor.setAutoPressing({ isAlways: true }, 2);
		}

		update() {
			if (this.ticks > 80) {
				if (this.ticks === 83) {
					this.gmrActor.teachFitness(10);
				}
				if (this.ticks > 120) {
					this.isRemoving = true;
				}
				this.applyingForce.y -= 0.001;
			}
			if (super.update() === false) {
				return false;
			}
		}
	}
}
