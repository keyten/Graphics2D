function CurveAttrHooks(attrs){
	extend(this, attrs); // todo: deepExtend neccessary?
}

Curve = new Class({
	initialize: function(method, funcAttrs, path){
		this.method = method;
		this.path = path;
		this.attrs = {};
		this.attrs.args = funcAttrs;
		if(Curve.canvasFunctions[method]){
			this.attrHooks = Curve.canvasFunctions[method].attrHooks;
		}
	},

	// General Curve methods
	attrHooks: CurveAttrHooks.prototype = {
		args: {
			set: function(){
				this.update();
			}
		}
	},

	attr: Class.attr,

	clone: function(){
		var clone = Delta.curve(this.method, this.attrs.args);
		extend(clone.attrs, this.attrs); // todo: deepExtend
		return clone;
	},

	startAt: function(){
		var index = this.path.attrs.d.indexOf(this);
		return index === 0 ? [0, 0] : this.path.attrs.d[index - 1].endAt();
	},

	endAt: function(){
		if(!Curve.canvasFunctions[this.method].endAt){
			return null;
		}
		return Curve.canvasFunctions[this.method].endAt(this.attrs.args);
	},

	update: function(){
		if(this.path){
			this.path.update();
		}
		return this;
	},

	// Canvas Curve methods
	bounds: function(prevEnd){
		if(!Curve.canvasFunctions[this.method].bounds){
			return null;
		}
		if(!prevEnd){
			prevEnd = this.startAt();
		}
		return Curve.canvasFunctions[this.method].bounds(prevEnd, this.attrs.args);
	},

	process: function(ctx){
		ctx[this.method].apply(ctx, this.attrs.args);
	}
});

// todo: rename to canvasMethods
Curve.canvasFunctions = {
	moveTo: {
		attrHooks: makeAttrHooks(['x', 'y']),
		endAt: function(attrs){
			return attrs.slice();
		}
	},
	lineTo: {
		attrHooks: makeAttrHooks(['x', 'y']),
		bounds: function(from, attrs){
			return [from[0], from[1], attrs[0], attrs[1]];
		},
		endAt: function(attrs){
			return attrs.slice();
		}
	},
	quadraticCurveTo: {
		attrHooks: makeAttrHooks(['hx', 'hy', 'x', 'y']),
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
		attrHooks: makeAttrHooks(['h1x', 'h1y', 'h2x', 'h2y', 'x', 'y']),
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
		attrHooks: makeAttrHooks(['x', 'y', 'radius', 'start', 'end', 'clockwise']),
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
		attrHooks: makeAttrHooks(['x1', 'y1', 'x2', 'y2', 'radius', 'clockwise'])
	}
};

function makeAttrHooks(argList){
	var attrHooks = new CurveAttrHooks({});
	argList.forEach(function(arg, i){
		attrHooks[arg] = {
			get: function(){
				return this.attrs.args[i];
			},
			set: function(value){
				this.attrs.args[i] = value;
				this.update();
			}
		};
	});
	return attrHooks;
}

// todo: move to path?
Curve.fromArray = function(array, path){
	if(array === true){
		return closePath;
	}

	if(array[0] in Delta.curves){
		return Delta.curve(array[0], array.slice(1), path);
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
	arcTo: Curve,
	closePath: Curve
};

Delta.Curve = Curve;

Delta.curve = function(method, attrs, path){
	return new Delta.curves[method](method, attrs, path);
};