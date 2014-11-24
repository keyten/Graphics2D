/*! Graphics2D Quart (Bezier^4) 1.0
 *  Author: Keyten aka Dmitriy Miroshnichenko
 *  License: MIT / LGPL
 */
(function(window, $, undefined){

	var quart = function(numbers, curves, path){
		this._arguments = numbers;
		this._points = 20;
		this._path = path;
		this.update = path.update.bind(path);

		this.name = 'quartBezierTo';
		this.h1x = numbers[4];
		this.h1y = numbers[5];
		this.h2x = numbers[6];
		this.h2y = numbers[7];
		this.h3x = numbers[8];
		this.h3y = numbers[9];
		this.x1 = numbers[0];
		this.y1 = numbers[1];
		this.x2 = numbers[2];
		this.y2 = numbers[3];
	};

	quart.prototype.process = function(ctx){
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

	quart.prototype.pointAt = function(t){
		return quart.pointAt.apply(0, this._arguments.concat([t]));
	};

	quart.prototype.arguments = function(value){
		if(value === undefined)
			return this._arguments;
		if(arguments.length > 1)
			value = Array.prototype.slice.call(arguments);
		this._arguments = value;
		this.h1x = value[4];
		this.h1y = value[5];
		this.h2x = value[6];
		this.h2y = value[7];
		this.h3x = value[8];
		this.h3y = value[9];
		this.x1 = value[0];
		this.y1 = value[1];
		this.x2 = value[2];
		this.y2 = value[3];
		this.update();
		return this;
	};

	quart.parameters = ['x1', 'y1', 'x2', 'y2', 'h1x', 'h1y', 'h2x', 'h2y', 'h3x', 'h3y'];
	quart.prototype.set = function(name, value){
		var index = quart.parameters.indexOf(name);
		this._arguments[index] = value;
		this[name] = value;
		this.update();
		return this;
	};



	$.util.pathFunctions.quartCurveTo = quart;


	$.pointOfQuart = quart.pointAt = function(fx, fy, tx, ty, h1x, h1y, h2x, h2y, h3x, h3y, t){
		var i = 1 - t;
		return {
			x: (Math.pow(i,4)*fx) + (4*t*i*i*i*h1x) + (4*t*t*i*i*h2x) + (4*t*t*t*i*h3x) + (Math.pow(t,4)*tx),
			y: (Math.pow(i,4)*fy) + (4*t*i*i*i*h1y) + (4*t*t*i*i*h2y) + (4*t*t*t*i*h3y) + (Math.pow(t,4)*ty)
		};
	};


})(window, Graphics2D);