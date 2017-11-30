/* GPL License
 * Ported from LibCanvas
 * "Artem Smirnov <art543484@ya.ru>"
 * "Shock <shocksilien@gmail.com>"
 * https://github.com/theshock/libcanvas/blob/master/Source/Plugins/Curves.js
 */
Delta.drawRibbonCurve = function(ctx, params){
	var step = params.step || 0.2;
	var prev = params.point(-step);
	var prevDrawPoints;
	var drawPoints;
	for(var t = -step; t < 1.02; t += step){
		var cur = params.point(t);
		drawPoints = getDrawPoints(prev, cur, 10, -1);
		if(t >= step){
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(prevDrawPoints[0].x, prevDrawPoints[0].y)
			ctx.lineTo(prevDrawPoints[1].x, prevDrawPoints[1].y);
			ctx.lineTo(drawPoints[1].x, drawPoints[1].y);
			ctx.lineTo(drawPoints[0].x, drawPoints[0].y);
			ctx.fillStyle = randcolor();
			ctx.fill();
			ctx.stroke();
		}
		prevDrawPoints = drawPoints;
		prev = cur;
	}
};

Curve.prototype.attrHooks.ribbon = {
	set: function(){
		this.update();
	}
};

Curve.prototype.attrHooks.ribbonGradient = {
	set: function(){
		this.update();
	}
};

// Curve работает на process; надо переопределять process и вызывать из него draw
var oldCurveDraw = Curve.prototype.draw;
Curve.prototype.draw = function(){
	if(!this.attrs.ribbon || !this.attrs.ribbonGradient || !this.pointAt){
		oldCurveDraw.apply(this, arguments);
	}
	// ...
};

// curve.attr('ribbon', true);
// curve.attr('ribbonGradient', ctx.gradient('ribbon', 'horizontal' / 'vertical', colors, tStart = 0, tEnd = 1, etc));

// or:
// path.attr('ribbon', true)
// path.attr('ribbonGradient', ...);
// В свою очередь, должен быть абстрактный (не привязанный к канвасу!) класс Gradient
function getDrawPoints(prev, cur, width, inverted){
	var w = cur.x - prev.x,
		h = cur.y - prev.y,
		dist = Math.sqrt(w * w + h * h),

		sin = h / dist,
		cos = w / dist,

		dx = sin * width,
		dy = cos * width;

	return [{
		x: cur.x + dx,
		y: cur.y + dy * inverted
	}, {
		x: cur.x - dx,
		y: cur.y - dy * inverted
	}];
}


function abc() {

// The following text contains bad code and due to it's code it should not be readed by ANYONE!

var
	Transition = atom.Transition,
	Color = atom.Color,
	EC = {};

/** @returns {atom.Color} */
EC.getColor = function (color) {
	return new Color(color || [0,0,0,1]);
};

EC.getPoints = function (prevPos, pos, width, inverted) {
	var
		w    = pos.x-prevPos.x,
		h    = pos.y-prevPos.y,
		dist = atom.math.hypotenuse(w, h),

		sin = h / dist,
		cos = w / dist,

		dx = sin * width,
		dy = cos * width;

	return [
		new Point(pos.x + dx, pos.y + dy*inverted),
		new Point(pos.x - dx, pos.y - dy*inverted)
	];
};

EC.getGradientFunction = function (attr) {
	switch (typeof attr.gradient) {
		case 'undefined' :
			return atom.fn.lambda( EC.getColor(attr.color) );

		case 'function' :
			return attr.gradient;

		default :
			var gradient = { fn: attr.gradient.fn || 'linear' };

			if (typeof gradient.fn != 'string') {
				throw new Error('LibCanvas.Context2D.drawCurve -- unexpected type of gradient function');
			}

			gradient.from = EC.getColor(attr.gradient.from);
			gradient.to   = EC.getColor(attr.gradient.to  );

			var diff = gradient.from.diff( gradient.to );

			return function (t) {
				var factor = Transition.get(gradient.fn)(t);
				return gradient.from.shift( diff.clone().mul(factor) ).toString();
			};
	}
};

// возвращает width(t)
EC.getWidthFunction = function (attr) {
	attr.width = attr.width || 1;
	switch (typeof attr.width) {
		case 'number'  : return atom.fn.lambda(attr.width);
		case 'function': return attr.width;
		case 'object'  : return EC.getWidthFunction.range( attr.width );
		default: throw new TypeError('LibCanvas.Context2D.drawCurve -- unexpected type of width');
	}
};

EC.getWidthFunction.range = function (width) {
	if(!width.from || !width.to){
		throw new Error('LibCanvas.Context2D.drawCurve -- width.from or width.to undefined');
	}
	var diff = width.to - width.from;
	return function(t){
		return width.from + diff * Transition.get(width.fn || 'linear')(t);
	}
};

// возвращает точки кривой
EC.curvesFunctions = [
	function (p, t) { // linear
		return {
			x:p[0].x + (p[1].x - p[0].x) * t,
			y:p[0].y + (p[1].y - p[0].y) * t
		};
	},
	function (p,t) { // quadratic
		var i = 1-t;
		return {
			x:i*i*p[0].x + 2*t*i*p[1].x + t*t*p[2].x,
			y:i*i*p[0].y + 2*t*i*p[1].y + t*t*p[2].y
		};
	},
	function (p, t) { // qubic
		var i = 1-t;
		return {
			x:i*i*i*p[0].x + 3*t*i*i*p[1].x + 3*t*t*i*p[2].x + t*t*t*p[3].x,
			y:i*i*i*p[0].y + 3*t*i*i*p[1].y + 3*t*t*i*p[2].y + t*t*t*p[3].y
		};
	}
];

Context2D.prototype.drawCurve = function (obj) {
	var points = atom.array.append( [Point(obj.from)], obj.points.map(Point), [Point(obj.to)] );

	var gradientFunction = EC.getGradientFunction(obj),             //Getting gradient function
		widthFunction    = EC.getWidthFunction(obj),                //Getting width function
		curveFunction    = EC.curvesFunctions[ obj.points.length ]; //Getting curve function

	if (!curveFunction) throw new Error('LibCanvas.Context2D.drawCurve -- unexpected number of points');

	var step = obj.step || 0.02;

	var invertedMultipler = obj.inverted ? 1 : -1;

	var controlPoint, prevContorolPoint,
		drawPoints  , prevDrawPoints   ,
		width , color, prevColor, style;

	prevContorolPoint = curveFunction(points, -step);

	for (var t=-step ; t<1.02 ; t += step) {
		controlPoint = curveFunction(points, t);
		color = gradientFunction(t);
		width = widthFunction(t) / 2;

		drawPoints = EC.getPoints(prevContorolPoint, controlPoint, width, invertedMultipler);

		if (t >= step) {
			// #todo: reduce is part of array, not color
			var diff = EC.getColor(prevColor).diff(color);

			if ( (diff.red + diff.green + diff.blue) > 150 ) {
				style = this.createLinearGradient(prevContorolPoint, controlPoint);
				style.addColorStop(0, prevColor);
				style.addColorStop(1,     color);
			} else {
				style = color;
			}

				this
					.set("lineWidth",1)
					.beginPath(prevDrawPoints[0])
					.lineTo   (prevDrawPoints[1])
					.lineTo   (drawPoints[1])
					.lineTo   (drawPoints[0])
					.fill  (style)
					.stroke(style);
		}
		prevDrawPoints    = drawPoints;
		prevContorolPoint = controlPoint;
		prevColor         = color;
	}
	return this;
};

};