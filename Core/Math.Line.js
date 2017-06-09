Curve.types.lineTo.pointAt = function(curve, t, startPoint){
	if(!startPoint){
		startPoint = curve.startAt();
	}
	return [
		startPoint[0] + t * (curve.attrs[0] - startPoint[0]),
		startPoint[1] + t * (curve.attrs[1] - startPoint[1]),
	];
};