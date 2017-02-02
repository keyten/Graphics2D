var closePath = new Curve('closePath', []);

Path = new Class(Drawable, {

	initialize : function(args, context){
		this.super('initialize', arguments);

		if(isObject(args[0])){
			args = this.processObject(args[0], Path.args);
		}

		this.attrs.d = Path.parse(args[0], this);
		if(args[1]){
			this.styles.fillStyle = args[1];
		}
		if(args[2]){
			Drawable.processStroke(args[2], this.styles);
		}
	},

	attrHooks: extend(Object.assign({}, Drawable.prototype.attrHooks), {
		d: {
			set: function(value){
				this.update();
				return value;
			}
		}
	}),

	// Parts
	part: function(index, value){
		if(value === undefined){
			return this.attrs.d[index];
		}

		value = Path.parse(value, this, index !== 0);
		this.attrs.d.splice.apply(this.attrs.d, [index, 1].concat(value));
		return this.update();
	},

	before: function(index, value, turnMoveToLine){
		// if index == 0 && turnMoveToLine, then the current first moveTo will be turned to lineTo
		if(index === 0 && turnToLine !== false){
			this.attrs.d[0].name = 'lineTo';
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
	push: function(curve){
		this.attrs.d = this.attrs.d.concat(Path.parse(curve, this, this.attrs.d.length !== 0));
		return this.update();
	},

	forEach: function(){
		this.attrs.d.forEach.apply(this.attrs.d, arguments);
		return this;
	},

	map: function(){
		return this.attrs.d.map.apply(this.attrs.d, arguments);
	},

	reduce: function(){
		return this.attrs.d.reduce.apply(this.attrs.d, arguments);
	},

	// Parts addition
	moveTo: function(x, y){
		return this.push(['moveTo', x, y])
	},

	lineTo : function(x, y){
		return this.push(['lineTo', x, y])
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
		return this.push(closePath);
	},


	shapeBounds: function(){
		var minX =  Infinity,
			minY =  Infinity,
			maxX = -Infinity,
			maxY = -Infinity,

			currentBounds;
		for(var i = 0; i < this.attrs.d.length; i++){
			currentBounds = this.attrs.d[i].bounds();
			minX = Math.min(minX, currentBounds.x1, currentBounds.x2);
			maxX = Math.max(maxX, currentBounds.x1, currentBounds.x2);
			minY = Math.min(minY, currentBounds.y1, currentBounds.y2);
			maxY = Math.max(maxY, currentBounds.y1, currentBounds.y2);
		}
		return new Bounds(minX, minY, maxX - minX, maxY - minY);
	},

	draw : function(ctx){
		if(this._visible){
			this.context.renderer.drawPath(
				this.attrs.d,
				ctx, this.styles, this.matrix, this
			);
		}
	}

} );

Path.args = ['d', 'fill', 'stroke'];

// some parts are commented here because I want to make Curve internal class
Path.parse = function(data, path, firstIsNotMove){
	if(!data){
		return [];
	}

	if(data + '' === data){
		return Path.parseSVG(data, path, firstIsNotMove);
	}

	/* if(data instanceof Curve){
		data.path = path;
		return [data];
	} */

	var curves = [];
	if(Array.isArray(data)){
		for(var i = 0; i < data.length; i++){

			// fix for [x,y] instead of [[x,y]]
			// necessary for path.curve(index, [0, 0])
			if(+data[1] === data[1]){
				data = [data];
			}

			// Curve
			/* if(data[i] instanceof Curve){
				curves[i].push(data[i]);
				curves[i].path = path;
			}

			// Array
			else { */
				if(i === 0 && !firstIsNotMove){
					curves.push(new Curve('moveTo', isNaN(data[i][0]) ? data[i].slice(1) : data[i], path));
					continue;
				}
				curves.push(Curve.fromArray(data[i], path));
			/* } */

		}
	}
	return curves;
};

Path.parseSVG = function(data, path, firstIsNotMove){
	return [];
};

$.path = function(){
	var path = new Path(arguments);
	path.init();
	return path;
};

$.Path = Path;