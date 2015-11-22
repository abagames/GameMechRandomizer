/// <reference path="../../typings/lodash/lodash.d.ts" />
/// <reference path="../../typings/snap.svg/snapsvg.d.ts" />
/// <reference path="../../typings/SAT/SAT.d.ts" />
/// <reference path="../../typings/GIFCaptureCanvas/GifCaptureCanvas.d.ts" />
/// <reference path="MyGameUtil.ts" />
/// <reference path="../GameMechrandomizer.ts" />
declare var AnimationFrame: any;

class GmrSampleUtil {
	version = 1;
	mgu: MyGameUtil;
	gmrForEvaluation: GameMechRandomizer;
	gmrForPlay: GameMechRandomizer;
	af: { request: Function };
	gcc: GifCaptureCanvas;
	random: GameMechRandomizer.Random;
	evolveCount = 0;
	evolutionResult: any;
	evaluatingEntity: GameMechRandomizer.Entity;
	evaluationFrameCount = 0;
	snap: Snap.Paper;
	generations: GmrSampleUtil.Generations;

	constructor(public gmrPatterns: any,
		public functions: {
			initEvaluation: Function, updateEvaluation: Function,
			initPlay: Function, updatePlay: Function
		},
		public evaluationFrameNum = 8 * 60) {
		this.mgu = new MyGameUtil();
		this.mgu.initKeyboard();
		this.af = new AnimationFrame();
		//gcc = new GifCaptureCanvas();
		//gcc.scale = 1;
		this.random = new GameMechRandomizer.Random();
		this.goToNextGenerations(true);
	}

	goToNextGenerations(isFirst = false) {
		if (this.generations != null) {
			this.generations.isInvalid = true;
		}
		this.generations = new GmrSampleUtil.Generations(
			this.gmrPatterns,
			this.functions,
			this.evaluationFrameNum,
			this);
		if (isFirst) {
			this.generations.setPatternsFromUrl(window.location.search.substring(1));
		}
	}

	evolve() {
		this.generations.evolve();
	}

	getGameMechRandomizerForEvaluation() {
		return this.generations.gmrForEvaluation;
	}

	getGameMechRandomizerForPlay() {
		return this.generations.gmrForPlay;
	}

	getMyGameUtil() {
		return this.mgu;
	}

	setupSnap() {
		if (this.snap != null) {
			this.snap.remove();
			this.snap = null;
		}
		var snapDiv = document.getElementById('snapDiv');
		var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		svg.setAttribute('id', 'snapSvg');
		snapDiv.appendChild(svg);
		var snapSize = 100;
		this.snap = Snap('#snapSvg');
		this.snap.attr({ viewBox: `0 0 ${snapSize} ${snapSize}` });
		var style = this.snap.node.style;
		style.width = style.height = '100%';
		style.margin = '0';
		style.background = 'white';
		this.mgu.initPointer(this.snap.node);
	}
}

namespace GmrSampleUtil {
	export class Generations {
		gmrForEvaluation: GameMechRandomizer;
		gmrIndex = 0;
		gmrForPlay: GameMechRandomizer;
		evolveCount = 0;
		playEntity: any;
		evaluatingEntity: GameMechRandomizer.Entity;
		evaluationFrameCount = 0;
		evaluationNumPerFrame = 4 * 60;
		isInvalid = false;
		isNextGenerationReady = false;
		isPlayingPatternsFromUrl = false;

		constructor(public gmrPatterns: any,
			public functions: {
				initEvaluation: Function, updateEvaluation: Function,
				initPlay: Function, updatePlay: Function
			},
			public evaluationFrameNum: number,
			public gsu: GmrSampleUtil,
			public randomSeed: number = null) {
			this.gmrForEvaluation = new GameMechRandomizer({
				patterns: this.gmrPatterns,
				functions: {
					evaluate: this.evaluate
				},
				randomSeed: this.randomSeed,
				config: {
					fittestAlwaysSurvives: false
				}
			});
			this.gmrForEvaluation.seedPopulation();
			var result = this.gmrForEvaluation.getGenerationResult();
			this.playEntity = result[0].pop[0].entity;
			this.gmrForPlay = new GameMechRandomizer();
			this.evolve = this.evolve.bind(this);
			this.evolveIteration = this.evolveIteration.bind(this);
			this.evaluateAndUpdatePlay = this.evaluateAndUpdatePlay.bind(this);
			this.evaluate = this.evaluate.bind(this);
		}

		evolve() {
			if (this.isPlayingPatternsFromUrl) {
				this.setupGame();
				this.evaluateAndUpdatePlay();
				return;
			}
			this.gmrForEvaluation.initGeneration();
			this.startGame();
			this.evolveIteration();
		}

		evolveIteration() {
			if (this.isInvalid) {
				return;
			}
			var entity = this.gmrForEvaluation.getNextEntity();
			var p = document.getElementById('nextGeneration');
			if (entity == null) {
				/*p.textContent = `[N]: evolve to a next generation`;
				this.isNextGenerationReady = true;
				this.evaluateAndUpdatePlay();*/
				this.evolveToNextGeneration();
			} else {
				var ep = this.gmrForEvaluation.getEvaluatedPercent();
				p.textContent = `generating a next generation (${ep}%)`;
				this.gmrForEvaluation.startEvaluation(entity);
				this.evaluationFrameCount = 0;
				this.functions.initEvaluation();
				this.evaluatingEntity = entity;
				this.evaluateAndUpdatePlay();
			}
		}

		evolveToNextGeneration() {
			this.isNextGenerationReady = false;
			this.gmrForEvaluation.createNextGeneration();
			var results = this.gmrForEvaluation.getGenerationResult();
			var maxFitness = -0x7fffffff;
			_.forEach(results, (result) => {
				if (result.pop[0].fitness > maxFitness) {
					maxFitness = result.pop[0].fitness;
					this.playEntity = result.pop[0].entity;
				}
			});
			this.evolveCount++;
			this.evolve();
		}

		evaluateAndUpdatePlay() {
			if (this.isInvalid) {
				return;
			}
			if (this.isNextGenerationReady) {
				if (this.gsu.mgu.keyboard.consumePressed('n')) {
					this.evolveToNextGeneration();
					return;
				}
			} else if (!this.isPlayingPatternsFromUrl) {
				if (this.evaluate() === false) {
					return;
				}
				if (this.gsu.mgu.keyboard.consumePressed('u')) {
					this.createUrl();
				}
			}
			this.gsu.af.request(this.evaluateAndUpdatePlay);
			this.functions.updatePlay();
			//this.gsu.gcc.captureSvg(this.gsu.snap.node);	
		}

		evaluate() {
			var fn = this.evaluationFrameNum - this.evaluationFrameCount;
			if (fn <= 0) {
				var fitness = this.gmrForEvaluation.endEvaluation(this.evaluatingEntity);
				this.gmrForEvaluation.setFitness(fitness, this.evaluatingEntity);
				this.evolveIteration();
				return false;
			} else {
				if (fn > this.evaluationNumPerFrame) {
					fn = this.evaluationNumPerFrame;
				}
				_.times(fn, () => {
					this.functions.updateEvaluation();
				});
				this.evaluationFrameCount += fn;
			}
		}

		startGame() {
			var p = document.getElementById('generation');
			p.textContent =
			`generation: ${this.evolveCount} / fitness: ${this.playEntity.fitness}`;
			this.gmrForPlay.setPatterns(this.playEntity.patterns);
			this.setupGame();
		}
		
		setupGame() {
			this.gsu.setupSnap();
			this.functions.initPlay();
		}

		createUrl() {
			var baseUrl = window.location.href.split('?')[0];
			var patternsStr = this.gmrForPlay.getPatternsString();
			var title = document.getElementsByTagName("title")[0].innerHTML;
			try {
				window.history.pushState('', title,
					`${baseUrl}?v=${this.gsu.version}&d=${patternsStr}`);
			} catch (e) { }
		}

		setPatternsFromUrl(query: string) {
			var params = query.split('&');
			var version: string;
			var dataStr: string;
			_.forEach(params, (param) => {
				var pair = param.split('=');
				if (pair[0] === 'v') {
					version = pair[1];
				}
				if (pair[0] === 'd') {
					dataStr = pair[1];
				}
			});
			if (dataStr == null || Number(version) !== this.gsu.version) {
				return;
			}
			try {
				this.gmrForPlay.setPattternsFromString(dataStr);
				this.isPlayingPatternsFromUrl = true;
			} catch (e) { }
		}
	}

	export class Actor {
		pos: SAT.Vector;
		vel: SAT.Vector;
		ppos: SAT.Vector;
		scale: SAT.Vector;
		svg: Snap.Element = null;
		collider: SAT.Polygon;
		isRemoving = false;
		ticks = 0;
		gmrActor: GameMechRandomizer.Actor;

		constructor() {
			this.collider = new SAT.Box(new SAT.Vector(), 1, 1).toPolygon();
			this.ppos = new SAT.Vector();
			this.scale = new SAT.Vector(1, 1);
		}

		update() {
			if (this.isRemoving) {
				if (this.svg != null) {
					this.svg.remove();
					this.svg = null;
				}
				return false;
			}
			this.ppos.copy(this.pos);
			this.pos.add(this.vel);
			if (this.svg != null) {
				var tx = Math.floor(this.pos.x * 100) / 100;
				if (tx === NaN || tx < -1000 || tx > 1000) {
					tx = 1000;
				}
				var ty = Math.floor(this.pos.y * 100) / 100;
				if (ty === NaN || ty < -1000 || ty > 1000) {
					ty = 1000;
				}
				this.svg.transform
					(`t${tx},${ty} s${this.scale.x},${this.scale.y}`);
			}
			this.gmrActor.update();
			this.ticks++;
		}
	}
}
