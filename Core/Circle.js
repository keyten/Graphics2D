Circle = new Class(Drawable, {

	initialize : function(args, context){
		this.super('initialize', arguments);

		if(isObject(args[0])){
			args = this.processObject(args[0], Circle.args);
		}

		this.attrs.cx = args[0];
		this.attrs.cy = args[1];
		this.attrs.radius = args[2];
		if(args[3]){
			this.styles.fillStyle = args[3];
		}
		if(args[4]){
			this.attrs.stroke = args[4];
			Drawable.processStroke(args[4], this.styles);
		}
	},

	attrHooks: new DrawableAttrHooks({
		cx: {
			set: function(value){
				this.update();
			}
		},
		cy: {
			set: function(value){
				this.update();
			}
		},
		radius: {
			set: function(value){
				this.update();
			}
		}
	}),

	isPointIn : function(x, y){
		var point = this.super('isPointIn', [x, y]);
		x = point[0];
		y = point[1];
		return (Math.pow(x - this.attrs.cx, 2) + Math.pow(y - this.attrs.cy, 2)) <= Math.pow(this.attrs.radius, 2);
	},

	bounds: function(transform, around){
		return this.super('bounds', [
			[this.attrs.cx - this.attrs.radius, this.attrs.cy - this.attrs.radius, this.attrs.radius * 2, this.attrs.radius * 2],
			transform, around
		]);
	},

	draw : function(ctx){
		if(this.attrs.visible){
			this.context.renderer.drawCircle(
				[this.attrs.cx, this.attrs.cy, Math.abs(this.attrs.radius)],
				ctx, this.styles, this.matrix, this
			);
		}
	},

	processPath: function(ctx){
		ctx.beginPath();
		ctx.arc(this.attrs.cx, this.attrs.cy, Math.abs(this.attrs.radius), 0, Math.PI * 2, true);
	}

});

Circle.args = ['cx', 'cy', 'radius', 'fill', 'stroke'];

['cx', 'cy', 'radius'].forEach(function(propName){
	Circle.prototype.attrHooks[propName].preAnim = Drawable.prototype.attrHooks._num.preAnim;
	Circle.prototype.attrHooks[propName].anim = Drawable.prototype.attrHooks._num.anim;
});

Delta.circle = function(){
	return new Circle(arguments);
};

Delta.Circle = Circle;