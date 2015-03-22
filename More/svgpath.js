/*! Graphics2D SVG Paths 1.0
 *  Author: Keyten aka Dmitriy Miroshnichenko
 *  License: MIT / LGPL
 */
(function(window, $, undefined){

	var lengths = {
		M:2,
		L:2,
		H:1,
		V:1,
		C:6,
		S:4,
		Q:4,
		T:2,
		A:7,
		Z:0,
		m:2,
		l:2,
		h:1,
		v:1,
		c:6,
		s:4,
		q:4,
		t:2,
		a:7,
		z:0
	};

	$.util.parseSVGPath = function(string){
		var match = string.match(/([A-Za-z])\s*((\-?\d*\.\d+|\-?\d+)((\s*,\s*|\s|\-)(\-?\d*\.\d+|\-?\d+))*)?/g);
		var curves = [];
		var command;
		var numbers;
		var length;

		var x = 0,
			y = 0,
			hx = 0,
			hy = 0;
		for(var i = 0, l = match.length; i < l; i++){
			command = match[i][0];
			numbers = match[i].match(/\-?\d*\.\d+|\-?\d+/g); // arguments
			length = lengths[match[i][0]]; // count of the arguments (L - 2, H - 1...)
			if(numbers){
				numbers = numbers.map(function(v){ return Number(v); });
				if(numbers.length > length){
					var exist = numbers.length,
						mustb = length,
						current;
					for(; mustb <= exist; mustb+=length){
						current = numbers.slice(mustb-length, mustb);
						switch(command){
							case 'm': // moveto, relative
								x += current[0];
								y += current[1];
								curves.push({
									name : 'moveTo',
									arguments : [x, y]
								});
								break;

							case 'M': // moveto, absolute
								x = current[0];
								y = current[1];
								curves.push({
									name : 'moveTo',
									arguments : [x, y]
								});
								break;

							case 'l': // lineto, relative
								x += current[0];
								y += current[1];
								curves.push({
									name : 'lineTo',
									arguments : [x, y]
								});
								break;

							case 'L': // lineto, absolute
								x = current[0];
								y = current[1];
								curves.push({
									name : 'lineTo',
									arguments : [x, y]
								});
								break;

							case 'h': // horizontal line, relative
								x += current[0];
								curves.push({
									name : 'lineTo',
									arguments : [x, y]
								});
								break;

							case 'H': // horizontal line, absolute
								x = current[0];
								curves.push({
									name : 'lineTo',
									arguments : [x, y]
								});
								break;

							case 'v': // vertical line, relative
								y += current[0];
								curves.push({
									name : 'lineTo',
									arguments : [x, y]
								});
								break;

							case 'V': // vertical line, absolute
								y = current[0];
								curves.push({
									name : 'lineTo',
									arguments : [x, y]
								});
								break;

							case 'C': // bezier cubic; absolute
								x = current[4];
								y = current[5];
								hx = current[2];
								hy = current[3];
								curves.push({
									name : 'bezierCurveTo',
									arguments : [current[0], current[1], hx, hy, x, y]
								});
								break;

							case 'c': // bezier cubic; relative
								hx = x + current[2];
								hy = y + current[3];
								curves.push({
									name : 'bezierCurveTo',
									arguments : [
										x + current[0], y + current[1],
										hx, hy,
										x + current[4], y + current[5]
									]
								});
								x += current[4];
								y += current[5];
								break;

							case 'S': // smooth bezier cubic; absolute
								var dx = x - hx,
									dy = y - hy;
								hx = current[0];
								hy = current[1];
								curves.push({
									name : 'bezierCurveTo',
									arguments : [
										x + dx, y + dy,
										hx, hy,
										current[2], current[3]
									]
								});
								x = current[2];
								y = current[3];
								break;

							case 's': // smooth bezier cubic; relative
								var dx = x - hx,
									dy = y - hy;
								hx = current[0];
								hy = current[1];
								curves.push({
									name : 'bezierCurveTo',
									arguments : [
										x + dx, y + dy,
										x + hx, y + hy,
										x + current[2], y + current[3]
									]
								});
								x = current[2];
								y = current[3];
								break;


							case 'Q': // bezier quad; absolute
								hx = current[0];
								hy = current[1];
								x = current[2];
								y = current[3];
								curves.push({
									name : 'quadraticCurveTo',
									arguments : [
										hx, hy,
										x, y
									]
								});
								break;

							case 'q': // bezier quad; relative
								hx = x + current[0];
								hy = y + current[1];
								x += current[2];
								y += current[3];
								curves.push({
									name : 'quadraticCurveTo',
									arguments : [
										hx, hy,
										x,y
									]
								});
								break;

							case 'T': // smooth bezier quad; absolute
								var dx = x - hx,
									dy = y - hy;
								hx = x + dx;
								hy = y + dy;
								x = current[0];
								y = current[1];
								curves.push({
									name : 'quadraticCurveTo',
									arguments : [
										hx, hy,
										x, y
									]
								});
								break;

							case 't': // smooth bezier quad; relative
								var dx = x - hx,
									dy = y - hy;
								hx = x + dx;
								hy = y + dy;
								x += current[0];
								y += current[1];
								curves.push({
									name : 'quadraticCurveTo',
									arguments : [
										hx, hy,
										x, y
									]
								});
								break;

							case 'A': // arc curve; absolute
								x = current[5];
								y = current[6];
								break;

							case 'a': // arc curve; relative
								x += current[5];
								y += current[6];
								break;

							default: break;
						}
					}
				}
				else {
					switch(command){
						case 'm': // moveto, relative
							x += numbers[0];
							y += numbers[1];
							curves.push({
								name : 'moveTo',
								arguments : [x, y]
							});
							break;

						case 'M': // moveto, absolute
							x = numbers[0];
							y = numbers[1];
							curves.push({
								name : 'moveTo',
								arguments : [x, y]
							});
							break;

						case 'l': // lineto, relative
							x += numbers[0];
							y += numbers[1];
							curves.push({
								name : 'lineTo',
								arguments : [x, y]
							});
							break;

						case 'L': // lineto, absolute
							x = numbers[0];
							y = numbers[1];
							curves.push({
								name : 'lineTo',
								arguments : [x, y]
							});
							break;

						case 'h': // horizontal line, relative
							x += numbers[0];
							curves.push({
								name : 'lineTo',
								arguments : [x, y]
							});
							break;

						case 'H': // horizontal line, absolute
							x = numbers[0];
							curves.push({
								name : 'lineTo',
								arguments : [x, y]
							});
							break;

						case 'v': // vertical line, relative
							y += numbers[0];
							curves.push({
								name : 'lineTo',
								arguments : [x, y]
							});
							break;

						case 'V': // vertical line, absolute
							y = numbers[0];
							curves.push({
								name : 'lineTo',
								arguments : [x, y]
							});
							break;

						case 'C': // bezier cubic; absolute
							x = numbers[4];
							y = numbers[5];
							hx = numbers[2];
							hy = numbers[3];
							curves.push({
								name : 'bezierCurveTo',
								arguments : [numbers[0], numbers[1], hx, hy, x, y]
							});
							break;

						case 'c': // bezier cubic; relative
							hx = x + numbers[2];
							hy = y + numbers[3];
							curves.push({
								name : 'bezierCurveTo',
								arguments : [
									x + numbers[0], y + numbers[1],
									hx, hy,
									x + numbers[4], y + numbers[5]
								]
							});
							x += numbers[4];
							y += numbers[5];
							break;

						case 'S': // smooth bezier cubic; absolute
							var dx = x - hx,
								dy = y - hy;
							hx = numbers[0];
							hy = numbers[1];
							curves.push({
								name : 'bezierCurveTo',
								arguments : [
									x + dx, y + dy,
									hx, hy,
									numbers[2], numbers[3]
								]
							});
							x = numbers[2];
							y = numbers[3];
							break;

						case 's': // smooth bezier cubic; relative
							var dx = x - hx,
								dy = y - hy;
							hx = numbers[0];
							hy = numbers[1];
							curves.push({
								name : 'bezierCurveTo',
								arguments : [
									x + dx, y + dy,
									x + hx, y + hy,
									x + numbers[2], y + numbers[3]
								]
							});
							x = numbers[2];
							y = numbers[3];
							break;


						case 'Q': // bezier quad; absolute
							hx = numbers[0];
							hy = numbers[1];
							x = numbers[2];
							y = numbers[3];
							curves.push({
								name : 'quadraticCurveTo',
								arguments : [
									hx, hy,
									x, y
								]
							});
							break;

						case 'q': // bezier quad; relative
							hx = x + numbers[0];
							hy = y + numbers[1];
							x += numbers[2];
							y += numbers[3];
							curves.push({
								name : 'quadraticCurveTo',
								arguments : [
									hx, hy,
									x,y
								]
							});
							break;

						case 'T': // smooth bezier quad; absolute
							var dx = x - hx,
								dy = y - hy;
							hx = x + dx;
							hy = y + dy;
							x = numbers[0];
							y = numbers[1];
							curves.push({
								name : 'quadraticCurveTo',
								arguments : [
									hx, hy,
									x, y
								]
							});
							break;

						case 't': // smooth bezier quad; relative
							var dx = x - hx,
								dy = y - hy;
							hx = x + dx;
							hy = y + dy;
							x += numbers[0];
							y += numbers[1];
							curves.push({
								name : 'quadraticCurveTo',
								arguments : [
									hx, hy,
									x, y
								]
							});
							break;

						case 'A': // arc curve; absolute
							x = numbers[5];
							y = numbers[6];
							break;

						case 'a': // arc curve; relative
							x += numbers[5];
							y += numbers[6];
							break;

						default: break;
					}
				}
			}
			else curves.push({ name : 'closePath' });
		}
		return curves;
	};


	$.Context.prototype.pathFromSVG = function(points, fill, stroke){
		return this.push(new $.Path($.util.parseSVGPath(points), fill, stroke, this));
	};
	$.Context.prototype.imageFromSVG = function(points, x, y, fill, stroke){
		var path = new $.Path($.util.parseSVGPath(points), fill, stroke, this);
		var bounds = path.bounds();
		var w = this.canvas.width,
			h = this.canvas.height;
		this.canvas.width = bounds.width;
		this.canvas.height = bounds.height;

		path.draw(this.context);
		var du = this.canvas.toDataURL();

		this.canvas.width = w;
		this.canvas.height = h;
		return this.image(du, x, y);
	};




})(window, Graphics2D);