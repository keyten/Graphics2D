Picture = new Class(Drawable, {

	initialize : function(args, context){
		this.super('initialize', arguments);

		if(isObject(args[0])){
			args = this.processObject(args[0], Picture.args);
		}

		this.attrs.image = Picture.parse(args[0]);
		this.attrs.x = args[1];
		this.attrs.y = args[2];
		this.attrs.width = args[3] === undefined ? 'auto' : args[3];
		this.attrs.height = args[4] === undefined ? 'auto' : args[4];
		if(args[5]){
			this.attrs.crop = args[5];
		}

		this.attrs.image.addEventListener('load', function(event){
			this.update();
			this.fire('load', event);
		}.bind(this));

		this.attrs.image.addEventListener('error', function(e){
			this.fire('error', event);
		}.bind(this));
	},

	attrHooks: new DrawableAttrHooks({
		image: {
			set: function(value){
				value = Picture.parse(value);

				if(value.complete){
					this.update();
				}

				value.addEventListener('load', function(event){
					this.update();
					this.fire('load', event);
				}.bind(this));

				return value;
			}
		},

		x: {
			set: function(value){
				this.attrs.x = value;
				this.update();
			}
		},

		y: {
			set: function(value){
				this.attrs.y = value;
				this.update();
			}
		},

		width: {
			set: function(value){
				this.attrs.width = value;
				this.update();
			}
		},

		height: {
			set: function(value){
				this.attrs.height = value;
				this.update();
			}
		},

		crop: {
			set: function(value){
				this.attrs.crop = value;
				this.update();
			}
		},

		smooth: {
			get: function(){
				return this.styles[smoothPrefix(this.context.context)] || this.context.context[smoothPrefix(this.context.context)];
			},
			set: function(value){
				this.styles[smoothPrefix(this.context.context)] = !!value;
				this.update();
			}
		}
	}),

	remove: function(){
		this.super('remove');
		// todo:
		// what if user want to push the image again?
		// should be able to restore the link to blob
		// the blob is still saved in the image.blob, just needs to call domurl.createObjectURL again
		if(this.attrs.image.blob){
			domurl.revokeObjectURL(this.attrs.image.blob);
		}
	},

	getRealSize: function(){
		var w = this.attrs.width,
			h = this.attrs.height;

		// they both are auto by default because saving proportions is by default true
		if(w === 'auto' && h === 'auto'){
			w = h = 'native';
		}

		if(w === 'auto'){
			w = this.attrs.image.width * (h / this.attrs.image.height);
		} else if(w === 'native'){
			w = this.attrs.image.width;
		}

		if(h === 'auto'){
			h = this.attrs.image.height * (w / this.attrs.image.width);
		} else if(h === 'native'){
			h = this.attrs.image.height;
		}

		return [w, h];
	},

	bounds: function(transform, around){
		var size = this.getRealSize();
		return this.super('bounds', [
			[this.attrs.x, this.attrs.y, size[0], size[1]],
			transform, around
		]);
	},

	isPointIn : function(x, y){
		var point = this.super('isPointIn', [x, y]);
		x = point[0];
		y = point[1];

		var size = this.getRealSize();
		return x > this.attrs.x && y > this.attrs.y && x < this.attrs.x + size[0] && y < this.attrs.y + size[1];
	},

	draw : function(ctx){
		if(this.attrs.visible && this.attrs.image.complete){
			this.context.renderer.pre(ctx, this.styles, this.matrix, this);

			var params = [this.attrs.image, this.attrs.x, this.attrs.y];
			var width = this.attrs.width,
				height = this.attrs.height,
				crop = this.attrs.crop;

			if((this.attrs.width === 'auto' || this.attrs.width === 'native') ||
				(this.attrs.height === 'auto' || this.attrs.height === 'native')){
				var size = this.getRealSize();
				width  = size[0];
				height = size[1];
			}

			if(crop){
				ctx.drawImage(
					this.attrs.image,
					crop[0], crop[1],
					crop[2], crop[3],

					this.attrs.x, this.attrs.y,
					width, height
				);
			} else if(
				(this.attrs.width === 'auto' || this.attrs.width === 'native') &&
				(this.attrs.height === 'auto' || this.attrs.height === 'native')) {
				ctx.drawImage(
					this.attrs.image,
					this.attrs.x, this.attrs.y
				);
			} else {
				ctx.drawImage(
					this.attrs.image,
					this.attrs.x, this.attrs.y,
					width, height
				);
			}
			ctx.restore();
		}
	}

});

var smoothWithPrefix;
function smoothPrefix(ctx){
	['mozImageSmoothingEnabled', 'webkitImageSmoothingEnabled', 'msImageSmoothingEnabled', 'imageSmoothingEnabled'].forEach(function(name){
		if(name in ctx){
			smoothWithPrefix = name;
		}
	});

	smoothPrefix = function(){
		return smoothWithPrefix;
	};
	return smoothWithPrefix;
}

Picture.args = ['image', 'x', 'y', 'width', 'height', 'crop'];

Picture.parse = function(image){
	if(image + '' === image){
		if(image[0] === '#'){
			return document.getElementById(image.substr(1));
		} else if(image[0] === '<svg'){
			var blob = new Blob([image], {type: 'image/svg+xml;charset=utf-8'});
			image = new Image();
			image.src = domurl.createObjectURL(blob);
			image.blob = blob;
		} else {
			var imageObject = new Image();
			imageObject.src = image;
			return imageObject;
		}
	}
	return image;
};

Delta.image = function(){
	return new Picture(arguments);
};

Delta.Image = Picture;