var CurveApprox = new Class(Curve, {
	initialize: function(method, attrs, path, detail){
		this.super('initialize', arguments);
		this.attrs.detail = detail;
	},

	genPoints: function(startPoint){
		var detail = this.attrs.detail || Curve.detail;
		var points = [startPoint || this.startAt()];
		for(var i = 1; i <= detail; i++){
			points.push(this.pointAt(i / detail, points[0]));
		}
		return points;
	},

	process: function(ctx){
		if(!this._points){
			this._points = this.genPoints();
		}

		this._points.forEach(function(point){
			ctx.lineTo(point[0], point[1]);
		});
	}
});

Delta.CurveApprox = CurveApprox;
// todo: rename to CurvePolyline