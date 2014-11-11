var ctx = Graphics2D.id('example_gradients');

ctx.circle(120, 150, 100, {
	colors : ['#0fa', '#fa0'],
	type : 'radial',
	radius : 100,
	startRadius : 0,
	center : [120,150]
}, '1px #e90').mousemove(function(e){
	this.fill().startRadius(e.contextX, e.contextY);
});


ctx.circle(360, 150, 100, {
	colors : ['#0fa', '#0af'],
	type : 'radial',
	radius : 100,
	startRadius : 0,
	center : [360,150]
}, '1px #09e').mousemove(function(e){
	this.fill().hilite(e.contextX - 360, e.contextY - 150);
});


ctx.circle(600, 150, 100, {
	colors : ['#af0', '#a0f'],
	type : 'radial',
	radius : 100,
	startRadius : 0,
	center : [600,150]
}, '1px #90e').mousemove(function(e){
	this.fill().center(e.contextX, e.contextY);
});