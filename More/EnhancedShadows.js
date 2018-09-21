Drawable.prototype.attrHooks.shadow = {
	set: function(value){
		this._useEnhancedShadow = !(value + '' === value || (
			value.length === undefined &&
			value.opacityDependence !== false &&
			+value.opacity !== value.opacity &&
			+value.size !== value.size));

		if(!this._useEnhancedShadow){
			Drawable.processShadow(value, this.styles);
		} else {
			// todo: make up a good way to delete items
			// without delete
			delete this.styles.shadowOffsetX;
			delete this.styles.shadowOffsetY;
			delete this.styles.shadowBlur;
			delete this.styles.shadowColor;

			if(!value.length){
				value = [value];
			}
		//	this.attrs.shadow = value;
		}

		this.update();
	}
};

var offsetForShadow = 1000;

var pre = Circle.prototype.draw;
Circle.prototype.draw = function(ctx){
	// вполне умещается в переопределение Renderer.pre
	if(this._useEnhancedShadow){
		ctx.save();
		ctx.translate(-offsetForShadow, -offsetForShadow);

		var thisContext = {
			attrs: {
				visible: true
			},
			context: {
				renderer: {
					pre: function(){},
					post: function(){}
				}
			}
		};
		// нам нужны только трансформации на самом деле
		// this.context.renderer.pre(ctx, this.styles, this.matrix, this);
		this.attrs.shadow.forEach(function(shadowElem){
			// нужно бы, чтобы offsetForShadow зависел ещё и от трансформаций самого канваса сейчас
			ctx.shadowOffsetX = (shadowElem.x || 0) + offsetForShadow;
			ctx.shadowOffsetY = (shadowElem.y || 0) + offsetForShadow;
			ctx.shadowColor = shadowElem.color;
			ctx.shadowBlur = shadowElem.blur || 0;
			if(shadowElem.size && shadowElem.size !== 1){
				;
			}
			pre.call(this, ctx);
		}, this);
		ctx.restore();
	}
	pre.call(this, ctx);
};
