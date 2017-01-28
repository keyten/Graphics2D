// todo: rename to Picture
Img = new Class(Drawable, {

	initialize : function(args, context){
		this.super('initialize', arguments);

		if(isObject(args[0])){
			args = this.processObject(args[0], Img.args);
		}

		this.attrs.image = Img.parse(args[0]);
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

		this.attrs.image.addEventListener('load', function(event){
			this.update();

			if(this.attrs.image.blob){
				domurl.revokeObjectURL(this.attrs.image.blob);
			}

			this.fire('load', event);
		}.bind(this));

		this.attrs.image.addEventListener('error', function(e){
			this.fire('error', event);
		});
	},

	draw : function(ctx){
		if(this._visible){
			var params = [this.attrs.image, this.attrs.x, this.attrs.y];
			this.context.renderer.drawImage(params, ctx, this.styles, this.matrix, this);
		}
	}

});

Img.args = ['image', 'x', 'y', 'width', 'height', 'crop'];

Img.parse = function(image){
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

$.image = function(){
	var image = new Img(arguments);
	return image;
};