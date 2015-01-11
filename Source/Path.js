	$.Path = Path = new Class(Shape, {

		initialize : function(points, fill, stroke, context){
			this._z = context.elements.length;
			this.context = context;
			if(isHash(points)){
				this._points = this._parsePath(points.points);
				this._parseHash(points);
			}
			else {
				this._points = this._parsePath(points);
				this._processStyle(fill, stroke, context.context);
			}
		},

		// points
		point : function(index, value){
			if(value === undefined)
				return this._points[index];
			this._points = this._points.slice(0, index).concat(this._parsePath(value).concat(this._points.slice(index+1)));
			return this.update();
		},
		before : function(index, points){
			this._points = this._points.slice(0, index).concat(this._parsePath(points).concat(this._points.slice(index)));
			return this.update();
		},
		after : function(index, points){
			return this.before(index+1, points);
		},
		remove : function(index){
			if(index === undefined)
				return Shape.prototype.remove.call(this);
			this._points = this._points.slice(0, index).concat( this._points.slice(index+1) );
			return this.update();
		},

		points : function(points){
			if(points === undefined){
				return this._points;
			}
			this._points = this._parsePath(points);
			return this.update();
		},

		push : function(object){
			this._points.push(object);
			return this.update();
		},
		add : function(name, arg){
			return this.push( new _.pathFunctions[name](arg, this._points, this) );
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
			return this.add('arcTo', [x1, y1, x2, y2, radius, clockwise]);
		},
		arc : function(x, y, radius, start, end, clockwise){
			return this.add('arc', [x, y, radius, start, end, clockwise]);
		},
		closePath : function(){
			return this.add('closePath');
		},

		// transformations
		allPoints : function(fn){
			// path.allPoints() => [[0,0], [10,10]]
			// path.allPoints(function(func, arg){ return [0,0] })
			var allPoints = [],
				returnData, temp;
			if(fn === undefined){
				fn = function(x,y){
					allPoints.push([x,y]);
				};
				returnData = true;
			}
			this._points.forEach(function(func){
				var arg = func._arguments;
				if( temp = fn(Number(arg[0]), Number(arg[1])) ){
					arg[0] = temp[0];
					arg[1] = temp[1];
				}
				if( arg.length > 3 && func.name != 'arc' && (temp = fn(Number(arg[2]), Number(arg[3]))) ){
					arg[2] = temp[0];
					arg[3] = temp[1];
				}
				if( func.name == 'bezierCurveTo' && (temp = fn(Number(arg[4]), Number(arg[5]))) ){
					arg[4] = temp[0];
					arg[5] = temp[1];
				}
			});
			return returnData ? allPoints : this.update();
		},
		transformPath : function(a,b,c,d,e,f, pivot){
			if(isString(a) && a in _.transformFunctions){
				a = _.transformFunctions[a].apply(null, Array.prototype.slice.call(arguments,1));
				b = a[1];
				c = a[2];
				d = a[3];
				e = a[4];
				f = a[5];
				a = a[0];
			}

			var m = [1,0,0,1,0,0], m2 = [a,b,c,d,e,f];
			_.transform(m, m2, _.corner(pivot, this.bounds()));
			return this.allPoints(function(x, y){
				return _.transformPoint(x, y, m);
			});
		},


		bounds : function(){
			var x  =  Infinity,
				y  =  Infinity,
				x2 = -Infinity,
				y2 = -Infinity;
			this._points.forEach(function(point){
				if(point.name != 'lineTo'
					&& point.name != 'moveTo'
					&& point.name != 'quadraticCurveTo'
					&& point.name != 'bezierCurveTo')
					return;
				var a = point._arguments; // and if a[2] or a[4] == 0?
				x  = Math.min( x,  a[0], a[2] || x,  a[4] || x  );
				y  = Math.min( y,  a[1], a[3] || y,  a[5] || y  );
				x2 = Math.max( x2, a[0], a[2] || x2, a[4] || x2 );
				y2 = Math.max( y2, a[1], a[3] || y2, a[5] || y2 );
			});
			return new Bounds(x, y, x2 - x, y2 - y);
		},
		processPath : function(ctx){
			ctx.save();
			ctx.beginPath();
			this._points.forEach(function(point, i){
				point.process(ctx, i);
			});
			ctx.restore();
		},
		_parsePath : function(path){
			if(!path) return [];
			var curves = [];
			if(isArray(path)){

				// number array
				if(isArray(path[0])){
					curves[0] = new _.pathFunctions.moveTo(path[0], curves, this);

					path.forEach(function(value, i){
						if(i === 0)
							return;

						if(value === true){
							curves[i] = new _.pathFunctions.closePath([], curves, this);
							return;
						}

						curves[i] = new _.pathFunctions[
							{
								2: 'lineTo',
								4: 'quadraticCurveTo',
								6: 'bezierCurveTo'
							}[value.length]
						](value, curves, this);
					}.bind(this));
				}

				// objects
				else {
					path.forEach(function(value, i){
						// {name, args, ?x,y}
						curves[i] = new _.pathFunctions[value.name](value.arguments, curves, this);
					}.bind(this));
				}

			}

			// SVG-like
			else if(isString(path)){
				// regular for numbers: /\-?\d*\.\d+|\-?\d+/g
				var match = path.match(/([A-Za-z])\s*((\-?\d*\.\d+|\-?\d+)((\s*,\s*|\s|\-)(\-?\d*\.\d+|\-?\d+))*)?/g);
				// TODO: make possible more than one letter?
				var command;
				var numbers;
				var length;
				var toNumber = function(v){ return Number(v); };
				for(var i = 0, l = match.length; i < l; i++){
					command = _.svgFunctions[match[i][0]];
					numbers = match[i].match(/\-?\d*\.\d+|\-?\d+/g); // arguments
					length = _.svgPathLengths[match[i][0]]; // count of the arguments (L - 2, H - 1...)
					if(numbers){
						numbers = numbers.map(toNumber);

						if(numbers.length > length){
							// multiple in one command: L100,100,200,200,300,300,400,400 (== L100,100 L200,200, ...)
							var exist = numbers.length,
								mustb = length;
				//				iters = exist / mustb;
							for(; mustb <= exist; mustb+=length){
								curves.push(new _.pathFunctions[command](numbers.slice(mustb-length, mustb), curves, this));
							}
						}
						else
							curves.push(new _.pathFunctions[command](numbers, curves, this));
					}
					else
						curves.push(new _.pathFunctions[command](numbers, curves, this));
				}
			}
			return curves;
		}

	});
