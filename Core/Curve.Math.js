Curve.epsilon = 0.0001;
Curve.detail = 10;
		// слишком многословно
		// надо сделать во всём модуле локальную переменную для canvasFunctions
		// а мб и для отдельных её элементов

// Curve utilities
extend(Curve.prototype, {
	// renamed from before
	prev: function(){
		if(!this.path){
			return null;
		}

		var d = this.path.attr('d');
		var index = d.indexOf(this);

		if(index < 1){
			return null;
		}
		return d[index - 1];
	},

	next: function(){
		if(!this.path){
			return null;
		}

		var d = this.path.attr('d');
		var index = d.indexOf(this);

		if(index === d.length - 2){
			return null;
		}
		return d[index + 1];
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

	flatten: function(detail, start){
		if(!start){
			start = this.startAt();
		}

		var lines = [];

		for(var i = 1; i <= detail; i++){
			lines.push(
				Delta.curve('lineTo', this.pointAt(i / detail, start), this.path)
			);
		}

		var curves = this.path.attr('d');
		curves.splice.apply(curves, [curves.indexOf(this), 1].concat(lines));
		this.path.attr('d', curves);
		return this;
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

		// http://pomax.github.io/bezierinfo/legendre-gauss.html#n2
		var lengthIntegrate = this.lengthIntegrate || (Curve.canvasFunctions[this.method] && Curve.canvasFunctions[this.method].lengthIntegrate);
		if(lengthIntegrate){
			// We use legendre-gauss approximation
			return integrate(lengthIntegrate, 0, 1, detail);
		} else {
			// We just approximate the curve with lines
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

	tangentAt: function(curve, startPoint){
		if(!startPoint){
			startPoint = curve.startAt();
		}
		// x = x0 + (x1 - x0)t
		// y = y0 + (y1 - y0)t
		return Math.atan2(curve.attrs.args[1] - startPoint[1], curve.attrs.args[0] - startPoint[0]) / Math.PI * 180;
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

// QuadraticCurveTo
extend(Curve.canvasFunctions.quadraticCurveTo, {
	pointAt: function(curve, t, startPoint){
		if(!startPoint){
			startPoint = curve.startAt();
		}
		var i = 1 - t;
		return [
			i * i * startPoint[0] + 2 * t * i * curve.attrs.args[0] + t * t * curve.attrs.args[2],
			i * i * startPoint[1] + 2 * t * i * curve.attrs.args[1] + t * t * curve.attrs.args[3],
		];
	},

	tangentAt: function(curve, startPoint){
		if(!startPoint){
			startPoint = curve.startAt();
		}
	},

	splitAt: function(curve, t, startPoint){
		if(!startPoint){
			startPoint = curve.startAt();
		}

		var i = 1 - t;
		var point = Curve.canvasFunctions.quadraticCurveTo.pointAt(curve, t, startPoint);
		return {
			start: [
				startPoint,
				[
					t * p[0] + i * startPoint[0],
					t * p[1] + i * startPoint[1]
				],
				point
			],
			end: [
				point,
				[
					t * p[2] + i * p[0],
					t * p[3] + i * p[1]
				],
				[
					p[2],
					p[3]
				]
			]
		};
	},

	// note: check a curve ([x, y, x, y, x, y])
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

			ax = x0 - 2 * x1 + x2,
			bx = x1 - x0,
			ay = y0 - 2 * y1 + y2,
			by = y1 - y0,

			A = ax * ax + ay * ay,
			B = ax * bx + ay * by,
			C = bx * bx + by * by;

		function integral(t){
			// the quadratic curve is just a straight line
			if(A * C === B * B){
				// note: works bad with lines where handle is not inside the line
				// from [0, 0], to [50, 50] with handle [100, 100] for ex.
				return 2 * Math.sqrt(A) * Math.abs(t * t / 2 + B * t / A);
			}

			return (
				(A * C - B * B) * Math.log(
					Math.sqrt(A) * Math.sqrt(A * t * t + 2 * B * t + C) + A * t + B
				) +
				Math.sqrt(A) * (A * t + B) * Math.sqrt(t * (A * t + 2 * B) + C)
			) / Math.pow(A, 3/2);
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
	pointAt: function(curve, t, startPoint){
		if(!startPoint){
			startPoint = curve.startAt();
		}
		var i = 1 - t;
		return [
			i * i * i * startPoint[0] + 3 * t * i * i * curve.attrs.args[0] + 3 * t * t * i * curve.attrs.args[2] + t * t * t * curve.attrs.args[4],
			i * i * i * startPoint[1] + 3 * t * i * i * curve.attrs.args[1] + 3 * t * t * i * curve.attrs.args[3] + t * t * t * curve.attrs.args[5]
		];
	},

	tangentAt: function(curve, startPoint){
		if(!startPoint){
			startPoint = curve.startAt();
		}
	},

	splitAt: function(curve, t, startPoint){
		if(!startPoint){
			startPoint = curve.startAt();
		}

		var i = 1 - t;
		var point = Curve.canvasFunctions.bezierCurveTo.pointAt(curve, t, startPoint);
		return {
			start: [
				startPoint,
				[
					t * p[0] + i * startPoint[0],
					t * p[1] + i * startPoint[1]
				],
				[
					t * t * p[2] + 2 * t * i * p[0] + i * i * startPoint[0],
					t * t * p[3] + 2 * t * i * p[1] + i * i * startPoint[1]
				],
				point
			],
			end: [
				point,
				[
					t * t * p[4] + 2 * t * i * p[2] + i * i * p[0],
					t * t * p[5] + 2 * t * i * p[3] + i * i * p[1]
				],
				[
					t * p[4] + i * p[2],
					t * p[5] + i * p[3]
				],
				[
					p[4],
					p[5]
				]
			]
		};
	},

	lengthIntegrate: function(t, startPoint){
		;
	},

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

// Flattening
extend(Curve.prototype.attrHooks, {
	flatten: {
		set: function(){
			this.update();
		}
	}
});

var oldCurveProcess = Curve.prototype.process;
Curve.prototype.process = function(ctx){
	if(!this.attrs.flatten){
		return oldCurveProcess.apply(this, arguments);
	}

	var detail = this.attrs.flatten;
	var start = this.startAt();
	var point;
	for(var i = 1; i <= detail; i++){
		point = this.pointAt(i / detail, start);
		ctx.lineTo(point[0], point[1]);
	}
};

// Legendre-Gauss integration
var abscissas = [
	[0.5773502691896257],
	[0, 0.7745966692414834],
	[0.33998104358485626, 0.8611363115940526],
	[0, 0.5384693101056831, 0.906179845938664],
	[0.2386191860831969, 0.6612093864662645, 0.932469514203152],
	[0, 0.4058451513773972, 0.7415311855993945, 0.9491079123427585],
	[0.1834346424956498, 0.525532409916329, 0.7966664774136267, 0.9602898564975363],
	[0, 0.3242534234038089, 0.6133714327005904, 0.8360311073266358, 0.9681602395076261],
	[0.14887433898163122, 0.4333953941292472, 0.6794095682990244, 0.8650633666889845, 0.9739065285171717],
	[0, 0.26954315595234496, 0.5190961292068118, 0.7301520055740494, 0.8870625997680953, 0.978228658146057],
	[0.1252334085114689, 0.3678314989981802, 0.5873179542866175, 0.7699026741943047, 0.9041172563704749, 0.9815606342467192],
	[0, 0.2304583159551348, 0.44849275103644687, 0.6423493394403402, 0.8015780907333099, 0.9175983992229779, 0.9841830547185881],
	[0.10805494870734367, 0.31911236892788974, 0.5152486363581541, 0.6872929048116855, 0.827201315069765, 0.9284348836635735, 0.9862838086968123],
	[0, 0.20119409399743451, 0.3941513470775634, 0.5709721726085388, 0.7244177313601701, 0.8482065834104272, 0.937273392400706, 0.9879925180204854],
	[0.09501250983763744, 0.2816035507792589, 0.45801677765722737, 0.6178762444026438, 0.755404408355003, 0.8656312023878318, 0.9445750230732326, 0.9894009349916499]
];

var weights = [
	[1],
	[0.8888888888888888, 0.5555555555555556],
	[0.6521451548625461, 0.34785484513745385],
	[0.5688888888888889, 0.47862867049936647, 0.23692688505618908],
	[0.46791393457269104, 0.3607615730481386, 0.17132449237917036],
	[0.4179591836734694, 0.3818300505051189, 0.27970539148927664, 0.1294849661688697],
	[0.362683783378362, 0.31370664587788727, 0.22238103445337448, 0.10122853629037626],
	[0.3302393550012598, 0.31234707704000286, 0.26061069640293544, 0.1806481606948574, 0.08127438836157441],
	[0.29552422471475287, 0.26926671930999635, 0.21908636251598204, 0.1494513491505806, 0.06667134430868814],
	[0.2729250867779006, 0.26280454451024665, 0.23319376459199048, 0.18629021092773426, 0.1255803694649046, 0.05566856711617366],
	[0.24914704581340277, 0.2334925365383548, 0.20316742672306592, 0.16007832854334622, 0.10693932599531843, 0.04717533638651183],
	[0.2325515532308739, 0.22628318026289723, 0.2078160475368885, 0.17814598076194574, 0.13887351021978725, 0.09212149983772845, 0.04048400476531588],
	[0.2152638534631578, 0.2051984637212956, 0.18553839747793782, 0.15720316715819355, 0.12151857068790319, 0.08015808715976021, 0.03511946033175186],
	[0.2025782419255613, 0.19843148532711158, 0.1861610000155622, 0.16626920581699392, 0.13957067792615432, 0.10715922046717194, 0.07036604748810812, 0.03075324199611727],
	[0.1894506104550685, 0.18260341504492358, 0.16915651939500254, 0.14959598881657674, 0.12462897125553388, 0.09515851168249279, 0.062253523938647894, 0.027152459411754096]
];

// ported with all the optimizations from paperjs
function integrate(f, a, b, n){
	var x = abscissas[n - 2],
		w = weights[n - 2],
		A = (b - a) * 0.5,
		B = A + a,
		i = 0,
		m = (n + 1) >> 1,
		sum = n & 1 ? w[i++] * f(B) : 0; // Handle odd n
	while (i < m) {
		var Ax = A * x[i];
		sum += w[i++] * (f(B + Ax) + f(B - Ax));
	}
	return A * sum;
}