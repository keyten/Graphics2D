Curve = new Class({
	initialize: function(method, funcAttrs, path){
		this.method = method;
		this.path = path;
		this.funcAttrs = funcAttrs;
	},

	update: function(){
		if(this.path){
			this.path.update();
		}
		return this;
	},

	process: function(ctx){
		ctx[this.method].apply(ctx, this.funcAttrs);
	},

	// Parameters
	attr: function(prop, value){
		if(prop + '' !== prop){
			Object.keys(prop).forEach(function(key){
				this.attr(key, prop[key]);
			}, this);
			return this;
		}

		// attrHooks
		var index = Curve.canvasFunctions[this.method].attrs.indexOf(prop);
		if(value === undefined){
			return index > -1 ? this.funcAttrs[index] : (this.attrs || {})[prop];
		}

		if(index > -1){
			this.funcAttrs[index] = value;
		} else {
			(this.attrs || (this.attrs = {}))[prop] = value;
		}
		return this.update();
	},

	bounds: function(prevEnd){
		if(!Curve.canvasFunctions[this.method].bounds){
			return null;
		}
		return Curve.canvasFunctions[this.method].bounds(prevEnd, this.funcAttrs);
	},

	endAt: function(){
		if(!Curve.canvasFunctions[this.method].endAt){
			return null;
		}
		return Curve.canvasFunctions[this.method].endAt(this.funcAttrs);
	}
});

Curve.canvasFunctions = {
	moveTo: {
		attrs: ['x', 'y'],
		endAt: function(attrs){
			return attrs.slice();
		}
	},
	lineTo: {
		attrs: ['x', 'y'],
		bounds: function(from, attrs){
			return [from[0], from[1], attrs[0], attrs[1]];
		},
		endAt: function(attrs){
			return attrs.slice();
		}
	},
	quadraticCurveTo: {
		attrs: ['hx', 'hy', 'x', 'y'],
		bounds: function(from, attrs){
			var minX = Math.min(from[0], attrs[0], attrs[2]);
			var minY = Math.min(from[1], attrs[1], attrs[3]);
			var maxX = Math.max(from[0], attrs[0], attrs[2]);
			var maxY = Math.max(from[1], attrs[1], attrs[3]);
			return [minX, minY, maxX, maxY];
		},
		endAt: function(attrs){
			return attrs.slice(2);
		}
	},
	bezierCurveTo: {
		attrs: ['h1x', 'h1y', 'h2x', 'h2y', 'x', 'y'],
		bounds: function(from, attrs){
			var minX = Math.min(from[0], attrs[0], attrs[2], attrs[4]);
			var minY = Math.min(from[1], attrs[1], attrs[3], attrs[5]);
			var maxX = Math.max(from[0], attrs[0], attrs[2], attrs[4]);
			var maxY = Math.max(from[1], attrs[1], attrs[3], attrs[5]);
			return [minX, minY, maxX, maxY];
		},
		endAt: function(attrs){
			return attrs.slice(4);
		}
	},
	arc: {
		attrs: ['x', 'y', 'radius', 'start', 'end', 'clockwise'],
		bounds: function(from, attrs){
			var x = attrs[0],
				y = attrs[1],
				radius = attrs[2],
				start = attrs[3],
				end = attrs[4],
				clockwise = attrs[5];
				// todo: support 'from'
			return [x - radius, y - radius, x + radius, y + radius];
		},
		endAt: function(attrs){
			var x = attrs[0],
				y = attrs[1],
				radius = attrs[2],
				delta = attrs[4] - attrs[3];

			if(attrs[5]){
				delta = -delta;
			}
			return [
				x + Math.cos(delta) * radius,
				y + Math.sin(delta) * radius
			];
		}
	},
	arcTo: {
		attrs: ['x1', 'y1', 'x2', 'y2', 'radius', 'clockwise']
	}
};

Curve.fromArray = function(array, path){
	if(array === true){
		return closePath;
	}

	if(array[0] in Delta.curves){
		return new Delta.curves[array[0]](array[0], array.slice(1), path);
	}

	return new Curve({
		'2': 'lineTo',
		'4': 'quadraticCurveTo',
		'6': 'bezierCurveTo'
	}[array.length], array, path);
};

Delta.curves = {
	moveTo: Curve,
	lineTo: Curve,
	quadraticCurveTo: Curve,
	bezierCurveTo: Curve,
	arc: Curve,
	arcTo: Curve
};

Delta.Curve = Curve;