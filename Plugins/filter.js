/*! Graphics2D Filters 1.0
 *  Author: Keyten aka Dmitriy Miroshnichenko
 *  License: MIT / LGPL
 */
(function(window, $, undefined){

	var oldDraw = $.Image.prototype.draw;

	$.Image.prototype.filter = function(filter, options){
		var data = this.context.context.getImageData(this._x, this._y, this._width, this._height);
		if($.filters[filter].call(this, data.data, options || {}) !== false){
			this._imageData = data;
			this.context.context.putImageData(data, this._x, this._y);
		}
		return this;
	};

	$.Image.prototype.draw = function(ctx){
		if(this._imageData){
			ctx.putImageData(this._imageData, this._x, this._y);
		}
		else oldDraw.call(this, ctx);
	};

	$.filters = {
		vertex: function(data, callback){
			var w = this._width,
				h = this._height,
				result = this.context.context.createImageData(w, h),
				rdata = result.data,
				pixel;
			for(var i = 0; i < data.length; i+=4){
				pixel = callback(
					(i / 4) % w, Math.floor(i / 4 / w),
					data[i], data[i+1], data[i+2], data[i+3],
					i);
				pixel = (w * pixel.y + pixel.x) * 4; // is it wrong?
				rdata[pixel] = data[i];
				rdata[pixel+1] = data[i+1];
				rdata[pixel+2] = data[i+2];
				rdata[pixel+3] = data[i+3];
			}
			this._imageData = result;
			this.update();
			return false;
		},

		pixel: function(data, options){
			var pixel, i;
			if(typeof options === 'function'){
				for(i = 0; i < data.length; i+= 4){
					pixel = options(data[i], data[i+1], data[i+2], data[i+3]);
					data[i]   = pixel.r;
					data[i+1] = pixel.g;
					data[i+2] = pixel.b;
					data[i+3] = pixel.a;
				}
			}
			else {
				var callback = options.callback,
					opacity  = options.opacity,
					interpolate = $.util.interpolate;
				for(i = 0; i < data.length; i+= 4){
					pixel = callback(data[i], data[i+1], data[i+2], data[i+3]);
					data[i]   = interpolate(data[i], pixel.r, opacity);
					data[i+1] = interpolate(data[i+1], pixel.g, opacity);
					data[i+2] = interpolate(data[i+2], pixel.b, opacity);
				}
			}
		}
	};

})(window, Graphics2D);