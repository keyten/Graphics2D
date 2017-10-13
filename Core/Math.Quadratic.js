Delta.Math.Quadratic = {
	pointAt: function(start, handle, end, t){
		return [
			Math.pow(1 - t, 2) * start[0] + 2 * t * (1 - t) * handle[0] + t * t * end[0],
			Math.pow(1 - t, 2) * start[1] + 2 * t * (1 - t) * handle[1] + t * t * end[1]
		];
	},

	splitAt: function(start, handle, end, t){
		var point = Delta.Math.Quadratic.pointAt(start, handle, end, t);
		return {
			start: [
				start,
				[
					t * handle[0] + (1 - t) * start[0],
					t * handle[1] + (1 - t) * start[1]
				],
				point
			],
			end: [
				point,
				[
					t * end[0] + (1 - t) * handle[0],
					t * end[1] + (1 - t) * handle[1]
				],
				end
			]
		};
	},

	length: function(start, handle, end){
		;
	},

	intersect: function(line1start, line1handle, line1end, line2start, line2handle, line2end){
		//;
	}
};

Curve.canvasFunctions.quadraticCurveTo.pointAt = function(curve, t, startPoint){
	if(!startPoint){
		startPoint = curve.startAt();
	}

	var x1 = startPoint[0],
		y1 = startPoint[1],
		p = curve.attrs.args;

	return [
		Math.pow(1 - t, 2) * x1 + 2 * t * (1 - t) * p[0] + t * t * p[2],
		Math.pow(1 - t, 2) * y1 + 2 * t * (1 - t) * p[1] + t * t * p[3]
	];
};

Curve.canvasFunctions.quadraticCurveTo.splitAt = function(curve, t, startPoint){
	if(!startPoint){
		startPoint = curve.startAt();
	}
	var p = curve.attrs.args;
	var point = Curve.canvasFunctions.quadraticCurveTo.pointAt(curve, t, startPoint);
	return {
		start: [
			startPoint,
			[
				t * p[0] - (t - 1) * startPoint[0],
				t * p[1] - (t - 1) * startPoint[1]
			],
			point
		],
		end: [
			point,
			[
				t * p[2] - (t - 1) * p[0],
				t * p[3] - (t - 1) * p[1]
			],
			[
				p[2],
				p[3]
			]
		]
	};
};
