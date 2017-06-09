Curve.types.quadraticCurveTo.pointAt = function(curve, t, startPoint){
	if(!startPoint){
		startPoint = curve.startAt();
	}

	var x1 = startPoint[0],
		y1 = startPoint[1],
		hx = curve.attrs[0],
		hy = curve.attrs[1],
		x2 = curve.attrs[2],
		y2 = curve.attrs[3];

	return [
		Math.pow(1 - t, 2) * x1 + 2 * t * (1 - t) * hx + t * t * x2,
		Math.pow(1 - t, 2) * y1 + 2 * t * (1 - t) * hy + t * t * y2
	];
};
