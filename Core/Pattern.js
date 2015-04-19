var from = {
	'repeat' : true,
	'no-repeat' : false,
	'repeat-x' : 'x',
	'repeat-y' : 'y'
};
$.Pattern = Pattern = new Class({

	initialize : function(image, repeat, context){
		var blob;
		this._repeat = (isBoolean(repeat) ? (repeat ? 'repeat' : 'no-repeat') : (isString(repeat) ? 'repeat-' + repeat : 'repeat'));

		if(image instanceof Image)
			this._image = image;

		else if(isString(image)){
			if(image[0] === '#')
				this._image = document.getElementById(image.substr(1));
			else if(image.indexOf('<svg') === 0){
				blob = new Blob([image], {type: 'image/svg+xml;charset=utf-8'});
				this._image = new Image();
				this._image.src = domurl.createObjectURL(blob);
			}
			else {
				this._image = new Image();
				this._image.src = image;
			}
		}
		this._image.addEventListener('load', function(){
			this.update();

			if( blob )
				domurl.revokeObjectURL( blob );
		}.bind(this));

		this.context = context;
	},

	// параметры
	repeat : function(repeat){
		if(repeat === undefined)
			return from[this._repeat];
		this._repeat = (isBoolean(repeat) ? (repeat ? 'repeat' : 'no-repeat') : (isString(repeat) ? 'repeat-' + repeat : 'repeat'));
		return this.update();
	},

	// отрисовка
	update : Gradient.prototype.update,
	toCanvasStyle : function(context){
		if( !this._image.complete )
			return 'transparent';

		return context.createPattern(this._image, this._repeat);
	}


});
