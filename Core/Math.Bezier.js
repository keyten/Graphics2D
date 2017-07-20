Delta.Math.Bezier = {
	pointAt: function(start, handle1, handle2, end, t){
		return [
			Math.pow(1 - t, 3) * start[0] + 3 * t * Math.pow(1 - t, 2) * handle1[0] + 3 * t * t * (1 - t) * handle2[0] + t * t * t * end[0],
			Math.pow(1 - t, 3) * start[1] + 3 * t * Math.pow(1 - t, 2) * handle1[1] + 3 * t * t * (1 - t) * handle2[1] + t * t * t * end[1]
		];
	},

	splitAt: function(start, handle1, handle2, end, t){
		var point = Delta.Math.Bezier.pointAt(start, handle1, handle2, end, t);
		return {
			start: [
				start,
				[
					t * handle1[0] + (1 - t) * start[0],
					t * handle2[1] + (1 - t) * start[1]
				],
				[
					t * t * handle2[0] + 2 * t * (1 - t) * handle1[0] + Math.pow(1 - t, 2) * start[0],
					t * t * handle2[1] + 2 * t * (1 - t) * handle1[1] + Math.pow(1 - t, 2) * start[1]
				],
				point
			],
			end: [
				point,
				[
					t * t * end[0] + 2 * t * (1 - t) * handle2[0] + Math.pow(1 - t, 2) * handle1[0],
					t * t * end[1] + 2 * t * (1 - t) * handle2[1] + Math.pow(1 - t, 2) * handle1[1]
				],
				[
					t * end[0] - (1 - t) * handle2[0],
					t * end[1] - (1 - t) * handle2[1]
				],
				end
			]
		};
	},

	length: function(start, handle1, handle2, end){
		;
	},

	intersect: function(
		line1start, line1handle1, line1handle2, line1end,
		line2start, line2handle1, line2handle2, line2end
		){
		//;
	}
};

Curve.canvasFunctions.bezierCurveTo.pointAt = function(curve, t, startPoint){
	if(!startPoint){
		startPoint = curve.startAt();
	}

	var x1 = startPoint[0],
		y1 = startPoint[1],
		p = curve.funcAttrs;

	return [
		Math.pow(1 - t, 3) * x1 + 3 * t * Math.pow(1 - t, 2) * p[0] + 3 * t * t * (1 - t) * p[2] + t * t * t * p[4],
		Math.pow(1 - t, 3) * y1 + 3 * t * Math.pow(1 - t, 2) * p[1] + 3 * t * t * (1 - t) * p[3] + t * t * t * p[5]
	];
};

Curve.canvasFunctions.bezierCurveTo.splitAt = function(curve, t, startPoint){
	if(!startPoint){
		startPoint = curve.startAt();
	}
	var p = curve.funcAttrs;
	var point = Curve.canvasFunctions.bezierCurveTo.pointAt(curve, t, startPoint);
	return {
		start: [
			startPoint,
			[
				t * p[0] - (t - 1) * startPoint[0],
				t * p[1] - (t - 1) * startPoint[1]
			],
			[
				t * t * p[2] - 2 * t * (t - 1) * p[0] + (t - 1) * (t - 1) * startPoint[0],
				t * t * p[3] - 2 * t * (t - 1) * p[1] + (t - 1) * (t - 1) * startPoint[1]
			],
			point
		],
		end: [
			point,
			[
				t * t * p[4] - 2 * t * (t - 1) * p[2] + (t - 1) * (t - 1) * p[0],
				t * t * p[5] - 2 * t * (t - 1) * p[3] + (t - 1) * (t - 1) * p[1]
			],
			[
				t * p[4] - (t - 1) * p[2],
				t * p[5] - (t - 1) * p[3]
			],
			[
				p[4],
				p[5]
			]
		]
	};
};
