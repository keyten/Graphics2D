/*! Graphics2D Star
 *  Author: Keyten aka Dmitriy Miroshnichenko
 *  License: MIT / LGPL
 */
(function(window, $, undefined){

	var pi2 = Math.PI * 2;
	var Star = $.Class($.Shape, {
		initialize : function(cx, cy, radius1, radius2, points, fill, stroke, context){
			this._z = context.elements.length;
			this.context = context;
			if($.util.isHash(cx)){
				this._cx = cx.cx || cx.x;
				this._cy = cx.cy || cx.y;
				this._radius1 = cx.radius1 || (cx.radius ? cx.radius[0] : 0);
				this._radius2 = cx.radius2 || (cx.radius ? cx.radius[1] : 0);
				this._points = cx.points;
				this._distortion = cx.distortion || 0;
				this._parseHash(cx);
			}
			else {
				this._cx = cx;
				this._cy = cy;
				this._radius1 = radius1;
				this._radius2 = radius2;
				this._points = points;
				this._processStyle(fill, stroke, context.context);
			}
		},

		_distortion : 0,

		processPath : function(ctx){
			ctx.beginPath();
			for(var i = 0; i < this._points; i++){
				var angle1 = pi2 * i / this._points,
					angle2 = angle1 + (Math.PI / this._points) + this._distortion;
				ctx.lineTo(this._cx + this._radius1 * Math.cos(angle1), this._cy + this._radius1 * Math.sin(angle1));
				ctx.lineTo(this._cx + this._radius2 * Math.cos(angle2), this._cy + this._radius2 * Math.sin(angle2));
			}
		}
	});

	$.Star = Star;

	// animation
	$.Shape.prototype._anim.radius1 = $.Shape.prototype._anim.number;
	$.Shape.prototype._anim.radius2 = $.Shape.prototype._anim.number;
	$.Shape.prototype._anim.points = $.Shape.prototype._anim.number;
	$.Shape.prototype._anim.distortion = {
		start : function(){
			this._animData.distortion = this._distortion;
		},
		step : function(end, t){
			this._distortion = this._animData.distortion * (1 - t) + end * t;
		},
		end : function(){
			delete this._animData.distortion;
		}
	};


	$.Context.prototype.star = function(cx, cy, radius1, radius2, points, fill, stroke){
		return this.push(new Star(cx, cy, radius1, radius2, points, fill, stroke, this));
	};

})(window, Graphics2D);