Rect = new Class(Drawable, {

	initialize : function(args, context){
		this.super('initialize', arguments);

		if(isObject(args[0])){
			args = this.processObject(args[0], Rect.args);
		}

		this.attrs.x = args[0];
		this.attrs.y = args[1];
		this.attrs.width = args[2];
		this.attrs.height = args[3];
		if(args[4]){
			this.styles.fillStyle = args[4];
		}
		if(args[5]){
			Drawable.processStroke(args[5], this.styles);
		}
	},

	attrHooks: extend(Object.assign({}, Drawable.prototype.attrHooks), {
		x: {
			set: function(value){
				this.update();
				return value;
			}
		},
		y: {
			set: function(value){
				this.update();
				return value;
			}
		},
		width: {
			set: function(value){
				this.update();
				return value;
			}
		},
		height: {
			set: function(value){
				this.update();
				return value;
			}
		},

		x1: {
			get: function(){
				return this.attrs.x;
			},
			set: function(value){
				this.attrs.x = value;
				this.update();
			}
		},
		y1: {
			get: function(){
				return this.attrs.y;
			},
			set: function(value){
				this.attrs.y = value;
				this.update();
			}
		},
		x2: {
			get: function(){
				return this.attrs.x + this.attrs.width;
			},
			set: function(value){
				this.attrs.width = value - this.attrs.x;
				this.update();
			}
		},
		y2: {
			get: function(){
				return this.attrs.y + this.attrs.height;
			},
			set: function(value){
				this.attrs.height = value - this.attrs.y;
				this.update();
			}
		}
	}),

	// this variation is faster
	// very very faster!
	// if you change an attrs of 100 000 elements
	// then all x-ses will work in ~ 7 ms
	// all attr-s — in ~ 100 ms
	/* x: function(val){
		if(val === undefined){
			return this.attrs.x;
		}
		this.attrs.x = val;
		return this.update();
	}, */

	shapeBounds : function(){
		return [this.attrs.x, this.attrs.y, this.attrs.width, this.attrs.height];
	},

	draw : function(ctx){
		if(this._visible){
			this.context.renderer.drawRect(
				[this.attrs.x, this.attrs.y, this.attrs.width, this.attrs.height],
				ctx, this.styles, this.matrix, this
			);
		}
	},

	isPointIn : function(x, y){
		return x > this.attrs.x && y > this.attrs.y && x < this.attrs.x + this.attrs.width && y < this.attrs.y + this.attrs.height;
	}

});

Rect.args = ['x', 'y', 'width', 'height', 'fill', 'stroke'];

$.rect = function(){
	return new Rect(arguments);
};