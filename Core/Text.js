Text = new Class(Drawable, {

	initialize : function(args, context){
		this.super('initialize', arguments);

		if(isObject(args[0])){
			args = this.processObject(args[0], Text.args);
		}

		this.attrs.text = args[0];
		this.attrs.font = args[1];
		this.attrs.x = args[2];
		this.attrs.y = args[3];
		if(args[4]){
			this.styles.fillStyle = args[4];
		}
		if(args[5]){
			// todo: parse!
			this.styles.strokeStyle = args[5];
		}

		this.styles.textBaseline = 'top';
	},

	attrHooks: extend(Object.assign({}, Drawable.prototype.attrHooks), {
		x: {
			set: function(value){
				this.update();
				return value;
			}
		},
		y: {
			set: function(value){
				this.update();
				return value;
			}
		}
	}),

	_bounds : function(){},

	draw : function(ctx){
		if(this._visible){
			this.context.renderer.drawText(
				[this.attrs.text, this.attrs.x, this.attrs.y],
				ctx, this.styles, this.matrix, this
			);
		}
	},

	isPointIn : function(x, y){}

});

Text.args = ['text', 'font', 'x', 'y', 'fill', 'stroke'];

$.text = function(){
	return new Text(arguments);
};