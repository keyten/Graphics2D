$.Gradient = Gradient = new Class({

	initialize : function(type, colors, from, to, context){
		// distance in from & to
		this.context = context;
		if(isObject(type)){
			this._type = type.type || 'linear';
			this._from = type.from;
			this._to = type.to;
			if( type.cache !== undefined )
				this._cache = type.cache;
			colors = type.colors;
		}
		else {
			if( from === undefined || (to === undefined && ( isArray(type) || isObject(type) )) ){ // (type & to undefined) or (type or to undefined)
				if(type === 'radial'){
					this._from = 'center';
					this._to = 'center';
				} else {
					to = from;
					from = colors;
					colors = type;
					type = 'linear';
				}
			}
			this._type = type;
			this._from = from;
			this._to = to;
		}
		this._colors = isArray(colors) ? this._parseColors(colors) : colors;

		if(Gradient.gradients[ this._type ]){
			var grad = Gradient.gradients[ this._type ];
			extend(this, grad);
			if( grad.init )
				grad.init.call(this, type);
		}
	},

	_parseColors : function(colors){
		var stops = {},
			step = 1 / (colors.length - 1);
		colors.forEach(function(color, i){
			stops[ step * i ] = color;
		});
		return stops;
	},

	colorMix : function(t){
		var last,
			stops = this._colors,
			keys  = Object.keys( stops ).sort();

		for(var i = 0, l = keys.length; i < l; i++){
			if(keys[i] == t)
				return _.color(stops[keys[i]]);
			else if(parseFloat(last) < t && parseFloat(keys[i]) > t){
				var c1 = _.color(stops[last]),
					c2 = _.color(stops[keys[i]]);
				t = (t - parseFloat(last)) / (parseFloat(keys[i]) - parseFloat(last));
				return [
					c1[0] + (c2[0] - c1[0]) * t | 0,
					c1[1] + (c2[1] - c1[1]) * t | 0,
					c1[2] + (c2[2] - c1[2]) * t | 0,
					c1[3] + (c2[3] - c1[3]) * t
				];
			}
			last = keys[i];
		}

	},
	color : function(i, color){
		if(color === undefined)
			return this._colors[i];
		this._colors[i] = color;
		return this.update();
	},

	colors : function(colors){
		if(colors === undefined)
			return this._colors;
		this._colors = colors;
		return this.update();
	},

	reverse : function(){
		var colors = this._colors,
			new_colors = {},
			i;
		for(i in colors){
			if($.has(colors, i))
				new_colors[1-i] = colors[i];
		}
		this._colors = new_colors;
		return this.update();
	},

	// general
	from : function(x,y,r){
		if(isString(x) && x in $.corners){
			this._from = x;
			return this.update();
		}
		if(isArray(x)){
			r = x[2];
			y = x[1];
			x = x[0];
		}

		if(!isArray(this._from))
			this._from = [];

		if(x !== undefined) this._from[0] = x; // TODO: distance ?
		if(y !== undefined) this._from[1] = y;
		if(r !== undefined) this._from[2] = r;
		return this.update();
	},

	to : function(x,y,r){
		if(isString(x) && x in $.corners){
			this._from = x;
			return this.update();
		}
		if(isArray(x)){
			r = x[2];
			y = x[1];
			x = x[0];
		}

		if(!isArray(this._from))
			this._from = [];

		if(x !== undefined) this._to[0] = x;
		if(y !== undefined) this._to[1] = y;
		if(r !== undefined) this._to[2] = r;
		return this.update();
	},

	clone : function(){
		return $.clone(this);
	},

	// drawing and _set
	update : function(){
		this.context.update();
		return this;
	},

	_cache : true,

	toCanvasStyle : function(ctx, element){
		var grad,
			from = this._from,
			to = this._to;

		// for corners like 'top left'
		if(!isArray(from)){
			if(isString(from) && /^\d+(px|pt)?/.test(from))
				this._from = from = _.distance(from);
			else
				from = element.corner(from);
		}
		if(!isArray(to)){
			if(isString(from) && /^\d+(px|pt)?/.test(to))
				this._to = to = _.distance(to);
			else
				to = element.corner(to);
		}

		// Cache
		var key = this.key(from, to);
		if(this._cache && this.context._cache[key])
			return this.context._cache[key];

		if(this._type === 'linear')
			grad = ctx.createLinearGradient(from[0], from[1], to[0], to[1]);

		else
			grad = ctx.createRadialGradient(from[0], from[1], from[2] || 0, to[0], to[1], to[2] || element.bounds().height);

		for(var offset in this._colors){
			if(Object.prototype.hasOwnProperty.call(this._colors, offset))
				grad.addColorStop( offset, this._colors[offset] );
		}

		this.context._cache[key] = grad;
		return grad;
	},

	key : function(from, to){
		return [this._type, from, to, JSON.stringify(this._colors)].join(',');
	}

});

Gradient.gradients = {
	linear: {
		init: function(){
			var from = this._from;
			switch(from){
				case 'vertical':
					this._from = 'top';
					this._to = 'bottom';
					break;
				case 'horizontal':
					this._from = 'left';
					this._to = 'right';
					break;
				case 'diag1':
					this._from = 'top left';
					this._to = 'bottom right';
					break;
				case 'diag2':
					this._from = 'top right';
					this._to = 'bottom left';
					break;
				default: break;
			}
		}
	},
	radial: {
		init: function(options){
			if( !isObject(options) )
				return;

			if( !this._to ) this._to = [0,0];
			if( !this._from ) this._from = [0,0];

			// to: center & ( radius | dest )
			// from: startRadius & hilite
			if( options.center ){
				// 'center' or other corner?
				this._to = slice.call(options.center, 0, 2);
			}
			if( options.hilite ){
				this._from = [
					this._to[0] + options.hilite[0],
					this._to[1] + options.hilite[1],
					this._from[2]
				];
			} else if( !options.from ){
				this._from = slice.call(this._to);
			}
			if( options.radius ){
				if(isNumberLike( options.radius ))
					this._to[2] = options.radius;
				else
					this._to[2] = Math.round(Math.sqrt( Math.pow(this._to[0] - options.radius[0], 2) + Math.pow(this._to[1] - options.radius[1], 2) ));
			}
			if( options.startRadius ){
				if(isNumberLike( options.startRadius ))
					this._from[2] = options.startRadius;
				else
					this._from[2] = Math.round(Math.sqrt( Math.pow(this._to[0] - options.startRadius[0], 2) + Math.pow(this._to[1] - options.startRadius[1], 2) ));
			}
		},

		radius : function(radius, y){
			if(radius === undefined)
				return this._to[2];

			if(y !== undefined)
				radius = [radius, y];

			if(!isNumberLike(radius)){
				var vx = this._to[0] - radius[0];
				var vy = this._to[1] - radius[1];

				this._to[2] = Math.round(Math.sqrt( vx*vx + vy*vy ));
			}
			else {
				this._to[2] = _.distance(radius);
			}
			return this.update();
		},

		startRadius : function(radius, y){
			if(radius === undefined)
				return this._from[2];

			if(y !== undefined)
				radius = [radius, y];

			if(!isNumberLike(radius)){
				var vx = this._to[0] - radius[0];
				var vy = this._to[1] - radius[1];

				this._from[2] = Math.round(Math.sqrt( vx*vx + vy*vy ));
			}
			else {
				this._from[2] = _.distance(radius);
			}
			return this.update();
		},

		center : function(x, y){
			if(x === undefined)
				return this._to.slice(0, 2);
			if(y === undefined){
				y = x[1];
				x = x[0];
			}
			this._to[0] = x;
			this._to[1] = y;
			return this.update();
		},

		hilite : function(x, y){
			if(x === undefined)
				return [this._from[0] - this._to[0], this._from[1] - this._to[1]];
			if(y === undefined){
				y = x[1];
				x = x[0];
			}
			this._from[0] = this._to[0] + x;
			this._from[1] = this._to[1] + y;
			return this.update();
		}
	}
};