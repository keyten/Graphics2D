Circle = new Class(Shape, {

	init : function(){
		var props = this._cx;
		if(isHash( props )){
			this._cx = props.cx || props.x || 0;
			this._cy = props.cy || props.y || 0;
			this._radius = props.radius;
			this._parseHash(props);
		} else {
			this._processStyle();
		}
	},

	// параметры
	cx : function(cx){
		return this._property('cx', cx);
	},
	cy : function(cy){
		return this._property('cy', cy);
	},
	radius : function(r){
		return this._property('radius', r);
	},

	bounds : function(){
		return new Bounds(this._cx - this._radius, this._cy - this._radius, this._radius * 2, this._radius * 2);
	},
	processPath : function(ctx){
		ctx.beginPath();
		ctx.arc(this._cx, this._cy, this._radius, 0, Math.PI*2, true);
	}

});
Circle.props = [ 'cx', 'cy', 'radius', 'fill', 'stroke' ];