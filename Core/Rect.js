Rect = new Class(Drawable, {
	argsOrder: ['x', 'y', 'width', 'height', 'fill', 'stroke'],

	attrHooks: new DrawableAttrHooks({
		x: {set: updateSetter},
		y: {set: updateSetter},
		width: {set: updateSetter},
		height: {set: updateSetter},

		x1: {
			get: function(){
				return this.attrs.x;
			},
			set: function(value){
				this.attrs.width += (this.attrs.x - value);
				this.attrs.x = value;
				this.update();
				return null;
			}
		},
		y1: {
			get: function(){
				return this.attrs.y;
			},
			set: function(value){
				this.attrs.height += (this.attrs.y - value);
				this.attrs.y = value;
				this.update();
				return null;
			}
		},
		x2: {
			get: function(){
				return this.attrs.x + this.attrs.width;
			},
			set: function(value){
				this.attrs.width = value - this.attrs.x;
				this.update();
				return null;
			}
		},
		y2: {
			get: function(){
				return this.attrs.y + this.attrs.height;
			},
			set: function(value){
				this.attrs.height = value - this.attrs.y;
				this.update();
				return null;
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
		x = point[0];
		y = point[1];
		return x > this.attrs.x && y > this.attrs.y && x < this.attrs.x + this.attrs.width && y < this.attrs.y + this.attrs.height;
	},

	preciseBounds : function(){
		return new Bounds(
			this.attrs.x,
			this.attrs.y,
			this.attrs.width,
			this.attrs.height
		);
	},
/*
	bounds: function(transform, around){
		return this.super('bounds', [
			[this.attrs.x, this.attrs.y, this.attrs.width, this.attrs.height],
			transform, around
		]);
	}, */

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


['x', 'y', 'width', 'height', 'x1', 'x2', 'y1', 'y2'].forEach(function(propName, i){
	var tick = i > 3 ? Animation.tick.numAttr : Animation.tick.num;
	Rect.prototype.attrHooks[propName].preAnim = tick.preAnim;
	Rect.prototype.attrHooks[propName].anim = tick.anim;
}); 

Delta.rect = function(){
	return new Rect(arguments);
};

Delta.Rect = Rect;