Delta.Group = new Class(Drawable, {

	initialize: function(args){
		this.super('initialize', [args]);

		this.attrs.children = args[0];
		this.attrs.x = args[1];
		this.attrs.y = args[2];
		this.attrs.fill = args[3];
		this.attrs.stroke = args[4];
	},

	draw : function(ctx){
		if(!this.attrs.visible){
			return;
		}

		this.preDraw(ctx);


//		for(var i = 0; i < this.attrs.children.length; i++){
//			this.attrs.children[i].draw(ctx);
//		}

		this.attrs.children.forEach(function(child){
			child.draw(ctx);
		});
	}

});

Delta.Group.args = ['children', 'x', 'y', 'fill', 'stroke'];

Delta.group = function(){
	return new Delta.Group(arguments);
};

Context.prototype.group = function(){
	return this.push(new Delta.Group(arguments));
};