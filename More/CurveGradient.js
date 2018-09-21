Delta.drawGradientCurve = function(curve, ctx){
	var point, lastPoint;

	lastPoint = curve.curve(0);
	for(var i = 1; i < curve.detail; i++){
		point = curve.curve(i / curve.detail);
		ctx.beginPath();
		ctx.moveTo(lastPoint[0], lastPoint[1]);
		ctx.lineTo(point[0], point[1]);
		ctx.lineWidth = curve.width(i / curve.detail);
		ctx.stroke();
		lastPoint = point;
	}
};