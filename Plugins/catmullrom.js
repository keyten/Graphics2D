/*! Graphics2D CatmullRom 1.0
 *  Author: Keyten aka Dmitriy Miroshnichenko
 *  License: MIT / LGPL
 */
(function(window, $, undefined){

	var catmullRom = function(numbers, curves, path){
		this._arguments = numbers;
		this._points = 20;
		this._path = path;
		this.update = path.update.bind(path);

		this.name = 'catmullRom';
		this.h1x = numbers[0];
		this.h1y = numbers[1];
		this.h2x = numbers[5];
		this.h2y = numbers[7];
		this.x1 = numbers[2];
		this.y1 = numbers[3];
		this.x2 = numbers[4];
		this.y2 = numbers[5];
	};

	$.util.pathFunctions.catmullRom = catmullRom;


	catmullRom.prototype.process = function(ctx){
		var max = this._points,
			step = 100 / max,
			point;
		for(var i = 0; i <= 100; i+=step){
			point = this.pointAt(i / 100);
			ctx.lineTo(point.x, point.y);
		}
		if(i-step < 100){
			point = this.pointAt(1);
			ctx.lineTo(point.x, point.y);
		}
	};

	catmullRom.prototype.pointAt = function(t){
		return catmullRom.pointAt.apply(0, this._arguments.concat([t]));
	};

	catmullRom.prototype.length = function(){
		var max = this._points,
			step = 100 / max,
			point,
			length = 0,
			last;
		point = this.pointAt(0);
		last = point;
		for(var i = 1; i <= 100; i+=step){
			point = this.pointAt(i / 100);
			length += Math.sqrt( Math.pow(point.x - last.x, 2) + Math.pow(point.y - last.y, 2) );
			last = point;
		}
		return length;
	};

	// utils
	catmullRom.prototype.arguments = function(value){
		if(value === undefined)
			return this._arguments;
		if(arguments.length > 1)
			value = Array.prototype.slice.call(arguments);
		this._arguments = value;
		this.h1x = value[0];
		this.h1y = value[1];
		this.h2x = value[5];
		this.h2y = value[7];
		this.x1 = value[2];
		this.y1 = value[3];
		this.x2 = value[4];
		this.y2 = value[5];
		this.update();
		return this;
	};

	catmullRom.parameters = ['h1x', 'h1y', 'x1', 'y1', 'x2', 'y2', 'h2x', 'h2y'];
	catmullRom.prototype.set = function(name, value){
		var index = catmullRom.parameters.indexOf(name);
		this._arguments[index] = value;
		this[name] = value;
		this.update();
		return this;
	};



	// CR
	catmullRom.pointAt = function(x1, y1, x2, y2, x3, y3, x4, y4, t){
		return {
			x: 0.5 * ((-x1 + 3*x2 - 3*x3 + x4)*t*t*t
					+ (2*x1 - 5*x2 + 4*x3 - x4)*t*t
					+ (-x1 + x3)*t
					+ 2*x2),
			y: 0.5 * ((-y1 + 3*y2 - 3*y3 + y4)*t*t*t
					+ (2*y1 - 5*y2 + 4*y3 - y4)*t*t
					+ (-y1 + y3)*t
					+ 2*y2)
		};
	};


})(window, Graphics2D);