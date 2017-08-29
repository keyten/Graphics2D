Path = new Class(Drawable, {

	initialize : function(args, context){
		this.super('initialize', arguments);

		if(isObject(args[0])){
			args = this.processObject(args[0], Path.args);
		}

		this.attrs.d = Path.parse(args[0], this);

		// parseInt is neccessary bcs isNaN('30px') -> true
		if(isNaN(parseInt(args[1]))){
			args[3] = args[1];
			args[4] = args[2];
			args[1] = args[2] = null;
		}

		if(args[1] || args[2]){
			this.attrs.x = args[1] || 0;
			this.attrs.y = args[2] || 0;
		}

		if(args[3]){
			this.styles.fillStyle = args[3];
		}
		if(args[4]){
			this.attrs.stroke = args[4];
			Drawable.processStroke(args[4], this.styles);
		}
	},

	attrHooks: new DrawableAttrHooks({
		d: {
			set: function(value){
				this.update();
				return value;
			}
		},

		x: {
			set: function(value){
				this.update();
			}
		},

		y: {
			set: function(value){
				this.update();
			}
		}
	}),

	// Curves
	curve: function(index, value){
		if(value === undefined){
			return this.attrs.d[index];
		}

		if(!isNaN(value[0])){
			value = [value];
		}

		value = Path.parse(value, this, index !== 0);
		// todo: when removing curve unbind it from path
		this.attrs.d.splice.apply(this.attrs.d, [index, 1].concat(value));
		return this.update();
	},

	curves: function(value){
		if(value === undefined){
			return this.attrs.d;
		}

		this.attrs.d = Path.parse(value, this, true);
		return this.update();
	},

	before: function(index, value, turnMoveToLine){
		// if index == 0 && turnMoveToLine, then the current first moveTo will be turned to lineTo
		if(index === 0 && turnToLine !== false){
			this.attrs.d[0].method = 'lineTo';
		}

		if(!isNaN(value[0])){
			value = [value];
		}

		value = Path.parse(value, this, index !== 0);
		this.attrs.d.splice.apply(this.attrs.d, [index, 0].concat(value));
		return this.update();
	},

	after: function(index, value){
		return this.before(index + 1, value);
	},

	remove: function(index){
		if(index === undefined){
			return this.super('remove');
		}
		this.attrs.d[index].path = null;
		this.attrs.d.splice(index, 1);
		return this.update();
	},

	// Array species
	push: function(method, attrs){
		if(attrs){
			this.attrs.d.push(Delta.curve(method, attrs, this));
		} else {
			this.attrs.d = this.attrs.d.concat(Path.parse(method, this, this.attrs.d.length !== 0));
		}
		return this.update();
	},

	each: function(){
		this.attrs.d.forEach.apply(this.attrs.d, arguments);
		return this;
	},

	map: function(){
		return this.attrs.d.map.apply(this.attrs.d, arguments);
	},

	// Curves addition
	moveTo: function(x, y){
		// todo: optimize!
		// return this.attrs.d.push(Delta.curve('moveBy', [x, y], this)); - but it is not beautiful :p
		return this.push(['moveTo', x, y]);
	},

	lineTo : function(x, y){
		return this.push(['lineTo', x, y]);
	},

	quadraticCurveTo : function(hx, hy, x, y){
		return this.push(['quadraticCurveTo', hx, hy, x, y]);
	},

	bezierCurveTo : function(h1x, h1y, h2x, h2y, x, y){
		return this.push(['bezierCurveTo', h1x, h1y, h2x, h2y, x, y]);
	},

	arcTo : function(x1, y1, x2, y2, radius, clockwise){
		return this.push(['arcTo', x1, y1, x2, y2, radius, !!clockwise]);
	},

	arc : function(x, y, radius, start, end, clockwise){
		return this.push(['arc', x, y, radius, start, end, !!clockwise]);
	},

	closePath : function(){
		return this.push(['closePath']);
	},

	isPointIn : function(x, y){
		;
	},

	bounds: function(transform, around){
		var minX =  Infinity,
			minY =  Infinity,
			maxX = -Infinity,
			maxY = -Infinity,

			currentBounds,
			currentPoint = [0, 0];
		for(var i = 0; i < this.attrs.d.length; i++){
			currentBounds = this.attrs.d[i].bounds(currentPoint);
			currentPoint = this.attrs.d[i].endAt() || currentPoint;

			if(!currentBounds){
				continue;
			}

			minX = Math.min(minX, currentBounds[0], currentBounds[2]);
			maxX = Math.max(maxX, currentBounds[0], currentBounds[2]);
			minY = Math.min(minY, currentBounds[1], currentBounds[3]);
			maxY = Math.max(maxY, currentBounds[1], currentBounds[3]);
		}

		return this.super('bounds', [
			[minX, minY, maxX - minX, maxY - minY],
			transform, around
		]);
	},

	draw : function(ctx){
		if(this.attrs.visible){
			this.context.renderer.drawPath(
				[this.attrs.d, this.attrs.x, this.attrs.y],
				ctx, this.styles, this.matrix, this
			);
		}
	}

} );

Path.args = ['d', 'offsetX', 'offsetY', 'fill', 'stroke'];

Path.parse = function(data, path, firstIsNotMove){
	if(!data){
		return [];
	}
/*
	if(data + '' === data){
		return Path.parseSVG(data, path, firstIsNotMove);
	} */

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

/* Path.parseSVG = function(data, path, firstIsNotMove){
	return [];
}; */

Delta.path = function(){
	return new Path(arguments);
};

Delta.Path = Path;