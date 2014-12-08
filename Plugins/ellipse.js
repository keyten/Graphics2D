/*! Graphics2D Ellipse
 *  Author: Keyten aka Dmitriy Miroshnichenko
 *  License: MIT / LGPL
 */
(function(window, $, undefined){

	var Ellipse = $.Class($.Circle, {
		initialize : function(object){
			// TODO: parameters
			this._rx = this._ry = this._radius;

			if($.util.isHash(object)){
				this._rx = object.rx;
				this._ry = object.ry;
			}
		},

		_rx : 0,
		_ry : 0,

		radius : function(radius){
			if(radius === undefined){
				if(this._rx !== this._ry)
					return null;
				return this._rx;
			}
			this._rx = this._ry = radius;
			return this.update();
		},

		rx : function(rx){
			return this._property('rx', rx);
		},
		ry : function(ry){
			return this._property('ry', ry);
		},

		processPath : function(ctx){
			if(this._rx === this._ry)
				return $.Circle.prototype.processPath.call(this, ctx);

			var cx = this._cx,
				cy = this._cy,
				rx = this._rx,
				ry = this._ry;
			ctx.beginPath();

			// move to top
			ctx.moveTo(cx, cy - ry);

			// left
			ctx.quadraticCurveTo(cx + rx, cy - ry, cx + rx, cy);

			// bottom
			ctx.quadraticCurveTo(cx + rx, cy + ry, cx, cy + ry);

			// right
			ctx.quadraticCurveTo(cx - rx, cy + ry, cx - rx, cy);

			// top
			ctx.quadraticCurveTo(cx - rx, cy - ry, cx, cy - ry);
		}
	});

	$.Ellipse = Ellipse;

	// animating corners
	$.Shape.prototype._anim.rx = $.Shape.prototype._anim.number;
	$.Shape.prototype._anim.ry = $.Shape.prototype._anim.number;

	$.Context.prototype.ellipse = function(cx, cy, radius, /* rx, ry */ fill, stroke){
		return this.push(new Ellipse(cx, cy, radius, fill, stroke, this));
	};

})(window, Graphics2D);