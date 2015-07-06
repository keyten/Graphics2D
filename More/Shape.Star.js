Star = new Class(Shape, {

	init : function(){
		var props = this._cx;
		if(isHash( props )){
			this._cx = props.cx || props.x || 0;
			this._cy = props.cy || props.y || 0;
			this._radius1 = props.radius1 || (props.radius ? props.radius[0] : 0);
			this._radius2 = props.radius2 || (props.radius ? props.radius[1] : 0);
			this._points = props.points;
			this._distortion = props.distortion || 0;
			this._parseHash(props);
		} else {
			this._processStyle();
		}
	},

	_distortion : 0,

	// parameters
	cx : function(value){
		return this._property('cx', value);
	},

	cy : function(value){
		return this._property('cy', value);
	},

	radius1 : function(value){
		return this._property('radius1', value);
	},

	radius2 : function(value){
		return this._property('radius2', value);
	},

	points : function(value){
		return this._property('points', value);
	},

	distortion : function(value){
		return this._property('distortion', value);
	},

	bounds : function(){
		var r = Math.max(this._radius1, this._radius2);
		return new Bounds(this._cx - r, this._cy - r, r * 2, r * 2);
	},
	processPath : function(ctx){
		var angle1, angle2,
			offset = Math.PI / this._points,
			i = 0;

		ctx.beginPath();

		for(; i < this._points; i++){
			angle1 = pi2 * i / this._points;
			angle2 = angle1 + offset + this._distortion;
			ctx.lineTo(this._cx + this._radius1 * Math.cos(angle1), this._cy + this._radius1 * Math.sin(angle1));
			ctx.lineTo(this._cx + this._radius2 * Math.cos(angle2), this._cy + this._radius2 * Math.sin(angle2));
		}

		ctx.closePath();
	}

});
Star.props = [ 'cx', 'cy', 'radius1', 'radius2', 'points', 'fill', 'stroke' ];

Context.prototype.star = function(){
	return this.push( new Star(arguments, this) );
};

$.fx.step.radius1 = $.fx.step.int;
$.fx.step.radius2 = $.fx.step.int;
$.fx.step.points = $.fx.step.int;
$.fx.step.distortion = $.fx.step.float;

$.Star = Star;