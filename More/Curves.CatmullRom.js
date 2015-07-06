//# Catmull-Rom Curves
Curve.curves.catmullRom = {

	params : function(){
		var from = this.from(),
			arg = this._arguments;
		return {
			x1  : from[0],
			y1  : from[1],
			x2  : arg[2],
			y2  : arg[3],
			h1x : arg[0],
			h1y : arg[1],
			h2x : arg[4],
			h2y : arg[5]
		};
	},

	pointAt : function(t){
		var p = this.params();
		return CRPoint( p.h1x, p.h1y, p.x1, p.y1, p.x2, p.y2, p.h2x, p.h2y, t );
	},

	tangentAt : function(t){
		var p = this.params();
		return Math.atan2(
			0.5 * ( 3*t*t*(-p.h1y+3*p.y1-3*p.y2+p.h2y) + 2*t*(2*p.h1y-5*p.y1+4*p.y2-p.h2y) + (-p.h1y+p.y2)  ),
			0.5 * ( 3*t*t*(-p.h1x+3*p.x1-3*p.x2+p.h2x) + 2*t*(2*p.h1x-5*p.x1+4*p.x2-p.h2x) + (-p.h1x+p.x2)  )
		) / Math.PI * 180;
	},

	process : function( ctx, current ){
		var point,
			a = this._arguments,
			i = 0,
			detail = this._detail;
		for(; i <= detail; i++){
			point = CRPoint( a[0], a[1], current[0], current[1], a[2], a[3], a[4], a[5], i / detail );
			ctx.lineTo( point.x, point.y );
		}
		return [ a[4], a[5] ];
	},
	_detail : 20,
	h1x : argument( 0 ),
	h1y : argument( 1 ),
	h2x : argument( 4 ),
	h2y : argument( 5 ),
	x   : argument( 2 ),
	y   : argument( 3 ),
	_slice : [ 4 ],

	toCubic : function(){}
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

$.CRPoint = CRPoint;