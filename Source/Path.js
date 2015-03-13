	$.Path = Path = new Class(Shape, {

		initialize : function(points, fill, stroke, context){
			this._curves = Path.parsePath(points, this);
			this._processStyle(fill, stroke, context.context);
			this.context = context;
		},

		// curves
		curve : function(index, value){
			if(value === undefined)
				return this._curves[index];

			value = Path.parsePath(value, this, index === 0 ? false : true);
			this._curves.splice.apply(this._curves, [index, 1].concat(value));
			return this.update();
		},
		before : function(index, value, turnToLine){
			// if index = 0 & turnToLine then the first moveTo will be turned to lineTo
			// turnToLine = true by default
			if(turnToLine !== false && index === 0){
				this._curves[0]._name = 'lineTo';
			}

			value = Path.parsePath(value, this, index === 0 ? false : true);
			this._curves.splice.apply(this._curves, [index, 0].concat(value));
			return this.update();
		},
		after : function(index, value){
			return this.before(index+1, value);
//			value = Path.parsePath(value, this, index === 0 ? false : true);
//			this._curves.splice.apply(this._curves, [index+1, 0].concat(value));
//			return this.update();
		},
		remove : function(index){
			if(index === undefined)
				return Shape.prototype.remove.call(this);
			this._curves.splice(index, 1);
			return this.update();
		},
		curves : function(value){
			if(value === undefined)
				return this._curves;

			if(isNumber(value[0]))
				this._curves = Path.parsePath(Array.prototype.slice.call(arguments), this);
			else
				this._curves = Path.parsePath(value, this);
			return this.update();
		},

		// adding
		push : function(curve){
			this._curves.push(curve);
			return this.update();
		},
		add : function(name, arg){
			return this.push(new Path.curves[name](name, arg, this));
		},
		moveTo : function(x, y){
			return this.add('moveTo', [x, y]);
		},
		lineTo : function(x, y){
			return this.add('lineTo', [x, y]);
		},
		quadraticCurveTo : function(hx, hy, x, y){
			return this.add('quadraticCurveTo', [hx, hy, x, y]);
		},
		bezierCurveTo : function(h1x, h1y, h2x, h2y, x, y){
			return this.add('bezierCurveTo', [h1x, h1y, h2x, h2y, x, y]);
		},
		arcTo : function(x1, y1, x2, y2, radius, clockwise){
			return this.add('arcTo', [x1, y1, x2, y2, radius, !!clockwise]);
		},
		arc : function(x, y, radius, start, end, clockwise){
			return this.add('arc', [x, y, radius, start, end, !!clockwise]);
		},
		closePath : function(){
			// todo: using the closePath var
			return this.add('closePath', []);
		},

		// processing
		allPoints : function(callback){},
		transformPath : function(a, b, c, d, e, f, pivot){},
		processPath : function(ctx){
			var current = [0, 0];

			ctx.beginPath();
			this._curves.forEach(function(curve){
				curve = curve.process(ctx, current);
				current[0] += curve[0];
				current[1] += curve[1];
			});
		},
		merge : function(path){
			this._curves = this._curves.concat(path._curves);
			return this.update();
		},

		bounds : function(){}
	});

	function argument(n){
		return function(value){
			return this.argument(n, value);
		}
	}

	var basicLine, quadratic, bezier, arc, arcTo;

	Path.curves = {
		moveTo : basicLine = new Class(Curve, {
			process : function(ctx, point){
				ctx[this._name].apply(ctx, this._arguments);
				return this._arguments;
			},
			x : argument(0),
			y : argument(1),
			bounds : function(from){
				if(this._name === 'moveTo')
					return null;

				if(this._from)
					from = this._from;
				return new Bounds(from[0], from[1], this._arguments[0] - from[0], this._arguments[1] - from[1]);
			}
		}),
		lineTo : basicLine,
		quadraticCurveTo : quadratic = new Class(Curve, {
			process : function(ctx, point){
				ctx[this._name].apply(ctx, this._arguments);
				return this._arguments.slice(2);
			},
			x  : argument(2),
			y  : argument(3),
			hx : argument(0),
			hy : argument(1),
			bounds : function(from){
				if(this._from)
					from = this._from;
				var minx = Math.min(this._arguments[0], this._arguments[2], from[0]),
					miny = Math.min(this._arguments[1], this._arguments[3], from[1]),
					maxx = Math.max(this._arguments[0], this._arguments[2], from[0]),
					maxy = Math.max(this._arguments[1], this._arguments[3], from[1]);
				return new Bounds(minx, miny, maxx-minx, maxy-miny);
			}
		}),
		bezierCurveTo : bezier = new Class(Curve, {
			process : function(ctx, point){
				ctx[this._name].apply(ctx, this._arguments);
				return this._arguments.slice(4);
			},
			x   : argument(4),
			y   : argument(5),
			h1x : argument(0),
			h1y : argument(1),
			h2x : argument(2),
			h2y : argument(3),
			bounds : function(from){
				if(this._from)
					from = this._from;
				var minx = Math.min(this._arguments[0], this._arguments[2], this._arguments[4], from[0]),
					miny = Math.min(this._arguments[1], this._arguments[3], this._arguments[5], from[1]),
					maxx = Math.max(this._arguments[0], this._arguments[2], this._arguments[4], from[0]),
					maxy = Math.max(this._arguments[1], this._arguments[3], this._arguments[5], from[1]);
				return new Bounds(minx, miny, maxx-minx, maxy-miny);
			}
		}),
		arc : arc = new Class(Curve, {
			process : function(ctx, point){
				ctx[this._name].apply(ctx, this._arguments);

				var x = this._arguments[0],
					y = this._arguments[1],
					radius = this._arguments[2],
					start  = this._arguments[3],
					end    = this._arguments[4],
					clockwise = this._arguments[5],

					delta = end - start;

				if(clockwise)
					delta = -delta;

				return [
					x + Math.cos(delta) * radius,
					y + Math.sin(delta) * radius
				];
			},
			x : argument(0),
			y : argument(1),
			radius : argument(2),
			start : argument(3),
			end : argument(4),
			clockwise : argument(5)
		}),
		arcTo : arcTo = new Class(Curve, {
			process : function(ctx, point){
				ctx[this._name].apply(ctx, this._arguments);
				return this._arguments.slice(2,4);
			},
			x1 : argument(0),
			y1 : argument(1),
			x2 : argument(2),
			y2 : argument(3),
			radius : argument(4),
			clockwise : argument(5)
		})
	};

	var closePath = new Curve('closePath', []);

	function curveByArray(array, path){
		if(array === true)
			return closePath;

		switch(array.length){
			case 2:
				return new basicLine('lineTo', array, path);
			case 4:
				return new quadratic('quadraticCurveTo', array, path);
			case 6:
				return new bezier('bezierCurveTo', array, path);
		}
	}

	Path.parsePath = function(path, pathObject, firstIsNotMove){
		if(!path)
			return [];

		if(path instanceof Curve)
			return [path];

		var curves = [];
		if(isArray(path)){

			// fix for [x,y] instead of [[x,y]]
			if(isNumber(path[0]))
				path = [path];

			for(var i = 0, l = path.length; i < l; i++){

				// Curve
				if(path[i] instanceof Curve)
					curves.push(path[i]);

				// Array
				else {
					if(i === 0 && !firstIsNotMove){
						curves.push(new basicLine('moveTo', path[i], pathObject));
						continue;
					}
					curves.push(curveByArray(path[i], pathObject))
				}
			}

		}

		return curves;
	};