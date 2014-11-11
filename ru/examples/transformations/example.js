var ctx = Graphics2D.id('example_transformations');

var image = ctx.image('cat.png', 280, 60);

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
button("Scale", 10, function(){
	tool("scale");
});
button("Rotate", 50, function(){
	tool("rotate");
});
button("Skew", 90, function(){
	tool("skew");
});
button("Translate", 130, function(){
	tool("translate");
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

// Scale tool
(function(){
	var tool = Tools.scale = {
		cursor : 'crosshair'
	};
	var line, point, point2, text;

	tool.mousedown = function(e){
		line = ctx.line(e.contextX, e.contextY, e.contextX, e.contextY, '2px #0fa');
		point = ctx.circle(e.contextX, e.contextY, 5, 'white', '1px #0fa');
		point2 = ctx.circle(e.contextX, e.contextY, 5, 'white', '1px #0af');
		text = ctx.text('0', 'Arial 9pt', 620, 20, 'black');
	};
	tool.mousemove = function(e){
		if(line){
			line.point(1).arguments(e.contextX, e.contextY);
			point2.cx(e.contextX).cy(e.contextY);
			if(Math.sqrt( Math.pow(e.contextX - point.cx(), 2) + Math.pow(e.contextY - point.cy(), 2) ) > 200)
				line.stroke('#0af');
			else
				line.stroke('#0fa');

			text.text(Math.sqrt( Math.pow(e.contextX - point.cx(), 2) + Math.pow(e.contextY - point.cy(), 2) ) / 200);
		}
	};
	tool.mouseup = function(e){
		image.animate( 'scale', Math.sqrt( Math.pow(e.contextX - point.cx(), 2) + Math.pow(e.contextY - point.cy(), 2) ) / 200, 300, 'easeOut' );
		point2.animate('opacity', 0, { after : function(){ this.remove(); } });
		point.animate('opacity', 0, { after : function(){ this.remove(); } });
		line.animate('opacity', 0, { after : function(){ this.remove(); } });
		text.animate('opacity', 0, { after : function(){ this.remove(); } });
		line = null;
	};

	Tools.selected = tool;
})();

// Rotate tool
(function(){
	var tool = Tools.rotate = {
		cursor : 'crosshair'
	};
	var line, point, point2, text;

	tool.mousedown = function(e){
		line = ctx.line(e.contextX, e.contextY, e.contextX, e.contextY, '2px #fa0');
		point = ctx.circle(e.contextX, e.contextY, 5, 'white', '1px #fa0');
		point2 = ctx.circle(e.contextX, e.contextY, 5, 'white', '1px #fa0');
		text = ctx.text('0', 'Arial 9pt', 620, 20, 'black');
	};
	tool.mousemove = function(e){
		if(line){
			line.point(1).arguments(e.contextX, e.contextY);
			point2.cx(e.contextX).cy(e.contextY);
			text.text(Math.sqrt( Math.pow(e.contextX - point.cx(), 2) + Math.pow(e.contextY - point.cy(), 2) ) / 10);
		}
	};
	tool.mouseup = function(e){
		image.animate( 'rotate', Math.sqrt( Math.pow(e.contextX - point.cx(), 2) + Math.pow(e.contextY - point.cy(), 2) ) / 10, 300, 'easeOut' );
		point2.animate('opacity', 0, { after : function(){ this.remove(); } });
		point.animate('opacity', 0, { after : function(){ this.remove(); } });
		line.animate('opacity', 0, { after : function(){ this.remove(); } });
		text.animate('opacity', 0, { after : function(){ this.remove(); } });
		line = null;
	};
})();

// Skew tool
(function(){
	var tool = Tools.skew = {
		cursor : 'crosshair'
	};
	var line, point, point2, textx, texty;

	tool.mousedown = function(e){
		line = ctx.line(e.contextX, e.contextY, e.contextX, e.contextY, '2px #a0f');
		point = ctx.circle(e.contextX, e.contextY, 5, 'white', '1px #f0a');
		point2 = ctx.circle(e.contextX, e.contextY, 5, 'white', '1px #f0a');
		textx = ctx.text('0', 'Arial 9pt', 620, 20, 'black');
		texty = ctx.text('0', 'Arial 9pt', 620, 40, 'black');
	};
	tool.mousemove = function(e){
		if(line){
			line.point(1).arguments(e.contextX, e.contextY);
			point2.cx(e.contextX).cy(e.contextY);
			textx.text((e.contextX - point.cx()) / 10);
			texty.text((e.contextY - point.cy()) / 10);
		}
	};
	tool.mouseup = function(e){
			image.animate({
				skewX:(e.contextX - point.cx()) / 10,
				skewY:(e.contextY - point.cy()) / 10
			}, 300, 'easeOut' );
		point2.animate('opacity', 0, { after : function(){ this.remove(); } });
		point.animate('opacity', 0, { after : function(){ this.remove(); } });
		line.animate('opacity', 0, { after : function(){ this.remove(); } });
		textx.animate('opacity', 0, { after : function(){ this.remove(); } });
		texty.animate('opacity', 0, { after : function(){ this.remove(); } });
		line = null;
	};
})();

// Translate tool
(function(){
	var tool = Tools.translate = {
		cursor : 'crosshair'
	};
	var line, point, point2, textx, texty;

	tool.mousedown = function(e){
		line = ctx.line(e.contextX, e.contextY, e.contextX, e.contextY, '2px gray');
		point = ctx.circle(e.contextX, e.contextY, 5, 'white', '1px gray');
		point2 = ctx.circle(e.contextX, e.contextY, 5, 'white', '1px gray');
		textx = ctx.text('0', 'Arial 9pt', 620, 20, 'black');
		texty = ctx.text('0', 'Arial 9pt', 620, 40, 'black');
	};
	tool.mousemove = function(e){
		if(line){
			line.point(1).arguments(e.contextX, e.contextY);
			point2.cx(e.contextX).cy(e.contextY);
			textx.text((e.contextX - point.cx()));
			texty.text((e.contextY - point.cy()));
		}
	};
	tool.mouseup = function(e){
		image.animate({
			translateX: (e.contextX - point.cx()),
			translateY: (e.contextY - point.cy())
		}, 300, 'easeOut' );
		point2.animate('opacity', 0, { after : function(){ this.remove(); } });
		point.animate('opacity', 0, { after : function(){ this.remove(); } });
		line.animate('opacity', 0, { after : function(){ this.remove(); } });
		textx.animate('opacity', 0, { after : function(){ this.remove(); } });
		texty.animate('opacity', 0, { after : function(){ this.remove(); } });
		line = null;
	};
})();