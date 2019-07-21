Rect = new Class(Drawable, {
	argsOrder : ['x', 'y', 'width', 'height', 'fill', 'stroke'],

	attrHooks : new DrawableAttrHooks({
		x : {
			set : function(value){
				this.attrs.x = distance(value);
				this.update();
			}
		},
		y : {
			set : function(value){
				this.attrs.y = distance(value);
				this.update();
			}
		},
		width : {
			set : function(value){
				this.attrs.width = distance(value);
				this.update();
			}
		},
		height : {
			set : function(value){
				this.attrs.height = distance(value);
				this.update();
			}
		},

		x1 : {
			get : function(){
				return this.attrs.x;
			},
			set : function(value){
				value = distance(value);
				this.attrs.width += (this.attrs.x - value);
				this.attrs.x = value;
				this.update();
			}
		},
		y1 : {
			get : function(){
				return this.attrs.y;
			},
			set : function(value){
				value = distance(value);
				this.attrs.height += (this.attrs.y - value);
				this.attrs.y = value;
				this.update();
			}
		},
		x2 : {
			get : function(){
				return this.attrs.x + this.attrs.width;
			},
			set : function(value){
				this.attrs.width = distance(value) - this.attrs.x;
				this.update();
			}
		},
		y2 : {
			get : function(){
				return this.attrs.y + this.attrs.height;
			},
			set : function(value){
				this.attrs.height = distance(value) - this.attrs.y;
				this.update();
			}
		}
	}),

	// For history:
	// this variation is faster
	// very very faster!
	// if you change attrs of 100 000 elements
	// then all x-ses will work in ~ 7 ms
	// all attr-s — in ~ 100 ms
	/* x: function(val){
		if(val === undefined){
			return this.attrs.x;
		}
		this.attrs.x = val;
		return this.update();
	}, */

	isPointIn : function(x, y, options){
		var point = this.isPointInBefore(x, y, options);
		return Delta.isPointInRect(point[0], point[1], this.attrs.x, this.attrs.y, this.attrs.width, this.attrs.height);
	},

	preciseBounds : function(){
		return new Bounds(
			this.attrs.x,
			this.attrs.y,
			this.attrs.width,
			this.attrs.height
		);
	},

	draw : function(ctx){
		if(this.attrs.visible){
			this.preDraw(ctx);

			if(this.attrs.fill){
				ctx.fillRect(
					this.attrs.x,
					this.attrs.y,
					this.attrs.width,
					this.attrs.height
				);
			}
			if(this.attrs.stroke){
				ctx.strokeRect(
					this.attrs.x,
					this.attrs.y,
					this.attrs.width,
					this.attrs.height
				);
			}

			ctx.restore();
		}
	},

	processPath : function(ctx){
		ctx.beginPath();
		ctx.rect(this.attrs.x, this.attrs.y, this.attrs.width, this.attrs.height);
	}
});

Rect.prototype.roughBounds = Rect.prototype.preciseBounds;

['x', 'y', 'width', 'height', 'x1', 'x2', 'y1', 'y2'].forEach(function(propName, i){
	var tick = i > 3 ? Animation.tick.numAttr : Animation.tick.num;
	Rect.prototype.attrHooks[propName].preAnim = tick.preAnim;
	Rect.prototype.attrHooks[propName].anim = tick.anim;
});

Delta.rect = function(){
	return new Rect(arguments);
};

Delta.Rect = Rect;