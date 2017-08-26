Curve.epsilon = 0.0001;
Curve.detail = 10;

extend(Curve.prototype, {

	// For canvas curves
	// (should be redefined in other curves)
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
	},

	// For any curves
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

	approx: function(detail, func, value){
		// todo: cache startPoint
		var startPoint = this.startAt();
		var lastPoint = startPoint;
		for(var i = 1; i <= detail; i++){
			value = func(value, lastPoint, lastPoint = this.pointAt(i / detail, startPoint), i);
		}
		return value;
	},

	length: function(detail){
		if(!detail){
			detail = Curve.detail;
		}

		var length = 0,
			lastPoint = this.pointAt(0),
			point;
		for(var i = 1; i <= detail; i++){
			point = this.pointAt(i / detail);
			length += Math.sqrt(Math.pow(point[1] - lastPoint[1], 2) + Math.pow(point[0] - lastPoint[0], 2));
			lastPoint = point;
		}
		return length;
	},

	nearest: function(x, y, detail){
		if(!detail){
			detail = Curve.detail;
		}

		// todo: gradient descent
		var point,
			min = Infinity,
			minPoint,
			minI,
			distance;
		for(var i = 0; i <= detail; i++){
			point = this.pointAt(i / detail);
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
	bounds: function(startPoint, detail){
		if(!startPoint){
			startPoint = this.startAt();
		}

		if(!detail){
			detail = Curve.detail;
		}

		var minX = Infinity,
			minY = Infinity,
			maxX = -Infinity,
			maxY = -Infinity,
			point;

		for(var t = 0; t <= detail; t++){
			point = this.pointAt(t / detail, startPoint);
			minX = Math.min(minX, point[0]);
			minY = Math.min(minY, point[1]);
			maxX = Math.max(maxX, point[0]);
			maxY = Math.max(maxY, point[1]);
		}

		return [minX, minY, maxX, maxY];
	},

	intersections: function(curve){
		;
	}

});

// Lines
Curve.canvasFunctions.moveTo.pointAt = function(curve, t, startPoint){
	return curve.funcAttrs;
};

// todo: attrs instead of curve?
Curve.canvasFunctions.lineTo.pointAt = function(curve, t, startPoint){
	if(!startPoint){
		startPoint = curve.startAt();
	}
	return [
		startPoint[0] + t * (curve.funcAttrs[0] - startPoint[0]),
		startPoint[1] + t * (curve.funcAttrs[1] - startPoint[1]),
	];
};

Curve.canvasFunctions.lineTo.splitAt = function(curve, t, startPoint){
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
			[curve.funcAttrs[0], curve.funcAttrs[1]]
		]
	};
};
