	$.Rect = Rect = new Class(Shape, {

		initialize : function(x, y, w, h, fill, stroke, context){
			this.context = context;
			if(isHash(x)){
				this._x = x.x;
				this._y = x.y;
				this._width = x.width;
				this._height = x.height;
				this._parseHash(x);
			}
			else {
				this._x = x;
				this._y = y;
				this._width = w;
				this._height = h;
				this._processStyle(fill, stroke, context.context);
			}
		},

		// parameters
		x : function(x){
			return this._property('x', x);
		},
		y : function(y){
			return this._property('y', y);
		},
		width : function(w){
			return this._property('width', w);
		},
		height : function(h){
			return this._property('height', h);
		},
		x1 : function(x){
			return x === undefined ?
				this._x :
				this._property('width', this._width - x + this._x)
					._property('x', x);
		},
		y1 : function(y){
			return y === undefined ?
				this._y :
				this._property('height', this._height - y + this._y)
					._property('y', y);
		},
		x2 : function(x){
			return x === undefined ?
				this._x + this._width :
				this._property('width', x - this._x);
		},
		y2 : function(y){
			return y === undefined ?
				this._y + this._height :
				this._property('height', y - this._y);
		},

		bounds : function(){
			return new Bounds(this._x, this._y, this._width, this._height);
		},
		processPath : function(ctx){
			ctx.beginPath();
			ctx.rect(this._x, this._y, this._width, this._height);
		}

	});
