Raster = new Class(Drawable, {

	initialize : function(args, context){
		this.super('initialize', arguments);

		if(isObject(args[0])){
			args = this.processObject(args[0], Raster.args);
		}

		this.attrs.data = args[0];
		this.attrs.x = args[1];
		this.attrs.y = args[2];
	},

	draw : function(ctx){
		if(this._visible){
			var params = [this.attrs.data, this.attrs.x, this.attrs.y];
			this.context.renderer.drawData(params, ctx, this.styles, this.matrix, this);
		}
	}

});

Raster.args = ['data', 'x', 'y'];

Delta.raster = function(){
	var raster = new Raster(arguments);
	return raster;
};