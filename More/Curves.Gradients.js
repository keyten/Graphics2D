//# Curve gradients

Curve.prototype.visible = true;
Curve.prototype._special = false; // hides the curve and draws after

Curve.prototype.hide = function(){
	this.visible = false;
};

Curve.prototype.show = function(){
	this.visible = true;
};

Curve.prototype.fill = function(from, to){
	if(to){
		this.fill; // todo: gradient
	}
	else {
		this.fill = from;
	}
	this._special = true;
	return this.update();
};

Curve.prototype.draw = function(ctx){
	if(!this.visible)
		return;
	var from = this.from();
	ctx.save();
	ctx.beginPath();
	ctx.moveTo(from[0], from[1]);
	this.process(ctx);
	ctx.stroke();
	ctx.restore();
/*	draw : function(ctx){
		if(!this._visible)
			return;
		this._applyStyle();
		this.processPath(ctx);
		if(this._style.fillStyle)
			ctx.fill();
		if(this._style.strokeStyle)
			ctx.stroke();
		ctx.restore();
	}, */
};

Path.prototype.processPath = function(ctx){
	var curve,
		current = [0, 0],
		curves = this._curves,
		special = [],
		i = 0;

	ctx.beginPath();
	for(; i < curves.length; i++){
		if(curves[i].visible && !curves[i]._special){
			curve = curves[i].process(ctx, current);

			if(curve)
				current = curve;
		}
		else {
			current = curves[i].endsIn();
			ctx.moveTo(current[0], current[1]);
			if(curves[i]._special){
				special.push(curves[i]);
			}
		}
	}

	this._special = special;
};

Path.prototype.draw = function(ctx){
	Shape.prototype.draw.call(this, ctx);

	if(!this._special) return;

	var spec = this._special,
		i = 0;
	for(; i < spec.length; i++){
		spec[i].draw(ctx);
	}
}

/*
	path.curve(x)
			.width(...)
			.fill(...)
			.stroke(...);
*/