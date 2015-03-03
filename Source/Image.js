	var smoothWithPrefix;
	function smoothPrefix(ctx){
		if(smoothWithPrefix) return smoothWithPrefix;
		['imageSmoothingEnabled', 'mozImageSmoothingEnabled', 'webkitImageSmoothingEnabled', 'msImageSmoothingEnabled'].forEach(function(name){
			if(name in ctx)
				smoothWithPrefix = name;
		});
		return smoothWithPrefix;
	}

	$.Image = Img = new Class(Shape, {

		initialize : function(image, x, y, width, height, context){
			this._z = context.elements.length;
			this.context = context;

			if(x === undefined){
				this._image = image.image;
				this._x = image.x;
				this._y = image.y;
				this._width = image.width;
				this._height = image.height;
				this._crop = image.crop;
				this._parseHash(image);
			}
			else {
				this._image = image;
				this._x = x;
				this._y = y;
				this._width = width;
				this._height = height;
			}

			if(isString(this._image)){
				if(this._image[0] == '#')
					this._image = document.getElementById( this._image.substr(1) );
				else {
					x = new Image();
					x.src = this._image;
					this._image = x;
				}
			}

			var s;

			// image already loaded
			if(this._image.complete){
				s = this._computeSize(this._width, this._height, this._image);
				this._width = s[0];
				this._height = s[1];
			}
			
			this._image.onload = function(){
				this.fire('load');
				s = this._computeSize(this._width, this._height, this._image);
				this._width = s[0];
				this._height = s[1];
				this.update();
			}.bind(this);

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

	Img.prototype._anim.crop = {
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
