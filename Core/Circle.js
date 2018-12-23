Circle = new Class(Drawable, {
	argsOrder: ['cx', 'cy', 'radius', 'fill', 'stroke'],

	attrHooks: new DrawableAttrHooks({
		cx: {set: updateSetter},
		cy: {set: updateSetter},
		radius: {set: updateSetter}
	}),

	isPointIn : function(x, y, options){
		options = (options === 'mouse' ? this.attrs.interactionProps : options) || {};
		var point = this.isPointInBefore(x, y, options);
		x = point[0];
		y = point[1];
		var stroke = options.stroke ? (this.styles.lineWidth || 0) / 2 : 0;
//		if(options.fill === false && Math.pow(x - this.attrs.cx, 2) + Math.pow(y - this.attrs.cy, 2) <= Math.pow(this.attrs.radius - stroke, 2)){
//			return false;
//		}
		return (Math.pow(x - this.attrs.cx, 2) + Math.pow(y - this.attrs.cy, 2)) <= Math.pow(this.attrs.radius + stroke, 2);
	},

	preciseBounds : function(){
		return new Bounds(
			this.attrs.cx - this.attrs.radius,
			this.attrs.cy - this.attrs.radius,
			this.attrs.radius * 2,
			this.attrs.radius * 2
		);
	},
/*
	bounds: function(transform, around){
		return this.super('bounds', [
			[this.attrs.cx - this.attrs.radius, this.attrs.cy - this.attrs.radius, this.attrs.radius * 2, this.attrs.radius * 2],
			transform, around
		]);
	}, */

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

Circle.args = ['cx', 'cy', 'radius', 'fill', 'stroke'];

['cx', 'cy', 'radius'].forEach(function(propName){
	Circle.prototype.attrHooks[propName].preAnim = Drawable.prototype.attrHooks._num.preAnim;
	Circle.prototype.attrHooks[propName].anim = Drawable.prototype.attrHooks._num.anim;
});

Delta.circle = function(){
	return new Circle(arguments);
};

Delta.Circle = Circle;