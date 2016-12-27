Pattern = new Class({
	initialize: function(image, repeat, context){
		this.image = Img.parse(image);
		this.context = context;

		this.image.addEventListener('load', function(e){
			this.update();
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

		return ctx.createPattern(this.image, 'repeat');
	}
});

Pattern.parseRepeat = function(value){
	if(value === !!value){
		return value ? 'repeat' : 'no-repeat';
	}
	if(value === value + ''){
		return 'repeat-' + value;
	}
	return 'repeat';
};