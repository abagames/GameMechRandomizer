/// <reference path="../typings/lodash/lodash.d.ts" />
declare var Genetic: any;
declare var XorShift: any;
declare module LZString {
    function compressToEncodedURIComponent(obj: any): string;
    function decompressFromEncodedURIComponent(str: string): any;
}

class GameMechRandomizer {
	patterns: any;
	evaluations: GameMechRandomizer.Evaluation[];
	genetics: any[];
	geneticsIndex = 0;
	random: GameMechRandomizer.Random;
	patternKeys: string[] = [];
	notificationParams: { pop: any, generation: any, stats: any, isFinished: boolean }[];
	deltaDeathFitness = 10;
	noDeathFitnessPenalty = 1000;
	overDeathFitnessPenalty = 1000;
	seedNum = 5;

	constructor(public params?: {
		patterns: any, functions: any, randomSeed?: number,
		deathDeltaFitness?: number,
		noDeathFitnessPenalty?: number, overDeathFitnessPenalty?: number,
		config?: any, seedNum?: number, seedSize?: number
	}) {
		if (this.params == null) {
			this.random = new GameMechRandomizer.Random();
			return;
		}
		var config = params.config;
		if (config == null) {
			config = {};
		}
		if (params.seedNum != null) {
			this.seedNum = params.seedNum;
		}
		if (params.seedSize != null) {
			config.size = params.seedSize;
		} else {
			config.size = 50;
		}
		this.random = new GameMechRandomizer.Random(params.randomSeed);
		this.seed = this.seed.bind(this);
		this.mutate = this.mutate.bind(this);
		this.crossover = this.crossover.bind(this);
		this.notification = this.notification.bind(this);
		if (params.deathDeltaFitness != null) {
			this.deltaDeathFitness = params.deathDeltaFitness;
		}
		if (params.noDeathFitnessPenalty != null) {
			this.noDeathFitnessPenalty = params.noDeathFitnessPenalty;
		}
		if (params.overDeathFitnessPenalty != null) {
			this.overDeathFitnessPenalty = params.overDeathFitnessPenalty;
		}
		_.forOwn(this.params.patterns, (value, key) => {
			this.patternKeys.push(key);
		});
		this.genetics = _.times(this.seedNum, () => {
			var genetic = Genetic.create(config);
			genetic.optimize = Genetic.Optimize.Maximize;
			genetic.select1 = Genetic.Select1.Tournament2;
			genetic.select2 = Genetic.Select2.Tournament2;
			genetic.seed = this.seed;
			genetic.mutate = this.mutate;
			genetic.crossover = this.crossover;
			genetic.notification = this.notification;
			genetic.setRandomFunc(this.random.f);
			return genetic;
		});
	}

	addEvaluationType(type: GameMechRandomizer.EvaluationType): number {
		this.evaluations.push(new GameMechRandomizer.Evaluation(type));
		return this.evaluations.length - 1;
	}

	seedPopulation() {
		this.notificationParams = [];
		_.forEach(this.genetics, (genetic) => {
			genetic.seedPopulation();
		});
	}

	initGeneration() {
		_.forEach(this.genetics, (genetic) => {
			genetic.initGeneration();
		});
		this.geneticsIndex = 0;
		this.notificationParams = [];
	}

	getNextEntity(): any {
		var entity = this.genetics[this.geneticsIndex].getNextEntity();
		if (entity != null) {
			return entity;
		}
		this.geneticsIndex++;
		if (this.geneticsIndex >= this.seedNum) {
			return null;
		}
		return this.getNextEntity();
	}

	getEvaluatedPercent(): number {
		var p = this.geneticsIndex / this.seedNum;
		p += this.genetics[this.geneticsIndex].getEvaluatedPercent() / this.seedNum;
		return Math.floor(p * 100);
	}

	setFitness(fitness: number, entity: any) {
		this.genetics[this.geneticsIndex].setFitness(fitness, entity);
	}

	createNextGeneration() {
		_.forEach(this.genetics, (genetic) => {
			genetic.createNextGeneration();
		});
	}

	getGenerationResult() {
		return this.notificationParams;
	}

	startEvaluation(entity: GameMechRandomizer.Entity) {
		this.patterns = entity.patterns;
		this.evaluations = null;
		this.evaluations = [];
	}

	endEvaluation(entity: GameMechRandomizer.Entity) {
		var smartOperationEvaluations: GameMechRandomizer.Evaluation[] = [];
		var dullOperationEvaluations: GameMechRandomizer.Evaluation[] = [];
		_.forEach(this.evaluations, (e) => {
			if (e.type === GameMechRandomizer.EvaluationType.SmartOperation) {
				smartOperationEvaluations.push(e);
			} else {
				dullOperationEvaluations.push(e);
			}
		});
		var fitness = 0;
		_.forEach(smartOperationEvaluations, (soe) => {
			_.forEach(dullOperationEvaluations, (doe) => {
				if (doe.death <= soe.death * 2) {
					fitness -= this.overDeathFitnessPenalty;
				} else {
					fitness += (doe.death - soe.death) * this.deltaDeathFitness;
				}
			});
			fitness += soe.fitness * 2;
			if (soe.death === 0) {
				fitness -= this.noDeathFitnessPenalty;
			}
		});
		_.forEach(dullOperationEvaluations, (doe) => {
			fitness += doe.fitness;
			if (doe.death === 0) {
				fitness -= this.noDeathFitnessPenalty * 2;
			}
		});
		entity.smartOperationEvaluations = smartOperationEvaluations;
		entity.dullOperationEvaluations = dullOperationEvaluations;
		entity.fitness = fitness;
		return fitness;
	}

	actor(obj: any, name: string = null, randomSeed: number = null) {
		if (name == null) {
			name = obj.constructor.toString().match(/^\s*function\s*(\S*)\s*\(/)[1];
		}
		var pt = this.patterns[name];
		if (randomSeed == null) {
			randomSeed = this.random.i(0x7fffffff);
		}
		return new GameMechRandomizer.Actor(obj, pt, randomSeed, this);
	}

	teachDeath(evaluationIndex: number) {
		if (evaluationIndex == null) {
			return;
		}
		this.evaluations[evaluationIndex].death++;
	}

	teachFitness(evaluationIndex: number, fitness: number) {
		if (evaluationIndex == null) {
			return;
		}
		this.evaluations[evaluationIndex].fitness += fitness;
	}

	setPatterns(patterns: any) {
		this.patterns = patterns;
	}
	
    getPatternsString() {
		return LZString.compressToEncodedURIComponent(JSON.stringify(this.patterns));
	}
	
	setPattternsFromString(str: string) {
		this.patterns = JSON.parse(LZString.decompressFromEncodedURIComponent(str));
	}

	seed() {
		var entity = new GameMechRandomizer.Entity();
		_.forOwn(this.params.patterns, (value, key) => {
			var properties: GameMechRandomizer.PatternProperty[] =
				_.map(value.properties, (p) => {
					if (p instanceof Array) {
						return new GameMechRandomizer.PatternProperty
							(p[0], p[1], p[2]);
					} else {
						return new GameMechRandomizer.PatternProperty(<string>p);
					}
				});
			entity.patterns[key] = new GameMechRandomizer.Pattern
				(properties, value.buttonNum, this.random);
		});
		return entity;
	}

	mutate(entity: GameMechRandomizer.Entity) {
		var key = this.patternKeys[this.random.i(this.patternKeys.length)];
		GameMechRandomizer.Pattern.mutate(entity.patterns[key], this.random);
		return entity;
	}

	crossover(motherEntity: GameMechRandomizer.Entity,
		fatherEntity: GameMechRandomizer.Entity) {
		var key = this.patternKeys[this.random.i(this.patternKeys.length)];
		GameMechRandomizer.Pattern.crossover
			(motherEntity.patterns[key], fatherEntity.patterns[key], this.random);
		return [motherEntity, fatherEntity];
	}

	notification(pop, generation, stats, isFinished) {
		this.notificationParams.push({
			pop: pop, generation: generation, stats: stats, isFinished: isFinished
		});
	}
}

namespace GameMechRandomizer {
	export class Entity {
		patterns: any = {};
		smartOperationEvaluations: Evaluation[];
		dullOperationEvaluations: Evaluation[];
		fitness: number;
	}

	export class Evaluation {
		death = 0;
		fitness = 0;

		constructor(public type: EvaluationType) { }
	}

	export enum EvaluationType {
		SmartOperation,
		DullOperation
	}

	export class Actor {
		actions: Action[];
		autoPressing: PressingPattern[];
		_isPressing: boolean[];
		isPressingAuto: boolean[];
		isPressingManual: boolean[];
		random: Random;
		evaluationIndex: number = null;

		constructor(public obj: any, public pattern: Pattern, randomSeed: number,
			public gmr: GameMechRandomizer) {
			this.actions = _.map(pattern.actionPatterns, (pt) =>
				new Action(pt, obj, pattern.properties[pt.propertyIndex], this));
			this.autoPressing = _.times(pattern.buttonNum, () => null);
			this._isPressing = _.times(pattern.buttonNum, () => false);
			this.isPressingAuto = _.times(pattern.buttonNum, () => null);
			this.isPressingManual = _.times(pattern.buttonNum, () => false);
			this.random = new Random(randomSeed);
		}

		setPressing(index: number, value = true) {
			this.isPressingManual[index] = value;
		}

		isPressing(index: number) {
			return this._isPressing[index];
		}

		update() {
			_.forEach(this.autoPressing, (ap, i) => {
				if (ap != null) {
					if (ap.isAlways) {
						this.isPressingAuto[i] = true;
					} else {
						if (this.random.f() < ap.changingProbability) {
							this.isPressingAuto[i] = !this.isPressingAuto[i];
						}
					}
				}
				var pm = this.isPressingManual[i] == null ?
					false : this.isPressingManual[i];
				this._isPressing[i] = this.isPressingAuto[i] || pm;
				if (this._isPressing[i]) {
					_.forEach(this.actions, (act) => {
						if (act.pattern.buttonIndex === i) {
							act.doing();
						}
					});
				}
				this.isPressingManual[i] = null;
			});
			_.forEach(this.actions, (act) => {
				act.update();
			});
		}

		resetResources() {
			_.forEach(this.actions, (act) => {
				act.resetResource();
			});
		}

		teachDeath() {
			this.gmr.teachDeath(this.evaluationIndex);
		}

		teachFitness(fitness: number = 1) {
			this.gmr.teachFitness(this.evaluationIndex, fitness);
		}

		setAutoPressing
			(params: { changingProbability?: number, isAlways?: boolean },
			buttonIndex: number) {
			var pattern = new PressingPattern();
			if (params.changingProbability != null) {
				pattern.changingProbability = params.changingProbability;
			}
			if (params.isAlways != null) {
				pattern.isAlways = params.isAlways;
			}
			this.autoPressing[buttonIndex] = pattern;
		}

		setEvaluationIndex(index: number) {
			this.evaluationIndex = index;
		}
	}

	export class PressingPattern {
		changingProbability = 0;
		isAlways = false;
	}

	export class Action {
		resource: ActionResource;
		isDoing = false;
		wasDoing = false;
		isOn = false;
		orgValue: number;
		valueObj: any;
		valuePropertyName: string;
		valueMin: number = null;
		valueMax: number = null;
		valueScale = 1;
		valueCenter = 0;

		constructor(public pattern: ActionPattern, public obj: any,
			property: PatternProperty, public actor: Actor) {
			var propertyNames = property.name.split('.');
			this.resource = new ActionResource(pattern.resourcePattern);
			this.valueObj = obj;
			_.forEach(propertyNames, (prop, i) => {
				if (i < propertyNames.length - 1) {
					this.valueObj = this.valueObj[prop];
				} else {
					this.valuePropertyName = prop;
				}
			});
			if (property.min != null) {
				this.valueMin = property.min;
				this.valueMax = property.max;
				this.valueScale = Math.sqrt(property.max - property.min) /
				(Math.pow(2, ActionPattern.valuePowMax) * 2);
				this.valueCenter = (property.max + property.min) / 2;
			}
			if (this.pattern.type === ActionType.Pressed ||
				this.pattern.type === ActionType.Pressing) {
				this.isOn = true;
			}
		}

		doing() {
			var isOperating = false;
			if (this.pattern.type == ActionType.Pressing) {
				isOperating = true;
			} else {
				if (!this.wasDoing) {
					isOperating = true;
				}
			}
			if (isOperating) {
				if (this.resource.action()) {
					if (this.pattern.type === ActionType.Toggle ||
						this.pattern.type === ActionType.TogglePressing) {
						if (!this.isOn && this.pattern.operation === ActionOperation.To) {
							this.orgValue = this.valueObj[this.valuePropertyName];
						}
						if (this.pattern.type === ActionType.Toggle) {
							this.isOn = !this.isOn;
						} else {
							this.isOn = true;
						}
					}
					this.operate();
				}
			}
			this.wasDoing = true;
			this.isDoing = true;
		}

		operate() {
			var v = this.pattern.operationValue;
			switch (this.pattern.operation) {
				case ActionOperation.Plus:
					if (!this.isOn) {
						v *= -1;
					}
					if (this.pattern.type === ActionType.Pressing) {
						v = this.sqrtPlusMinus(v);
					}
					v = v * this.valueScale + this.valueCenter;
					this.valueObj[this.valuePropertyName] += v;
					break;
				case ActionOperation.Mul:
					if (!this.isOn) {
						v = 1 / v;
					}
					v = this.sqrtPlusMinus(v);
					if (this.pattern.type === ActionType.Pressing) {
						v = this.sqrtPlusMinus(v);
					}
					this.valueObj[this.valuePropertyName] *= v;
					break;
				case ActionOperation.To:
					if (!this.isOn) {
						v = this.orgValue;
					} else {
						v = this.squarePlusMinus(v);
						v = v * this.valueScale + this.valueCenter;
					}
					this.valueObj[this.valuePropertyName] = v;
					break;
			}
			if (this.valueMin != null &&
				this.valueObj[this.valuePropertyName] < this.valueMin) {
				this.actor.teachFitness(-1);
			}
			if (this.valueMax != null &&
				this.valueObj[this.valuePropertyName] > this.valueMax) {
				this.actor.teachFitness(-1);
			}
		}

		sqrtPlusMinus(v: number) {
			if (v >= 0) {
				return Math.sqrt(v);
			} else {
				return -Math.sqrt(-v);
			}
		}

		squarePlusMinus(v: number) {
			if (v >= 0) {
				return v * v;
			} else {
				return -(v * v);
			}
		}

		update() {
			this.resource.update();
			if (!this.isDoing) {
				if (this.wasDoing && this.pattern.type === ActionType.TogglePressing) {
					this.isOn = false;
					this.operate();
				}
				this.wasDoing = false;
			}
			this.isDoing = false;
		}

		resetResource() {
			this.resource.reset();
		}
	}

	class ActionResource {
		value = 0;

		constructor(public pattern: ActionResourcePattern) {
			this.reset();
		}

		update() {
			this.value += this.pattern.updatingValue;
			if (this.value > 1) {
				this.value = 1;
			}
		}

		action() {
			if (this.value < this.pattern.actionValue) {
				return false;
			}
			this.value -= this.pattern.actionValue;
			if (this.value < 0) {
				this.value = 0;
			}
			return true;
		}

		reset() {
			this.value = 1;
		}
	}

	export class Pattern {
		actionPatterns: ActionPattern[];

		constructor
			(public properties: PatternProperty[], public buttonNum: number,
			random: Random) {
			this.actionPatterns = _.times(random.i(buttonNum * 2 + 1, buttonNum),
				() => new ActionPattern(this.properties.length, buttonNum, random));
		}
	}

	export class PatternProperty {
		constructor(public name: string,
			public min: number = null, public max: number = null) { }
	}

	export namespace Pattern {
		export function mutate(pattern: Pattern, random: Random) {
			var ap = pattern.actionPatterns[random.i(pattern.actionPatterns.length)];
			ActionPattern.mutate(ap, null, random);
		}

		export function crossover(mp: Pattern, fp: Pattern, random: Random) {
			var map = mp.actionPatterns[random.i(mp.actionPatterns.length)];
			var fap = fp.actionPatterns[random.i(fp.actionPatterns.length)];
			ActionPattern.crossover(map, fap, random);
		}
	}

	class ActionPattern {
		propertyIndex: number;
		resourcePattern: ActionResourcePattern;
		type: ActionType;
		operation: ActionOperation;
		operationValue: number;
		buttonIndex: number;

		constructor(public propertyNum: number, public buttonNum: number, random: Random) {
			_.times(6, (i) => ActionPattern.mutate(this, i, random));
		}
	}

	namespace ActionPattern {
		export var valuePowMax = 2;

		export function mutate(ap: ActionPattern, index: number, random: Random) {
			if (index == null) {
				index = random.i(6);
			}
			switch (index) {
				case 0:
					ap.propertyIndex = random.i(ap.propertyNum);
					break;
				case 1:
					ap.resourcePattern = new ActionResourcePattern(random);
					break;
				case 2:
					ap.type = random.i(4);
					break;
				case 3:
					ap.operation = random.i(3);
					break;
				case 4:
					ap.operationValue = Math.pow(2, random.f(valuePowMax, -valuePowMax));
					if (random.f() < 0.5) {
						ap.operationValue *= -1;
					}
					break;
				case 5:
					ap.buttonIndex = random.i(ap.buttonNum);
					break;
			}
		}

		export function crossover(map: ActionPattern, fap: ActionPattern, random: Random) {
			var properties = ['propertyIndex', 'resourcePattern', 'type',
				'operation', 'operationValue', 'buttonIndex'];
			swapProperty(map, fap, properties[random.i(6)]);
		}

		function swapProperty(v1, v2, property) {
			var t = v1[property];
			v1[property] = v2[property];
			v2[property] = t;
		}
	}

	enum ActionType {
		Toggle,
		TogglePressing,
		Pressed,
		Pressing
	}

	enum ActionOperation {
		Plus,
		Mul,
		To
	}

	class ActionResourcePattern {
		updatingValue: number;
		actionValue: number;

		constructor(random: Random) {
			var avr = random.f();
			if (avr < 0.5) {
				this.actionValue = 0;
			} else if (avr < 0.75) {
				this.actionValue = random.f();
			} else {
				this.actionValue = 1;
			}
			this.updatingValue = random.f(0.1);
		}
	}

	export class Random {
		xorshift: { random: Function };

		constructor(seed: number = null) {
			if (seed == null) {
				seed = Math.random() * 0x7fffffff;
			}
			var x = seed = 1812433253 * (seed ^ (seed >>> 30));
			var y = seed = 1812433253 * (seed ^ (seed >>> 30)) + 1;
			var z = seed = 1812433253 * (seed ^ (seed >>> 30)) + 2;
			var w = seed = 1812433253 * (seed ^ (seed >>> 30)) + 3;
			this.xorshift = new XorShift([x, y, z, w]);
			this.f = this.f.bind(this);
			this.i = this.i.bind(this);
			this.pm = this.pm.bind(this);
		}

		f(to: number = 1, from: number = 0) {
			return this.xorshift.random() * (to - from) + from;
		}

		i(to: number = 2, from: number = 0) {
			return Math.floor(this.xorshift.random() * (to - from)) + from;
		}

		pm() {
			return Math.floor(this.xorshift.random() * 2) * 2 - 1;
		}
	}
}
