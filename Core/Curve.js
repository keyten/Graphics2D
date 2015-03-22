$.Curve = Curve = new Class({
	initialize : function( name, _arguments, path ){
		this.name = name;
		this.path = path;
		this._arguments = _arguments;

		if( name in Curve.curves ){
			Curve.curves[ name ]( this );
		}
	},

	// todo: extendsBy to the classes
	_property : Shape.prototype._property,
	update : function(){
		this.path.update();
		return this;
	},

	arguments : function(){
		return this._property( 'arguments', arguments.length > 1 ? arguments : arguments[0] );
	},

	argument : function( index, value ){
		if( value === undefined )
			return this._arguments[ index ];
		this._arguments[ index ] = value;
		return this.update();
	},

	from : function(){}, // returns from point

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
	moveTo : function( object ){
		object._slice = [ , ];
		object.points = function(){ return [this._arguments]; };
		object.x = argument( 0 );
		object.y = argument( 1 );
	},
	lineTo : function( object ){
		Curve.curves.moveTo( object );
		object._bounds = function(from){
			return new Bounds( from[0], from[1], this._arguments[0] - from[0], this._arguments[1] - from[1] );
		};
	},
	quadraticCurveTo : function( object ){
		object._slice = [ 2 ];
		object.points = function(){ return [this._arguments.slice(2), this._arguments.slice(0, 2)]; };
		object.hx = argument( 0 );
		object.hy = argument( 1 );
		object.x  = argument( 2 );
		object.y  = argument( 3 );
		object._bounds = function(f){ // from
			var a = this._arguments,
				x1 = Math.min(a[0], a[2], f[0]),
				y1 = Math.min(a[1], a[3], f[1]),
				x2 = Math.max(a[0], a[2], f[0]),
				y2 = Math.max(a[1], a[3], f[1]);
			return new Bounds(x1, y1, x2 - x1, y2 - y1);
		};
	},
	bezierCurveTo : function( object ){
		object._slice = [ 4 ];
		object.points = function(){ return [this._arguments.slice(4), this._arguments.slice(2, 4), this._arguments.slice(0, 2)]; };
		object.h1x = argument( 0 );
		object.h1y = argument( 1 );
		object.h2x = argument( 2 );
		object.h2y = argument( 3 );
		object.x   = argument( 4 );
		object.y   = argument( 5 );
		object._bounds = function(f){ // from
			var a = this._arguments,
				x1 = Math.min(a[0], a[2], a[4], f[0]),
				y1 = Math.min(a[1], a[3], a[5], f[1]),
				x2 = Math.max(a[0], a[2], a[4], f[0]),
				y2 = Math.max(a[1], a[3], a[5], f[1]);
			return new Bounds(x1, y1, x2 - x1, y2 - y1);
		};
	},
	arc : function( object ){
		object.points = function(){ return [this._arguments.slice(0, 2)]; };
		object.x         = argument( 0 );
		object.y         = argument( 1 );
		object.radius    = argument( 2 );
		object.start     = argument( 3 );
		object.end       = argument( 4 );
		object.clockwise = argument( 5 );

		object.endsIn = function(){
			// var [x, y, radius, start, end, clockwise] = this._arguments;
			var x         = this._arguments[ 0 ],
				y         = this._arguments[ 1 ],
				radius    = this._arguments[ 2 ],
				start     = this._arguments[ 3 ],
				end       = this._arguments[ 4 ],
				clockwise = this._arguments[ 5 ],
				delta     = end - start;

			if( clockwise )
				delta = -delta;
// why?.. is it must be in the base functionality?
			return [
				x + Math.cos( delta ) * radius,
				y + Math.sin( delta ) * radius
			];
		};
	},
	arcTo : function( object ){
		object.points = function(){ return [this._arguments.slice(0, 2), this._arguments.slice(2)]; };
		object._slice = [ 2, 4 ];
		object.x1 = argument( 0 );
		object.y1 = argument( 1 );
		object.x2 = argument( 2 );
		object.y2 = argument( 3 );
		object.radius = argument( 4 );
		object.clockwise = argument( 5 );
	}
};

Curve.byArray = function(array, path){
	if(array === true)
		return closePath;

	switch(array.length){
		case 2: return new Curve('lineTo', array, path);
		case 4: return new Curve('quadraticCurveTo', array, path);
		case 6: return new Curve('bezierCurveTo', array, path);
	}
};

$.curves = Curve.curves;