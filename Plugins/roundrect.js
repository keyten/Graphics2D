/*! Graphics2D RoundRect
 *  Author: Keyten aka Dmitriy Miroshnichenko
 *  License: MIT / LGPL
 */
(function(window, $, undefined){

	var RoundRect = $.Class($.Rect, {
		initialize : function(object){
			if($.util.isHash(object)){
				this._rx = object.rx;
				this._ry = object.ry;
			}
		},

		_rx : 0,
		_ry : 0,

		rx : function(rx){
			return this._property('rx', rx);
		},
		ry : function(ry){
			return this._property('ry', ry);
		},

		processPath : function(ctx){
			if(!this._rx && !this._ry)
				return $.Rect.prototype.processPath.call(this, ctx);

			var x = this._x,
				y = this._y,
				w = this._width,
				h = this._height,
				rx = this._rx,
				ry = this._ry;
			ctx.beginPath();
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
	});

	$.RoundRect = RoundRect;

	// animating corners
	$.Shape.prototype._anim.rx = $.Shape.prototype._anim.number;
	$.Shape.prototype._anim.ry = $.Shape.prototype._anim.number;

	$.Context.prototype.roundrect = function(x, y, w, h, fill, stroke){
		return this.push(new RoundRect(x, y, w, h, fill, stroke, this));
	};

})(window, Graphics2D);