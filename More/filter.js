//# Filters
var nativeDraw = Img.prototype.draw;

Img.prototype.filter = function(filter, options){
	if(!this._image.complete){
		return this.on('load', function(){
			this.filter(filter, options);
		});
	}

	var data = this.context.context.getImageData(this._x, this._y, this._width, this._height);

	if( typeof filter !== 'function' ){

		if( $.filters[filter] === undefined ){
			throw new Error('Filter \"' + filter + '\" is not defined.');
		}
		
		filter = $.filters[filter];
	}

	if( filter.call(this, data.data, options || {}) !== false ){
		this._imageData = data;
		this.context.context.putImageData(data, this._x, this._y);
	}

	return this;
};

Img.prototype.draw = function(ctx){
	// unknown bug in Chrome 43
	if(this._imageData)
		ctx.putImageData(this._imageData, this._x, this._y);
	else
		nativeDraw.call(this, ctx);

	return this;
};

$.filters = {

	pixel : function(data, callback){
		var pixel,
			i = 0,
			l = data.length;

		for(; i < l; i += 4){
			pixel = callback(data[i], data[i+1], data[i+2], data[i+3], i);
			data[i]   = pixel[0];
			data[i+1] = pixel[1];
			data[i+2] = pixel[2];
			data[i+3] = pixel[3];
		}

	},

	vertex : function(data, callback){
		var pixel,
			w = this._width,
			h = this._height,
			result = this.context.context.createImageData(w, h),
			rdata = result.data,
			i = 0,
			l = data.length,
			idw = w / 4;
		for(; i < l; i += 4){
			pixel = callback(
				(i / 4) % w, Math.floor(i / 4 / w),
				data[i], data[i+1], data[i+2], data[i+3],
				i);
			pixel = (w * pixel[1] + pixel[0]) * 4;
			rdata[pixel] = data[i];
			rdata[pixel+1] = data[i+1];
			rdata[pixel+2] = data[i+2];
			rdata[pixel+3] = data[i+3];
		}
		this._imageData = result;
		this.update();
		return false;
	}

};