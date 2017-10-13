Curve.epsilon = 0.0001;
Curve.detail = 10;

// General Curve methods
extend(Curve.prototype, {
	tangentAt: function(t, epsilon, startPoint){
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

	// работает весьма плохо, нужно поотлаживать
	// переопределяет внутренний у curve, когда это не нужно
	// нужно сделать точные у всех родных
	bounds: function(startPoint, detail){
		if(!startPoint){
			startPoint = this.startAt();
		}

		if(Curve.canvasFunctions[this.method].bounds){
			return Curve.canvasFunctions[this.method].bounds(startPoint, this.attrs.args);
		}

		if(!detail){
			detail = Curve.detail;
		}

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

// LineTo
extend(Curve.canvasFunctions.quadraticCurveTo, {
	bounds: function(startPoint, attrs){
		// note: doesn't work right
		var x0 = startPoint[0],
			y0 = startPoint[1],
			x1 = attrs[0],
			y1 = attrs[1],
			x2 = attrs[2],
			y2 = attrs[3];

		var tx = (x0 - x1 / 2) / (x0 - x1 + x2);
		var ty = (y0 - y1 / 2) / (y0 - y1 + y2);

		var x;
		var y;
		if(tx >= 0 && tx <= 1){
			x = Math.pow(1 - tx, 2) * x0 + (1 - tx) * tx * x1 + tx * tx * x2;;
		}
		if(ty >= 0 && ty <= 1){
			y = Math.pow(1 - ty, 2) * y0 + (1 - ty) * ty * y1 + ty * ty * y2;
		}

		var minX = Math.min(startPoint[0], attrs[2], x === undefined ? Infinity : x);
		var minY = Math.min(startPoint[1], attrs[3], y === undefined ? Infinity : y);
		var maxX = Math.max(startPoint[0], attrs[2], x === undefined ? -Infinity : x);
		var maxY = Math.max(startPoint[1], attrs[3], y === undefined ? -Infinity : y);
		return [minX, minY, maxX, maxY];
	}
});