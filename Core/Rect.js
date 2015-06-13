Rect = new Class(Shape, {

	init : function(){
		var props = this._x;
		if(isObject( props )){
			this._x = props.x;
			this._y = props.y;
			this._width  = props.width  || props.w || 0;
			this._height = props.height || props.h || 0;
			this._parseHash(props);
		} else {
			this._processStyle();
		}
	},

	// parameters
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

	_bounds : function(){
		return new Bounds(this._x, this._y, this._width, this._height);
	},
	processPath : function(ctx){
		ctx.beginPath();
		ctx.rect(this._x, this._y, this._width, this._height);
	}

});
Rect.props = [ 'x', 'y', 'width', 'height', 'fill', 'stroke' ];
Rect.distances = [ true, true, true, true ];