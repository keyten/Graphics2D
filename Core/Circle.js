Circle = new Class(Shape, {

	init : function(){
		var props = this._cx;
		if(isObject( props )){
			this._cx = props.cx || props.x || 0;
			this._cy = props.cy || props.y || 0;
			this._radius = props.radius;
			this._parseHash(props);
		} else {
			this._processStyle();
		}
	},

	// parameters
	cx : function(cx){
		return this.prop('cx', cx);
	},

	cy : function(cy){
		return this.prop('cy', cy);
	},
	
	radius : function(r){
		return this.prop('radius', r);
	},

	_bounds : function(){
		return new Bounds(this._cx - this._radius, this._cy - this._radius, this._radius * 2, this._radius * 2);
	},
	
	processPath : function(ctx){
		ctx.beginPath();
		// Math.abs -- fix for negative radius (for ex. - animate radius to 0 with elasticOut easing)
		ctx.arc(this._cx, this._cy, Math.abs(this._radius), 0, Math.PI*2, true);
	}

});
Circle.props = [ 'cx', 'cy', 'radius', 'fill', 'stroke' ];
Circle.distances = [true, true, true];