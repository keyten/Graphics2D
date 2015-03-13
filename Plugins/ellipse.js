/*! Graphics2D Ellipse
 *  Author: Keyten aka Dmitriy Miroshnichenko
 *  License: MIT / LGPL
 */
(function(window, $, undefined){

	var Ellipse = $.Class($.Circle, {
		initialize : function(object){
			this._rx = this._ry = this._radius;

			if($.util.isHash(object)){
				this._rx = object.rx;
				this._ry = object.ry;
				if(object.kappa !== undefined)
					this._kappa = object.kappa;
			}
		},

		_rx : 0,
		_ry : 0,
		_kappa : 4/3 * (Math.sqrt(2) - 1),

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
		kappa : function(kappa){
			return this._property('kappa', kappa);
		},

		processPath : function(ctx){
			// http://stackoverflow.com/questions/2172798/how-to-draw-an-oval-in-html5-canvas/23184724#23184724
			ctx.beginPath();
			if(ctx.ellipse){
				// x, y, radiusX, radiusY, rotation, startAngle, endAngle, anticlockwise
				ctx.ellipse(this._cx, this._cy, this._rx, this._ry, 0, 0, Math.PI * 2, true);
				return;
			}

			var kappa = this._kappa,
				cx = this._cx,
				cy = this._cy,
				rx = this._rx,
				ry = this._ry,

				ox = rx * kappa,
				oy = ry * kappa;

			ctx.moveTo(cx - rx, cy);
			ctx.bezierCurveTo(cx - rx, cy - oy, cx - ox, cy - ry, cx, cy - ry);
			ctx.bezierCurveTo(cx + ox, cy - ry, cx + rx, cy - oy, cx + rx, cy);
			ctx.bezierCurveTo(cx + rx, cy + oy, cx + ox, cy + ry, cx, cy + ry);
			ctx.bezierCurveTo(cx - ox, cy + ry, cx - rx, cy + oy, cx - rx, cy);
			ctx.closePath(); // fix for a last corner with kappa=0
		}
	});

	Ellipse.kappa = Ellipse.prototype._kappa;
	$.Ellipse = Ellipse;

	// animating corners
	$.Shape.prototype._anim.rx = $.Shape.prototype._anim.number;
	$.Shape.prototype._anim.ry = $.Shape.prototype._anim.number;
	$.Shape.prototype._anim.kappa = {
		start : function(){
			this._animData.kappaStart = this._kappa;
		},
		step : function(end, t){
			this._kappa = this._animData.kappaStart * (1 - t) + end * t;
		},
		end : function(){
			delete this._animData.kappaStart;
		}
	};

	$.Context.prototype.ellipse = function(cx, cy, rx, ry, fill, stroke){
		if($.util.isNumber(ry) || (typeof ry === 'string' && ry.search(/\d+/) === 0)){
			return this.push(new Ellipse({
				cx:cx, cy:cy, rx:rx, ry:ry, fill:fill, stroke:stroke
			}, null, null, null, null, this));
		}
		return this.push(new Ellipse(cx, cy, rx, ry, fill, this));
	};

})(window, Graphics2D);