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
			Drawable.processStroke(args[4], this.styles);
		}
	},

	// прыгает z-index!
	// todo: unbound these events too
	// with requestAnimFrame
/*	update: function(){
		if(!this.context){
			return this;
		}

		var ctx = this.context.context;
		var updateList = [this];
		var bound = this.bounds();
		var maxBound = bound;

		this.context.elements.forEach(element => {
			bound = element.bounds();
			if(doRectsIntersect(bound, maxBound)){
				updateList.push(element);
				maxBound.x1 = Math.min(maxBound.x1, bound.x1);
				maxBound.y1 = Math.min(maxBound.y1, bound.y1);
				maxBound.x2 = Math.max(maxBound.x2, bound.x2);
				maxBound.y2 = Math.max(maxBound.y2, bound.y2);
			}
		});

		ctx.clearRect(maxBound.x1, maxBound.y1, maxBound.x2 - maxBound.x1, maxBound.y2 - maxBound.y1);
		// отсрочиваем отрисовку, чтобы параметры успели измениться
		requestAnimationFrame(() => updateList.forEach(element => element.draw(ctx)));
	}, */

	attrHooks: extend(Object.assign({}, Drawable.prototype.attrHooks), {
		cx: {
			set: function(value){
				this.update();
				return value;
			}
		},
		cy: {
			set: function(value){
				this.update();
				return value;
			}
		},
		radius: {
			set: function(value){
				this.update();
				return Math.abs(value);
			}
		}
	}),

	shapeBounds : function(){
		return [this.attrs.cx - this.attrs.radius, this.attrs.cy - this.attrs.radius, this.attrs.radius * 2, this.attrs.radius * 2];
	},

	draw : function(ctx){
		if(this._visible){
			this.context.renderer.drawCircle(
				[this.attrs.cx, this.attrs.cy, this.attrs.radius],
				ctx, this.styles, this.matrix, this
			);
		}
	},

	isPointIn : function(x, y){
		return (Math.pow(x - this.attrs.cx, 2) + Math.pow(y - this.attrs.cy, 2)) <= Math.pow(this.attrs.radius, 2);
	}

});

Circle.args = ['cx', 'cy', 'radius', 'fill', 'stroke'];

$.circle = function(){
	return new Circle(arguments);
};