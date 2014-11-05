(function(){
	var tool = Tools.path = {
		cursor : 'crosshair'
	};

	var controlline, controlpoint,
		activeline, cx, cy, px, py;
	
	tool.mousedown = function(e){
		var x = e.contextX,
			y = e.contextY,
			pos;

		if(!activeline){
			activeline = ctx.bezier(x, y, x, y, x, y, x, y, '2px ' + randcolor());
			activeline.isPointIn = function(){ return false }; // чтобы не перекрывала события нижележащим
			pos = 'start';
		}
		else {
			px = x;
			py = y;
			activeline.point(1, "B" + [cx, cy, x, y, x, y].join(","));
			pos = 'end';
		}

		controlline = ctx.line(x, y, x, y, '2px #05a');
		var cp1 = ctx.circle(x, y, 3, "#0af", '1px #05a');
		cp1.line = controlline;
		cp1.path = activeline; // это всё для Arrow tool
		cp1.type = 'main';

		controlpoint = ctx.circle(x, y, 3, "#0af", '1px #05a');
		controlpoint.line = controlline;
		controlpoint.path = activeline;
		controlpoint.type = 'control';

		cp1.pos = controlpoint.pos = pos;

		controlpoint.mouseover('animate', 'opacity', 1).mouseout('animate', 'opacity', 0.2);
	//	cp1.mouseover('animate', 'opacity', 1).mouseout('animate', 'opacity', 0.2);
	};
	tool.mousemove = function(e){
		if(!controlline || !controlpoint) return;
		controlline.point(1, "L" + e.contextX + "," + e.contextY);
		controlpoint.cx(e.contextX).cy(e.contextY);

		if(cx != null && cy != null){
			activeline.point(1, "B" + [cx, cy, e.contextX, e.contextY, px, py].join(","));
		}
	};
	tool.mouseup = function(e){
		if(cx != null && cy != null){
			cx = null;
			cy = null;
			activeline = null;
		}
		else {
			cx = e.contextX;
			cy = e.contextY;
		}
		controlline.animate('opacity', 0.2)
		controlpoint.animate('opacity', 0.2)
		controlline = null;
		controlpoint = null;
	};

	Tools.selected = tool;
})();
