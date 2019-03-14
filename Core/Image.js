Picture = new Class(Drawable, {
	// todo: image format libcanvas-like:
	// '/files/img/hexes.png [150:100]{0:0}'
	argsOrder : ['image', 'x', 'y', 'width', 'height', 'crop'],

	attrHooks : new DrawableAttrHooks({
		image : {
			set : function(value){
				value = this.attrs.image = Picture.parse(value);

				if(value.complete){
					this.update();
				}

				value.addEventListener('load', Picture.onImageLoadedCallback.bind(this));
				value.addEventListener('error', Picture.onImageErrorCallback.bind(this));

				return value;
			}
		},

		x : {set : updateSetter},
		y : {set : updateSetter},
		width : {set : updateSetter},
		height : {set : updateSetter},
		x1 : Rect.prototype.attrHooks.x1,
		y1 : Rect.prototype.attrHooks.y1,
		x2 : Rect.prototype.attrHooks.x2,
		y2 : Rect.prototype.attrHooks.y2,

		crop: {set : updateSetter},

		smooth : {
			get : function(){
				return this.attrs.smooth || true;
			},
			set : function(value){
				// this.styles[smoothPrefix(this.context.context)] = !!value;
				this.styles.imageSmoothingEnabled = !!value;
				this.update();
			}
		}
	}),

	remove: function(){
		this.super('remove');
		// todo:
		// what if user want to push the ctx.image again?
		// should be able to restore the link to blob
		// the blob is still saved in the image.blob, just needs to call domurl.createObjectURL again
		if(this.attrs.image.blob){
			domurl.revokeObjectURL(this.attrs.image.blob);
		}
	},

	getRealSize: function(){
		var w = this.attrs.width === undefined ? 'auto' : this.attrs.width,
			h = this.attrs.height === undefined ? 'auto' : this.attrs.height;

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

	preciseBounds : function(){
		var size = this.getRealSize();
		return new Bounds(this.attrs.x, this.attrs.y, size[0], size[1]);
	},

	isPointIn : function(x, y){
		var point = this.isPointInBefore(x, y, options);
		x = point[0];
		y = point[1];

		var size = this.getRealSize();
		return x > this.attrs.x && y > this.attrs.y && x < this.attrs.x + size[0] && y < this.attrs.y + size[1];
	},

	draw : function(ctx){
		if(this.attrs.visible){
			this.preDraw(ctx);
/*			var params = [this.attrs.image, this.attrs.x, this.attrs.y];
			var width = this.attrs.width,
				height = this.attrs.height,
				crop = this.attrs.crop;

			if((this.attrs.width === 'auto' || this.attrs.width === 'native') ||
				(this.attrs.height === 'auto' || this.attrs.height === 'native')){
				var size = this.getRealSize();
				width  = size[0];
				height = size[1];
			} */
			var size = this.getRealSize();
			var crop = this.attrs.crop;

			if(crop){
				ctx.drawImage(
					this.attrs.image,
					crop[0], crop[1],
					crop[2], crop[3],

					this.attrs.x, this.attrs.y,
					size[0], size[1]
				);
			} else {
				ctx.drawImage(
					this.attrs.image,

					this.attrs.x, this.attrs.y,
					size[0], size[1]
				);
			}/* else if(
				(this.attrs.width === 'auto' || this.attrs.width === 'native') &&
				(this.attrs.height === 'auto' || this.attrs.height === 'native')) {
				ctx.drawImage(
					this.attrs.image,
					this.attrs.x, this.attrs.y
				);
			}  */

			ctx.restore();
		}
	}

});
/*
var smoothWithPrefix;
function smoothPrefix(ctx){
	[
		'mozImageSmoothingEnabled',
		'webkitImageSmoothingEnabled',
		'msImageSmoothingEnabled',
		'imageSmoothingEnabled'
	].forEach(function(name){
		if(name in ctx){
			smoothWithPrefix = name;
		}
	});

	smoothPrefix = smoothPrefix2;
	return smoothWithPrefix;
}
function smoothPrefix2(){
	return smoothWithPrefix;
} */

Picture.args = ['image', 'x', 'y', 'width', 'height', 'crop'];

Picture.parse = function(image){
	if(isString(image)){
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

Picture.onImageLoadedCallback = function(event){
	this.update();
	this.fire('load', event);
};

Picture.onImageErrorCallback = function(event){
	this.fire('error', event);
};

Delta.image = function(){
	return new Picture(arguments);
};

Delta.Image = Picture;