Native context using
=============================

You can add your objects to redrawing & event processing:
	var point = {
		draw : function(ctx){
			ctx.fillRect(0, 0, 1, 1);
		}
	};
	ctx.push(point);

...