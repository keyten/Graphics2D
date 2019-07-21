Path = new Class(Drawable, {
	initialize : function(args){
		if(args[0].constructor !== Object){
			// todo: distance (not number)
			if(args[1].constructor !== Number){
				args[3] = args[1];
				args[4] = args[2];
				args[1] = args[2] = undefined;
			}
		}

		this.super('initialize', [args]);
	},

	argsOrder : ['d', 'x', 'y', 'fill', 'stroke'],

	attrHooks : new DrawableAttrHooks({
		d : {
			set : function(value){
				this.attrs.curves = Path.parse(value, this);
				this.update();
			}
		},
		x : Rect.prototype.attrHooks.x,
		y : Rect.prototype.attrHooks.y
	}),

	// Curves
	curve : function(index, value){
		if(value === undefined){
			return this.attrs.curves[index];
		}

		if(!isNaN(value[0])){
			value = [value];
		}

		Array.prototype.splice.apply(this.attrs.d, [index, 1].concat(value));
		// todo: when removing curve unbind it from path
		Array.prototype.splice.apply(this.attrs.curves, [index, 1].concat(Path.parse(value, this, index !== 0)));
		return this.update();
	},

	before : function(index, value, turnMoveToLine){
		// if index == 0 && turnMoveToLine, then the current first moveTo will be turned to lineTo
		if(index === 0 && turnMoveToLine){
			this.attrs.curves[0].method = 'lineTo';
		}

		if(!isNaN(value[0])){
			value = [value];
		}

		Array.prototype.splice.apply(this.attrs.d, [index, 0].concat(value));
		Array.prototype.splice.apply(this.attrs.curves, [index, 0].concat(Path.parse(value, this, index !== 0)));
		return this.update();
	},

	after : function(index, value){
		return this.before(index + 1, value);
	},

	remove : function(index){
		if(index === undefined){
			return this.super('remove');
		}

		this.attrs.curves[index].path = null;
		this.attrs.curves.splice(index, 1);
		this.attrs.d.splice(index, 1);
		return this.update();
	},

	// Array species
	push : function(method, attrs){
		if(attrs){
			this.attrs.d.push([method].concat(attrs));
			this.attrs.curves.push(Delta.curve(method, attrs, this));
		} else {
			this.attrs.d = this.attrs.d.concat(method);
			this.attrs.curves = this.attrs.curves.concat(Path.parse(method, this, this.attrs.d.length !== 0));
		}
		return this.update();
	},

	each : function(){
		Array.prototype.forEach.apply(this.attrs.curves, arguments);
		return this;
	},

	map : function(){
		return Array.prototype.map.apply(this.attrs.d, arguments);
	},

	// Curves addition
	moveTo : function(x, y){
		return this.push('moveTo', [x, y]);
	},

	lineTo : function(x, y){
		return this.push('lineTo', [x, y]);
	},

	quadraticCurveTo : function(hx, hy, x, y){
		return this.push('quadraticCurveTo', [hx, hy, x, y]);
	},

	bezierCurveTo : function(h1x, h1y, h2x, h2y, x, y){
		return this.push('bezierCurveTo', [h1x, h1y, h2x, h2y, x, y]);
	},

	arcTo : function(x1, y1, x2, y2, radius, clockwise){
		return this.push('arcTo', [x1, y1, x2, y2, radius, !!clockwise]);
	},

	arc : function(x, y, radius, start, end, clockwise){
		return this.push('arc', [x, y, radius, start, end, !!clockwise]);
	},

	closePath : function(){
		return this.push('closePath', []);
	},

	// todo: works a bit bad with translate & draggable
	isPointIn : function(x, y, options){
		// todo: doesnt work correct
		var point = this.isPointInBefore(x, y, options);
		x = point[0];
		y = point[1];

		var ctx = this.context.context;
		ctx.save();
		if(this.attrs.x || this.attrs.y){
			// todo x -= this.attrs.x instead
			ctx.translate(this.attrs.x || 0, this.attrs.y || 0);
		}

		this.process(ctx);
		var result = ctx.isPointInPath(x, y);

		ctx.restore();
		return result;
	},

	roughBounds: function(transform, around){
		var minX =  Infinity,
			minY =  Infinity,
			maxX = -Infinity,
			maxY = -Infinity,

			currentBounds,
			currentPoint = [0, 0];
		for(var i = 0; i < this.attrs.curves.length; i++){
			currentBounds = this.attrs.curves[i].bounds(currentPoint);
			currentPoint = this.attrs.curves[i].endAt() || currentPoint;

			if(!currentBounds){
				continue;
			}

			minX = Math.min(minX, currentBounds[0], currentBounds[2]);
			maxX = Math.max(maxX, currentBounds[0], currentBounds[2]);
			minY = Math.min(minY, currentBounds[1], currentBounds[3]);
			maxY = Math.max(maxY, currentBounds[1], currentBounds[3]);
		}

		return new Bounds(minX + (this.attrs.x || 0), minY + (this.attrs.y || 0), maxX - minX, maxY - minY);
	},

	process : function(ctx){
		ctx.beginPath();
		this.attrs.curves.forEach(function(curve){
			curve.process(ctx);
		});
	},

	draw : function(ctx){
		if(this.attrs.visible){
			this.preDraw(ctx);
			if(this.attrs.x || this.attrs.y){
				// todo: will it be affected by previous transformations (the path itself, the canvas)?
				ctx.translate(this.attrs.x || 0, this.attrs.y || 0);
			}
			this.process(ctx);
			this.postDraw(ctx);
		}
	}

} );

Path.args = ['d', 'x', 'y', 'fill', 'stroke'];

Path.parse = function(data, path, firstIsNotMove){
	if(!data){
		return [];
	}

	if(data.constructor === String){
		return Path.parseString(data, path, firstIsNotMove);
	}

	if(data instanceof Curve){
		data.path = path;
		return [data];
	}

	if(data[0] !== undefined && (+data[0] === data[0] || data[0] + '' === data[0])){
		data = [data];
	}

	var curves = [];
	if(Array.isArray(data)){
		for(var i = 0; i < data.length; i++){
			if(data[i] instanceof Curve){
				curves.push(data[i]);
				data[i].path = path;
			} else {
				if(i === 0 && !firstIsNotMove){
					curves.push(new Curve(
						'moveTo',
						isNaN(data[i][0]) ? data[i].slice(1) : data[i],
						path
					));
				} else {
					curves.push(Curve.fromArray(data[i], path));
				}
			}
		}
	}
	return curves;
};

Path.parseString = function(data, path, firstIsNotMove){
	throw "String path data is not supported";
};

Delta.path = function(){
	return new Path(arguments);
};

Delta.Path = Path;