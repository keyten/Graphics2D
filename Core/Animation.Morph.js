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

		var curveApprox = new CurveApprox(curve.method, curve.attrs, curve.path, data.detail);
		fx.startPoints = curveApprox._points = curveApprox.genPoints(start);

		// получаем конечные точки аппроксимации
		fx.endPoints = new CurveApprox(fx.endCurve.method, fx.endCurve.attrs, null, data.detail).genPoints(start);
		fx.deltas = fx.endPoints.map(function(endPoint, i){
			return [
				endPoint[0] - fx.startPoints[i][0],
				endPoint[1] - fx.startPoints[i][1]
			];
		});
		// todo: вынести куда-нибудь genPoints (CurveApprox.genPoints), чтобы не создавать каждый раз новый объект
		curve.path.curve(index, curveApprox);
		fx.curve = curveApprox;
		fx.index = index;
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

		fx.curve._points = fx.curve._points.map(function(point, i){
			return [
				fx.startPoints[i][0] + fx.deltas[i][0] * fx.pos,
				fx.startPoints[i][1] + fx.deltas[i][1] * fx.pos
			];
		});
		fx.curve.update();

		if(fx.pos === 1){
			fx.curve.path.curve(fx.index, fx.endCurve);
		}
	}
};