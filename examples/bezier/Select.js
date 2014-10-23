(function(){
	var tool = Tools.select = {
		cursor: 'default'
	};
	
	var path, line, point;
	tool.mousedown = function(e){
		if(e.targetObject && e.targetObject._cx){
			point = e.targetObject;
			path = point.path;
			line = point.line;
		}
	};
	tool.mousemove = function(e){
		if(!(path && line && point)) return;

		point.cx(e.contextX).cy(e.contextY);
		if(point.type == 'control'){
			line.point(1, "L" + e.contextX + "," + e.contextY);

			var arg = path.point(1).arg;
			if(point.pos == 'start'){
				arg[0] = e.contextX;
				arg[1] = e.contextY;
			}
			else {
				arg[2] = e.contextX;
				arg[3] = e.contextY;
			}
			path.point(1, "B" + arg.join(","));
		}
		else {
			line.point(0, "M" + e.contextX + "," + e.contextY);

			if(point.pos == 'start'){
				path.point(0, "M" + [e.contextX, e.contextY].join(","));
			}
			else {
				var arg = path.point(1).arg;
				arg[4] = e.contextX;
				arg[5] = e.contextY;
				path.point(1, "B" + arg.join(","));
			}
		}
	};
	tool.mouseup = function(e){
		point = null;
		path = null;
		line = null
	};
})();
