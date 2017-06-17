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
