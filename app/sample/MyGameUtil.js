/// <reference path="../../typings/lodash/lodash.d.ts" />
/// <reference path="../../typings/game_keyboard/game_keyboard.d.ts" />
/// <reference path="../../typings/sat/sat.d.ts" />
var MyGameUtil = (function () {
    function MyGameUtil() {
        this.actors = [];
        this.isPointerPressing = false;
        this.isPointerInitialized = false;
        this.extendsSAT();
    }
    MyGameUtil.prototype.updateActors = function (actors) {
        if (actors === void 0) { actors = null; }
        if (actors == null) {
            actors = this.actors;
        }
        for (var i = 0; i < actors.length;) {
            if (actors[i].update() === false) {
                actors.splice(i, 1);
            }
            else {
                i++;
            }
        }
    };
    MyGameUtil.prototype.getActors = function (clazz, actors) {
        if (actors === void 0) { actors = null; }
        if (actors == null) {
            actors = this.actors;
        }
        return _.filter(actors, function (a) { return a instanceof clazz; });
    };
    MyGameUtil.prototype.initKeyboard = function () {
        this.keyboard = new Keyboard(KeyMap['US']);
        this._stick = new SAT.Vector();
    };
    MyGameUtil.prototype.stick = function () {
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
    };
    MyGameUtil.prototype.initPointer = function (pointedElement) {
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
    };
    MyGameUtil.prototype.enableShowingErrors = function () {
        window.addEventListener('error', function (error) {
            var result = document.getElementById('result') || (function () {
                var result = document.createElement('pre');
                result.setAttribute('id', 'result');
                document.getElementsByTagName('body')[0].appendChild(result);
                return result;
            })();
            var message = [error.filename, '@', error.lineno, ':\n', error.message].join('');
            result.textContent += '\n' + message;
            return false;
        });
    };
    MyGameUtil.prototype.clamp = function (v, min, max) {
        if (min === void 0) { min = 0; }
        if (max === void 0) { max = 1; }
        return v < min ? min : (v > max ? max : v);
    };
    MyGameUtil.prototype.wrap = function (v, min, max) {
        if (min === void 0) { min = 0; }
        if (max === void 0) { max = 1; }
        var w = max - min;
        var om = v - min;
        return om >= 0 ? om % w + min : w + om % w + min;
    };
    MyGameUtil.prototype.random = function (seed) {
        if (seed === void 0) { seed = null; }
        return new MyGameUtil.Random(seed);
    };
    MyGameUtil.prototype.onMouseDown = function (event) {
        this.isPointerPressing = true;
        this.onMouseMove(event);
    };
    MyGameUtil.prototype.onMouseMove = function (event) {
        event.preventDefault();
        this.setPointerPos(event.clientX, event.clientY);
    };
    MyGameUtil.prototype.onMouseUp = function (event) {
        this.isPointerPressing = false;
    };
    MyGameUtil.prototype.onTouchStart = function (event) {
        this.isPointerPressing = true;
        this.onTouchMove(event);
    };
    MyGameUtil.prototype.onTouchMove = function (event) {
        event.preventDefault();
        var touch = event.touches[0];
        this.setPointerPos(touch.clientX, touch.clientY);
    };
    MyGameUtil.prototype.onTouchEnd = function (event) {
        this.isPointerPressing = false;
    };
    MyGameUtil.prototype.setPointerPos = function (clientX, clientY) {
        var rect = this.pointedElement.getBoundingClientRect();
        this.pointerPos.x = this.clamp(clientX - rect.left, 0, rect.width);
        this.pointerPos.y = this.clamp(clientY - rect.top, 0, rect.height);
    };
    MyGameUtil.prototype.extendsSAT = function () {
        var self = this;
        SAT.Vector.prototype.angle = function () {
            return Math.atan2(this.x, -this.y) * 180 / Math.PI;
        };
        SAT.Vector.prototype.set =
            function (x, y) {
                if (x === void 0) { x = 0; }
                if (y === void 0) { y = null; }
                if (typeof x === 'number') {
                    this.x = x;
                    if (!y) {
                        this.y = x;
                    }
                    else {
                        this.y = y;
                    }
                }
                else {
                    this.x = x.x;
                    this.y = x.y;
                }
                return this;
            };
        SAT.Vector.prototype.mul = function (v) {
            this.x *= v;
            this.y *= v;
            return this;
        };
        SAT.Vector.prototype.div = function (v) {
            this.x /= v;
            this.y /= v;
            return this;
        };
        SAT.Vector.prototype.rotate = function (angle) {
            var x = this.x;
            var y = this.y;
            var ag = -angle * Math.PI / 180;
            this.x = x * Math.cos(ag) - y * Math.sin(ag);
            this.y = x * Math.sin(ag) + y * Math.cos(ag);
            return this;
        };
        SAT.Vector.prototype.clamp =
            function (minX, maxX, minY, maxY) {
                if (minX === void 0) { minX = 0; }
                if (maxX === void 0) { maxX = 1; }
                if (minY === void 0) { minY = null; }
                if (maxY === void 0) { maxY = null; }
                if (!minY) {
                    minY = minX;
                }
                if (!maxY) {
                    maxY = maxX;
                }
                this.x = self.clamp(this.x, minX, maxX);
                this.y = self.clamp(this.y, minY, maxY);
                return this;
            };
        SAT.Vector.prototype.isIn =
            function (spacing, minX, maxX, minY, maxY) {
                if (spacing === void 0) { spacing = 0; }
                if (minX === void 0) { minX = 0; }
                if (maxX === void 0) { maxX = 1; }
                if (minY === void 0) { minY = 0; }
                if (maxY === void 0) { maxY = 1; }
                var x = this.x;
                var y = this.y;
                return minX - spacing <= x && x <= maxX + spacing &&
                    minY - spacing <= y && y <= maxY + spacing;
            };
        SAT.Vector.prototype.angleTo = function (other) {
            return Math.atan2(other.x - this.x, this.y - other.y) * 180 / Math.PI;
        };
        SAT.Vector.prototype.distanceTo = function (other) {
            var ox = other.x - this.x;
            var oy = other.y - this.y;
            return Math.sqrt(ox * ox + oy * oy);
        };
        SAT.Vector.prototype.moveTo =
            function (target, speed) {
                var d = this.distanceTo(target);
                if (d <= speed) {
                    this.copy(target);
                    return;
                }
                var r = speed / d;
                this.x += (target.x - this.x) * r;
                this.y += (target.y - this.y) * r;
                return this;
            };
        SAT.Vector.prototype.moveAngle =
            function (angle, speed) {
                var ag = angle * Math.PI / 180;
                this.x += Math.sin(ag) * speed;
                this.y -= Math.cos(ag) * speed;
                return this;
            };
    };
    return MyGameUtil;
})();
var MyGameUtil;
(function (MyGameUtil) {
    var Random = (function () {
        function Random(seed) {
            if (seed === void 0) { seed = null; }
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
        Random.prototype.f = function (to, from) {
            if (to === void 0) { to = 1; }
            if (from === void 0) { from = 0; }
            return this.xorshift.random() * (to - from) + from;
        };
        Random.prototype.i = function (to, from) {
            if (to === void 0) { to = 2; }
            if (from === void 0) { from = 0; }
            return Math.floor(this.xorshift.random() * (to - from)) + from;
        };
        Random.prototype.pm = function () {
            return Math.floor(this.xorshift.random() * 2) * 2 - 1;
        };
        return Random;
    })();
    MyGameUtil.Random = Random;
})(MyGameUtil || (MyGameUtil = {}));
//# sourceMappingURL=MyGameUtil.js.map