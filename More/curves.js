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