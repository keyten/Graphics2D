// DEPRECATED

var smoothWithPrefix;
function smoothPrefix(ctx){
	if(smoothWithPrefix){
		return smoothWithPrefix;
	}
	['mozImageSmoothingEnabled', 'webkitImageSmoothingEnabled', 'msImageSmoothingEnabled', 'imageSmoothingEnabled'].forEach(function(name){
		if(name in ctx){
			smoothWithPrefix = name;
		}
	});
	return smoothWithPrefix;
}

// todo: rename to...
// Raster, for ex.
Img = new Class(Drawable, {

	initialize : function(args, context){
		this.super('initialize', arguments);

		if(isObject(args[0])){
			args = this.processObject(args[0], Circle.args);
		}

		this.attrs.image = args[0]; // Raster.parseImage(args[0]);
		this.attrs.x = args[1];
		this.attrs.y = args[2];
		if(args[3]){
			this.attrs.width = args[3];
		}
		if(args[4]){
			this.attrs.height = args[4];
		}
		if(args[5]){
			this.attrs.crop = args[5];
		}

/*		if(this.object){
			var object = this.object;
			this._image = object.image;
			this._x = $.distance(object.x); // distance
			this._y = $.distance(object.y);
			this._width = $.distance(object.width);
			this._height = $.distance(object.height);
			this._crop = object.crop;
		}

		var blob, s;

		if(isString(this._image)){
			if(this._image[0] === '#'){
				this._image = document.getElementById( this._image.substr(1) );
			}

			// https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Drawing_DOM_objects_into_a_canvas
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


		this._image.addEventListener('load', function(e){
			this.update();

			if(blob){
				domurl.revokeObjectURL(blob);
			}

			this.fire('load', e);
		}.bind(this));

		this._image.addEventListener('error', function(e){
			this.fire('error', e);
		}.bind(this)); */

		// Video tag support?
	},

/*
	x  : Rect.prototype.x,
	y  : Rect.prototype.y,
	x1 : Rect.prototype.x1,
	y1 : Rect.prototype.y1,
	x2 : Rect.prototype.x2, // wrong!!! with 'auto', 'native'
	y2 : Rect.prototype.y2,
	width : function(w){
		if(w === undefined){
			if(this._width === 'auto'){
				return this._image.width * (this._height / this._image.height);
			} else if(this._width === 'native' || this._width == null){
				return this._image.width;
			}
			return this._width;
		}

		if(!this._image.complete){
			return this.once('load', 'width', w); // todo: once?
		}

		if(isNumberLike(w)){
			w = $.distance(w);
		}

		return this.prop('width', w);
	},
	height : function(h){
		if(h === undefined){
			if(this._height === 'auto'){
				return this._image.height * (this._width / this._image.width);
			} else if(this._height === 'native' || this._height == null){
				return this._image.height;
			}
			return this._height;
		}

		if(!this._image.complete){
			return this.once('load', 'height', h);
		}

		if(isNumberLike(h)){
			h = $.distance(h);
		}

		return this.prop('height', h);
	},
	_bounds : Rect.prototype._bounds,

	processPath : function(ctx){ // for event listeners
		ctx.beginPath();
		ctx.rect(this._x, this._y, this.width(), this.height());
	},

	load : function(fn){
		if(typeof fn === 'function' || isString(fn)){
			return this.on.apply(this, ['load'].concat(slice.call(arguments)));
		} else {
			return this.fire.apply(this, arguments);
		}
	},

	crop : function(arr){
		if(arguments.length === 0){
			return this._crop;
		}
		if(arguments.length > 1){
			this._crop = Array.prototype.slice.call(arguments, 0);
		} else if(arr === null){
			delete this._crop;
		}
		else {
			this._crop = arr;
		}
		return this.update();
	},

	smooth : function(value){
		var style = this.styles,
			prefix = smoothPrefix(this.context.context);
		if(value === undefined){
			return style[prefix] === undefined ? this.context.context[prefix] : style[prefix];
		}
		style[prefix] = !!value;
		return this.update();
	},

	_smooth : true, */

	draw : function(ctx){
		if(this._visible){
			var params = [this._image, this._x, this._y];
			this.context.renderer.drawImage(params, ctx, this.styles, this.matrix, this);
		}
		// закомментить, не стирать
		/* if(!this._visible){
			return;
		}
		ctx.save();
		this.styleToContext(ctx);
		var image = this._image,
			w = this._width,
			h = this._height;

		if(w === 'auto'){
			w = image.width * (h / image.height);
		} else if(w === 'native' || w == null){
			w = image.width;
		}

		if(h === 'auto'){
			h = image.height * (w / image.width);
		} else if(h === 'native' || h == null){
			h = image.height;
		}

		if(this._crop !== undefined){
			ctx.drawImage(image, this._crop[0], this._crop[1], this._crop[2], this._crop[3], this._x, this._y, w, h);
		} else if(w != null || h != null){
			ctx.drawImage(image, this._x, this._y, w, h);
		}

		if(this.styles.strokeStyle !== undefined){
			ctx.strokeRect(this._x, this._y, this._width, this._height);
		}
		ctx.restore(); */
	}

});

Img.args = ['image', 'x', 'y', 'width', 'height', 'crop'];

$.image = function(){
	var image = new Img(arguments);
	return image;
};

$.fx.step.crop = function( fx ){
	if( fx.state === 0 ){
		fx.start = fx.elem._crop;
		if( !fx.start ){
			fx.start = [ 0, 0, fx.elem._image.width, fx.elem._image.height ];
		}
	}

	fx.elem._crop = [
		Math.round(fx.start[0] + (fx.end[0] - fx.start[0]) * fx.pos),
		Math.round(fx.start[1] + (fx.end[1] - fx.start[1]) * fx.pos),
		Math.round(fx.start[2] + (fx.end[2] - fx.start[2]) * fx.pos),
		Math.round(fx.start[3] + (fx.end[3] - fx.start[3]) * fx.pos)
		];
};