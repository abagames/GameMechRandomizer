/// <reference path="../../typings/snap.svg/snapsvg.d.ts" />
/// <reference path="../../typings/SAT/SAT.d.ts" />
/// <reference path="../../typings/matter/matter-js.d.ts" />
/// <reference path="../../typings/GIFCaptureCanvas/GifCaptureCanvas.d.ts" />
/// <reference path="MyGameUtil.ts" />
/// <reference path="../GameMechrandomizer.ts" />
var GmrSampleSnap;
(function (GmrSampleSnap) {
    var Screen = (function () {
        function Screen() {
        }
        Screen.prototype.initPlay = function (mgu) {
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
            this.snap.attr({ viewBox: "0 0 " + snapSize + " " + snapSize });
            var style = this.snap.node.style;
            style.width = style.height = '100%';
            style.margin = '0';
            style.background = 'white';
            mgu.initPointer(this.snap.node);
        };
        Screen.prototype.capture = function (gcc) {
            gcc.captureSvg(this.snap.node);
        };
        return Screen;
    })();
    GmrSampleSnap.Screen = Screen;
    var Actor = (function () {
        function Actor() {
            this.svg = null;
            this.isRemoving = false;
            this.ticks = 0;
            this.collider = new SAT.Box(new SAT.Vector(), 1, 1).toPolygon();
            this.ppos = new SAT.Vector();
            this.scale = new SAT.Vector(1, 1);
        }
        Actor.prototype.update = function () {
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
                this.svg.transform("t" + tx + "," + ty + " s" + this.scale.x + "," + this.scale.y);
            }
            this.gmrActor.update();
            this.ticks++;
        };
        return Actor;
    })();
    GmrSampleSnap.Actor = Actor;
})(GmrSampleSnap || (GmrSampleSnap = {}));
var GmrSampleMatter;
(function (GmrSampleMatter) {
    var Screen = (function () {
        function Screen() {
            var _this = this;
            this.matterSize = 100;
            this.rendererForPlay = {
                create: Matter.Render.create
            };
            this.rendererForEvaluation = {
                create: function () { controller: _this.rendererForEvaluation; }
            };
        }
        Screen.prototype.initPlay = function (mgu) {
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
            this.engineForPlay.isForPlay = true;
            var style = this.engineForPlay.render.canvas.style;
            style.width = style.height = '100%';
            style.margin = '0';
            mgu.initPointer(this.engineForPlay.render.canvas);
        };
        Screen.prototype.getEngineForEvaluation = function () {
            return Matter.Engine.create({
                render: {
                    controller: this.rendererForEvaluation,
                    options: {
                        width: this.matterSize,
                        height: this.matterSize
                    }
                }
            });
        };
        Screen.prototype.clearEngine = function (engine) {
            Matter.Composite.clear(engine.world, false);
            Matter.Engine.clear(engine);
            engine.events = {};
        };
        Screen.prototype.updateEngine = function (engine) {
            var event = {
                timestamp: engine.timing.timestamp
            };
            Matter.Events.trigger(engine, 'beforeTick', event);
            Matter.Events.trigger(engine, 'tick', event);
            Matter.Engine.update(engine, 1000 / 60, 1);
            if (engine.isForPlay === true) {
                engine.render.controller.world(engine);
            }
            Matter.Events.trigger(engine, 'afterTick', event);
        };
        Screen.prototype.capture = function (gcc) {
            gcc.capture(this.engineForPlay.render.canvas);
        };
        return Screen;
    })();
    GmrSampleMatter.Screen = Screen;
    var Actor = (function () {
        function Actor(engine) {
            this.engine = engine;
            this.isRemoving = false;
            this.staticValue = 0;
            this.ticks = 0;
            this.applyingForce = Matter.Vector.create();
            this.pos = new SAT.Vector();
        }
        Actor.prototype.update = function () {
            this.pos.set(this.body.position);
            if (!this.pos.isIn(10, 0, 100, 0, 100)) {
                this.isRemoving = true;
            }
            if (this.isRemoving) {
                if (this.body != null) {
                    Matter.Composite.removeBody(this.engine.world, this.body);
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
        };
        return Actor;
    })();
    GmrSampleMatter.Actor = Actor;
    var Actor;
    (function (Actor) {
        Actor.properties = [
            ['body.restitution', 0.1, 1],
            ['body.friction', 0.1, 1],
            ['body.density', 0.001, 0.1],
            ['body.force.x', -0.0005, 0.0005],
            ['body.force.y', -0.0005, 0.0005],
            ['staticValue', -1, 1],
            ['applyingForce.x', -0.0001, 0.0001],
            ['applyingForce.y', -0.0001, 0.0001]
        ];
    })(Actor = GmrSampleMatter.Actor || (GmrSampleMatter.Actor = {}));
})(GmrSampleMatter || (GmrSampleMatter = {}));
//# sourceMappingURL=GmrSampleScreen.js.map