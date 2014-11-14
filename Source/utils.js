	Anim = new Class({

		initialize : function(from, to, dur, easing){
			this.from = from;
			this.delta = to - from;
			this.dur = dur || 500;
			this.ease = easing || 'linear';
		},

		start : function(fn, fps){
			var delta = this.delta,
				from  = this.from,
				dur   = this.dur,
				ease  = Anim.easing[this.ease] || function(x){return x;},
				start = Date.now(),
				finish = start + dur,
				interval, time, frame;

			interval = this.interval = setInterval(function(){ // fixme! requestAnimationFrame -- посмотреть, что там, а то фигня какая-то с ним получается
				if(time == (time = Date.now())) return;
				frame = ease( time > finish ? 1 : (time - start) / dur );
				fn(from + delta * frame, frame);

				if(time > finish)
					clearInterval(interval);
			}, fps || 10); // fixme или можно 1000 / fps, так точнее будет... реально fps

			return this;
		},
		stop : function(){
			clearInterval(this.interval);
			return this;
		}

	});

	// Mootools :)
	Anim.easing = {
		linear : function(x){ return x; },
		half : function(x){ return Math.sqrt(x); },
		pow : function(t, v){
			return Math.pow(t, v || 6);
		},
		expo : function(t, v){
			return Math.pow(v || 2, 8 * (t-1));
		},
		circ : function(t){
			return 1 - Math.sin(Math.acos(t));
		},
		sine : function(t){
			return 1 - Math.cos(t * Math.PI / 2);
		},
		back : function(t, v){
			v = v || 1.618;
			return Math.pow(t, 2) * ((v + 1) * t - v);
		},
		bounce : function(t){
			for(var a = 0, b = 1; 1; a += b, b /= 2){
				if(t >= (7 - 4 * a) / 11){
					return b * b - Math.pow((11 - 6 * a - 11 * t) / 4, 2);
				}
			}
		},
		elastic : function(t, v){
			return Math.pow(2, 10 * --t) * Math.cos(20 * t * Math.PI * (v || 1) / 3);
		}
	};
	['quad', 'cubic', 'quart', 'quint'].forEach(function(name, i){
		Anim.easing[name] = function(t){ return Math.pow(t, i+2); };
	});

	function processEasing(func){
		Anim.easing[i + 'In'] = func;
		Anim.easing[i + 'Out'] = function(t){
			return 1 - func(1 - t);
		};
		Anim.easing[i + 'InOut'] = function(t){
			return t <= 0.5 ? func(2 * t) : (2 - func(2 * (1 - t))) / 2;
		};
	}

	for(var i in Anim.easing){
		// don't make functions within a loop
		if(Object.prototype.hasOwnProperty(Anim.easing, i))
			processEasing(Anim.easing[i]);
	}



	function Bounds(x,y,w,h){
		this.x = this.x1 = x;
		this.y = this.y1 = y;
		this.w = this.width  = w;
		this.h = this.height = h;
		this.x2 = x + w;
		this.y2 = y + h;
		this.cx = x + w / 2;
		this.cy = y + h / 2;
	}



	function Class(parent, properties, base){

		if(!properties) properties = parent, parent = null;

		var cls = function(){ return (cls.prototype.initialize || emptyFunc).apply(this,arguments); };
		if(parent){

			// go to the parent
			cls = function(){

				if(cls.prototype.__initialize__)
					return cls.prototype.__initialize__.apply(this,arguments);

				var parent = this.constructor.parent;
				while(parent){
					if('initialize' in parent.prototype)
						parent.prototype.initialize.apply(this, arguments);
					parent = parent.parent;
				}

				return (cls.prototype.initialize || emptyFunc).apply(this,arguments);
			};


			// prototype inheriting
			var sklass = function(){};
			sklass.prototype = parent.prototype;
			cls.prototype = new sklass();
			cls.parent = parent;
			cls.prototype.constructor = cls;

		}
		if(base)
			extend(cls, base);

		extend(cls.prototype, properties);

		return cls;

	}


	function extend(a,b){
		for(var i in b){
			if(Object.prototype.hasOwnProperty.call(b,i))
				a[i] = b[i];
		}
		return a;
	}

	// typeofs
	function isString(a){
		return toString.call(a) == '[object String]';
	}
	function isArray(a) {
		return toString.call(a) == '[object Array]';
	}
	function isHash(a){
		try {
			JSON.stringify(a); // only hashes
			return toString.call(a) == '[object Object]';
		}
		catch(e){
			return false;
		}
	}
	function isNumber(value){
		if(toString.call(value) == '[object Number]')
			return true;
		if( isString(value) && /^(\d+|(\d+)?\.\d+)(em|ex|ch|rem|vw|vh|vmin|vmax|cm|mm|in|px|pt|pc)?$/.test(value) )
			return true;
		return false;
	}
//	function isPoint(a){
//		return isNumber(a) || typeof a == 'object';
//	}

	_.Bounds = Bounds;
	_.extend = extend;
	_.isString = isString;
	_.isArray = isArray;
	_.isHash = isHash;
	_.isNumber = isNumber;

	// constants

	_.dashes = {
		shortdash:			[4, 1],
		shortdot:			[1, 1],
		shortdashdot:		[4, 1, 1, 1],
		shortdashdotdot:	[4, 1, 1, 1, 1, 1],
		dot:				[1, 3],
		dash:				[4, 3],
		longdash:			[8, 3],
		dashdot:			[4, 3, 1, 3],
		longdashdot:		[8, 3, 1, 3],
		longdashdotdot:		[8, 3, 1, 3, 1, 3]
	};

	_.reg = {
//		decimal : /^\d*\.\d+$/,
//		distance : /^\d*(\.\d*)?(em|ex|ch|rem|vw|vh|vmin|vmax|cm|mm|in|px|pt|pc)?$/,
//		number : /^\d*$/,
//		distanceValue : /[^\d]*/
	};

	_.corners = {
		'left'  : [0, 0.5],
		'right' : [1, 0.5],
		'top'   : [0.5, 0],
		'bottom': [0.5, 1],
		'center': [0.5, 0.5],
		'left top'    : [0, 0],
		'top left'    : [0, 0],
		'left bottom' : [0, 1],
		'bottom left' : [0, 1],
		'right top'   : [1, 0],
		'top right'   : [1, 0],
		'right bottom': [1, 1],
		'bottom right': [1, 1],

		'lt'	: [0, 0],
		'tl'	: [0, 0],
		'lb'	: [0, 1],
		'bl'	: [0, 1],
		'rt'	: [1, 0],
		'tr'	: [1, 0],
		'rb'	: [1, 1],
		'br'	: [1, 1]
	};

	_.pathStrFunctions = {
		'M' : 'moveTo',
		'L' : 'lineTo',
		'B' : 'bezierCurveTo',
		'Q' : 'quadraticCurveTo',
		'R' : 'rect',
		'A' : 'arc'
	};

	_.colors = { // http://www.w3.org/TR/css3-color/#svg-color
		'aliceblue': 'f0f8ff',
		'antiquewhite': 'faebd7',
		'aqua': '0ff',
		'aquamarine': '7fffd4',
		'azure': 'f0ffff',
		'beige': 'f5f5dc',
		'bisque': 'ffe4c4',
		'black': '000',
		'blanchedalmond': 'ffebcd',
		'blue': '00f',
		'blueviolet': '8a2be2',
		'brown': 'a52a2a',
		'burlywood': 'deb887',
		'burntsienna': 'ea7e5d',
		'cadetblue': '5f9ea0',
		'chartreuse': '7fff00',
		'chocolate': 'd2691e',
		'coral': 'ff7f50',
		'cornflowerblue': '6495ed',
		'cornsilk': 'fff8dc',
		'crimson': 'dc143c',
		'cyan': '0ff',
		'darkblue': '00008b',
		'darkcyan': '008b8b',
		'darkgoldenrod': 'b8860b',
		'darkgray': 'a9a9a9',
		'darkgreen': '006400',
		'darkgrey': 'a9a9a9',
		'darkkhaki': 'bdb76b',
		'darkmagenta': '8b008b',
		'darkolivegreen': '556b2f',
		'darkorange': 'ff8c00',
		'darkorchid': '9932cc',
		'darkred': '8b0000',
		'darksalmon': 'e9967a',
		'darkseagreen': '8fbc8f',
		'darkslateblue': '483d8b',
		'darkslategray': '2f4f4f',
		'darkslategrey': '2f4f4f',
		'darkturquoise': '00ced1',
		'darkviolet': '9400d3',
		'deeppink': 'ff1493',
		'deepskyblue': '00bfff',
		'dimgray': '696969',
		'dimgrey': '696969',
		'dodgerblue': '1e90ff',
		'firebrick': 'b22222',
		'floralwhite': 'fffaf0',
		'forestgreen': '228b22',
		'fuchsia': 'f0f',
		'gainsboro': 'dcdcdc',
		'ghostwhite': 'f8f8ff',
		'gold': 'ffd700',
		'goldenrod': 'daa520',
		'gray': '808080',
		'green': '008000',
		'greenyellow': 'adff2f',
		'grey': '808080',
		'honeydew': 'f0fff0',
		'hotpink': 'ff69b4',
		'indianred': 'cd5c5c',
		'indigo': '4b0082',
		'ivory': 'fffff0',
		'khaki': 'f0e68c',
		'lavender': 'e6e6fa',
		'lavenderblush': 'fff0f5',
		'lawngreen': '7cfc00',
		'lemonchiffon': 'fffacd',
		'lightblue': 'add8e6',
		'lightcoral': 'f08080',
		'lightcyan': 'e0ffff',
		'lightgoldenrodyellow': 'fafad2',
		'lightgray': 'd3d3d3',
		'lightgreen': '90ee90',
		'lightgrey': 'd3d3d3',
		'lightpink': 'ffb6c1',
		'lightsalmon': 'ffa07a',
		'lightseagreen': '20b2aa',
		'lightskyblue': '87cefa',
		'lightslategray': '789',
		'lightslategrey': '789',
		'lightsteelblue': 'b0c4de',
		'lightyellow': 'ffffe0',
		'lime': '0f0',
		'limegreen': '32cd32',
		'linen': 'faf0e6',
		'magenta': 'f0f',
		'maroon': '800000',
		'mediumaquamarine': '66cdaa',
		'mediumblue': '0000cd',
		'mediumorchid': 'ba55d3',
		'mediumpurple': '9370db',
		'mediumseagreen': '3cb371',
		'mediumslateblue': '7b68ee',
		'mediumspringgreen': '00fa9a',
		'mediumturquoise': '48d1cc',
		'mediumvioletred': 'c71585',
		'midnightblue': '191970',
		'mintcream': 'f5fffa',
		'mistyrose': 'ffe4e1',
		'moccasin': 'ffe4b5',
		'navajowhite': 'ffdead',
		'navy': '000080',
		'oldlace': 'fdf5e6',
		'olive': '808000',
		'olivedrab': '6b8e23',
		'orange': 'ffa500',
		'orangered': 'ff4500',
		'orchid': 'da70d6',
		'palegoldenrod': 'eee8aa',
		'palegreen': '98fb98',
		'paleturquoise': 'afeeee',
		'palevioletred': 'db7093',
		'papayawhip': 'ffefd5',
		'peachpuff': 'ffdab9',
		'peru': 'cd853f',
		'pink': 'ffc0cb',
		'plum': 'dda0dd',
		'powderblue': 'b0e0e6',
		'purple': '800080',
		'red': 'f00',
		'rosybrown': 'bc8f8f',
		'royalblue': '4169e1',
		'saddlebrown': '8b4513',
		'salmon': 'fa8072',
		'sandybrown': 'f4a460',
		'seagreen': '2e8b57',
		'seashell': 'fff5ee',
		'sienna': 'a0522d',
		'silver': 'c0c0c0',
		'skyblue': '87ceeb',
		'slateblue': '6a5acd',
		'slategray': '708090',
		'slategrey': '708090',
		'snow': 'fffafa',
		'springgreen': '00ff7f',
		'steelblue': '4682b4',
		'tan': 'd2b48c',
		'teal': '008080',
		'thistle': 'd8bfd8',
		'tomato': 'ff6347',
		'turquoise': '40e0d0',
		'violet': 'ee82ee',
		'wheat': 'f5deb3',
		'white': 'fff',
		'whitesmoke': 'f5f5f5',
		'yellow': 'ff0',
		'yellowgreen': '9acd32'
	};


	// Clear functions
	_.move = function(from, to){ // moves an element of array
		if(from < to) to++; // учёт того, что с перемещением элемента массив сам изменяется. и изменяются координаты
		var first = this.slice(0,to),
			last  = this.slice(to),
			res = first.concat([this[from]]).concat(last);
		if(from > to) from++;
		first = res.slice(0,from);
		last  = res.slice(from+1);
		return first.concat(last);
	};

	_.multiply = function(m1, m2){ // multiplies two matrixes
		return [
			m1[0] * m2[0] + m1[2] * m2[1],
			m1[1] * m2[0] + m1[3] * m2[1],
			m1[0] * m2[2] + m1[2] * m2[3],
			m1[1] * m2[2] + m1[3] * m2[3],
			m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
			m1[1] * m2[4] + m1[3] * m2[5] + m1[5]
		];
	};

	_.interpolate = function(from, to, t){ // for example: interpolate(0, 5, 0.5) => 2.5
		return from + (to - from) * t;
	};

	_.transformPoint = function(x,y, m){
		return [x * m[0] + y * m[2] + m[4], x * m[1] + y * m[3] + m[5]];
	};




	// Сокращения
	_.transform = function( m1, m2, pivot ){ // transforms the matrix with a pivot
		extend( m1, _.multiply( m1, [ 1,0,0,1,pivot[0],pivot[1] ] ) );
		extend( m1, _.multiply( m1, m2 ) );
		extend( m1, _.multiply( m1, [ 1,0,0,1,-pivot[0],-pivot[1] ] ) );
	};


	// DOM
	_.coordsOfElement = function(element){ // returns coords of DOM element
		var offsetElement = element, x = 0, y = 0;
		while(offsetElement){
			x += offsetElement.offsetLeft;
			y += offsetElement.offsetTop;
			offsetElement = offsetElement.offsetParent;
		}
		return [x,y];
	};

	_.color = function(value){ // parses CSS-like colors (rgba(255,0,0,0.5), green, #f00...)
		if(value === undefined) return;

		var test;
		if(value in _.colors)
			return _.color('#' + _.colors[value]);
		if(test = value.match(/^rgba?\((\d{1,3})\,\s*(\d{1,3})\,\s*(\d{1,3})(\,\s*([0-9\.]{1,4}))?\)/))
			return [parseInt(test[1]), parseInt(test[2]), parseInt(test[3]), parseFloat(test[5] || 1)];
		if(test = value.match(/^rgba?\((\d{1,3})\%?\,\s*(\d{1,3})\%?\,\s*(\d{1,3})\%?(\,\s*([0-9\.]{1,4}))?\)/))
			return [ Math.round(parseInt(test[1]) * 2.55), Math.round(parseInt(test[2]) * 2.55), Math.round(parseInt(test[3]) * 2.55), parseFloat(test[5] || 1) ];
		if(test = value.match(/^\#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i))
			return [parseInt(test[1], 16), parseInt(test[2], 16), parseInt(test[3], 16), 1];
		if(test = value.match(/^\#([0-9a-f])([0-9a-f])([0-9a-f])/i))
			return [parseInt(test[1] + test[1], 16), parseInt(test[2] + test[2], 16), parseInt(test[3] + test[3], 16), 1];
		if(value == 'rand')
			return [Math.round(Math.random() * 255), Math.round(Math.random() * 255), Math.round(Math.random() * 255), Number(Math.random().toFixed(2))];

		return [0,0,0,0];
	};

	_.distance = function(value){
		if(value === undefined) return;
		if(!value) return 0;
		if(toString.call(value) == '[object Number]') // not isNumber :(
			return value;

		if((value + '').indexOf('px') == (value + '').length-2)
			return parseInt((value + '').replace(/[^\d]*/, ''));

		if(!_.units){
			var div = document.createElement('div');
			document.body.appendChild(div); // FF don't need this :)
			_.units = {};
			['em', 'ex', 'ch', 'rem', 'vw',
			 'vh', 'vmin', 'vmax', 'cm',
			 'mm', 'in', 'pt', 'pc'].forEach(function(unit){
				div.style.width = '1' + unit;
				_.units[unit] = parseFloat(getComputedStyle(div).width);
			});
			document.body.removeChild(div);
		}

		var unit = value.replace(/\d+?/gi, '');
		value = value.replace(/[^\d]+?/gi, '');
		return Math.round(_.units[unit] * value);
	};

	_.corner = function(corner, bounds){
		if(isArray(corner))
			return corner;
		if(isHash(corner))
			return [corner.x, corner.y];
		if(!corner)
			corner = 'center';
		return [bounds.x + bounds.w * _.corners[corner][0], bounds.y + bounds.h * _.corners[corner][1] ];
	};

	// Animation
	_.animTransformConstants = {
		rotate : 0,
		scale : 1,
		scaleX : 1,
		scaleY : 1,
		skew : 0,
		skewX : 0,
		skewY : 0,
		translate : 0,
		translateX : 0,
		translateY : 0
	};

	// Path
	_.pathFunctions = {
		moveTo: { name:'moveTo', params:['x','y'] },
		lineTo: { name:'lineTo', params:['x','y'] },
		quadraticCurveTo: { name:'quadraticCurveTo', params:['hx','hy', 'x','y'] },
		bezierCurveTo: { name:'bezierCurveTo', params:['h1x','h1y', 'h2x','h2y', 'x','y'] },
		closePath: { name:'closePath', params:[] }
	};
	var fn = function(numbers, curves, path){
		this.name = this.base.name;
		this._arguments = numbers;
		this.update = path.update.bind(path);
		for(var i = 0; i < this.base.params.length;i++)
			this[this.base.params[i]] = numbers[i];
	};
	var proto = {
		arguments : function(value){
			if(value === undefined)
				return this._arguments;
			if(arguments.length > 1)
				value = Array.prototype.slice.call(arguments);

			this._arguments = value;
			for(var i = 0; i < this.base.params.length;i++)
				this[this.base.params[i]] = value[i];
			this.update();
			return this;
		},
		set : function(name, value){
			var index = this.base.params.indexOf(name);
			this._arguments[index] = value;
			this[name] = value;
			this.update();
			return this;
		},
		process : function(ctx){
			ctx[this.name].apply(ctx, this._arguments);
		}
	};

	for(var cm in _.pathFunctions){
		if(Object.prototype.hasOwnProperty.call(_.pathFunctions, cm)){
			var cur = _.pathFunctions[cm];
			_.pathFunctions[cm] = fn;
			_.pathFunctions[cm].prototype = extend({
				base: cur
			}, proto);
		}
	}
	// It's not real SVG!
	_.svgFunctions = { M:'moveTo', L:'lineTo', C:'bezierCurveTo', Q:'quadraticCurveTo', Z:'closePath',
		m:'moveTo', l:'lineTo', c:'bezierCurveTo', q:'quadraticCurveTo', z:'closePath' };
	_.svgPathLengths = { M:2, L:2, C:6, Q:4, Z:0, m:2, l:2, c:6, q:4, z:0 };

	_.transformFunctions = {
		scale : function(x, y){
			if(isArray(x)){
				y = x[1];
				x = x[0];
			}
			if(y === undefined)
				y = x;
			return [x, 0, 0, y, 0, 0];
		},
		rotate : function(angle, unit){
			if(unit !== 'rad')
				angle = angle * Math.PI / 180;
			return [Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), 0, 0];
		},
		skew : function(x, y){
			if(isArray(x)){
				y = x[1];
				x = x[0];
			}
			if(y === undefined)
				y = x;
			return [1, Math.tan(y * Math.PI / 180), Math.tan(x * Math.PI / 180), 1, 0, 0];
		},
		translate : function(x, y){
			if(isArray(x)){
				y = x[1];
				x = x[0];
			}
			if(y === undefined)
				y = x;
			return [1, 0, 0, 1, x, y];
		}
	};
