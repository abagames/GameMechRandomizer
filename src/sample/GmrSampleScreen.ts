/// <reference path="../../typings/snap.svg/snapsvg.d.ts" />
/// <reference path="../../typings/SAT/SAT.d.ts" />
/// <reference path="../../typings/matter/matter-js.d.ts" />
/// <reference path="../../typings/GIFCaptureCanvas/GifCaptureCanvas.d.ts" />
/// <reference path="MyGameUtil.ts" />
/// <reference path="../GameMechrandomizer.ts" />

interface GmrSampleScreen {
	snap?: Snap.Paper;
	engine?: Matter.Engine;
	setup(mgu: MyGameUtil);
	update();
	capture(gcc: GifCaptureCanvas);
}

namespace GmrSampleSnap {
	export class Screen implements GmrSampleScreen {
		snap: Snap.Paper;

		setup(mgu: MyGameUtil) {
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

		update() { }

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
		engine: Matter.Engine;

		setup(mgu: MyGameUtil) {
			if (this.engine != null) {
				Matter.Composite.clear(this.engine.world, false);
				this.engine = null;
			}
			var screenDiv = document.getElementById('screenDiv');
			var matterSize = 100;
			this.engine = Matter.Engine.create(screenDiv, {
				render: {
					options: {
						width: matterSize,
						height: matterSize
					}
				}
			});
			var style = this.engine.render.canvas.style;
			style.width = style.height = '100%';
			style.margin = '0';
			mgu.initPointer(this.engine.render.canvas);
		}

		update() {
			var event = {
				timestamp: this.engine.timing.timestamp
			};
			Matter.Events.trigger(this.engine, 'beforeTick', event);
			Matter.Events.trigger(this.engine, 'tick', event);
			Matter.Engine.update(this.engine, 1000 / 60, 1);
			Matter.Events.trigger(this.engine, 'afterTick', event);
		}

		capture(gcc: GifCaptureCanvas) {
			gcc.capture(this.engine.render.canvas);
		}
	}

	export class Actor {
		isRemoving = false;
		body: Matter.Body;
		gmrActor: GameMechRandomizer.Actor;
		ticks = 0;

		constructor(public engine: Matter.Engine) { }

		update() {
			if (this.isRemoving) {
				if (this.body != null) {
					Matter.Composite.removeBody(<any>this.engine.world, this.body);
					this.body = null;
				}
				return false;
			}
			this.gmrActor.update();
			this.ticks++;
		}
	}
}
