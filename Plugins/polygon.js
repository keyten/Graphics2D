/*! Graphics2D Regular Polygon
 *  Author: Keyten aka Dmitriy Miroshnichenko
 *  License: MIT / LGPL
 */
(function(window, $, undefined){

	var pi2 = Math.PI * 2;
	var Polygon = $.Class($.Shape, {
		initialize : function(cx, cy, radius, sides, fill, stroke, context){
			this._z = context.elements.length;
			this.context = context;
			if($.util.isHash(cx)){
				this._cx = cx.cx || cx.x;
				this._cy = cx.cy || cx.y;
				this._radius = cx.radius;
				this._sides = cx.sides;
				this._parseHash(cx);
			}
			else {
				this._cx = cx;
				this._cy = cy;
				this._radius = radius;
				this._sides = sides;
				this._processStyle(fill, stroke, context.context);
			}
		},

		processPath : function(ctx){
			ctx.beginPath();
			for(var i = 0; i < this._sides; i++){
				var angle = pi2 * i / this._sides;
				ctx.lineTo(this._cx + this._radius * Math.cos(angle), this._cy + this._radius * Math.sin(angle));
			}
			ctx.closePath();
		}
	});

	$.Polygon = Polygon;

	// animation
	$.Shape.prototype._anim.sides = $.Shape.prototype._anim.number;

	$.Context.prototype.polygon = function(cx, cy, radius, sides, fill, stroke){
		return this.push(new Polygon(cx, cy, radius, sides, fill, stroke, this));
	};

})(window, Graphics2D);