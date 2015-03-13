	$.Curve = Curve = new Class(Shape, {
		initialize : function(name, args, from, fill, stroke, context){
			this._name = name;
			this._arguments = args; // todo: parsing args {x: 10, y:10}
			this.context = context;

			if(context instanceof Context){
				// independent curve
				this._from = from;
				this._processStyle(fill, stroke, context.context);
			}
			else if(from) {
				// from - path
				this.update = from.update.bind(from);
			}

			if(name in Path.curves)
				extend(this, Path.curves[name].prototype);
		},

		arguments : function(){
			return this._property('arguments', arguments.length > 1 ? arguments : arguments[0]);
		},

		argument : function(index, value){
			if(value === undefined)
				return this._arguments[index];
			this._arguments[index] = value;
			this.update();
			return this;
		},

		from : function(x, y){
			if(y !== undefined)
				return this._property('from', [x, y]);
			return this._property('from', x);
		},

		process : function(ctx){
			ctx[this._name].apply(ctx, this._arguments);
			return [0,0];
		},

		processPath : function(ctx){
			ctx.beginPath();
			ctx.moveTo(this._from[0], this._from[1]);
			this.process(ctx, this._from);
		},

		toPath : function(){
			// this.context.push?
			var path = new Path(this);
			path._style = this._style;
			return path;
		},

		bounds : function(){
			return null;
		}

		// pointAt: function(){},
		// tangentAt: function(){},
		// normalAt = auto
		// intersections: function(){},
		// toBezier: function(){},
		// approximate: function(){}, // by lines
		// bounds: function(){},
		// length: function(){},
		// divide: function(){},
		// nearest: function(){}, // nearest point
		// allPoints
	});