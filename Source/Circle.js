	$.Circle = Circle = new Class(Shape, {

		initialize : function(cx, cy, radius, fill, stroke, context){
			this.context = context;
			if(isHash(cx)){
				this._cx = cx.cx || cx.x || 0;
				this._cy = cx.cy || cx.y || 0;
				this._radius = cx.radius;
				this._parseHash(cx);
			}
			else {
				this._cx = cx;
				this._cy = cy;
				this._radius = radius;
				this._processStyle(fill, stroke, context.context);
			}
		},

		// параметры
		cx : function(cx){
			return this._property('cx', cx);
		},
		cy : function(cy){
			return this._property('cy', cy);
		},
		radius : function(r){
			return this._property('radius', r);
		},

		bounds : function(){
			return new Bounds(this._cx - this._radius, this._cy - this._radius, this._radius * 2, this._radius * 2);
		},
		processPath : function(ctx){
			ctx.beginPath();
			ctx.arc(this._cx, this._cy, this._radius, 0, Math.PI*2, true);
		}

	});
