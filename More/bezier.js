//# Bezier Curves
Curve.curves.bezier = {
	pointAt : function(t){},
	process : function( ctx, current ){
		var curx, cury,
			x = [ current[0] ].concat(getElements( this._arguments, 0 )),
			y = [ current[1] ].concat(getElements( this._arguments, 1 )),
			detail = this._detail,
			i = 0;
		for(; i <= detail; i++){
			curx = bezier( x, i / detail );
			cury = bezier( y, i / detail );
			ctx.lineTo( curx, cury );
		}
		return this._arguments.slice( this._arguments.length - 2 );
	},
	_detail : 50
};

function getElements( array, i ){
	// i = 0 -- odd
	// i = 1 -- even
	var result = [],
		l = array.length;
	for( ; i < l; i += 2 ){
		result.push( array[i] );
	}
	return result;
}

function factorial(n){
	if(n === 1 || n === 0) return 1;
		return n * factorial(n-1);
}

function C(i, m){
	return factorial(m) / (factorial(i) * factorial(m - i));
}

function bezier(points, t){
	var len = points.length,
		m = len - 1,
		i = 0,
		l = 1 - t,
		result = 0;
	for(; i < len; i++){
		result += C(i, m) * Math.pow(t, i) * Math.pow(l, m - i) * points[i];
	}
	return result;
}