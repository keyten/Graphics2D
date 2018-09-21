// todo: redefine Path.draw for passing current last coordinates into process function
// or add this into Core Path
// smth like curve.__lastCoordinates = [...]
// or
// this.__lastCoordinates = [...]
// and in curve:
// this.path.__lastCoordinates[0] + this.x...

// SVG Curves
extend(Delta.curves, {
	// todo: add everywhere pointAt and etc
	// they should be possible to animate

	moveBy: new Class(Curve, {
		process: function(ctx){
			var lastPoint = this.startAt();
			ctx.moveTo(lastPoint[0] + this.attrs.args[0], lastPoint[1] + this.attrs.args[1]);
		},

		endAt: function(){
			var lastPoint = this.startAt();
			return [lastPoint[0] + this.attrs.args[0], lastPoint[1] + this.attrs.args[1]];
		},

		pointAt: function(){
			return this.endAt();
		}
	}),

	lineBy: new Class(Curve, {
		process: function(ctx){
			var lastPoint = this.startAt();
			ctx.lineTo(lastPoint[0] + this.attrs.args[0], lastPoint[1] + this.attrs.args[1]);
		},

		endAt: function(){
			var lastPoint = this.startAt();
			return [lastPoint[0] + this.attrs.args[0], lastPoint[1] + this.attrs.args[1]];
		},

		pointAt: function(t, start){
			;
		}
	}),

	horizontalLineTo: new Class(Curve, {
		process: function(ctx){
			var lastPoint = this.startAt();
			ctx.lineTo(this.attrs.args[0], lastPoint[1]);
		},

		endAt: function(){
			var lastPoint = this.startAt();
			return [this.attrs.args[0], lastPoint[1]];
		}
	}),

	horizontalLineBy: new Class(Curve, {
		process: function(ctx){
			var lastPoint = this.startAt();
			ctx.lineTo(lastPoint[0] + this.attrs.args[0], lastPoint[1]);
		},

		endAt: function(){
			var lastPoint = this.startAt();
			return [lastPoint[0] + this.attrs.args[0], lastPoint[1]];
		}
	}),

	verticalLineTo: new Class(Curve, {
		process: function(ctx){
			var lastPoint = this.startAt();
			ctx.lineTo(lastPoint[0], this.attrs.args[0]);
		},

		endAt: function(){
			var lastPoint = this.startAt();
			return [lastPoint[0], this.attrs.args[0]];
		}
	}),

	verticalLineBy: new Class(Curve, {
		process: function(ctx){
			var lastPoint = this.startAt();
			ctx.lineTo(lastPoint[0], lastPoint[1] + this.attrs.args[0]);
		},

		endAt: function(){
			var lastPoint = this.startAt();
			return [lastPoint[0], lastPoint[1] + this.attrs.args[0]];
		}
	}),

	quadraticCurveBy: new Class(Curve, {
		getQuadraticParameters: function(){
			var lastPoint = this.startAt();
			return [
				lastPoint[0] + this.attrs.args[0],
				lastPoint[1] + this.attrs.args[1],
				lastPoint[0] + this.attrs.args[2],
				lastPoint[1] + this.attrs.args[3]
			];
		},

		process: function(ctx){
			var p = this.getQuadraticParameters();
			ctx.quadraticCurveTo(p[0], p[1], p[2], p[3]);
		},

		endAt: function(){
			var p = this.getQuadraticParameters();
			return [p[2], p[3]];
		}
	}),

	shorthandQuadraticCurveTo: new Class(Curve, {
		getQuadraticParameters: function(){
			var lastCurve = this.prev();
			var lastPoint = lastCurve.endAt();
			var tangentDelta;

			if(lastCurve.method === 'quadraticCurveTo'){
				lastCurve = lastCurve.attrs.args;
			} else if(lastCurve.getQuadraticParameters){
				lastCurve = lastCurve.getQuadraticParameters();
			} else {
				lastCurve = null;
			}

			if(lastCurve){
				tangentDelta = [
					lastCurve[2] - lastCurve[0],
					lastCurve[3] - lastCurve[1],
				];
			} else {
				tangentDelta = [0, 0];
			}

			return [
				lastPoint[0] + tangentDelta[0],
				lastPoint[1] + tangentDelta[1],
				this.attrs.args[0],
				this.attrs.args[1],
			];
		},

		process: function(ctx){
			var p = this.getQuadraticParameters();
			ctx.quadraticCurveTo(p[0], p[1], p[2], p[3]);
		},

		endAt: function(){
			var p = this.getQuadraticParameters();
			return [p[2], p[3]];
		}
	}),

	shorthandQuadraticCurveBy: new Class(Curve, {
		getQuadraticParameters: function(){
			var lastCurve = this.prev();
			var lastPoint = lastCurve.endAt();
			var tangentDelta;

			if(lastCurve.method === 'quadraticCurveTo'){
				lastCurve = lastCurve.attrs.args;
			} else if(lastCurve.getQuadraticParameters){
				lastCurve = lastCurve.getQuadraticParameters();
			} else {
				lastCurve = null;
			}

			if(lastCurve){
				tangentDelta = [
					lastCurve[2] - lastCurve[0],
					lastCurve[3] - lastCurve[1],
				];
			} else {
				tangentDelta = [0, 0];
			}

			return [
				lastPoint[0] + tangentDelta[0],
				lastPoint[1] + tangentDelta[1],
				lastPoint[0] + this.attrs.args[0],
				lastPoint[1] + this.attrs.args[1],
			];
		},

		process: function(ctx){
			var p = this.getQuadraticParameters();
			ctx.quadraticCurveTo(p[0], p[1], p[2], p[3]);
		},

		endAt: function(){
			var p = this.getQuadraticParameters();
			return [p[2], p[3]];
		}
	}),

	bezierCurveBy: new Class(Curve, {
		getBezierParameters: function(){
			var lastPoint = this.startAt();
			return [
				lastPoint[0] + this.attrs.args[0],
				lastPoint[1] + this.attrs.args[1],
				lastPoint[0] + this.attrs.args[2],
				lastPoint[1] + this.attrs.args[3],
				lastPoint[0] + this.attrs.args[4],
				lastPoint[1] + this.attrs.args[5]
			];
		},

		process: function(ctx){
			var p = this.getBezierParameters();
			ctx.bezierCurveTo(p[0], p[1], p[2], p[3], p[4], p[5]);
		},

		endAt: function(){
			var p = this.getBezierParameters();
			return [p[4], p[5]];
		}
	}),

	shorthandCurveTo: new Class(Curve, {
		getBezierParameters: function(){
			var lastCurve = this.prev();
			var lastPoint = lastCurve.endAt();
			var tangentDelta;
			// add quadratic support?

			// possibly this will work will all the functions which can be approximated as bezier
			if(lastCurve.getBezierParameters){
				lastCurve = lastCurve.getBezierParameters();
			} else if(lastCurve.method === 'bezierCurveTo'){
				lastCurve = lastCurve.attrs.args;
			} else {
				lastCurve = null;
			}

			if(lastCurve){
				tangentDelta = [
					lastCurve[4] - lastCurve[2],
					lastCurve[5] - lastCurve[3]
				];
			} else {
				tangentDelta = [0, 0];
			}

			return [
				lastPoint[0] + tangentDelta[0],
				lastPoint[1] + tangentDelta[1],
				this.attrs.args[0],
				this.attrs.args[1],
				this.attrs.args[2],
				this.attrs.args[3],
			];
		},

		process: function(ctx){
			var p = this.getBezierParameters();
			ctx.bezierCurveTo(p[0], p[1], p[2], p[3], p[4], p[5]);
		},

		endAt: function(){
			var p = this.getBezierParameters();
			return [p[4], p[5]];
		}
	}),

	shorthandCurveBy: new Class(Curve, {
		getBezierParameters: function(){
			var lastCurve = this.prev();
			var lastPoint = lastCurve.endAt();
			var tangentDelta;
			if(lastCurve.getBezierParameters){
				lastCurve = lastCurve.getBezierParameters();
			} else if(lastCurve.method === 'bezierCurveTo'){
				lastCurve = lastCurve.attrs.args;
			} else {
				lastCurve = null;
			}

			if(lastCurve){
				tangentDelta = [
					lastCurve[4] - lastCurve[2],
					lastCurve[5] - lastCurve[3]
				];
			} else {
				tangentDelta = [0, 0];
			}

			return [
				lastPoint[0] + tangentDelta[0],
				lastPoint[1] + tangentDelta[1],
				lastPoint[0] + this.attrs.args[0],
				lastPoint[1] + this.attrs.args[1],
				lastPoint[0] + this.attrs.args[2],
				lastPoint[1] + this.attrs.args[3],
			];
		},

		process: function(ctx){
			var p = this.getBezierParameters();
			ctx.bezierCurveTo(p[0], p[1], p[2], p[3], p[4], p[5]);
		},

		endAt: function(){
			var p = this.getBezierParameters();
			return [p[4], p[5]];
		}
	}),

	ellipticalArcTo: new Class(Curve, {
		process: function(ctx){
			// rx, ry x-axis-rotation large-arc-flag, sweep-flag, x,y
			var rx = this.attrs.args[0],
				ry = this.attrs.args[1],
				rot = this.attrs.args[2],
				large = this.attrs.args[3] === 1,
				sweep = this.attrs.args[4] === 1,
				x = this.attrs.args[5],
				y = this.attrs.args[6],

				start = this.startAt();

			var segs = arcToSegments(x, y, rx, ry, large, sweep, rot, start[0], start[1]);
			segs.forEach(function(segment){
				segment = segmentToBezier.apply(this, segment);
				ctx.bezierCurveTo.apply(ctx, segment);
			});

			// from cakejs from inkscape svgtopdf
			function arcToSegments(x, y, rx, ry, large, sweep, th, ox, oy) {
				th = th * (Math.PI/180)
				var sin_th = Math.sin(th)
				var cos_th = Math.cos(th)
				rx = Math.abs(rx)
				ry = Math.abs(ry)
				var px = cos_th * (ox - x) * 0.5 + sin_th * (oy - y) * 0.5
				var py = cos_th * (oy - y) * 0.5 - sin_th * (ox - x) * 0.5
				var pl = (px*px) / (rx*rx) + (py*py) / (ry*ry)
				if (pl > 1) {
				  pl = Math.sqrt(pl)
				  rx *= pl
				  ry *= pl
				}

				var a00 = cos_th / rx
				var a01 = sin_th / rx
				var a10 = (-sin_th) / ry
				var a11 = (cos_th) / ry
				var x0 = a00 * ox + a01 * oy
				var y0 = a10 * ox + a11 * oy
				var x1 = a00 * x + a01 * y
				var y1 = a10 * x + a11 * y

				var d = (x1-x0) * (x1-x0) + (y1-y0) * (y1-y0)
				var sfactor_sq = 1 / d - 0.25
				if (sfactor_sq < 0) sfactor_sq = 0
				var sfactor = Math.sqrt(sfactor_sq)
				if (sweep == large) sfactor = -sfactor
				var xc = 0.5 * (x0 + x1) - sfactor * (y1-y0)
				var yc = 0.5 * (y0 + y1) + sfactor * (x1-x0)

				var th0 = Math.atan2(y0-yc, x0-xc)
				var th1 = Math.atan2(y1-yc, x1-xc)

				var th_arc = th1-th0
				if (th_arc < 0 && sweep == 1){
				  th_arc += 2*Math.PI
				} else if (th_arc > 0 && sweep == 0) {
				  th_arc -= 2 * Math.PI
				}

				var segments = Math.ceil(Math.abs(th_arc / (Math.PI * 0.5 + 0.001)))
				var result = []
				for (var i=0; i<segments; i++) {
				  var th2 = th0 + i * th_arc / segments
				  var th3 = th0 + (i+1) * th_arc / segments
				  result[i] = [xc, yc, th2, th3, rx, ry, sin_th, cos_th]
				}

				return result
			}

			function segmentToBezier(cx, cy, th0, th1, rx, ry, sin_th, cos_th) {
				var a00 = cos_th * rx
				var a01 = -sin_th * ry
				var a10 = sin_th * rx
				var a11 = cos_th * ry

				var th_half = 0.5 * (th1 - th0)
				var t = (8/3) * Math.sin(th_half * 0.5) * Math.sin(th_half * 0.5) / Math.sin(th_half)
				var x1 = cx + Math.cos(th0) - t * Math.sin(th0)
				var y1 = cy + Math.sin(th0) + t * Math.cos(th0)
				var x3 = cx + Math.cos(th1)
				var y3 = cy + Math.sin(th1)
				var x2 = x3 + t * Math.sin(th1)
				var y2 = y3 - t * Math.cos(th1)
				return [
				  a00 * x1 + a01 * y1,      a10 * x1 + a11 * y1,
				  a00 * x2 + a01 * y2,      a10 * x2 + a11 * y2,
				  a00 * x3 + a01 * y3,      a10 * x3 + a11 * y3
				];
			}
		},

		endAt: function(){
			return [
				this.attrs.args[5],
				this.attrs.args[6]
			];
		}
	})
});

// SVG Parsing
Delta.SVGCurves = {
	M: 'moveTo',
	m: 'moveBy',
	L: 'lineTo',
	l: 'lineBy',
	H: 'horizontalLineTo',
	h: 'horizontalLineBy',
	V: 'verticalLineTo',
	v: 'verticalLineBy',
	C: 'bezierCurveTo',
	c: 'bezierCurveBy',
	S: 'shorthandCurveTo',
	s: 'shorthandCurveBy',
	Q: 'quadraticCurveTo',
	q: 'quadraticCurveBy',
	T: 'shorthandQuadraticCurveTo',
	t: 'shorthandQuadraticCurveBy',
	A: 'ellipticalArcTo',
	a: 'ellipticalArcBy',
	Z: 'closePath',
	z: 'closePath'
};

Delta.SVGCurvesLengths = {
	M: 2,
	m: 2,
	L: 2,
	l: 2,
	H: 1,
	h: 1,
	V: 1,
	v: 1,
	C: 6,
	c: 6,
	S: 4,
	s: 4,
	Q: 4,
	q: 4,
	T: 2,
	t: 2,
	A: 7,
	a: 7,
	Z: 0,
	z: 0
};

var pathParseOld = Path.parse;
Path.parse = function(data, path, firstIsNotMove){
	if(data + '' !== data){
		return pathParseOld(data, path, firstIsNotMove);
	}

	var result = [];
	data.match(/[a-zA-Z](\s*-?\d+\,?|\s*-?\d*\.\d+\,?)*/g).forEach(function(curve, index){
		var command = curve[0];
		if(!Delta.SVGCurves[command]){
			throw 'Unknown SVG curve command "' + command + '"';
		}

		// replacing anything like .7.8 to .7,.8
		curve = curve.replace(/(\.\d+)\./g, '$1,.');

		var args = curve.match(/-?\d+?\.\d+|-?\d+/g);
		if(args){
			args = args.map(Number);
		} else {
			args = [];
		}

		var len = Delta.SVGCurvesLengths[command];
		while(args.length > len){
			result.push(
				Delta.curve(Delta.SVGCurves[command], args.slice(0, len), path)
			);

			args = args.slice(len);
		}
		result.push(
			Delta.curve(Delta.SVGCurves[command], args, path)
		);
	});
	return result;
};

Object.keys(Delta.SVGCurves).forEach(function(key){
	var name = Delta.SVGCurves[key];
	if(!Path.prototype[name]){
		Path.prototype[name] = function(){
			return this.push(name, Array.prototype.slice.call(arguments), this);
		};
	}
});
