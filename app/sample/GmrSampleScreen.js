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
        Screen.prototype.setup = function (mgu) {
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
        Screen.prototype.update = function () { };
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
        }
        Screen.prototype.setup = function (mgu) {
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
        };
        Screen.prototype.update = function () {
            var event = {
                timestamp: this.engine.timing.timestamp
            };
            Matter.Events.trigger(this.engine, 'beforeTick', event);
            Matter.Events.trigger(this.engine, 'tick', event);
            Matter.Engine.update(this.engine, 1000 / 60, 1);
            Matter.Events.trigger(this.engine, 'afterTick', event);
        };
        Screen.prototype.capture = function (gcc) {
            gcc.capture(this.engine.render.canvas);
        };
        return Screen;
    })();
    GmrSampleMatter.Screen = Screen;
    var Actor = (function () {
        function Actor(engine) {
            this.engine = engine;
            this.isRemoving = false;
            this.ticks = 0;
        }
        Actor.prototype.update = function () {
            if (this.isRemoving) {
                if (this.body != null) {
                    Matter.Composite.removeBody(this.engine.world, this.body);
                    this.body = null;
                }
                return false;
            }
            this.gmrActor.update();
            this.ticks++;
        };
        return Actor;
    })();
    GmrSampleMatter.Actor = Actor;
})(GmrSampleMatter || (GmrSampleMatter = {}));
//# sourceMappingURL=GmrSampleScreen.js.map