Circle = new Class(Shape, {

	initialize : function(){
		if(this.object){
			var object = this.object;
			this._cx = object.cx;
			this._cy = object.cy;
			this._radius = object.radius;
			delete this.object;
		}
	},

	// Parameters

	cx : function(cx){
		return this.prop('cx', cx);
	},

	cy : function(cy){
		return this.prop('cy', cy);
	},

	radius : function(r){
		return this.prop('radius', r);
	},

	bounds : function(){
		return new Bounds(this._cx - this._radius, this._cy - this._radius, this._radius * 2, this._radius * 2);
	},

	processPath : function(ctx){
		ctx.beginPath();
		ctx.arc(this._cx, this._cy, Math.abs(this._radius), 0, Math.PI*2, true);
	}

});

Circle.props = [ 'cx', 'cy', 'radius' ];
Circle.processStyle = true;
Circle.firstObject = true;
Circle.propHandlers = [distance, distance, distance];


$.circle = function(){
	return new Circle(arguments);
};