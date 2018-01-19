// {moduleName Animation.Morph}
// {requires Curve.Math, Curve.Approx}

Path.prototype.attrHooks.morph = {
	preAnim: function(fx, data){
		var curve = data.curve,
			to = data.to,

			start = curve.startAt(), // иногда кидает ошибку, если несколько анимаций морфа
			index = curve.path.attr('d').indexOf(curve);

		// заменяем кривую на её аппроксимацию
		fx.startCurve = curve;
		fx.endCurve = Path.parse(to, null, true)[0]; // todo: multiple curves & paths
		fx.detail = data.detail || Curve.detail || 10;

		fx.startPoints = [start];
		fx.endPoints = [fx.endCurve.pointAt(0, start)];

		for(var i = 1; i <= fx.detail; i++){
			fx.startPoints.push(curve.pointAt(i / fx.detail, start));
			fx.endPoints.push(fx.endCurve.pointAt(i / fx.detail, start));
		}

		fx.polyline = new CurvePolyline('polyline', fx.startPoints, curve.path);
		fx.index = index;

		curve.path.curve(index, fx.polyline);
	},

	anim: function(fx){
		// noise animation
		// maybe plugin after
		/* fx.curve._points = fx.curve._points.map(function(point, i){
			return [
				fx.startPoints[i][0],
				fx.startPoints[i][1] + Math.random() * 10
			];
		}); */

		fx.polyline.attr('args', fx.polyline.attr('args').map(function(point, i){
			return [
				fx.startPoints[i][0] + (fx.endPoints[i][0] - fx.startPoints[i][0]) * fx.pos,
				fx.startPoints[i][1] + (fx.endPoints[i][1] - fx.startPoints[i][1]) * fx.pos
			];
		}));

		if(fx.pos === 1){
			fx.startCurve.path.curve(fx.index, fx.endCurve);
		}
	}
};