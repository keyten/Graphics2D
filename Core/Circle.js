Circle = new Class(Drawable, {
	argsOrder : ['cx', 'cy', 'radius', 'fill', 'stroke'],

	attrHooks : new DrawableAttrHooks({
		cx : {
			set : function(value){
				this.attrs.cx = distance(value);
				this.update();
			}
		},
		cy : {
			set : function(value){
				this.attrs.cy = distance(value);
				this.update();
			}
		},
		radius : {
			set : function(value){
				this.attrs.radius = distance(value);
				this.update();
			}
		}
	}),

	isPointIn : function(x, y, options){
		var point = this.isPointInBefore(x, y, options);
		x = point[0];
		y = point[1];
		return (Math.pow(x - this.attrs.cx, 2) + Math.pow(y - this.attrs.cy, 2)) <= Math.pow(this.attrs.radius, 2);
	},

	preciseBounds : function(){
		return new Bounds(
			this.attrs.cx - this.attrs.radius,
			this.attrs.cy - this.attrs.radius,
			this.attrs.radius * 2,
			this.attrs.radius * 2
		);
	},

	draw : function(ctx){
		if(this.attrs.visible){
			this.preDraw(ctx);
			ctx.beginPath();
			ctx.arc(
				this.attrs.cx,
				this.attrs.cy,
				Math.abs(this.attrs.radius),
				0,
				Math.PI * 2,
				true
			);
			this.postDraw(ctx);
		}
	},

	processPath: function(ctx){
		ctx.beginPath();
		ctx.arc(this.attrs.cx, this.attrs.cy, Math.abs(this.attrs.radius), 0, Math.PI * 2, true);
	}

});

Circle.prototype.roughBounds = Circle.prototype.preciseBounds;

['cx', 'cy', 'radius'].forEach(function(propName){
	Circle.prototype.attrHooks[propName].preAnim = Animation.tick.numAttr.preAnim;
	Circle.prototype.attrHooks[propName].anim = Animation.tick.numAttr.anim;
});

Delta.circle = function(){
	return new Circle(arguments);
};

Delta.Circle = Circle;