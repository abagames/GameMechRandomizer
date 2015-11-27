/// <reference path="../../typings/snap.svg/snapsvg.d.ts" />
/// <reference path="../../typings/SAT/SAT.d.ts" />
/// <reference path="../../typings/GIFCaptureCanvas/GifCaptureCanvas.d.ts" />
/// <reference path="MyGameUtil.ts" />
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
            var snapDiv = document.getElementById('snapDiv');
            var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('id', 'snapSvg');
            snapDiv.appendChild(svg);
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
//# sourceMappingURL=GmrSampleScreen.js.map