Curve.epsilon = 0.0001;
Curve.detail = 10;

// Curve utilities
extend(Curve.prototype, {
	before: function(){
		if(!this.path){
			return null;
		}

		var d = this.path.attr('d');
		var index = d.indexOf(this);

		if(index < 1){
			return null;
		}
		return d[index - 1];
	}
});

// General Curve methods
extend(Curve.prototype, {
	tangentAt: function(t, epsilon, startPoint){
		// supports canvas curves
		if(Curve.canvasFunctions[this.method] && Curve.canvasFunctions[this.method].tangentAt){
			return Curve.canvasFunctions[this.method].tangentAt(this, startPoint);
		}

		if(!epsilon){
			epsilon = Curve.epsilon;
		}

		var t1 = t - epsilon,
			t2 = t + epsilon;

		if(t1 < 0){
			t1 = 0;
		}
		if(t2 > 1){
			t2 = 1;
		}

		var point1 = this.pointAt(t1, startPoint),
			point2 = this.pointAt(t2, startPoint);

		return Math.atan2(point2[1] - point1[1], point2[0] - point1[0]) * 180 / Math.PI;
	},

	normalAt: function(t, epsilon, startPoint){
		return this.tangentAt(t, epsilon, startPoint) - 90;
	},

	flatten: function(detail, startPoint){
		// превратить кривую в кучу прямых
		// todo: запилить также атрибут flatten, который не превращает в прямые, но меняет отрисовку
	},

	// like reduce
	// todo: check if this function neccessary
	approx: function(detail, func, value){
		var startPoint = this.startAt();
		var lastPoint = startPoint;
		for(var i = 1; i <= detail; i++){
			value = func(value, lastPoint, lastPoint = this.pointAt(i / detail, startPoint), i);
		}
		return value;
	},

	length: function(detail, startPoint){
		// supports canvas curves
		if(Curve.canvasFunctions[this.method] && Curve.canvasFunctions[this.method].length){
			return Curve.canvasFunctions[this.method].length(this, startPoint);
		}

		if(!detail){
			detail = Curve.detail;
		}

		var length = 0,
			lastPoint = startPoint || this.startAt(),
			point;
		for(var i = 1; i <= detail; i++){
			point = this.pointAt(i / detail);
			length += Math.sqrt(Math.pow(point[1] - lastPoint[1], 2) + Math.pow(point[0] - lastPoint[0], 2));
			lastPoint = point;
		}
		return length;
	},

	nearest: function(x, y, detail, startPoint){
		// supports canvas curves
		if(Curve.canvasFunctions[this.method] && Curve.canvasFunctions[this.method].nearest){
			return Curve.canvasFunctions[this.method].nearest(this, startPoint);
		}

		if(!detail){
			detail = Curve.detail;
		}

		if(!startPoint){
			startPoint = this.startAt();
		}

		// todo: gradient descent
		var point,
			min = Infinity,
			minPoint,
			minI,
			distance;
		for(var i = 0; i <= detail; i++){
			point = this.pointAt(i / detail, startPoint);
			distance = Math.sqrt(Math.pow(point[0] - x, 2) + Math.pow(point[1] - y, 2));
			if(distance < min){
				minPoint = point;
				minI = i;
				min = distance;
			}
		}

		return {
			point: minPoint,
			t: minI / detail,
			distance: min
		};
	},

	bounds: function(startPoint, detail){
		if(!startPoint){
			startPoint = this.startAt();
		}

		// supports canvas curves
		if(Curve.canvasFunctions[this.method].bounds){
			return Curve.canvasFunctions[this.method].bounds(startPoint, this.attrs.args);
		}

		if(!detail){
			detail = Curve.detail;
		}

		// todo: how about binary search?

		var point,

			minX = Infinity,
			minY = Infinity,
			maxX = -Infinity,
			maxY = -Infinity;

		for(var t = 0; t <= detail; t++){
			point = this.pointAt(t / detail, startPoint);
			if(minX > point[0]){
				minX = point[0];
			}
			if(minY > point[1]){
				minY = point[1];
			}
			if(maxX < point[0]){
				maxX = point[0];
			}
			if(maxY < point[1]){
				maxY = point[1];
			}
		}

		return [minX, minY, maxX, maxY];
	},

	intersections: function(curve){
		;
	}
});

// Canvas Curve methods
extend(Curve.prototype, {
	pointAt: function(t, startPoint){
		var fn = Curve.canvasFunctions[this.method];

		if(fn && fn.pointAt){
			return fn.pointAt(this, t, startPoint);
		}

		throw "The method \"pointAt\" is not supported for \"" + this.method + "\" curves";
	},

	splitAt: function(t, startPoint){
		var fn = Curve.canvasFunctions[this.method];

		if(fn && fn.splitAt){
			return fn.splitAt(this, t, startPoint);
		}

		throw "The method \"splitAt\" is not supported for \"" + this.method + "\" curves";
	}
});

// MoveTo
extend(Curve.canvasFunctions.moveTo, {
	pointAt: function(curve, t, startPoint){
		return curve.attrs.args;
	},

	length: function(){
		return 0;
	}
});

// LineTo
extend(Curve.canvasFunctions.lineTo, {
	pointAt: function(curve, t, startPoint){
		if(!startPoint){
			startPoint = curve.startAt();
		}
		return [
			startPoint[0] + t * (curve.attrs.args[0] - startPoint[0]),
			startPoint[1] + t * (curve.attrs.args[1] - startPoint[1]),
		];
	},

	tangentAt: function(curve){},

	splitAt: function(curve, t, startPoint){
		if(!startPoint){
			startPoint = curve.startAt();
		}

		var point = Curve.canvasFunctions.lineTo.pointAt(curve, t, startPoint);
		return {
			start: [
				startPoint,
				point
			],
			end: [
				point,
				[curve.attrs.args[0], curve.attrs.args[1]]
			]
		};
	},

	length: function(curve, startPoint){
		if(!startPoint){
			startPoint = curve.startAt();
		}

		var dx = curve.attrs.args[0] - startPoint[0],
			dy = curve.attrs.args[1] - startPoint[1];

		return Math.sqrt(dx * dx + dy * dy);
	}
});

// QuadraticCurveTo
extend(Curve.canvasFunctions.quadraticCurveTo, {
	pointAt: function(){},
	tangentAt: function(){},
	splitAt: function(){},

	length: function(curve, startPoint){
		if(!startPoint){
			startPoint = curve.startAt();
		}

		var x0 = startPoint[0],
			y0 = startPoint[1],
			x1 = curve.attrs.args[0],
			y1 = curve.attrs.args[1],
			x2 = curve.attrs.args[2],
			y2 = curve.attrs.args[3],

			dx0 = x1 - x0,
			dy0 = y1 - y0,
			dx1 = x2 - x1,
			dy1 = y2 - y1,

			A = Math.pow(dx0 - dx1, 2) + Math.pow(dy0 - dy1, 2),
			B = 2 * (dx0 * (dx1 - dx0) + dy0 * (dy1 - dy0)),
			C = dx0 * dx0 + dy0 * dy0;

		// 2 * Int( sqrt(C + tB + t^2 A) dt )

// A is zero if and only if the len is zero
// so check before integrating

		function integral(t){
		console.log( 2 * A * t + B );

			return ((2 * A * t + B) * Math.sqrt(t * (A * t + B) + C)) /
					(4 * A) -
				((B * B - 4 * A * C) * Math.log(2 * Math.sqrt(A) * Math.sqrt(t * (A * t + B) + C) + 2 * A * t + B)) / (8 * Math.pow(A, 3/2))
		}

		return integral(1) - integral(0);
	},

	bounds: function(startPoint, attrs){
		var x0 = startPoint[0],
			y0 = startPoint[1],
			hx = attrs[0],
			hy = attrs[1],
			x2 = attrs[2],
			y2 = attrs[3],
			tx = (x0 - hx) / (x2 - 2 * hx + x0),
			ty = (y0 - hy) / (y2 - 2 * hy + y0),
			extrX, extrY;

		if(tx >= 0 && tx <= 1){
			extrX = [
				Math.pow(1 - tx, 2) * x0 + 2 * (1 - tx) * tx * hx + tx * tx * x2,
				Math.pow(1 - tx, 2) * y0 + 2 * (1 - tx) * tx * hy + tx * tx * y2
			];
		}

		if(ty >= 0 && ty <= 1){
			extrY = [
				Math.pow(1 - ty, 2) * x0 + 2 * (1 - ty) * ty * hx + ty * ty * x2,
				Math.pow(1 - ty, 2) * y0 + 2 * (1 - ty) * ty * hy + ty * ty * y2
			];
		}

		return [
			Math.min(x0, x2, extrX ? extrX[0] : Infinity, extrY ? extrY[0] : Infinity),
			Math.min(y0, y2, extrX ? extrX[1] : Infinity, extrY ? extrY[1] : Infinity),
			Math.max(x0, x2, extrX ? extrX[0] : -Infinity, extrY ? extrY[0] : -Infinity),
			Math.max(y0, y2, extrX ? extrX[1] : -Infinity, extrY ? extrY[1] : -Infinity)
		];
	}
});

// BezierCurveTo
extend(Curve.canvasFunctions.bezierCurveTo, {
	bounds: function(startPoint, attrs){
		var x0 = startPoint[0],
			y0 = startPoint[1],
			x1 = attrs[0],
			y1 = attrs[1],
			x2 = attrs[2],
			y2 = attrs[3],
			x3 = attrs[4],
			y3 = attrs[5],

			ax = 3 * (-x0 + 3 * x1 - 3 * x2 + x3),
			ay = 3 * (-y0 + 3 * y1 - 3 * y2 + y3),
			bx = 6 * (x0 - 2 * x1 + x2),
			by = 6 * (y0 - 2 * y1 + y2),
			cx = 3 * (x1 - x0),
			cy = 3 * (y1 - y0),

			dxrt = Math.sqrt(bx * bx - 4 * ax * cx),
			dyrt = Math.sqrt(by * by - 4 * ay * cy),

			extrX1, extrX2, extrY1, extrY2;

		function bezierPoint(t){
			return t >= 0 && t <= 1 && [
				Math.pow(1 - t, 3) * x0 + 3 * Math.pow(1 - t, 2) * t * x1 + 3 * (1 - t) * t * t * x2 + t * t * t * x3,
				Math.pow(1 - t, 3) * y0 + 3 * Math.pow(1 - t, 2) * t * y1 + 3 * (1 - t) * t * t * y2 + t * t * t * y3
			];
		}

		extrX1 = bezierPoint((-bx + dxrt) / (2 * ax));
		extrX2 = bezierPoint((-bx - dxrt) / (2 * ax));
		extrY1 = bezierPoint((-by + dyrt) / (2 * ay));
		extrY2 = bezierPoint((-by - dyrt) / (2 * ay));

		return [
			Math.min(x0, x3, extrX1 ? extrX1[0] : Infinity, extrX2 ? extrX2[0] : Infinity,
				extrY1 ? extrY1[0] : Infinity, extrY2 ? extrY2[0] : Infinity),
			Math.min(y0, y3, extrX1 ? extrX1[1] : Infinity, extrX2 ? extrX2[1] : Infinity,
				extrY1 ? extrY1[1] : Infinity, extrY2 ? extrY2[1] : Infinity),
			Math.max(x0, x3, extrX1 ? extrX1[0] : -Infinity, extrX2 ? extrX2[0] : -Infinity,
				extrY1 ? extrY1[0] : -Infinity, extrY2 ? extrY2[0] : -Infinity),
			Math.max(y0, y3, extrX1 ? extrX1[1] : -Infinity, extrX2 ? extrX2[1] : -Infinity,
				extrY1 ? extrY1[1] : -Infinity, extrY2 ? extrY2[1] : -Infinity)
		];
	}
});