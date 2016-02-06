Rect = new Class(Shape, {

	init : function(){
		if(this.object){
			var object = this.object;
			this._x = object.x;
			this._y = object.y;
			this._width = object.width;
			this._height = object.height;
			delete this.object;
		}
	},

	// Parameters

	x : function(x){
		return this.prop('x', x);
	},
	y : function(y){
		return this.prop('y', y);
	},
	width : function(w){
		return this.prop('width', w);
	},
	height : function(h){
		return this.prop('height', h);
	},
	x1 : function(x){
		return x === undefined ?
			this._x :
			this.prop('width', this._width - x + this._x)
				.prop('x', x);
	},
	y1 : function(y){
		return y === undefined ?
			this._y :
			this.prop('height', this._height - y + this._y)
				.prop('y', y);
	},
	x2 : function(x){
		return x === undefined ?
			this._x + this._width :
			this.prop('width', x - this._x);
	},
	y2 : function(y){
		return y === undefined ?
			this._y + this._height :
			this.prop('height', y - this._y);
	},

	// todo: rename _bounds to originalBounds
	bounds : function(){
		return new Bounds(this._x, this._y, this._width, this._height);
	},

	processPath : function(ctx){
		ctx.beginPath();
		ctx.rect(this._x, this._y, this._width, this._height);
	}

});

Rect.props = [ 'x', 'y', 'width', 'height' ];
Rect.processStyle = true;
Rect.firstObject = true; // parse the first argument if it is object
Rect.propHandlers = [distance, distance, distance, distance];

$.rect = function(){
	var rect = new Rect(arguments);
	rect.init();
	return rect;
};

// todo: x1, y1, x2, y2 animation