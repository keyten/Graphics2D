//# RoundRect
Rect.prototype._rx = 0;
Rect.prototype._ry = 0;
Rect.prototype.initialize = function(){
	var props = this._x;
	if(isHash( props )){
		this._rx = props.rx || props.radius || 0;
		this._ry = props.ry || props.radius || 0;
	}
};
Rect.prototype.processPath = function(ctx){
	var x = this._x,
		y = this._y,
		w = this._width,
		h = this._height,
		rx = this._rx,
		ry = this._ry;

	ctx.beginPath();
	if(rx === 0 && ry === 0){
		ctx.rect(this._x, this._y, this._width, this._height);
	}
	else {
		ctx.moveTo(x, y + ry);

		// left side
		ctx.lineTo(x, y+h-ry);
		// left bottom corner
		ctx.quadraticCurveTo(x, y+h, x+rx, y+h);

		// bottom side
		ctx.lineTo(x+w-rx, y+h);
		// right bottom corner
		ctx.quadraticCurveTo(x+w, y+h, x+w, y+h-ry);

		// right side
		ctx.lineTo(x+w, y+ry);
		// right top corner
		ctx.quadraticCurveTo(x+w, y, x+w-rx, y);

		// top side
		ctx.lineTo(x+rx, y);
		// top left side
		ctx.quadraticCurveTo(x, y, x, y+ry);

		ctx.closePath();
	}
};

Rect.prototype.rx = function(rx){
	return this._property('rx', rx);
};

Rect.prototype.ry = function(ry){
	return this._property('ry', ry);
};

$.fx.step.rx = $.fx.step.int;
$.fx.step.ry = $.fx.step.int;