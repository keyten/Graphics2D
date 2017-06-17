Curve.canvasFunctions.quadraticCurveTo.pointAt = function(curve, t, startPoint){
	if(!startPoint){
		startPoint = curve.startAt();
	}

	var x1 = startPoint[0],
		y1 = startPoint[1],
		p = curve.funcAttrs;

	return [
		Math.pow(1 - t, 2) * x1 + 2 * t * (1 - t) * p[0] + t * t * p[2],
		Math.pow(1 - t, 2) * y1 + 2 * t * (1 - t) * p[1] + t * t * p[3]
	];
};

Curve.canvasFunctions.quadraticCurveTo.splitAt = function(curve, t, startPoint){
	if(!startPoint){
		startPoint = curve.startAt();
	}
	var p = curve.funcAttrs;
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
