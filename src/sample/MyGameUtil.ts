/// <reference path="../../typings/lodash/lodash.d.ts" />
/// <reference path="../../typings/game_keyboard/game_keyboard.d.ts" />
/// <reference path="../../typings/sat/sat.d.ts" />
declare var XorShift: any;

class MyGameUtil {
	actors: any[] = [];

	constructor() {
		this.extendsSAT();
	}

	updateActors(actors: any[] = null) {
		if (actors == null) {
			actors = this.actors;
		}
		for (var i = 0; i < actors.length;) {
			if (actors[i].update() === false) {
				actors.splice(i, 1);
			} else {
				i++;
			}
		}
	}

	getActors(clazz, actors: any[] = null) {
		if (actors == null) {
			actors = this.actors;
		}
		return _.filter(actors, (a) => a instanceof clazz);
	}

	keyboard: Keyboard;
	_stick: SAT.Vector;

	initKeyboard() {
		this.keyboard = new Keyboard(KeyMap['US']);
		this._stick = new SAT.Vector();
	}

	stick(): SAT.Vector {
		this._stick.set();
		if (this.keyboard.isPressed('up') || this.keyboard.isPressed('w')) {
			this._stick.y--;
		}
		if (this.keyboard.isPressed('left') || this.keyboard.isPressed('a')) {
			this._stick.x--;
		}
		if (this.keyboard.isPressed('down') || this.keyboard.isPressed('s')) {
			this._stick.y++;
		}
		if (this.keyboard.isPressed('right') || this.keyboard.isPressed('d')) {
			this._stick.x++;
		}
		if (this._stick.x !== 0 && this._stick.y !== 0) {
			this._stick.mul(0.7);
		}
		return this._stick;
	}

	pointerPos: { x: number, y: number };
	pointedElement: Element;
	isPointerPressing = false;
	isPointerInitialized = false;

	initPointer(pointedElement: Element) {
		this.pointedElement = pointedElement;
		if (this.isPointerInitialized) {
			return;
		}
		this.isPointerInitialized = true;
		this.pointerPos = { x: 0, y: 0 };
		this.onMouseDown = this.onMouseDown.bind(this);
		this.onMouseMove = this.onMouseMove.bind(this);
		this.onMouseUp = this.onMouseUp.bind(this);
		this.onTouchStart = this.onTouchStart.bind(this);
		this.onTouchMove = this.onTouchMove.bind(this);
		this.onTouchEnd = this.onTouchEnd.bind(this);
		window.addEventListener('mousedown', this.onMouseDown);
		window.addEventListener('mousemove', this.onMouseMove);
		window.addEventListener('mouseup', this.onMouseUp);
		window.addEventListener('touchstart', this.onTouchStart);
		window.addEventListener('touchmove', this.onTouchMove);
		window.addEventListener('touchend', this.onTouchEnd);
	}

	enableShowingErrors() {
		window.addEventListener('error', function(error: any) {
			var result = document.getElementById('result') || (function() {
				var result = document.createElement('pre');
				result.setAttribute('id', 'result');
				document.getElementsByTagName('body')[0].appendChild(result);
				return result;
			})();
			var message = [error.filename, '@', error.lineno, ':\n', error.message].join('');
			result.textContent += '\n' + message;
			return false;
		});
	}

	clamp(v: number, min: number = 0, max: number = 1): number {
		return v < min ? min : (v > max ? max : v);
	}

	wrap(v: number, min: number = 0, max: number = 1): number {
		var w = max - min;
		var om = v - min;
		return om >= 0 ? om % w + min : w + om % w + min;
	}

	random(seed: number = null): MyGameUtil.Random {
		return new MyGameUtil.Random(seed);
	}

	onMouseDown(event: MouseEvent) {
		this.isPointerPressing = true;
		this.onMouseMove(event);
	}

	onMouseMove(event: MouseEvent) {
		event.preventDefault();
		this.setPointerPos(event.clientX, event.clientY);
	}

	onMouseUp(event: MouseEvent) {
		this.isPointerPressing = false;
	}

	onTouchStart(event: TouchEvent) {
		this.isPointerPressing = true;
		this.onTouchMove(event);
	}

	onTouchMove(event: TouchEvent) {
		event.preventDefault();
		var touch = event.touches[0];
		this.setPointerPos(touch.clientX, touch.clientY);
	}

	onTouchEnd(event: TouchEvent) {
		this.isPointerPressing = false;
	}

	setPointerPos(clientX: number, clientY: number) {
		var rect = this.pointedElement.getBoundingClientRect();
		this.pointerPos.x = this.clamp(clientX - rect.left, 0, rect.width);
		this.pointerPos.y = this.clamp(clientY - rect.top, 0, rect.height);
	}

	extendsSAT() {
		var self = this;
		SAT.Vector.prototype.angle = function(): number {
			return Math.atan2(this.x, -this.y) * 180 / Math.PI;
		}
		SAT.Vector.prototype.set =
		function(x: number | { x: number, y: number } = 0, y: number = null) {
			if (typeof x === 'number') {
				this.x = x;
				if (!y) {
					this.y = x;
				} else {
					this.y = y;
				}
			} else {
				this.x = x.x;
				this.y = x.y;
			}
			return this;
		};
		SAT.Vector.prototype.mul = function(v: number) {
			this.x *= v;
			this.y *= v;
			return this;
		};
		SAT.Vector.prototype.div = function(v: number) {
			this.x /= v;
			this.y /= v;
			return this;
		};
		SAT.Vector.prototype.rotate = function(angle: number) {
			var x = this.x;
			var y = this.y;
			var ag = -angle * Math.PI / 180;
			this.x = x * Math.cos(ag) - y * Math.sin(ag);
			this.y = x * Math.sin(ag) + y * Math.cos(ag);
			return this;
		}
		SAT.Vector.prototype.clamp =
		function(minX: number = 0, maxX: number = 1,
			minY: number = null, maxY: number = null) {
			if (!minY) {
				minY = minX;
			}
			if (!maxY) {
				maxY = maxX;
			}
			this.x = self.clamp(this.x, minX, maxX);
			this.y = self.clamp(this.y, minY, maxY);
			return this;
		}
		SAT.Vector.prototype.isIn =
		function(spacing: number = 0, minX: number = 0, maxX: number = 1, minY: number = 0, maxY: number = 1): boolean {
			var x: number = this.x;
			var y: number = this.y;
			return minX - spacing <= x && x <= maxX + spacing &&
				minY - spacing <= y && y <= maxY + spacing;
		}
		SAT.Vector.prototype.angleTo = function(other: SAT.Vector): number {
			return Math.atan2(other.x - this.x, this.y - other.y) * 180 / Math.PI;
		}
		SAT.Vector.prototype.distanceTo = function(other: SAT.Vector): number {
			var ox: number = other.x - this.x;
			var oy: number = other.y - this.y;
			return Math.sqrt(ox * ox + oy * oy);
		}
		SAT.Vector.prototype.moveTo =
		function(target: SAT.Vector, speed: number): SAT.Vector {
			var d = this.distanceTo(target);
			if (d <= speed) {
				this.copy(target);
				return;
			}
			var r = speed / d;
			this.x += (target.x - this.x) * r;
			this.y += (target.y - this.y) * r;
			return this;
		}
		SAT.Vector.prototype.moveAngle =
		function(angle: number, speed: number): SAT.Vector {
			var ag = angle * Math.PI / 180;
			this.x += Math.sin(ag) * speed;
			this.y -= Math.cos(ag) * speed;
			return this;
		};
	}
}

namespace MyGameUtil {
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
