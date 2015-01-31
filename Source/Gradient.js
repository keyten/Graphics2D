	$.Gradient = Gradient = new Class({

		initialize : function(type, colors, from, to, context){
			if(isHash(type)){
				this._type = type.type || 'linear';
				this._colors = isArray(type.colors) ? this._parseColors(type.colors) : type.colors;

				this._from = type.from || [];
				this._to = type.to || [];

				// radial
				if(type.center){
					this._to[0] = type.center[0]; // TODO: distance
					this._to[1] = type.center[1];
				}

				if(type.hilite){
					this._from[0] = this._to[0] + type.hilite[0];
					this._from[1] = this._to[1] + type.hilite[1];
				}
				else if(!type.from){
					this._from[0] = this._to[0];
					this._from[1] = this._to[1];
				}

				if(isNumber(type.radius))
					this._to[2] = _.distance(type.radius);
				else if(isArray(type.radius))
					this._to[2] = Math.round(Math.sqrt( Math.pow(this._to[0] - type.radius[0], 2) + Math.pow(this._to[1] - type.radius[1], 2) ));
				
				if(isNumber(type.startRadius))
					this._from[2] = _.distance(type.startRadius);
				else if(isArray(type.startRadius))
					this._from[2] = Math.round(Math.sqrt( Math.pow(this._to[0] - type.startRadius[0], 2) + Math.pow(this._to[1] - type.startRadius[1], 2) ));
			}
			else {
				if(to === undefined){
					to = from;
					from = colors;
					colors = type;
					type = 'linear';
				}
				this._type = type || 'linear';
				this._colors = isArray(colors) ? this._parseColors(colors) : colors;
				this._from = from;
				this._to = to;
			}
			this.context = context;
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
					return _.interpolate( _.color(stops[last]), _.color(stops[keys[i]]), (t - parseFloat(last)) / (parseFloat(keys[i]) - parseFloat(last)) );
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

		// general
		from : function(x,y,r){
			if(isString(x) && x in _.corners){
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
			if(isString(x) && x in _.corners){
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

		// radial
		radius : function(radius, y){
			if(radius === undefined)
				return this._to[2];

			if(y !== undefined)
				radius = [radius, y];

			if(!isNumber(radius)){
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

			if(!isNumber(radius)){
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
			if(isString(from)){
				if(/^\d+(px|pt)?/.test(from))
					this._from = from = _.distance(from);
				else
					from = element.corner(from);
			}
			if(isString(to)){
				if(/^\d+(px|pt)?/.test(to))
					this._to = to = _.distance(to);
				else
					to = element.corner(to);
			}

			// TODO: add {x:10, y:10, from:'left'}
			// it's not a string :)

			// Cache
			var key = this.key(from, to);
			if(this._cache && this.context._cache[key])
				return this.context._cache[key];

			if(this._type == 'linear')
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
