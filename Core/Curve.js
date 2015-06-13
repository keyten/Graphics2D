$.Curve = Curve = new Class({
	initialize : function( name, _arguments, path ){
		this.name = name;
		this.path = path;
		this._arguments = _arguments;

		if( name in Curve.curves ){
			extend( this, Curve.curves[ name ] );
		}
	},

	prop : Shape.prototype.prop,
	update : function(){
		this.path.update();
		return this;
	},

	arguments : function(){
		return this.prop( 'arguments', arguments.length > 1 ? arguments : arguments[0] );
	},

	argument : function( index, value ){
		if( value === undefined )
			return this._arguments[ index ];
		this._arguments[ index ] = value;
		return this.update();
	},

	from : function(){ // returns the start point
		if(!this.path)
			throw 'Error: the curve hasn\'t path.';

		var index = this.path._curves.indexOf( this ),
			before = this.path._curves[ index - 1 ];

		if( index === 0 )
			return [0, 0];
		if( index === -1 || !before || !('endsIn' in before) )
			return null; // todo: throw new error

		var end = before.endsIn();
		if( !end )
			return null; // todo: throw
		return end;
	},

	endsIn : function(){
		if( this._slice )
			return this._arguments.slice( this._slice[0], this._slice[1] );
		return null;
	},

	process : function( ctx ){
		ctx[ this.name ].apply( ctx, this._arguments );
		return this.endsIn();
	},

	_bounds : function(){
		return null;
	}
});

Curve.curves = {
	moveTo : {
		_slice : [ , ],
		points : function(){ return [this._arguments]; },
		x : argument( 0 ),
		y : argument( 1 )
	},
	lineTo : {
		_slice : [ , ],
		points : function(){ return [this._arguments]; },
		_bounds : function( from ){
			var end = this._arguments;
			return new Bounds( from[0], from[1], end[0] - from[0], end[1] - from[1] );
		},
		x : argument( 0 ),
		y : argument( 1 )
	},
	quadraticCurveTo : {
		_slice : [ 2 ],
		points : function(){
			return [ this._arguments.slice(2), this._arguments.slice(0, 2) ];
		},
		_bounds : function( f ){
			var a = this._arguments,
				x1 = Math.min( a[0], a[2], f[0] ),
				y1 = Math.min( a[1], a[3], f[1] ),
				x2 = Math.max( a[0], a[2], f[0] ),
				y2 = Math.max( a[1], a[3], f[1] );
			return new Bounds( x1, y1, x2 - x1, y2 - y1 );
		},
		hx : argument( 0 ),
		hy : argument( 1 ),
		x  : argument( 2 ),
		y  : argument( 3 )
	},
	bezierCurveTo : {
		_slice : [ 4 ],
		points : function(){
			return [ this._arguments.slice(4), this._arguments.slice(2, 4), this._arguments.slice(0, 2) ];
		},
		_bounds : function( f ){
			var a = this._arguments,
				x1 = Math.min( a[0], a[2], a[4], f[0] ),
				y1 = Math.min( a[1], a[3], a[5], f[1] ),
				x2 = Math.max( a[0], a[2], a[4], f[0] ),
				y2 = Math.max( a[1], a[3], a[5], f[1] );
			return new Bounds( x1, y1, x2 - x1, y2 - y1 );
		},
		h1x : argument( 0 ),
		h1y : argument( 1 ),
		h2x : argument( 2 ),
		h2y : argument( 3 ),
		x   : argument( 4 ),
		y   : argument( 5 )
	},
	arc : {
		points : function(){
			return [ this._arguments.slice(0, 2) ];
		},
		x         : argument( 0 ),
		y         : argument( 1 ),
		radius    : argument( 2 ),
		start     : argument( 3 ),
		end       : argument( 4 ),
		clockwise : argument( 5 ),
		endsIn : function(){
			var x         = this._arguments[ 0 ],
				y         = this._arguments[ 1 ],
				radius    = this._arguments[ 2 ],
				start     = this._arguments[ 3 ],
				end       = this._arguments[ 4 ],
				clockwise = this._arguments[ 5 ],
				delta     = end - start;
			
			if( clockwise )
				delta = -delta;

			return [
				x + Math.cos( delta ) * radius,
				y + Math.sin( delta ) * radius
			];
		}
	},
	arcTo : {
		_slice : [ 2, 4 ],
		points : function(){
			return [ this._arguments.slice(0, 2), this._arguments.slice(2) ];
		},
		x1        : argument( 0 ),
		y1        : argument( 1 ),
		x2        : argument( 2 ),
		y2        : argument( 3 ),
		radius    : argument( 4 ),
		clockwise : argument( 5 )
	}
};

Curve.byArray = function(array, path){
	if(array === true)
		return closePath;

	if(array[0] in Curve.curves)
		return new Curve(array[0], array.slice(1), path);

	switch(array.length){
		case 2: return new Curve('lineTo', array, path);
		case 4: return new Curve('quadraticCurveTo', array, path);
		case 6: return new Curve('bezierCurveTo', array, path);
	}
};

$.curves = Curve.curves;