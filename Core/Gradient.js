function Gradient(type, colors, from, to){
	if(!isString(type) && colors){
		to = from;
		from = colors
		colors = type;
		type = Gradient.types.default;
	}

	this.attrs = {};
	this.updateList = [];
	this.processArguments([type, colors, from, to], this.argsOrder);
	if(Gradient.types[this.attrs.type]){
		Object.assign(this, Gradient.types[this.attrs.type]);
	}
	if(this.initialize){
		this.initialize();
	}

	this.update = this.updateFunction;
}

Gradient.AttrHooks = function(attrs){
	Object.assign(this, attrs);
}

Object.assign(Gradient.prototype, Class.mixins['AttrMixin'], {
	argsOrder : ['type', 'colors', 'from', 'to'],

	cached : null,

	attrHooks : Gradient.AttrHooks.prototype = {
		colors : {
			set : function(value){
				this.cached = null;
				this.attrs.colors = Gradient.parseColors(value);
				this.update();
			}
		}
	},

	update : function(){
		return this;
	},

	updateFunction : function(){
		this.updateList.forEach(function(elem){
			elem.update();
		});
		return this;
	},

	clone : function(){
		return new Gradient(this.attrs);
	},

	// t, mixColors
	// t, value
	color : function(t, value){
		var i = 0,
			colors = this.attrs.colors = this.attrs.colors.sort(function(pair1, pair2){
				return pair1[0] > pair2[0] ? 1 : -1;
			});

		while(colors[i][0] < t && ++i < colors.length);

		if(value !== undefined && !isBoolean(value)){
			this.cached = null;
			if(colors[i] && colors[i][0] === t){
				colors[i][1] = value;
			} else {
				colors.push([t, value]);
			}
			return this.update();
		}

		if(colors[i] && colors[i][0] === t){
			return Delta.color(colors[i][1]);
		}

		if(value === false){
			// do not mix colors
			return null;
		} else {
			if(t < colors[0][0]){
				return Delta.color(colors[0][1]);
			} else if(t > colors[colors.length - 1][0]){
				return Delta.color(colors[colors.length - 1][1]);
			}

			var c1 = Delta.color(colors[i - 1][1]),
				c2 = Delta.color(colors[i][1]);
			t = (t - colors[i - 1][0]) / (colors[i][0] - colors[i - 1][0]);
			return [
				c1[0] + (c2[0] - c1[0]) * t + 0.5 | 0,
				c1[1] + (c2[1] - c1[1]) * t + 0.5 | 0,
				c1[2] + (c2[2] - c1[2]) * t + 0.5 | 0,
				+(c1[3] + (c2[3] - c1[3]) * t).toFixed(2)
			];
		}
	}
});

Gradient.types = {
	default: 'linear',

	linear : {
		attrHooks : new Gradient.AttrHooks({
			from : {set : updateSetter},
			to : {set : updateSetter}
		}),

		toCanvasStyle : function(ctx, element){
			var from = isString(this.attrs.from) ?
				element.corner(this.attrs.from, this.attrs.boundsOptions) : this.attrs.from;
			var to = isString(this.attrs.to) ?
				element.corner(this.attrs.to, this.attrs.boundsOptions) : this.attrs.to;
			var colors = this.attrs.colors;

			var key = from + ' ' + to;
			if(this.cached && this.cached.key === key){
				return this.cached.grad;
			}

			var grad = ctx.createLinearGradient(from[0], from[1], to[0], to[1]);
			colors.forEach(function(pair){
				grad.addColorStop(pair[0], pair[1]);
			});

			this.cached = {
				grad : grad,
				key : key
			};

			return grad;
		}
	},

	radial : {
		attrHooks : new Gradient.AttrHooks({
			from : {
				set : function(value){
					if(isArray(value) && value.length > 2){
						this.attrs.startRadius = value[2];
						this.attrs.from = value.slice(0, 2);
					}
					this.update();
				}
			},
			to : {
				set : function(value){
					if(isArray(value) && value.length > 2){
						this.attrs.radius = value[2];
						this.attrs.to = value.slice(0, 2);
					}
					this.update();
				}
			},
			radius : {
				get : function(){
					return this.attrs.radius === undefined ? 'auto' : this.attrs.radius;
				},
				set : updateSetter
			},
			startRadius : {
				get : function(){
					return this.attrs.startRadius || 0;
				},
				set : updateSetter
			}
		}),

		toCanvasStyle : function(ctx, element){
			var bounds = this.attrs.boundsOptions instanceof Bounds ?
				this.attrs.boundsOptions : element.bounds(this.attrs.boundsOptions);
			var from = isString(this.attrs.from) ?
				element.corner(this.attrs.from, bounds) : this.attrs.from;
			var to = isString(this.attrs.to) ?
				element.corner(this.attrs.to, bounds) : this.attrs.to;
			var startRadius = this.attrs.startRadius || 0;
			var radius = isNaN(this.attrs.radius) ?
				Math.max(bounds.width, bounds.height) : this.attrs.radius;
			var colors = this.attrs.colors;

			var key = from + ' ' + to + ' ' + startRadius + ' ' + radius;
			if(this.cached && this.cached.key === key){
				return this.cached.grad;
			}

			var grad = ctx.createRadialGradient(from[0], from[1], startRadius, to[0], to[1], radius);
			colors.forEach(function(pair){
				grad.addColorStop(pair[0], pair[1]);
			});

			this.cached = {
				grad : grad,
				key : key
			};

			return grad;
		}
	}
};

Gradient.parseColors = function(colors){
	if(isArray(colors[0])){
		return colors.map(function(color){
			return color.slice();
		});
	}

	var result = [];
	if(isArray(colors)){
		var step = 1 / (colors.length - 1);
		colors.forEach(function(color, i){
			result.push([step * i, color]);
		});
	} else {
		Object.keys(colors).forEach(function(pos){
			result.push([+pos, colors[pos]]);
		});
	}
	return result;
};

Delta.Gradient = Gradient;