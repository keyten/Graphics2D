//# Catmull-Rom Curves
Curve.curves.catmullRom = {
	pointAt : function(t){},
	process : function( ctx, current ){
		var point,
			a = this._arguments,
			detail = this._detail,
			i = 0;
		for(; i < detail; i++){
			point = CRPoint( a[0], a[1], current[0], current[1], a[2], a[3], a[4], a[5], i / detail );
			ctx.lineTo( point.x, point.y );
		}
		return [ a[4], a[5] ];
	},
	_detail : 50,
	h1x : argument( 0 ),
	h1y : argument( 1 ),
	h2x : argument( 4 ),
	h2y : argument( 5 ),
	x   : argument( 2 ),
	y   : argument( 3 ),
	_slice : [ 4 ]
};

function CRPoint(x1, y1, x2, y2, x3, y3, x4, y4, t){
	return {
		x: 0.5 * ((-x1 + 3*x2 - 3*x3 + x4)*t*t*t
				+ (2*x1 - 5*x2 + 4*x3 - x4)*t*t
				+ (-x1 + x3)*t
				+ 2*x2),
		y: 0.5 * ((-y1 + 3*y2 - 3*y3 + y4)*t*t*t
				+ (2*y1 - 5*y2 + 4*y3 - y4)*t*t
				+ (-y1 + y3)*t
				+ 2*y2)
	};
}

function argument( index ){
	return function( value ){
		return this.argument( index, value );
	};
}

/*
	catmullRom.angleAt = function(x1, y1, x2, y2, x3, y3, x4, y4, t){
		var dx = 0.5 * (x3 - x1)
					+ 2*t*(2*x1 - 5*x2 + 4*x3 - x4)
					+ 3*t*t*(3*x2 + x4 - x1 - 3*x3),
			dy = 0.5 * (y3 - y1)
					+ 2*t*(2*y1 - 5*y2 + 4*y3 - y4)
					+ 3*t*t*(3*y2 + y4 - y1 - 3*y3);
		return Math.atan2(dy, dx);
	};
 */