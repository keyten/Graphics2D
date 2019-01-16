/* Delta.tileEngine({
	// ...
	cell: Delta.rect(0, 0, 20, 20, 'red'),
});
// или:
Delta.tileEngine({
	// ...
	cell: function(x, y, width, height, ctx){
		return ctx.rect;
	},

	cellUpdate: function(cell, x, y){
		cell.attr({x, y});
	}
});

// todo: попридумывать кейсы и как их решать
ctx.tileEngine({
	x, y, width, height, // or cellCountX: 10, cellCountY: 10
	cellSize: 10,
	cellMargin: 2,

	cell: Delta.rect(0, 0, 10, 10, 'white'),

	drawCells: true / false // из cell можно вовзвращать абстрактный объект или помещенный на канвас
	// если абстрактный, то они просто лежат в cells и engine работает как группа, тогда нужно поставить в true
	// если помещенный, то мы сами контролируем изменения в cells, тогда нужно в false, чтобы engine не работал как группа и не отрисовывал их второй раз
}).cellOn('mouseover', (e) => {
	e.target.attr('fill', randcolor());
}).cellEach(function(cell, i, j){
	if(logo[i][j] === '@'){
		cell.attr('fill', 'black');
	}
});

engine.cell(i, j).attr('fill');
engine.cellInPoint(x, y); */

// todo: унаследовать от group?
Delta.TileEngine = new Delta.Class(Delta.Drawable, {
	initialize : function(options){
		this.super('initialize');
		this.attrs.cellSize = options.cellSize;
		this.attrs.cellMargin = options.cellMargin || 0;
	},

	draw : function(ctx){
		;
	},

	cellOn : function(){},

	cellEach : function(){},

	cell : function(){},

	cellInPoint : function(){}
});

Delta.Context.prototype.tileEngine = function(options){
	return this.push(new Delta.TileEngine(options));
};
