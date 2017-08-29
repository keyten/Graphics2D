/*  Graphics2D More 1.9.0
 * 
 *  Author: Dmitriy Miroshnichenko aka Keyten <ikeyten@gmail.com>
 *  Last edit: 26.08.2017
 *  License: MIT / LGPL
 */

(function(window, $, undefined){

	var Context = $.Context,
		Shape = $.Shape,
		Rect = $.Rect,
		Circle = $.Circle,
		Curve = $.Curve,
		Path = $.Path,
		Img = $.Image,
		Text = $.Text,
		TextBlock = $.TextBlock,
		Gradient = $.Gradient,
		Pattern = $.Pattern,
		Class = $.Class,
		isHash = $.isObject,
		isObject = $.isObject,
		isString = $.isString,
		extend = $.extend,
		Bounds = $.Bounds;

	var Ellipse, Polygon, Star,

	pi2 = Math.PI * 2,
	emptyFunc = function(){};

//# Shapes

Ellipse = new Class(Shape, {

	init : function(){
		var props = this._cx;
		if(isHash( props )){
			this._cx = props.cx || props.x || 0;
			this._cy = props.cy || props.y || 0;
			if(props.radius !== undefined){
				this._rx = this._ry = props.radius;
			} else {
				this._rx = props.rx;
				this._ry = props.ry;
			}
			if(props.kappa !== undefined)
				this._kappa = props.kappa;

			this._parseHash(props);
		} else {
			this._processStyle();
		}
	},

	_kappa : 4/3 * (Math.sqrt(2) - 1),

	// parameters
	cx : function(cx){
		return this._property('cx', cx);
	},
	cy : function(cy){
		return this._property('cy', cy);
	},
	rx : function(rx){
		return this._property('rx', rx);
	},
	ry : function(ry){
		return this._property('ry', ry);
	},
	kappa : function(kappa){
		return this._property('kappa', kappa);
	},

	bounds : function(){
		return new Bounds(this._cx - this._rx, this._cy - this._ry, this._rx * 2, this._ry * 2);
	},
	processPath : function(ctx){
		// http://stackoverflow.com/questions/2172798/how-to-draw-an-oval-in-html5-canvas/23184724#23184724
		ctx.beginPath();
		if(ctx.ellipse && this._kappa === Ellipse.kappa){
			// x, y, radiusX, radiusY, rotation, startAngle, endAngle, anticlockwise
			ctx.ellipse(this._cx, this._cy, this._rx, this._ry, 0, 0, Math.PI * 2, true);
			return;
		}

		var kappa = this._kappa,
			cx = this._cx,
			cy = this._cy,
			rx = this._rx,
			ry = this._ry,

			ox = rx * kappa,
			oy = ry * kappa;

		ctx.moveTo(cx - rx, cy);
		ctx.bezierCurveTo(cx - rx, cy - oy, cx - ox, cy - ry, cx, cy - ry);
		ctx.bezierCurveTo(cx + ox, cy - ry, cx + rx, cy - oy, cx + rx, cy);
		ctx.bezierCurveTo(cx + rx, cy + oy, cx + ox, cy + ry, cx, cy + ry);
		ctx.bezierCurveTo(cx - ox, cy + ry, cx - rx, cy + oy, cx - rx, cy);
		ctx.closePath(); // fix for a last corner with kappa=0
	}

});

Ellipse.props = [ 'cx', 'cy', 'rx', 'ry', 'fill', 'stroke' ];
Ellipse.kappa = Ellipse.prototype._kappa;

Context.prototype.ellipse = function(){
	return this.push( new Ellipse(arguments, this) );
};

$.fx.step.kappa = $.fx.step.float;

$.Ellipse = Ellipse;
Polygon = new Class(Shape, {

	init : function(){
		var props = this._cx;
		if(isHash( props )){
			this._cx = props.cx || props.x || 0;
			this._cy = props.cy || props.y || 0;
			this._radius = props.radius;
			this._sides = props.sides;
			this._parseHash(props);
		} else {
			this._processStyle();
		}
	},

	// parameters
	cx : function(value){
		return this._property('cx', value);
	},

	cy : function(value){
		return this._property('cy', value);
	},

	radius : function(value){
		return this._property('radius', value);
	},

	sides : function(value){
		return this._property('sides', value);
	},

	bounds : function(){
		return new Bounds(this._cx - this._radius, this._cy - this._radius, this._radius * 2, this._radius * 2);
	},

	processPath : function(ctx){
		var angle,
			sides = pi2 / this._sides,
			i = 0;

		ctx.beginPath();

		for(; i < this._sides; i++){
			// angle = pi2 / sides * i
			angle = sides * i;
			ctx.lineTo(this._cx + this._radius * Math.cos(angle), this._cy + this._radius * Math.sin(angle));
		}
			
		ctx.closePath();
	}

});
Polygon.props = [ 'cx', 'cy', 'radius', 'sides', 'fill', 'stroke' ];

Context.prototype.polygon = function(){
	return this.push( new Polygon(arguments, this) );
};

$.fx.step.sides = $.fx.step.int;

$.Polygon = Polygon;
Star = new Class(Shape, {

	init : function(){
		var props = this._cx;
		if(isHash( props )){
			this._cx = props.cx || props.x || 0;
			this._cy = props.cy || props.y || 0;
			this._radius1 = props.radius1 || (props.radius ? props.radius[0] : 0);
			this._radius2 = props.radius2 || (props.radius ? props.radius[1] : 0);
			this._points = props.points;
			this._distortion = props.distortion || 0;
			this._parseHash(props);
		} else {
			this._processStyle();
		}
	},

	_distortion : 0,

	// parameters
	cx : function(value){
		return this._property('cx', value);
	},

	cy : function(value){
		return this._property('cy', value);
	},

	radius1 : function(value){
		return this._property('radius1', value);
	},

	radius2 : function(value){
		return this._property('radius2', value);
	},

	points : function(value){
		return this._property('points', value);
	},

	distortion : function(value){
		return this._property('distortion', value);
	},

	bounds : function(){
		var r = Math.max(this._radius1, this._radius2);
		return new Bounds(this._cx - r, this._cy - r, r * 2, r * 2);
	},
	processPath : function(ctx){
		var angle1, angle2,
			offset = Math.PI / this._points,
			i = 0;

		ctx.beginPath();

		for(; i < this._points; i++){
			angle1 = pi2 * i / this._points;
			angle2 = angle1 + offset + this._distortion;
			ctx.lineTo(this._cx + this._radius1 * Math.cos(angle1), this._cy + this._radius1 * Math.sin(angle1));
			ctx.lineTo(this._cx + this._radius2 * Math.cos(angle2), this._cy + this._radius2 * Math.sin(angle2));
		}

		ctx.closePath();
	}

});
Star.props = [ 'cx', 'cy', 'radius1', 'radius2', 'points', 'fill', 'stroke' ];

Context.prototype.star = function(){
	return this.push( new Star(arguments, this) );
};

$.fx.step.radius1 = $.fx.step.int;
$.fx.step.radius2 = $.fx.step.int;
$.fx.step.points = $.fx.step.int;
$.fx.step.distortion = $.fx.step.float;

$.Star = Star;
//# RoundRect
Rect.prototype._rx = 0;
Rect.prototype._ry = 0;
Rect.prototype.initialize = function(){
	var props = this._x;
	if(isHash( props )){
		this._rx = props.rx || props.radius || 0;
		this._ry = props.ry || props.radius || 0;
	}
};
Rect.prototype.processPath = function(ctx){
	var x = this._x,
		y = this._y,
		w = this._width,
		h = this._height,
		rx = this._rx,
		ry = this._ry;

	ctx.beginPath();
	if(rx === 0 && ry === 0){
		ctx.rect(this._x, this._y, this._width, this._height);
	}
	else {
		ctx.moveTo(x, y + ry);

		// left side
		ctx.lineTo(x, y+h-ry);
		// left bottom corner
		ctx.quadraticCurveTo(x, y+h, x+rx, y+h);

		// bottom side
		ctx.lineTo(x+w-rx, y+h);
		// right bottom corner
		ctx.quadraticCurveTo(x+w, y+h, x+w, y+h-ry);

		// right side
		ctx.lineTo(x+w, y+ry);
		// right top corner
		ctx.quadraticCurveTo(x+w, y, x+w-rx, y);

		// top side
		ctx.lineTo(x+rx, y);
		// top left side
		ctx.quadraticCurveTo(x, y, x, y+ry);

		ctx.closePath();
	}
};

Rect.prototype.rx = function(rx){
	return this._property('rx', rx);
};

Rect.prototype.ry = function(ry){
	return this._property('ry', ry);
};

$.fx.step.rx = $.fx.step.int;
$.fx.step.ry = $.fx.step.int;


//# Typography
var TextImproved = new Class(Text, {

	_letterSpace: 0,
	_wordSpace: 0,

	draw: function(ctx){
		if(!this._visible)
			return;
		this._applyStyle();

		var x = this._x,
			y = this._y,
			i = 0,
			l = this._lines.length,
			draw = emptyFunc,
			underline,
			line;

		if(this._style.fillStyle){
			if(this._style.strokeStyle)
				draw = function(t, x, y){
					ctx.fillText(t, x, y);
					ctx.strokeText(t, x, y);
				};
			else
				draw = ctx.fillText;
		} else
			draw = ctx.strokeText;

		if(this._underline){
			var height = Math.round(this._font.size / 5),
				lw = Math.round(this._font.size / 15),
				oldSize = this._style.lineWidth || lw;

			ctx.strokeStyle = this._style.strokeStyle || this._style.fillStyle;
			underline = function(x, y, width){
				ctx.lineWidth = lw;
				ctx.beginPath();
				ctx.moveTo(x, y + height);
				ctx.lineTo(x + width, y + height);
				ctx.stroke();
				ctx.lineWidth = oldSize;
			};
		}

		for(; i < l; i++){
			line = this._lines[i];
			draw.call(ctx, line.text, x + line.x, y + line.y + this._lineSpace * i);
			if(underline !== undefined)
				underline(line.x + x, y + line.y + this._lineSpace * i, ctx.measureText(line.text).width);
		}

		ctx.restore();
	}

});

TextImproved.props = Text.props;

Text.prototype.improve = function(){
	$.extend(this, TextImproved.prototype);
	return this;
};

Context.prototype.textImproved = function(){
	return this.push( new TextImproved(arguments, this) );
};

/* var textNativeDraw = Text.prototype.draw;
$.extend(Text.prototype, {
	
	_letterSpace: 0,
	letterSpace: function(space){
		return this.prop('letterSpace', space);
	},

	letter: function(index, style){
		if(style){
			if(!this._letterStyle)
				this._letterStyle = {};
			if(!this._letterStyle[index])
				this._letterStyle[index] = {};
			$.extend(this._letterStyle[index], style);
			this.update();
		}
		return this._letterStyle[index];
	},

	draw: function(ctx){
		if(this._letterSpace === 0 && this._letterStyle == null){
			return textNativeDraw.call(this, ctx);
		}

		if(!this._visible)
			return;
		this._applyStyle();

		var x = this._x,
			y = this._y,
			i = 0,
			l = this._lines.length,
			draw = emptyFunc,
			line,
			j,
			letterX,
			style;

		if(this._style.fillStyle){
			if(this._style.strokeStyle)
				draw = function(t, x, y){
					ctx.fillText(t, x, y);
					ctx.strokeText(t, x, y);
				};
			else
				draw = ctx.fillText;
		} else
			draw = ctx.strokeText;

		for(; i < l; i++){
			line = this._lines[i];
			letterX = 0;
			for(j = 0; j < line.text.length; j++){
				draw.call(ctx, line.text[j], x + line.x + letterX, y + line.y + this._lineSpace * i);
				letterX += ctx.measureText(line.text[j]).width + this._letterSpace;
			}
		}
	}

});

$.fx.step.letterSpace = $.fx.step.float;
/*
	- letterSpace.
	- letter.

*/


//# Curves

//# Catmull-Rom Curves
Curve.curves.catmullRom = {

	params : function(){
		var from = this.from(),
			arg = this._arguments;
		return {
			x1  : from[0],
			y1  : from[1],
			x2  : arg[2],
			y2  : arg[3],
			h1x : arg[0],
			h1y : arg[1],
			h2x : arg[4],
			h2y : arg[5]
		};
	},

	pointAt : function(t){
		var p = this.params();
		return CRPoint( p.h1x, p.h1y, p.x1, p.y1, p.x2, p.y2, p.h2x, p.h2y, t );
	},

	tangentAt : function(t){
		var p = this.params();
		return Math.atan2(
			0.5 * ( 3*t*t*(-p.h1y+3*p.y1-3*p.y2+p.h2y) + 2*t*(2*p.h1y-5*p.y1+4*p.y2-p.h2y) + (-p.h1y+p.y2)  ),
			0.5 * ( 3*t*t*(-p.h1x+3*p.x1-3*p.x2+p.h2x) + 2*t*(2*p.h1x-5*p.x1+4*p.x2-p.h2x) + (-p.h1x+p.x2)  )
		) / Math.PI * 180;
	},

	process : function( ctx, current ){
		var point,
			a = this._arguments,
			i = 0,
			detail = this._detail;
		for(; i <= detail; i++){
			point = CRPoint( a[0], a[1], current[0], current[1], a[2], a[3], a[4], a[5], i / detail );
			ctx.lineTo( point.x, point.y );
		}
		return [ a[4], a[5] ];
	},
	_detail : 20,
	h1x : argument( 0 ),
	h1y : argument( 1 ),
	h2x : argument( 4 ),
	h2y : argument( 5 ),
	x   : argument( 2 ),
	y   : argument( 3 ),
	_slice : [ 4 ],

	toCubic : function(){}
};

function CRPoint(x1, y1, x2, y2, x3, y3, x4, y4, t){
	return {
		x: 0.5 * ((-x1 + 3*x2 - 3*x3 + x4)*t*t*t
				+ (2*x1 - 5*x2 + 4*x3 - x4)*t*t
				+ (-x1 + x3)*t
				+ 2*x2),
		y: 0.5 * ((-y1 + 3*y2 - 3*y3 + y4)*t*t*t
				+ (2*y1 - 5*y2 + 4*y3 - y4)*t*t
				+ (-y1 + y3)*t
				+ 2*y2)
	};
}

function argument( index ){
	return function( value ){
		return this.argument( index, value );
	};
}

$.CRPoint = CRPoint;
//# Bezier Curves
Curve.curves.bezier = {
	pointAt : function(t){},
	process : function( ctx, current ){
		var curx, cury,
			x = [ current[0] ].concat(getElements( this._arguments, 0 )),
			y = [ current[1] ].concat(getElements( this._arguments, 1 )),
			detail = this._detail,
			i = 0;
		for(; i <= detail; i++){
			curx = bezier( x, i / detail );
			cury = bezier( y, i / detail );
			ctx.lineTo( curx, cury );
		}
		return this._arguments.slice( this._arguments.length - 2 );
	},
	_detail : 50
};

function getElements( array, i ){
	// i = 0 -- odd
	// i = 1 -- even
	var result = [],
		l = array.length;
	for( ; i < l; i += 2 ){
		result.push( array[i] );
	}
	return result;
}

function factorial(n){
	if(n === 1 || n === 0) return 1;
		return n * factorial(n-1);
}

function C(i, m){
	return factorial(m) / (factorial(i) * factorial(m - i));
}

function bezier(points, t){
	var len = points.length,
		m = len - 1,
		i = 0,
		l = 1 - t,
		result = 0;
	for(; i < len; i++){
		result += C(i, m) * Math.pow(t, i) * Math.pow(l, m - i) * points[i];
	}
	return result;
}
//# Curves
Curve.detail = 10;
Curve.delta = 0.0001;

extend(Curve.prototype, {
	tangentAt : function(t, delta){
		if(delta === undefined)
			delta = Curve.delta;

		var t1 = t - delta,
			t2 = t + delta;

		if(t1 < 0)
			t1 = 0;
		if(t2 > 1)
			t2 = 1;

		var point1 = this.pointAt(t1),
			point2 = this.pointAt(t2);

		return Math.atan2(point2.y - point1.y, point2.x - point1.x) * 180 / Math.PI;
	},

	normalAt : function(t, delta){
		return this.tangentAt(t, delta) - 90;
	},

	nearest : function(x, y, detail){
		if(detail === undefined)
			detail = Curve.detail;

		var point, min = Infinity, minPoint, distance;
		for(var t = 0; t <= detail; t++){
			point = this.pointAt(t / detail);
			distance = Math.sqrt( Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2) );
			if(distance < min){
				min = distance;
				minPoint = point;
				minPoint.distance = distance;
				minPoint.t = t / detail;
			}
		}
		return minPoint;
	},

	approximate : function(detail){
		if(detail === undefined)
			detail = Curve.detail;

		var lines = [], last = this.pointAt(0), point;
		for(var t = 1; t <= detail; t++){
			point = this.pointAt(t / detail);
			// round coords?
			lines.push({ x1: last.x, y1: last.y, x2: point.x, y2: point.y });
			last = point;
		}
		return lines;
	},

	toLines : function(detail){
		if(detail === undefined)
			detail = Curve.detail;

		var curves = this.path._curves,
			index = curves.indexOf(this),
			lines = [],
			point;
		for(var t = 0; t <= detail; t++){
			point = this.pointAt(t / detail);
			lines.push( new Curve('lineTo', [point.x, point.y], this.path) );
		}
		curves.splice.apply(curves, [index, 1].concat(lines));
		return this.update();
	},

	length : function(detail){
		var lines = this.approximate(detail),
			length = 0;
		for(var i = 0, l = lines.length; i < l; i++){
			length += Math.sqrt( Math.pow(lines[i].x2 - lines[i].x1, 2) + Math.pow(lines[i].y2 - lines[i].y1, 2) );
		}
		return length;
	},

	_bounds : function(detail){
		if(!this.pointAt)
			return null;

		if(detail === undefined)
			detail = Curve.detail;

		var point,
			x1 =  Infinity,
			y1 =  Infinity,
			x2 = -Infinity,
			y2 = -Infinity;
		for(var t = 0; t <= detail; t++){
			point = this.pointAt(t / detail);
			if(point.x < x1)
				x1 = point.x;
			if(point.y < y1)
				y1 = point.y;
			if(point.x > x2)
				x2 = point.x;
			if(point.y > y2)
				y2 = point.y;
		}
		return new Bounds(x1, y1, x2 - x1, y2 - y1);
	},

	curvature : function(){
		return null;
	}
});

extend(Curve.curves.moveTo, {
	length: null
});

extend(Curve.curves.lineTo, {
	pointAt : function(t){
		var from = this.from();
		var to = this._arguments;
		return {
			x: (1 - t)*from[0] + t*to[0],
			y: (1 - t)*from[1] + t*to[1]
		};
	},

	tangentAt : function(){
		var from = this.from();
		var to = this._arguments;
		return Math.atan2( to[1] - from[1], to[0] - from[0] ) * 180 / Math.PI;
	},

	length : function(){
		var from = this.from();
		var to = this._arguments;
		return Math.sqrt( Math.pow(to[1] - from[1], 2) + Math.pow(to[0] - from[0], 2) );
	},

	curvature : function(){
		return 0;
	},

	divide : function(t){
		if(t);
		return [];
	},

	solve : function(coord){
		if('t' in coord)
			throw new Error('Use pointAt(t) function instead solve.');
		// solve({ x:5 }) -> {x, y, t}
		// solve({ y:100 }) -> {x, y, t}
		// solve({ x, y })
	}
});

extend(Curve.curves.quadraticCurveTo, {
	params : function(){
		var from = this.from(),
			arg = this._arguments;
		return {
			x1 : from[0],
			y1 : from[1],
			x2 : arg[2],
			y2 : arg[3],
			hx : arg[0],
			hy : arg[1]
		};
	},

	pointAt : function(t){
		var p = this.params(),
			i = 1 - t;
		return {
			x: (i*i*p.x1) + (2*t*i*p.hx) + (t*t*p.x2),
			y: (i*i*p.y1) + (2*t*i*p.hy) + (t*t*p.y2)
		};
	},

	tangentAt : function(t){
		var p = this.params(),
			i = 1 - t;
		return Math.atan2(-2*p.y1*i + 2*p.hy*(1-2*t) + 2*p.y2*t, -2*p.x1*i + 2*p.hx*(1-2*t) + 2*p.x2*t) / Math.PI * 180;
	},

	toCubic : function(c){
		if(c === undefined)
			c = 2/3;

		var p = this.params();

		this.name = 'bezierCurveTo';
		this._arguments = [
			p.x1 + c * (p.hx - p.x1),
			p.y1 + c * (p.hy - p.y1),
			p.x2 + c * (p.hx - p.x2),
			p.y2 + c * (p.hy - p.y2),
			p.x2, p.y2
		];
		extend(this, Curve.curves.bezierCurveTo);
		return this;
	}
});

extend(Curve.curves.bezierCurveTo, {
	params : function(){
		var from = this.from(),
			arg = this._arguments;
		return {
			x1  : from[0],
			y1  : from[1],
			x2  : arg[4],
			y2  : arg[5],
			h1x : arg[0],
			h1y : arg[1],
			h2x : arg[2],
			h2y : arg[3]
		};
	},

	pointAt : function(t){
		var p = this.params(),
			i = 1 - t;
		return {
			x: (i*i*i*p.x1) + (3*t*i*i*p.h1x) + (3*t*t*i*p.h2x) + t*t*t*p.x2,
			y: (i*i*i*p.y1) + (3*t*i*i*p.h1y) + (3*t*t*i*p.h2y) + t*t*t*p.y2
		};
	},

	tangentAt : function(t){
		var p = this.params(),
			i = 1 - t;
		return Math.atan2(
			-3*p.y1*i*i + 3*p.h1y*(i*i - 2*t*i) + 3*p.h2y*(2*t*i - t*t) + 3*t*t*p.y2,
			-3*p.x1*i*i + 3*p.h1x*(i*i - 2*t*i) + 3*p.h2x*(2*t*i - t*t) + 3*t*t*p.x2
			) / Math.PI * 180;
	},
});
// Arc
extend(Curve.curves.arc, {
	params : function(){
		var from = this.from(),
			arg = this._arguments;
		return {
			x1     : from[0],
			y1     : from[1],
			x2     : arg[0],
			y2     : arg[1],
			radius : arg[2],
			start  : arg[3],
			end    : arg[4],
			clockwise : arg[5]
		};
	},
	pointAt : function(){
		var p = this.params();
		return p;
	}
});


// ArcTo

		// pointAt: function(){},
		// tangentAt: function(){},
		// normalAt = auto
		// intersections: function(){},
		// toBezier: function(){},
		// approximate: function(){}, // by lines
		// bounds: function(){},
		// length: function(){},
		// divide: function(){},
		// nearest: function(){}, // nearest point
		// allPoints
	
//		TODO: animate by curve
//# Curve gradients

Curve.prototype.visible = true;
Curve.prototype._special = false; // hides the curve and draws after

Curve.prototype.hide = function(){
	this.visible = false;
};

Curve.prototype.show = function(){
	this.visible = true;
};

Curve.prototype.fill = function(from, to){
	if(to){
		this.fill; // todo: gradient
	}
	else {
		this.fill = from;
	}
	this._special = true;
	return this.update();
};

Curve.prototype.draw = function(ctx){
	if(!this.visible)
		return;
	var from = this.from();
	ctx.save();
	ctx.beginPath();
	ctx.moveTo(from[0], from[1]);
	this.process(ctx);
	ctx.stroke();
	ctx.restore();
/*	draw : function(ctx){
		if(!this._visible)
			return;
		this._applyStyle();
		this.processPath(ctx);
		if(this._style.fillStyle)
			ctx.fill();
		if(this._style.strokeStyle)
			ctx.stroke();
		ctx.restore();
	}, */
};

Path.prototype.processPath = function(ctx){
	var curve,
		current = [0, 0],
		curves = this._curves,
		special = [],
		i = 0;
	
	ctx.beginPath();
	for(; i < curves.length; i++){
		if(curves[i].visible && !curves[i]._special){
			curve = curves[i].process(ctx, current);

			if(curve)
				current = curve;
		}
		else {
			current = curves[i].endsIn();
			ctx.moveTo(current[0], current[1]);
			if(curves[i]._special){
				special.push(curves[i]);
			}
		}
	}

	this._special = special;
};

Path.prototype.draw = function(ctx){
	Shape.prototype.draw.call(this, ctx);

	if(!this._special) return;

	var spec = this._special,
		i = 0;
	for(; i < spec.length; i++){
		spec[i].draw(ctx);
	}
}

/*
	path.curve(x)
			.width(...)
			.fill(...)
			.stroke(...);
*/
//# Path Utils

extend(Path.prototype, {

	curveAt: function(t){
		var lengths = [],
			i = 0,
			currentLength,
			totalLength = 0;

		for(; i < this._curves.length; i++){
			if(this._curves[i].length){
				currentLength = this._curves[i].length(detail);
				totalLength += currentLength;
				lengths.push( currentLength );
			}
		}

		totalLength *= t;
		currentLength = 0;

		for(i = 0; i < this._curves.length; i++){
			if(this._curves[i].length){
				currentLength += this._curves[i].length(detail);
				if(currentLength <= totalLength)
					return this._curves[i];
			}
		}
	},

	pointAt: function(t, detail){

		return totalLength * t;
	},

	length: function(detail){
		var totalLength = 0,
			i = 0;
		for(; i < this._curves.length; i++){
			if(this._curves[i].length)
				totalLength += this._curves[i].length(detail);
		}
		return totalLength;
	}

});

//# Animation
//# Animation
// 1. Path to path.
// 2. Move by path.
// 3. Gradient to gradient.


$.fx.step.position = function( fx ){
	if( fx.state === 0 ){
		;
	}
};

/*
// Moving by path
$.fx.step.curve = function( fx ){
	if( fx.state === 0 ){
		if( !fx.elem._matrix )
			fx.elem._matrix = [1, 0, 0, 1, 0, 0];

		if( fx.elem._bounds || (fx.elem.bounds && fx.elem.bounds !== Shape.prototype.bounds) ){
			var b = fx.elem.bounds();
			fx.elem._matrix[4] -= b.cx;
			fx.elem._matrix[5] -= b.cy;
		}
	}

	if( fx.pointLast ){
		fx.elem._matrix[4] -= fx.pointLast.x;
		fx.elem._matrix[5] -= fx.pointLast.y;
	}
	var point = fx.end.pointAt(fx.pos);
	fx.elem._matrix[4] += point.x;
	fx.elem._matrix[5] += point.y;
	fx.pointLast = point;
};

$.fx.step.curveAngle = function( fx ){
	if( fx.state === 0 ){
		if( !fx.elem._matrix )
			fx.elem._matrix = [1, 0, 0, 1, 0, 0];

		if( fx.elem._bounds ){
			var b = fx.elem.bounds();
			fx.elem._matrix[4] -= b.cx;
			fx.elem._matrix[5] -= b.cy;
		}
	}

	if( fx.pointLast ){
		fx.elem._matrix[4] -= fx.pointLast.x;
		fx.elem._matrix[5] -= fx.pointLast.y;
		fx.elem.rotate(-fx.ang)
	}
	var point = fx.end.pointAt(fx.pos),
		angle = fx.end.tangentAt(fx.pos);
	fx.elem._matrix[4] += point.x;
	fx.elem._matrix[5] += point.y;
	fx.elem.rotate(angle);
	fx.pointLast = point;
	fx.ang = angle;
}; */ // -- bezier

//# Images

//# Filters
var nativeDraw = Img.prototype.draw;

// todo: список фильтров
Img.prototype.filter = function(filter, options){
	if(!this._image.complete){
		return this.on('load', function(){
			this.filter(filter, options);
		});
	}

	var data = this.context.context.getImageData(this._x, this._y, this._width, this._height);

	if( typeof filter !== 'function' ){

		if( $.filters[filter] === undefined ){
			throw new Error('Filter \"' + filter + '\" is not defined.');
		}

		filter = $.filters[filter];
	}

	if( filter.call(this, data.data, options || {}) !== false ){
		this._imageData = data;
		this.context.context.putImageData(data, this._x, this._y);
	}

	return this;
};

Img.prototype.draw = function(ctx){
	// unknown bug in Chrome 43
	if(this._imageData)
		ctx.putImageData(this._imageData, this._x, this._y);
	else
		nativeDraw.call(this, ctx);

	return this;
};

$.filters = {

	pixel : function(data, callback){
		var pixel,
			i = 0,
			l = data.length;

		for(; i < l; i += 4){
			pixel = callback(data[i], data[i+1], data[i+2], data[i+3], i);
			data[i]   = pixel[0];
			data[i+1] = pixel[1];
			data[i+2] = pixel[2];
			data[i+3] = pixel[3];
		}

	},

	vertex : function(data, callback){
		var pixel,
			w = this._width,
			h = this._height,
			result = this.context.context.createImageData(w, h),
			rdata = result.data,
			i = 0,
			l = data.length,
			idw = w / 4;
		for(; i < l; i += 4){
			pixel = callback(
				(i / 4) % w, Math.floor(i / 4 / w),
				data[i], data[i+1], data[i+2], data[i+3],
				i);
			pixel = ((w * pixel[1] + pixel[0]) * 4) | 0;
			rdata[pixel] = data[i];
			rdata[pixel+1] = data[i+1];
			rdata[pixel+2] = data[i+2];
			rdata[pixel+3] = data[i+3];
		}
		this._imageData = result;
		this.update();
		return false;
	}

};
//# ImageAnim

$.Context.prototype.imageanim = function(){
	return this.push( new ImageAnim(arguments, this) );
};

$.multiplePath = function(path){
	var array = [],
		re = /\[(\d+)\-(\d+)\]/,
		match = path.match(re),
		from = Number(match[1]),
		to = Number(match[2]);
	for(; from <= to; from++)
		array.push( path.replace(re, from) );
	return array;
};

function genSequence(length){
	var array = [];
	while(length--)
		array[length] = length;
	return array;
}

var ImageAnim = $.Class(Img, {

	init : function(){
		var props = this._image;
		this._frames = [];
		this._sequences = [];

		if(isObject(props)){
			this._image = props.image;
			this._x = props.x;
			this._y = props.y;
			this._width = props.width;
			this._height = props.height;
			this._crop = props.crop;
			this._parseHash(props);
		}

		if(isString(this._image))
			this._image = $.multiplePath(this._image);

		var image;
		this._image.forEach(function(frame){
			if( isString(frame) ){
				// other types? svg, #id?
				image = new Image();
				image.src = frame;
				frame = image;
			}
			this._frames.push(frame);
		}.bind(this));

		this._image = this._frames[0];

		// image already loaded
//		if(this._image.complete){
//			s = this._computeSize(this._width, this._height, this._image);
//			this._width = s[0];
//			this._height = s[1];
//		}

		this._image.addEventListener('load', function(e){
//			s = this._computeSize(this._width, this._height, this._image);
//			this._width = s[0];
//			this._height = s[1];
			this.update();

			this.fire('load', e);
		}.bind(this));

		this._image.addEventListener('error', function(e){
			this.fire('error', e);
		}.bind(this));
	},

	_startFrame: 0,

	frame : function(frame){
		if(frame === undefined)
			return this._frame;

		// wtf?
//		if(!this._frames[frame].complete)
//			return this._frames[frame].addEventListener('load', function(){ this.frame(frame); }.bind(this));

		this._frame = frame;
		this._image = this._frames[frame];
		this.fire('frame', {frame:frame});
		return this.update();
	},

	nextframe : function(){
		return this.frame(this._frame === this._frames.length-1 ? 0 : this._frame + 1);
	},

	prevframe : function(){
		return this.frame(this._frame === 0 ? this._frames.length-1 : this._frame - 1);
	},

	sequence : function(name, frames){
		this._sequences[name] = frames;
	},

	play : function(sequence, fps, loop, callback){
		if(isString(sequence))
			sequence = this._sequences[sequence];

		if(!sequence)
			sequence = genSequence(this._frames.length);

		if(!fps)
			fps = 60;

		if(typeof loop === 'function'){
			callback = loop;
			loop = true;
		}

		if(loop === undefined)
			loop = true;

		if(callback === undefined)
			callback = emptyFunc;

		var i = 0;
		if(fps < 0){
			i = sequence.length-1;
			this._timer = window.setInterval(function(){
				if(i === 0)
					!loop ? callback.call(this.stop()) : ((i = sequence.length-1), callback.call(this));
				this.frame(sequence[i--]);
			}.bind(this), -fps);
		}
		else {
			this._timer = window.setInterval(function(){
				if(sequence.length === i)
					!loop ? callback.call(this.stop()) : ((i = 0), callback.call(this));
				this.frame(sequence[i++]);
			}.bind(this), fps);
		}
	},

	stop : function(){
		window.clearInterval(this._timer);
		this._timer = null;
		return this;
	},

	toggle : function(){
		if( this._timer === null )
			this.play.apply(this, arguments);
		else
			this.stop();
		return this;
	},

	isPlaying : function(){
		return this._timer !== null;
	},

	_frame : 0
});

ImageAnim.props = [ 'image', 'x', 'y', 'width', 'height', 'crop' ];
ImageAnim.distances = [false, true, true]; // TODO: check on errors! 'auto', 'native' values?

$.ImageAnim = ImageAnim;
// {{don't include sprite.js}}
// {{don't include composites.js}}

//# SVG

// {{don't include svgpath.js}}


//# Utilities

$.app = function(query, width, height){
	return new App( document.querySelector(query), width, height );
};

function App(container, width, height){
	this.layers = [];
	this.container = container;
	this._width  = width;
	this._height = height;
	this.listeners = {};
}

App.prototype = {

	layer: function(index){
		if(index === undefined)
			index = this.layers.length;
		if(!this.layers[index]){
			// create a layer
			var canvas = document.createElement('canvas');
			canvas.width = this._width;
			canvas.height = this._height;

			canvas.style.position = 'absolute';

			canvas.style.zIndex = index;
			this.container.appendChild(canvas);
			return this.layers[index] = new Layer(canvas, this);
		}
		else {
			return this.layers[index];
		}
	},

	on: Context.prototype.on,

	listener: function(event){
		if(this.listeners[event])
			return;

		this.listeners[event] = [];

		var container = this.container;
		container.addEventListener(event, function(e){
			var coords = $.coordsOfElement(this.layers[0].canvas),
				element = null;

			e.contextX = e.clientX - coords.x;
			e.contextY = e.clientY - coords.y;

			for(var l = this.layers.length-1; l+1; l--){
				if(element = this.layers[l].getObjectInPoint(e.contextX, e.contextY))
					break;
			}

			e.targetObject = element;

			if(element && element.fire)
				element.fire(event, e);

			this.fire(event, e);
		}.bind(this));

		switch(event){
			case 'mouseover':
				this.listenerSpecial('mouseover', 'mouseout', 'hover', 'mousemove');
				this.listener('mouseout');
				break;
			case 'mouseout':
				this.listenerSpecial('mouseover', 'mouseout', 'hover', 'mousemove');
				this.listener('mouseover');
				break;
			case 'focus':
				this.listenerSpecial('focus', 'blur', 'focus', 'mousedown');
				break;
		}

		return this.listeners[event];
	},

	listenerSpecial: Context.prototype.listenerSpecial,

	fire: Context.prototype.fire,

	width: function(value){
		if(value === undefined)
			return this.layers[0].canvas.width;
		this.layers.forEach(function(layer){
			layer.canvas.width = value;
			layer.update();
		});
		return this;
	},

	height: function(value){
		if(value === undefined)
			return this.layers[0].canvas.height;
		this.layers.forEach(function(layer){
			layer.canvas.height = value;
			layer.update();
		});
		return this;
	}

};

var Layer = new Class(Context, {

	initialize: function(canvas, app){
		Context.apply(this, arguments);
		this.container = app.container;
		this.app = app;
	},

	listener: function(event){
		return this.app.listener(event);
	},

	listenerSpecial: function(over, out, name, baseevent){
		return this.app.listenerSpecial(over, out, name, baseevent);
	},

	z: function(){
		return Number(this.canvas.style.zIndex);
	},

	isVisible: function(){
		return this.canvas.style.visibility != 'hidden';
	},

	hide: function(){
		this.canvas.style.visibility = 'hidden';
		return this;
	},

	show: function(){
		this.canvas.style.visibility = 'visible';
		return this;
	},

	opacity: function(value){
		if(value === undefined)
			return this.canvas.style.opacity == null ? 1 : this.canvas.style.opacity;
		this.canvas.style.opacity = value;
		return this;
	},

	toDataURL: function(type){
		return this.canvas.toDataURL(type);
	}

});
var elProto = window.Element.prototype,
	prefix,
	funcName = 'requestFullScreen',
	cancName = 'cancelFullScreen',
	eventName = 'fullscreenchange',
	elementName = 'fullScreenElement',
	enabledName = 'fullScreenEnabled';

if('mozRequestFullScreen' in elProto)
	prefix = 'moz';
else if('webkitRequestFullScreen' in elProto)
	prefix = 'webkit';

if(prefix){
	funcName = camelPrefix(prefix, funcName);
	cancName = camelPrefix(prefix, cancName);
	eventName = prefix + eventName;
	elementName = camelPrefix(prefix, elementName);
	enabledName = camelPrefix(prefix, enabledName);
}

Context.prototype.fullscreen = function(resizecanvas){
	if(this.isFullscreen())
		return;

	this.canvas[funcName]();
	if(resizecanvas){
		this.normalState = {
			width: this.canvas.width,
			height: this.canvas.height
		};
		setTimeout(function(){
			this.canvas.width = window.innerWidth;
			this.canvas.height = window.innerHeight;
			this.update();
		}.bind(this), 10);

		this._resizeListener = function(e){
			if(document[elementName] === null){
				document.removeEventListener(eventName, this._resizeListener);
				this.fire('exitfull', e);
				this.canvas.width = this.normalState.width;
				this.canvas.height = this.normalState.height;
				this.normalState = null;
				this._resizeListener = null;
				this.update();
			}
		}.bind(this);
		document.addEventListener(eventName, this._resizeListener);
	}
	else {
		this._resizeListener = function(e){
			if(document[elementName] === null){
				document.removeEventListener(eventName, this._resizeListener);
				this.fire('exitfull', e);
			}
		}.bind(this);
		document.addEventListener(eventName, this._resizeListener);
	}
	this.fire('fullscreen'); // TODO: move this to the listener
};

Context.prototype.isFullscreen = function(){
	return document[elementName] === this.canvas;
};

Context.prototype.exitfull = function(){
	if(!this.isFullscreen())
		return;

	document[cancName]();
	this.fire('exitfull');
	if(this._resizeListener){
		document.removeEventListener(eventName, this._resizeListener);
		this._resizeListener = null;
	}
	if(this.normalState){
		this.canvas.width = this.normalState.width;
		this.canvas.height = this.normalState.height;
		this.normalState = null;
		this.update();
	}
};

function camelPrefix(prefix, name){
	return prefix + name[0].toUpperCase() + name.substr(1);
}

if(!prefix && !('requestFullScreen' in elProto)){
	// Fullscreen API isn't supported.
	Context.prototype.fullscreen = function(){};
	Context.prototype.isFullscreen = function(){};
	Context.prototype.exitfull = function(){};
}
//# Colors

var _color = $.color;
$.color = function(color, from, to){

	if(arguments.length === 1)
		return _color(color);

	if(!(from in $.colorSpaces) || !(to in $.colorSpaces)){
		throw 'Unknown colorspace (given: ' + from + ', ' + to + ')';
	}

	return $.colorSpaces[to].to( $.colorSpaces[from].from(color) );

}

$.colorSpaces = {
	cmy: {
		from: function(c, m, y){
			return {
				r: (100 - c) * 2.55,
				g: (100 - m) * 2.55,
				b: (100 - y) * 2.55
			};
		},
		to: function(r, g, b){
			return {
				c: (255 - r) / 2.55,
				m: (255 - g) / 2.55,
				y: (255 - b) / 2.55
			};
		},
		max: 100,
		min: 0,
		round: true
	},

	hsl: {
		from: function(h, s, l){

			function hue2rgb(v1, v2, vh){
				if( vh < 0 )
					vh += 1;
				else if( vh > 1 )
					vh -= 1;

				if( (6 * vh) < 1 )
					return v1 + (v2 - v1) * 6 * vh;
				if( (2 * vh) < 1 )
					return v2;
				if( (3 * vh) < 2 )
					return v1 + (v2 - v1) * ( 2/3 - vh ) * 6;
				return v1;
			}

			var v1, v2;
			if( s === 0 ){
				return {
					r: l * 255,
					g: l * 255,
					b: l * 255
				};
			}
			else {
				if( l < 0.5 )
					v2 = l * (1 + s);
				else
					v2 = (l + s) - (s * l);

				v1 = 2 * l - v2;

				return {
					r: 255 * hue2rgb( v1, v2, h + 1/3 ),
					g: 255 * hue2rgb( v1, v2, h ),
					b: 255 * hue2rgb( v1, v2, h - 1/3 )
				};
			}
		},
		to: function(r, g, b){
			r /= 255;
			g /= 255;
			b /= 255;

			var min = Math.min(r, g, b),
				max = Math.max(r, g, b),
				delta = max - min,
				l = (max + min) / 2,
				h, s,
				dr, dg, db;

			if( delta === 0 ){
				return {
					h: 0,
					s: 0,
					l: l * 100
				};
			}
			else {
				if( l < 0.5 )
					s = delta / (max + min);
				else
					s = delta / (2 - max - min);

				dr = (((max - r) / 6) + (delta / 2)) / delta;
				dg = (((max - g) / 6) + (delta / 2)) / delta;
				db = (((max - b) / 6) + (delta / 2)) / delta;

				if( r === max )
					h = db - dg;
				else if( g === max )
					h = 1/3 + dr - db;
				else if( b === max )
					h = 2/3 + dg - dr;

				if( h < 0 )
					h += 1;
				else if( h > 1 )
					h -= 1;
			}
			return {
				h: h * 360,
				s: s * 100,
				l: l * 100
			};
		},
		round: true,
		period: [360, 0, 0]
	},

	xyz: {
		from: function(x, y, z){
			x /= 100;
			y /= 100;
			z /= 100;

			var r =  x * 3.2406 - y * 1.5372 - z * 0.4986,
				g = -x * 0.9689 + y * 1.8758 + z * 0.0415,
				b =  x * 0.0557 - y * 0.2040 + z * 1.0570;

			if( r > 0.0031308 )
				r = 1.055 * (r ^ (1 / 2.4)) - 0.055;
			else
				r *= 12.92;

			if( g > 0.0031308 )
				g = 1.055 * (g ^ (1 / 2.4)) - 0.055;
			else
				g *= 12.92;

			if( b > 0.0031308 )
				b = 1.055 * (b ^ (1 / 2.4)) - 0.055;
			else
				b *= 12.92;

			return {
				r: r * 255,
				g: g * 255,
				b: b * 255
			}
		}
	}
};
// {{don't include layers.js}}
// {{don't include particles.js}}
// {{don't include camera.js}}
// {{don't include events_keyboard.js}}

})( typeof window !== 'undefined' ? window : this, Graphics2D );