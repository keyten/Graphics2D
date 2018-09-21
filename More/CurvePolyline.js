var CurvePolyline = new Class(Curve, {
	initialize: function(method, attrs, path){
		this.super('initialize', arguments);
		this.attrs = {
			args: attrs
		};
	},

	process: function(ctx){
		this.attrs.args.forEach(function(point){
			ctx.lineTo(point[0], point[1]);
		});
	}
});

Delta.CurvePolyline = CurvePolyline;