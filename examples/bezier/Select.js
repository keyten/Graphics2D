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
			line.point(1).arguments(e.contextX, e.contextY);

			var arg = path.point(1).arguments();
			if(point.pos == 'start'){
				arg[0] = e.contextX;
				arg[1] = e.contextY;
			}
			else {
				arg[2] = e.contextX;
				arg[3] = e.contextY;
			}
			path.point(1).arguments(arg);
		}
		else {
			line.point(0).arguments(e.contextX, e.contextY);

			if(point.pos == 'start'){
				path.point(0).arguments(e.contextX, e.contextY);
			}
			else {
				var arg = path.point(1).arguments();
				arg[4] = e.contextX;
				arg[5] = e.contextY;
				path.point(1).arguments(arg);
			}
		}
	};
	tool.mouseup = function(e){
		point = null;
		path = null;
		line = null
	};
})();
