Pattern = new Class({
	initialize: function(image, repeat, context){
		this.image = Img.parse(image);
		this.repeat = repeat;
		this.context = context;

		this.image.addEventListener('load', function(e){
			this.update();

			if(this.image.blob){
				domurl.revokeObjectURL(blob);
			}
		}.bind(this));
	},

	update: function(){
		this.context.update();
		return this;
	},

	toCanvasStyle: function(ctx){
		if(!this.image.complete){
			return 'transparent';
		}

		return ctx.createPattern(this.image, this.repeat || 'repeat');
	}
});