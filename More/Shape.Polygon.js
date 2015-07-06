Polygon = new Class(Shape, {

	init : function(){
		var props = this._cx;
		if(isHash( props )){
			this._cx = props.cx || props.x || 0;
			this._cy = props.cy || props.y || 0;
			this._radius = props.radius;
			this._sides = props.sides;
			this._parseHash(props);
		} else {
			this._processStyle();
		}
	},

	// parameters
	cx : function(value){
		return this._property('cx', value);
	},

	cy : function(value){
		return this._property('cy', value);
	},

	radius : function(value){
		return this._property('radius', value);
	},

	sides : function(value){
		return this._property('sides', value);
	},

	bounds : function(){
		return new Bounds(this._cx - this._radius, this._cy - this._radius, this._radius * 2, this._radius * 2);
	},

	processPath : function(ctx){
		var angle,
			sides = pi2 / this._sides,
			i = 0;

		ctx.beginPath();

		for(; i < this._sides; i++){
			// angle = pi2 / sides * i
			angle = sides * i;
			ctx.lineTo(this._cx + this._radius * Math.cos(angle), this._cy + this._radius * Math.sin(angle));
		}
			
		ctx.closePath();
	}

});
Polygon.props = [ 'cx', 'cy', 'radius', 'sides', 'fill', 'stroke' ];

Context.prototype.polygon = function(){
	return this.push( new Polygon(arguments, this) );
};

$.fx.step.sides = $.fx.step.int;

$.Polygon = Polygon;