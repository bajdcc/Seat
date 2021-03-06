function CanvasPreloader() {
    var _this = this;
    var PRLrequestAnimFrame = (function () {
        return window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            function (callback) {
                window.setTimeout(callback, 1000 / 60);
            };
    })();

    _this.SIZE = 320;
    _this.radius = _this.SIZE / 4;
    _this.colors = [
        {r: 255, g: 0, b: 0},
        {r: 0, g: 255, b: 0},
        {r: 0, g: 0, b: 255},
        {r: 255, g: 0, b: 0},
        {r: 0, g: 255, b: 0},
        {r: 0, g: 0, b: 255}
    ];
    _this.cirs = [];
    _this.whiteRadiusIni = _this.radius + 15;
    _this.POR = 'Loading...';
    _this.porAlpha = 1;

    _this.setup = function () {
        _this.container = document.createElement('div');
        _this.container.style.width = '100%';
        _this.container.style.height = '100%';
        _this.container.style.position = 'fixed';
        _this.container.style.top = '0';
        _this.container.style.left = '0';
        _this.container.style.background = '#fff';
        _this.container.style.zIndex = 99;
        _this.container.style.display = 'block';
        document.body.appendChild(_this.container);

        _this.canvas = document.createElement('canvas');
        _this.canvas.width = _this.SIZE;
        _this.canvas.height = _this.SIZE;
        _this.canvas.style.position = 'absolute';
        _this.canvas.style.margin = 'auto';
        _this.canvas.style.top = _this.canvas.style.bottom = _this.canvas.style.left = _this.canvas.style.right = '0';
        _this.canvas.style.width = '50%';
        _this.canvas.style.maxWidth = _this.SIZE + 'px';
        _this.canvas.style.maxHeight = _this.SIZE + 'px';
        _this.container.appendChild(_this.canvas);
        _this.context = _this.canvas.getContext('2d');
        for (var i = 0; i < _this.colors.length; i++) {
            var cir = {
                rx: _this.radius,
                ry: _this.radius,
                r: Math.random() * 360 * Math.PI / 180,
                vrx: .5 - Math.random(),
                vry: .5 - Math.random(),
                vr: .5 - Math.random()
            };
            _this.cirs.push(cir);
        }

        _this.render();

    }
    _this.render = function () {
        if (!_this) return;
        PRLrequestAnimFrame(_this.render);
        _this.context.clearRect(0, 0, _this.SIZE, _this.SIZE);
        _this.context.globalCompositeOperation = 'screen';
        var margen = 10;
        for (var i = 0; i < _this.cirs.length; i++) {
            var obj = _this.cirs[i];
            obj.rx += obj.vrx;
            if (obj.rx >= _this.radius + margen || obj.rx <= _this.radius - margen) {
                obj.rx += -obj.vrx;
                obj.vrx *= -1;
            }
            obj.ry += obj.vry;
            if (obj.ry > _this.radius + margen || obj.ry < _this.radius - margen) obj.vry *= -1;
            obj.r += obj.vr / 20;

            var c = _this.colors[i];
            _this.context.beginPath();
            _this.context.fillStyle = _this.gimmeGradient(c.r, c.g, c.b);
            if (_this.context.ellipse) {
                _this.context.ellipse(_this.SIZE / 2, _this.SIZE / 2, obj.rx, obj.ry, obj.r, 0, 2 * Math.PI);
            } else {
                _this.context.arc(_this.SIZE / 2, _this.SIZE / 2, obj.rx, 0, 2 * Math.PI, false);
            }
            _this.context.closePath();
            _this.context.fill();
        }

        if (_this.whiteRadiusIni > _this.radius / 2) {
            _this.context.beginPath();
            _this.context.fillStyle = '#fff';
            _this.context.arc(_this.SIZE / 2, _this.SIZE / 2, _this.whiteRadiusIni, 0, 2 * Math.PI, false);
            _this.context.closePath();
            _this.context.fill();
            _this.whiteRadiusIni += (0 - _this.whiteRadiusIni) * .01;
        }

        if (_this.whiteRadius) {
            _this.wr += (_this.whiteRadius - _this.wr) * .02;
            _this.context.beginPath();
            _this.context.fillStyle = '#fff';
            _this.context.arc(_this.SIZE / 2, _this.SIZE / 2, _this.wr, 0, 2 * Math.PI, false);
            _this.context.closePath();
            _this.context.fill();

            if (_this.wr >= _this.radius + margen) _this.destroy();
            if (_this) _this.porAlpha += (0 - _this.porAlpha) * .04;
        }

        if (_this) {
            _this.context.globalCompositeOperation = 'source-over';
            _this.context.fillStyle = 'rgba(150, 150, 150, ' + _this.porAlpha + ')';
            _this.context.font = '21px Arial';
            _this.context.textBaseline = 'middle';
            _this.context.textAlign = "center";
            _this.context.fillText(_this.POR, _this.SIZE / 2, _this.SIZE / 2);
        }
    }

    _this.gimmeGradient = function (r, g, b) {
        var grad = _this.context.createRadialGradient(_this.SIZE / 2, _this.SIZE / 2, 0, _this.SIZE / 2, _this.SIZE / 2, _this.radius);
        grad.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ', 1)');
        grad.addColorStop(.95, 'rgba(' + r + ',' + g + ',' + b + ', 1)');
        grad.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ', 0)');
        return grad;
    };

    _this.hide = function (_callBack) {
        _this.whiteRadius = _this.radius + 15;
        _this.wr = _this.whiteRadius / 2;
        if (_callBack) _this.callBack = _callBack;
    }
    _this.destroy = function () {
        _this.container.removeChild(_this.canvas);
        document.body.removeChild(_this.container);
        _this.canvas = _this.context = _this.colors = _this.cirs = null;
        PRLrequestAnimFrame = null;
        if (_this.callBack) _this.callBack();
        _this = null;
    }
    _this.setup();
}
var canvasPreloader = new CanvasPreloader();
$(document).ready(function () {
    setTimeout(function () {
        canvasPreloader.hide();
    }, 100);
});