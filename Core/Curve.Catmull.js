var CurveCatmull = new Class(Curve, {
	initialize: function(method, attrs, path){
		this.super('initialize', arguments);
		if(!attrs[6]){
			this.attrs.args[6] = 0.5;
		}
	},

	attrHooks: new CurveAttrHooks({
		h1x: {
			set: function(value){
				this.attrs.args[0] = value;
				this.update();
			}
		},
		h1y: {
			set: function(value){
				this.attrs.args[1] = value;
				this.update();
			}
		},
		h2x: {
			set: function(value){
				this.attrs.args[2] = value;
				this.update();
			}
		},
		h2y: {
			set: function(value){
				this.attrs.args[3] = value;
				this.update();
			}
		},
		x: {
			set: function(value){
				this.attrs.args[4] = value;
				this.update();
			}
		},
		y: {
			set: function(value){
				this.attrs.args[5] = value;
				this.update();
			}
		},
		tension: {
			set: function(value){
				this.attrs.args[6] = value;
				this.update();
			}
		}
	}),

	pointAt: function(t, start){
		if(!start){
			start = this.startAt();
		}

		// P(t) = (2t³ - 3t² + 1)p0 + (t³ - 2t² + t)m0 + ( -2t³ + 3t²)p1 + (t³ - t²)m1
		// Где p0, p1 - центральные точки сплайна, m0, m1 - крайние точки сплайна: (m0 - p0 - p1 - m1)

		var args = this.attrs.args,
			x1 = start[0],
			y1 = start[1],
			h1x = args[0],
			h1y = args[1],
			h2x = args[2],
			h2y = args[3],
			x2 = args[4],
			y2 = args[5];

		return [
			0.5 * ((-h1x + 3 * x1 - 3 * x2 + h2x)*t*t*t
				+ (2 * h1x - 5 * x1 + 4 * x2 - h2x)*t*t
				+ (-x1 + x2) * t
				+ 2 * x1),
			0.5 * ((-h1y + 3 * y1 - 3 * y2 + h2y)*t*t*t
				+ (2 * h1y - 5 * y1 + 4 * y2 - h2y)*t*t
				+ (-y1 + y2) * t
				+ 2 * y1)
		];
	},

	endAt: function(){
		return [this.attrs.args[4], this.attrs.args[5]];
	},

	tangentAt: function(t, start){
		if(!start){
			start = this.startAt();
		}

		var args = this.attrs.args,
			x1 = start[0],
			y1 = start[1],
			h1x = args[0],
			h1y = args[1],
			h2x = args[2],
			h2y = args[3],
			x2 = args[4],
			y2 = args[5];

		return Math.atan2(
			0.5 * (3 * t * t * (-h1y + 3 * y1 - 3 * y2 + h2y)
				+ 2 * t * (2 * h1y - 5 * y1 + 4 * y2 - h2y)
				+ (-h1y + y2)),
			0.5 * (3 * t * t * (-h1x + 3 * x1 - 3 * x2 + h2x)
				+ 2 * t * (2 * h1x - 5 * x1 + 4 * x2 - h2x)
				+ (-h1x + x2))
		) / Math.PI * 180;
	},

	process: function(ctx){
		var start = this.startAt(),
			args = this.attrs.args,
			x1 = start[0],
			y1 = start[1],
			h1x = args[0],
			h1y = args[1],
			h2x = args[2],
			h2y = args[3],
			x2 = args[4],
			y2 = args[5];

		var bezier = catmullRomToCubicBezier(x1, y1, h1x, h1y, h2x, h2y, x2, y2, args[6]);
		ctx.bezierCurveTo(bezier[2], bezier[3], bezier[4], bezier[5], bezier[6], bezier[7]);
	}
});

function catmullRomToCubicBezier(x1, y1, h1x, h1y, h2x, h2y, x2, y2, tension){
	var catmull = [
		h1x, h1y, // 0, 1
		x1, y1, // 2, 3
		x2, y2, // 4, 5
		h2x, h2y // 6, 7
	];

	var bezier = [
		catmull[2], catmull[3],
		catmull[2] + (catmull[4] - catmull[0]) / (6 * tension),
		catmull[3] + (catmull[5] - catmull[1]) / (6 * tension),
		catmull[4] - (catmull[6] - catmull[2]) / (6 * tension),
		catmull[5] - (catmull[7] - catmull[3]) / (6 * tension),
		catmull[4], catmull[5]
	];

	return bezier;
}

// catmull rom is a special case of hermite spline
function catmullRomToHermite(x1, y1, h1x, h1y, h2x, h2y, x2, y2){
	// возвращает то что можно запихнуть в path.push(...)
	return {
		h0: [x1, y1], // start point
		h1: [x2, y2], // end point
		h2: [(x2 - h1x) / 2, (y2 - h1y) / 2], // derivative at start point
		h3: [(h2x - x1) / 2, (h2y - y1) / 2] // derivative at end point
	};
}

// надо научить быть closed (нужно чтобы первая и последняя точка равнялись)
Delta.Curve.catmullSpline = function(points, closed, tension){
	return points.map(function(point, i){
		if(i === 0){
			return point;
		}

		var prev = points[i - 2] || points[i - 1];
		var next = points[i + 1] || point;

		return [
			'catmullTo',
			prev[0], prev[1],
			next[0], next[1],
			point[0], point[1],
			tension
		];
	});
}

Delta.curves['catmullTo'] = CurveCatmull;