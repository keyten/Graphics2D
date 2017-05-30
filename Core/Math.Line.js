Curve.types.lineTo.pointAt = function(curve, t, startPoint){
    if(!startPoint){
        startPoint = curve.startAt();
    }
    return [
        startPoint[0] + t * (curve.attrs[0] - startPoint[0]),
        startPoint[1] + t * (curve.attrs[1] - startPoint[1]),
    ];
};

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

Curve.types.bezierCurveTo.pointAt = function(curve, t, startPoint){
    if(!startPoint){
        startPoint = curve.startAt();
    }

	var x1 = startPoint[0],
		y1 = startPoint[1],
		h1x = curve.attrs[0],
		h1y = curve.attrs[1],
		h2x = curve.attrs[2],
		h2y = curve.attrs[3],
		x2 = curve.attrs[4],
		y2 = curve.attrs[5];

	return [
        Math.pow(1 - t, 3) * x1 + 3 * t * Math.pow(1 - t, 2) * h1x + 3 * t * t * (1 - t) * h2x + t * t * t * x2,
        Math.pow(1 - t, 3) * y1 + 3 * t * Math.pow(1 - t, 2) * h1y + 3 * t * t * (1 - t) * h2y + t * t * t * y2
    ];
};