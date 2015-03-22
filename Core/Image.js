var smoothWithPrefix;
function smoothPrefix(ctx){
	if(smoothWithPrefix) return smoothWithPrefix;
	['mozImageSmoothingEnabled', 'webkitImageSmoothingEnabled', 'msImageSmoothingEnabled', 'imageSmoothingEnabled'].forEach(function(name){
		if(name in ctx)
			smoothWithPrefix = name;
	});
	return smoothWithPrefix;
}

// https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Drawing_DOM_objects_into_a_canvas
var domurl = window.URL || window.webkitURL || window;

Img = new Class(Shape, {

	init : function(){
		// Note: the 5th argument is crop

		var props = this._image;
		if(isHash(props)){
			this._image = props.image;
			this._x = props.x;
			this._y = props.y;
			this._width = props.width;
			this._height = props.height;
			this._crop = props.crop;
			this._parseHash(props);
		}

		var blob, s;

		if(isString(this._image)){
			if(this._image[0] === '#')
				this._image = document.getElementById( this._image.substr(1) );
			else if(this._image.indexOf('<svg') === 0){
				blob = new Blob([this._image], {type: 'image/svg+xml;charset=utf-8'});
				this._image = new Image();
				this._image.src = domurl.createObjectURL(blob);
			}
			else {
				s = new Image();
				s.src = this._image;
				this._image = s;
			}
		}

		// image already loaded
		if(this._image.complete){
			s = this._computeSize(this._width, this._height, this._image);
			this._width = s[0];
			this._height = s[1];
		}
		
		this._image.addEventListener('load', function(){
			this.fire('load');
			s = this._computeSize(this._width, this._height, this._image);
			this._width = s[0];
			this._height = s[1];
			this.update();

			if(blob)
				domurl.revokeObjectURL(blob);
		}.bind(this));
		// Video tag support
	},
	
	_computeSize : function(w, h, image){
		// num, num
		if(isNumber(w) && isNumber(h))
			return [w, h];

		// 'native', 'native' or 'auto', 'auto'
		// and undefined, undefined
		if((isString(w) && isString(h)) || (w === undefined && h === undefined))
			return [image.width, image.height];

		// native
		if(w === 'native' || h === 'native')
			return [w === 'native' ? image.width : w,
					h === 'native' ? image.height : h];
	
		// auto
		if(w === 'auto' || h === 'auto')
			return [w === 'auto' ? image.width * (h / image.height) : w,
					h === 'auto' ? image.height * (w / image.width) : h];
	},

	x  : Rect.prototype.x,
	y  : Rect.prototype.y,
	x1 : Rect.prototype.x1,
	y1 : Rect.prototype.y1,
	x2 : Rect.prototype.x2,
	y2 : Rect.prototype.y2,
	width : function(w){
		if(w === undefined) return this._width;
		return this._property('width', this._computeSize(w, this._height, this._image)[0]);
	},
	height : function(h){
		if(h === undefined) return this._height;
		return this._property('height', this._computeSize(this._width, h, this._image)[1]);
	},
	bounds : Rect.prototype.bounds,
	processPath : Rect.prototype.processPath, // for event listeners

	crop : function(arr){
		if(arguments.length === 0)
			return this._crop;
		if(arguments.length > 1)
			this._crop = Array.prototype.slice.call(arguments, 0);
		else if(arr === null)
			delete this._crop;
		else this._crop = arr;
		return this.update();
	},

	smooth : function(value){
		var style = this._style,
			prefix = smoothPrefix(this.context.context);
		if(value === undefined)
			return style[prefix] === undefined ? this.context.context[prefix] : style[prefix];
		style[prefix] = !!value;
		return this.update();
	},

	_smooth : true,

	draw : function(ctx){
		if(!this._visible)
			return;
		this._applyStyle();

		if(this._crop !== undefined)
			ctx.drawImage(this._image, this._crop[0], this._crop[1], this._crop[2], this._crop[3], this._x, this._y, this._width, this._height);
		else if(this._width !== undefined)
			ctx.drawImage(this._image, this._x, this._y, this._width, this._height);
		else
			ctx.drawImage(this._image, this._x, this._y);

		if(this._style.strokeStyle !== undefined)
			ctx.strokeRect(this._x, this._y, this._width, this._height);
		ctx.restore();
	}

});

Img.props = [ 'image', 'x', 'y', 'width', 'height', 'crop' ];

$.fx.step.crop = function( fx ){
	if( fx.state === 0 ){
		fx.start = fx.elem._crop;
		if( !fx.start ){
			fx.start = [ 0, 0, fx.elem._image.width, fx.elem._image.height ];
		}
		console.log(fx.start);
	}

	fx.elem._crop = [
		Math.round(fx.start[0] + (fx.end[0] - fx.start[0]) * fx.pos),
		Math.round(fx.start[1] + (fx.end[1] - fx.start[1]) * fx.pos),
		Math.round(fx.start[2] + (fx.end[2] - fx.start[2]) * fx.pos),
		Math.round(fx.start[3] + (fx.end[3] - fx.start[3]) * fx.pos)
		];
};

/*	Img.prototype._anim.crop = {
	// extends the Shape::_anim
	start : function(end){
		this._animData.cropStart = this._crop || [0, 0, this._width, this._height];
	},
	process :function(end, t, property){
		var start = this._animData.cropStart,
			i = 1 - t;
		this._crop = [
			start[0] * i + end[0] * t,
			start[1] * i + end[1] * t,
			start[2] * i + end[2] * t,
			start[3] * i + end[3] * t
		];
	}
},
 */