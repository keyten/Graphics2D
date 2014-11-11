var ctx = Graphics2D.id('example_bezier');

// Buttons
function button(text, y, callback){
	var button = ctx.rect(10, y, 70, 30, { colors:['#f3f3f3', '#eee'], from:'top', to:'bottom' }, '#ddd 1px round');
	var text = ctx.text({
		text: text,
		font: 'Verdana 12px',
		x: 45,
		y: y+15,
		fill: 'black',
		align: 'center',
		baseline:'middle'
	});

	function over(){ button.stroke('#aaa') }
	function out(){ button.stroke('#ddd') }
	function down(e){
		button.fill({ colors:['#f3f3f3', '#eee'], from:'bottom', to:'top' });
		callback(e);
	}
	function up(){
		button.fill({ colors:['#f3f3f3', '#eee'], from:'top', to:'bottom' });
	}

	button.mouseover(over).mouseout(out).mousedown(down).mouseup(up);
	text.mouseover(over).mouseout(out).mousedown(down).mouseup(up);
}
button("Select", 10, function(){
	tool("select");
});
button("Bezier", 50, function(){
	tool("path");
});

// Tools
function tool(name){
	Tools.selected = Tools[name]
}
Tools = {};
	// Info
var xlabel = ctx.text("", "Arial 12px", 830, 10, "black"),
	ylabel = ctx.text("", "Arial 12px", 830, 30, "black");
	// Events
var cr = 'default';
ctx.on('mousemove', function(e){
	if(e.contextX <= 90){
		if(cr != 'default'){
			ctx.canvas.style.cursor = 'default';
			cr = 'default';
		}
	}
	else {
		xlabel.text("X: " + e.contextX);
		ylabel.text("Y: " + e.contextY);
	
		if(cr != Tools.selected.cursor){
			ctx.canvas.style.cursor = Tools.selected.cursor;
			cr = Tools.selected.cursor;
		}
		Tools.selected.mousemove(e);
	}
});
ctx.on('mousedown', function(e){
	if(e.contextX > 90){
		Tools.selected.mousedown(e);
	}
});
ctx.on('mouseup', function(e){
	if(e.contextX > 90){
		Tools.selected.mouseup(e);
	}
});
function rand(from, to){
	return Math.round(Math.random() * (to - from)) + from;
}
function randcolor(){
	return 'rgb(' + [rand(0,255), rand(0,255), rand(0,255)].join(',') + ')';
}