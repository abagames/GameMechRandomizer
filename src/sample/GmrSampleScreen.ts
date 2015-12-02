/// <reference path="../../typings/snap.svg/snapsvg.d.ts" />
/// <reference path="../../typings/SAT/SAT.d.ts" />
/// <reference path="../../typings/matter/matter-js.d.ts" />
/// <reference path="../../typings/GIFCaptureCanvas/GifCaptureCanvas.d.ts" />
/// <reference path="MyGameUtil.ts" />
/// <reference path="../GameMechrandomizer.ts" />

interface GmrSampleScreen {
	snap?: Snap.Paper;
	engineForPlay?: Matter.Engine;
	initPlay(mgu: MyGameUtil);
	capture(gcc: GifCaptureCanvas);
}

namespace GmrSampleSnap {
	export class Screen implements GmrSampleScreen {
		snap: Snap.Paper;

		initPlay(mgu: MyGameUtil) {
			if (this.snap != null) {
				this.snap.remove();
				this.snap = null;
			}
			var screenDiv = document.getElementById('screenDiv');
			var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
			svg.setAttribute('id', 'snapSvg');
			screenDiv.appendChild(svg);
			var snapSize = 100;
			this.snap = Snap('#snapSvg');
			this.snap.attr({ viewBox: `0 0 ${snapSize} ${snapSize}` });
			var style = this.snap.node.style;
			style.width = style.height = '100%';
			style.margin = '0';
			style.background = 'white';
			mgu.initPointer(this.snap.node);
		}

		capture(gcc: GifCaptureCanvas) {
			gcc.captureSvg(this.snap.node);
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

namespace GmrSampleMatter {
	export class Screen implements GmrSampleScreen {
		engineForPlay: Matter.Engine;
		matterSize = 100;
		rendererForPlay = {
			create: Matter.Render.create
		};
		rendererForEvaluation = {
			create: () => { controller: this.rendererForEvaluation }
		};

		initPlay(mgu: MyGameUtil) {
			var screenDiv = document.getElementById('screenDiv');	
			if (this.engineForPlay != null) {
				screenDiv.removeChild(this.engineForPlay.render.canvas);
				Matter.Composite.clear(this.engineForPlay.world, false);
				this.engineForPlay = null;
			}
			this.engineForPlay = Matter.Engine.create(screenDiv, {
				render: {
					controller: this.rendererForPlay,
					options: {
						width: this.matterSize,
						height: this.matterSize,
						wireframes: false
					}
				}
			});
			(<any>this.engineForPlay).isForPlay = true;
			var style = this.engineForPlay.render.canvas.style;
			style.width = style.height = '100%';
			style.margin = '0';
			mgu.initPointer(this.engineForPlay.render.canvas);
		}
		
		getEngineForEvaluation() {
			return Matter.Engine.create({
				render: {
					controller: this.rendererForEvaluation,
					options: {
						width: this.matterSize,
						height: this.matterSize
					}
				}
			});
		}
		
		clearEngine(engine: Matter.Engine) {
			Matter.Composite.clear(engine.world, false);
			Matter.Engine.clear(engine);
			engine.events = {};
		}

		updateEngine(engine: Matter.Engine) {
			var event = {
				timestamp: engine.timing.timestamp
			};
			Matter.Events.trigger(engine, 'beforeTick', event);
			Matter.Events.trigger(engine, 'tick', event);
			Matter.Engine.update(engine, 1000 / 60, 1);
			if ((<any>engine).isForPlay === true) {
				engine.render.controller.world(engine);
			}
			Matter.Events.trigger(engine, 'afterTick', event);
		}

		capture(gcc: GifCaptureCanvas) {
			gcc.capture(this.engineForPlay.render.canvas);
		}
	}

	export class Actor {
		isRemoving = false;
		body: Matter.Body;
		applyingForce: Matter.Vector;
		gmrActor: GameMechRandomizer.Actor;
		pos: SAT.Vector;
		staticValue = 0;
		ticks = 0;

		constructor(public engine: Matter.Engine) {
			this.applyingForce = Matter.Vector.create();
			this.pos = new SAT.Vector();
		}

		update() {
			this.pos.set(this.body.position);
			if (!this.pos.isIn(10, 0, 100, 0, 100)) {
				this.isRemoving = true;
			}
			if (this.isRemoving) {
				if (this.body != null) {
					Matter.Composite.removeBody(<any>this.engine.world, this.body);
				}
				return false;
			}
			if (this.applyingForce.x !== 0 || this.applyingForce.y !== 0) {
				Matter.Body.applyForce(this.body, this.body.position, this.applyingForce);
				this.applyingForce.x = this.applyingForce.y = 0;
			}
			this.body.isStatic = this.staticValue > 0;			
			this.gmrActor.update();
			this.ticks++;
		}
	}
	
	export namespace Actor {
		export var properties = [
			['body.restitution', 0.1, 1],
			['body.friction', 0.1, 1],
			['body.density', 0.001, 0.1],
			['body.force.x', -0.0005, 0.0005],
			['body.force.y', -0.0005, 0.0005],
			['staticValue', -1, 1],
			['applyingForce.x', -0.0001, 0.0001],
			['applyingForce.y', -0.0001, 0.0001]
		];
	}
}
