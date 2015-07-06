var closePath = new Curve('closePath', []);

Path = new Class( Shape, {

	init : function(){
		this._curves = Path.parsePath( this._curves, this );
		this._processStyle();
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
			this._curves[0].name = 'lineTo';
		}

		value = Path.parsePath(value, this, index === 0 ? false : true);
		this._curves.splice.apply(this._curves, [index, 0].concat(value));
		return this.update();
	},
	
	after : function(index, value){
		return this.before(index+1, value);
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

		if(isNumberLike(value[0]))
			this._curves = Path.parsePath(slice.call(arguments), this);
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
		return this.push(new Curve(name, arg, this));
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
		return this.push( closePath );
	},

	// processing
	merge : function(path){
		this._curves = this._curves.concat(path._curves);
		return this.update();
	},

	_bounds : function(){
		var curve, end,
			curves = this._curves,
			current = [0, 0],
			i = 0,
			l = curves.length,
			minx =  Infinity,
			miny =  Infinity,
			maxx = -Infinity,
			maxy = -Infinity;

		for(; i < l; i++){
			curve = curves[i];

			if(curve._bounds && (curve = curve._bounds(current))){
				minx = Math.min(minx, curve.x1, curve.x2);
				miny = Math.min(miny, curve.y1, curve.y2);
				maxx = Math.max(maxx, curve.x1, curve.x2);
				maxy = Math.max(maxy, curve.y1, curve.y2);
			}
			if( (end = curves[i].endsIn()) ){
				current = end;
			}
		}

		return new Bounds(minx, miny, maxx - minx, maxy - miny);
	},

	processPath : function(ctx){
		var curve,
			current = [0, 0],
			curves = this._curves,
			i = 0,
			l = curves.length;

		ctx.beginPath();
		for(; i < l; i++){
			curve = curves[i].process(ctx, current);
//			if(curve){
//				current[0] += curve[0];
//				current[1] += curve[1];
//			}
			
			if(curve)
				current = curve;
		}
	}

} );

Path.props = [ 'curves', 'fill', 'stroke' ];

Path.parsePath = function(path, pathObject, firstIsNotMove){
	if(!path)
		return [];

	if(path instanceof Curve){
		path.path = pathObject;
		return [path];
	}

	var curves = [];
	if(isArray(path)){

		// fix for [x,y] instead of [[x,y]]
		if(isNumberLike(path[0]))
			path = [path];

		for(var i = 0, l = path.length; i < l; i++){

			// Curve
			if(path[i] instanceof Curve){
				curves.push(path[i]);
				path[i].path = pathObject;
			}

			// Array
			else {
				if(i === 0 && !firstIsNotMove){
					curves.push(new Curve('moveTo', path[i], pathObject));
					continue;
				}
				curves.push(Curve.byArray(path[i], pathObject));
			}
		}

	}

	return curves;
};

$.path = function(){
	var path = new Path(arguments);
	path.init();
	return path;
};