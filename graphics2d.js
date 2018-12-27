/*  DeltaJS Core 1.9.0
 *
 *  Author: Dmitriy Miroshnichenko aka Keyten <ikeyten@gmail.com>
 *  Last edit: 27.12.2018
 *  License: MIT
 */

(function(window, undefined){

// The main DeltaJS class
var Delta = {},

// Classes
	Context,
	Drawable,
	Animation,
	Rect, Circle, Curve, Path, Picture, Text,
	Gradient, Pattern,

// Local variables
	document = window.document,
	toString = Object.prototype.toString,
	slice = Array.prototype.slice,
	has = Function.prototype.call.bind(Object.prototype.hasOwnProperty),
	reFloat = /^\d*\.\d+$/,
	reNumberLike = /^(\d+|(\d+)?\.\d+)(em|ex|ch|rem|vw|vh|vmin|vmax|cm|mm|in|px|pt|pc)?$/,
	domurl = window.URL || window.webkitURL || window,
	// todo: move to utils
	extend = Object.assign ? Object.assign : function(dest, source){
		var keys = Object.keys(source),
			l = keys.length;
		while(l--){
			dest[keys[l]] = source[keys[l]];
		}
		return dest;
	}, // Object.assign is not deep as well as the polyfill
	// todo: remove polyfill
	deepExtend = extend, // todo: check whether it is neccessary, maybe move to utils

// DOM
	browserEvents = {
		mouse: [
			'click',
			'dblclick',
			'mousedown',
			'mouseup',
			'mousemove',
			'mouseover',
			'mouseout',
			'mouseenter',
			'mouseleave',
			'mousewheel',
			'blur',
			'focus'
		],
		touch: [
			'touchstart',
			'touchmove',
			'touchend',
			'touchcancel'
		],
		pointer: [
			'pointerover',
			'pointerenter',
			'pointerdown',
			'pointermove',
			'pointerup',
			'pointercancel',
			'pointerout',
			'pointerleave',
			// check:
			'gotpointercapture',
			'lostpointercapture'
		],
		keyboard: [
			'keypress',
			'keydown',
			'keyup'
		]
	},

	_ = {},
	requestAnimationFrame = window.requestAnimationFrame		||
							window.webkitRequestAnimationFrame	||
							window.mozRequestAnimationFrame		||
							window.oRequestAnimationFrame		||
							window.msRequestAnimationFrame		||
							function(callback){
								return window.setTimeout(callback, 1000 / 60);
							},

	cancelAnimationFrame = window.cancelAnimationFrame			||
						   window.webkitCancelAnimationFrame	||
						   window.mozCancelAnimationFrame		||
						   window.oCancelAnimationFrame			||
						   window.msCancelAnimationFrame		||

						   window.cancelRequestAnimationFrame		||
						   window.webkitCancelRequestAnimationFrame	||
						   window.mozCancelRequestAnimationFrame	||
						   window.oCancelRequestAnimationFrame		||
						   window.msCancelRequestAnimationFrame		||

						   window.clearTimeout;

Delta.renderers = {};
/*// Class
function Class(parent, properties){
	if(!properties){
		properties = parent;
		parent = null;
	}

	var init = function(){
		return this.initialize && this.initialize.apply(this, arguments);
	};

	if(parent){
		// prototype inheriting
		var sklass = function(){};
		sklass.prototype = parent.prototype;
		init.prototype = new sklass();
		init.prototype.superclass = parent.prototype;
		init.prototype.constructor = init;

		init.prototype.super = function(name, args){
			// при вызове super внутри таймаута получим бесконечный цикл
			// по-хорошему, проверять бы arguments.callee.caller === arguments.callee
			// по-плохому, не стоит: это вроде как плохо, и вообще use strict
			if(!this.superclass.superclass || !this.superclass.superclass[name]){
				return this.superclass[name].apply(this, args);
			}

			var superclass = this.superclass;
			this.superclass = this.superclass.superclass;
			var result = superclass[name].apply(this, args);
			this.superclass = parent.prototype;
			return result;
		};
	}

	extend(init.prototype, properties);

	return init;
}

Class.attr = function(name, value){
	if(Array.isArray(name)){
		// getter attr(['attr1', 'attr2'])
		return name.map(function(name){
			return this.attr(name);
		}, this);
	} else if(name + '' !== name){
		// setter attr({ attr1: val1, attr2: val2 });
		Object.keys(name).forEach(function(key){
			this.attr(key, name[key]);
		}, this);
		return this;
	}

	// afaik its not good to use arguments?
	if(arguments.length === 1){
		// getter attr('attr1')
		if(this.attrHooks[name] && this.attrHooks[name].get){
			return this.attrHooks[name].get.call(this);
		}
		return this.attrs[name];
	}

	// setter attr('attr1', 'val1')
	if(this.attrHooks[name] && this.attrHooks[name].set){
		var result = this.attrHooks[name].set.call(this, value);
		if(result !== null){ // replace to result !== Delta._doNotSetProperty;
			// сжатие _-свойств минимизатором можно обойти через Delta['_doNot...'] = ...
			this.attrs[name] = result === undefined ? value : result;
		}
	} else {
		this.attrs[name] = value;
	}

	return this;
}; */

// Bounds class
function Bounds(x, y, w, h){
	if(w < 0){
		w = -w;
		x -= w;
	}
	if(h < 0){
		h = -h;
		y -= h;
	}

	this.x = this.x1 = x;
	this.y = this.y1 = y;
	this.w = this.width  = w;
	this.h = this.height = h;
	// todo: remove this all
	// and make a method `get` or `corner`: aabb.corner('left');
	this.x2 = x + w;
	this.y2 = y + h;
	this.cx = x + w / 2;
	this.cy = y + h / 2;
}

Delta.bounds = function(x, y, width, height){
	return new Bounds(x, y, width, height);
};

// Thenable is like Promise but faster 4x at Firefox and >100x at Chrome
function Thenable(func){
	func(this.resolve.bind(this), this.reject.bind(this));
}

Thenable.prototype = {
	resolve: function(value){
		if(this.success){
			this.success(value);
		}
	},

	reject: function(value){
		if(this.error){
			this.error(value);
		}
	},

	then: function(success, error){
		this.success = success;
		this.error = error;
	}
};

// utils
function argument(index){
	return function(value){
		return this.argument( index, value );
	};
} // не нужно

// wrapper for quick calls
function wrap(args, index){
	var funcName = args[index];
	args = slice.call(args, index + 1);
	return function(){
		this[funcName].apply(this, args);
	};
}

// typeofs

/*
use common typeofs
String: something + '' === something
Boolean: !!something === something
Array: Array.isArray(something)
Number: +something === something
Function: typeof something === 'function'
 */

/*
Guidelines:
Types: Array, String, Boolean, Number, UnitNumber
 */

function isObject(a){
	return toString.call(a) === '[object Object]';
}

function isPivot(v){
	return Array.isArray(v) || v in Delta.corners;
}

function isNumberLike(value){
	return +value === value || (value + '' === value && reNumberLike.test(value));
}

// todo: Pattern.isPatternLike();
function isPatternLike(value){
	return value instanceof Image ||
			(isObject(value) && has(value, 'image')) ||
			(value + '' === value && !(
				value.indexOf('http://') &&
				value.indexOf('https://') &&
				value.indexOf('./') &&
				value.indexOf('../') &&
				value.indexOf('data:image/') &&
				value.indexOf('<svg')
			) );
}

function parsePoint(point){
	if(+point === point){
		point = Delta.distance(point);
		return [point, point];
	}
	return [
		Delta.distance(point[0]),
		Delta.distance(point[1])
	];
}

Delta.Class = Class;
Delta.Bounds = Bounds;
Delta.extend = extend;
Delta.argument = argument;
Delta.wrap = wrap;
Delta.isObject = isObject;
Delta.isNumberLike = isNumberLike;
Delta.isPatternLike = isPatternLike;

// constants
Delta.dashes = {
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

Delta.fileTypes = {
	'jpeg': 'image/jpeg',
	'jpg': 'image/jpeg',
	'png': 'image/png',
	'webp': 'image/webp'
};

Delta.corners = {
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

Delta.colors = { // http://www.w3.org/TR/css3-color/#svg-color
	'aliceblue':				'f0f8ff',
	'antiquewhite':				'faebd7',
	'aqua':						'0ff',
	'aquamarine':				'7fffd4',
	'azure':					'f0ffff',
	'beige':					'f5f5dc',
	'bisque':					'ffe4c4',
	'black':					'000',
	'blanchedalmond':			'ffebcd',
	'blue':						'00f',
	'blueviolet':				'8a2be2',
	'brown':					'a52a2a',
	'burlywood':				'deb887',
	'burntsienna':				'ea7e5d',
	'cadetblue':				'5f9ea0',
	'chartreuse':				'7fff00',
	'chocolate':				'd2691e',
	'chucknorris':				'c00000',
	'coral':					'ff7f50',
	'cornflowerblue':			'6495ed',
	'cornsilk':					'fff8dc',
	'crimson':					'dc143c',
	'cyan':						'0ff',
	'darkblue':					'00008b',
	'darkcyan':					'008b8b',
	'darkgoldenrod':			'b8860b',
	'darkgray':					'a9a9a9',
	'darkgreen':				'006400',
	'darkgrey':					'a9a9a9',
	'darkkhaki':				'bdb76b',
	'darkmagenta':				'8b008b',
	'darkolivegreen':			'556b2f',
	'darkorange':				'ff8c00',
	'darkorchid':				'9932cc',
	'darkred':					'8b0000',
	'darksalmon':				'e9967a',
	'darkseagreen':				'8fbc8f',
	'darkslateblue':			'483d8b',
	'darkslategray':			'2f4f4f',
	'darkslategrey':			'2f4f4f',
	'darkturquoise':			'00ced1',
	'darkviolet':				'9400d3',
	'deeppink':					'ff1493',
	'deepskyblue':				'00bfff',
	'dimgray':					'696969',
	'dimgrey':					'696969',
	'dodgerblue':				'1e90ff',
	'firebrick':				'b22222',
	'floralwhite':				'fffaf0',
	'forestgreen':				'228b22',
	'fuchsia':					'f0f',
	'gainsboro':				'dcdcdc',
	'ghostwhite':				'f8f8ff',
	'gold':						'ffd700',
	'goldenrod':				'daa520',
	'gray':						'808080',
	'green':					'008000',
	'greenyellow':				'adff2f',
	'grey':						'808080',
	'honeydew':					'f0fff0',
	'hotpink':					'ff69b4',
	'indianred':				'cd5c5c',
	'indigo':					'4b0082',
	'ivory':					'fffff0',
	'khaki':					'f0e68c',
	'lavender':					'e6e6fa',
	'lavenderblush':			'fff0f5',
	'lawngreen':				'7cfc00',
	'lemonchiffon':				'fffacd',
	'lightblue':				'add8e6',
	'lightcoral':				'f08080',
	'lightcyan':				'e0ffff',
	'lightgoldenrodyellow':		'fafad2',
	'lightgray':				'd3d3d3',
	'lightgreen':				'90ee90',
	'lightgrey':				'd3d3d3',
	'lightpink':				'ffb6c1',
	'lightsalmon':				'ffa07a',
	'lightseagreen':			'20b2aa',
	'lightskyblue':				'87cefa',
	'lightslategray':			'789',
	'lightslategrey':			'789',
	'lightsteelblue':			'b0c4de',
	'lightyellow':				'ffffe0',
	'lime':						'0f0',
	'limegreen':				'32cd32',
	'linen':					'faf0e6',
	'magenta':					'f0f',
	'maroon':					'800000',
	'mediumaquamarine':			'66cdaa',
	'mediumblue':				'0000cd',
	'mediumorchid':				'ba55d3',
	'mediumpurple':				'9370db',
	'mediumseagreen':			'3cb371',
	'mediumslateblue':			'7b68ee',
	'mediumspringgreen':		'00fa9a',
	'mediumturquoise':			'48d1cc',
	'mediumvioletred':			'c71585',
	'midnightblue':				'191970',
	'mintcream':				'f5fffa',
	'mistyrose':				'ffe4e1',
	'moccasin':					'ffe4b5',
	'navajowhite':				'ffdead', // FF is not dead
	'navy':						'000080',
	'oldlace':					'fdf5e6',
	'olive':					'808000',
	'olivedrab':				'6b8e23',
	'orange':					'ffa500',
	'orangered':				'ff4500',
	'orchid':					'da70d6',
	'palegoldenrod':			'eee8aa',
	'palegreen':				'98fb98',
	'paleturquoise':			'afeeee',
	'palevioletred':			'db7093',
	'papayawhip':				'ffefd5',
	'peachpuff':				'ffdab9',
	'peru':						'cd853f',
	'pink':						'ffc0cb',
	'plum':						'dda0dd',
	'powderblue':				'b0e0e6',
	'purple':					'800080',
	'red':						'f00',
	'rosybrown':				'bc8f8f',
	'royalblue':				'4169e1',
	'saddlebrown':				'8b4513',
	'salmon':					'fa8072',
	'sandybrown':				'f4a460',
	'seagreen':					'2e8b57',
	'seashell':					'fff5ee',
	'sienna':					'a0522d',
	'silver':					'c0c0c0',
	'skyblue':					'87ceeb',
	'slateblue':				'6a5acd',
	'slategray':				'708090',
	'slategrey':				'708090',
	'snow':						'fffafa',
	'springgreen':				'00ff7f',
	'steelblue':				'4682b4',
	'tan':						'd2b48c',
	'teal':						'008080',
	'thistle':					'd8bfd8',
	'tomato':					'ff6347',
	'turquoise':				'40e0d0',
	'violet':					'ee82ee',
	'wheat':					'f5deb3',
	'white':					'fff',
	'whitesmoke':				'f5f5f5',
	'yellow':					'ff0',
	'yellowgreen':				'9acd32'
};

// DOM
Delta.coordsOfElement = function(element){ // returns coords of a DOM element
	var box = element.getBoundingClientRect(),
		style = window.getComputedStyle(element);

	return {
		x: box.left + parseInt(style.borderLeftWidth || 0) + parseInt(style.paddingLeft || 0),
		y: box.top  + parseInt(style.borderTopWidth  || 0) + parseInt(style.paddingTop  || 0)
	};
};

// Clean functions
Delta.clone = function(object){
	var result = new object.constructor();
	// todo: replace to Object.keys
	for(var i in object){
		if(has(object, i)){
			if(typeof object[i] === 'object' && !(object[i] instanceof Context) && !(object[i] instanceof Image)){
				result[i] = Delta.clone(object[i]);
			} else {
				result[i] = object[i];
			}
		}
	}
	return result;
};

Delta.strParse = {
	functions : function(str){
		var result = [];
		str = str.split(')');
		str.forEach(function(part){
			part = part.trim();
			if(part === ''){
				return;
			}

			result.push({
				args: part.split('(')[1].split(',').map(function(arg){
					return arg.trim();
				}),
				method: part.match(/[a-z]+/)[0]
			});
		});
		return result;
	}
};

// Matrices
Delta.parseTransform = function(attrs, element){
	// todo: check about speed and think how to raise it
	if(Array.isArray(attrs.transform)){
		return attrs.transform;
	}

	var result = [1, 0, 0, 1, 0, 0];
	if(attrs.transform === 'attributes'){
		(attrs.transformOrder || 'translate rotate scale skew').split(' ').forEach(function(method){
			if(attrs[method] !== undefined){
				result = Delta.transforms[method](result, attrs[method], element);
			}
		});
	} else {
		var str = attrs.transform.split(')');
		str.forEach(function(part){
			part = part.trim();
			if(part === ''){
				return;
			}

			var method = part.match(/[a-z]+/);
			var args = part.split('(')[1].split(',').map(function(arg){
				return arg.trim();
			});
			result = Delta.transforms[method](result, args, element);
		});
	}
	return result;
};

Delta.transforms = {
	translate: function(matrix, args){
		matrix[4] += +args[0];
		matrix[5] += +args[1];
		return matrix;
	},

	// todo: optimize matrix multiplications
	// todo: corner(..., {transform: 'ignore'})

	/* if(pivot){
		pivot = this.corner(pivot, {transform: 'ignore'});
		e = pivot[0] + e - a * pivot[0] - c * pivot[1];
		f = pivot[1] + f - b * pivot[0] - d * pivot[1];
	} */

	scale: function(matrix, args, elem){
		if(+args === args){
			// args = scale
			args = [args, args];
		} else if(+args[1] !== args[1]){
			// args = [scale, pivot]
			args = [args[0], args[0], args[1]];
		}

		var pivot = elem.corner(args[2] || 'center');
		matrix = Delta.transform(matrix, [1, 0, 0, 1, pivot[0], pivot[1]]);
		matrix = Delta.transform(matrix, [args[0], 0, 0, args[1], 0, 0]);
		matrix = Delta.transform(matrix, [1, 0, 0, 1, -pivot[0], -pivot[1]]);

		return matrix;
	},

	skew: function(matrix, args, elem){
		if(+args === args){
			// args = skew
			args = [args, args];
		} else if(+args[1] !== args[1]){
			// args = [skew, pivot]
			args = [args[0], args[0], args[1]];
		}
		args[0] = (+args[0]) / 180 * Math.PI;
		args[1] = (+args[1]) / 180 * Math.PI;

		var pivot = elem.corner(args[2] || 'center');
		matrix = Delta.transform(matrix, [1, 0, 0, 1, pivot[0], pivot[1]]);
		matrix = Delta.transform(matrix, [1, Math.tan(args[1]), Math.tan(args[0]), 1, 0, 0]);
		matrix = Delta.transform(matrix, [1, 0, 0, 1, -pivot[0], -pivot[1]]);

		return matrix;
	},

	rotate: function(matrix, args, elem){
		if(+args === args){
			args = [args];
		}
		args[0] = (+args[0]) / 180 * Math.PI;

		var pivot = elem.corner(args[1] || 'center');
		matrix = Delta.transform(matrix, [1, 0, 0, 1, pivot[0], pivot[1]]);
		matrix = Delta.transform(matrix, [Math.cos(args[0]), Math.sin(args[0]), -Math.sin(args[0]), Math.cos(args[0]), 0, 0]);
		matrix = Delta.transform(matrix, [1, 0, 0, 1, -pivot[0], -pivot[1]]);

		return matrix;
	}
};

Delta.isIdentityTransform = function(matrix){
	return matrix[5] === 0 && matrix[4] === 0 &&
			matrix[3] === 1 && matrix[2] === 0 &&
			matrix[1] === 0 && matrix[0] === 1;
};

Delta.transform = function(m1, m2){ // multiplies two 2D-transform matrices
	return [
		m1[0] * m2[0] + m1[2] * m2[1],
		m1[1] * m2[0] + m1[3] * m2[1],
		m1[0] * m2[2] + m1[2] * m2[3],
		m1[1] * m2[2] + m1[3] * m2[3],
		m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
		m1[1] * m2[4] + m1[3] * m2[5] + m1[5]
	];
};

Delta.transformPoint = function(matrix, point){
	return [
		matrix[0] * point[0] + matrix[2] * point[1] + matrix[4],
		matrix[1] * point[0] + matrix[3] * point[1] + matrix[5]
	];
};

Delta.inverseTransform = function(matrix){
	var det = matrix[0] * matrix[3] - matrix[2] * matrix[1];

	if(det === 0){
		return null;
	}

	return [
		matrix[3] / det,
		-matrix[1] / det,
		-matrix[2] / det,
		matrix[0] / det,
		-(matrix[3] * matrix[4] - matrix[2] * matrix[5]) / det,
		(matrix[1] * matrix[4] - matrix[0] * matrix[5]) / det
	];
};

Delta.color = function color(value){ // parses CSS-like colors (rgba(255,0,0,0.5), green, #f00...)
	if(value === undefined){
		return;
	}
	if(Array.isArray(value)){
		return value.slice(0, 4);
	}
	if(value + '' !== value){
		throw 'Not a color: ' + value.toString();
	}

	// rgba(255, 100, 20, 0.5)
	if(value.indexOf('rgb') === 0){
		value = value.substring(value.indexOf('(') + 1, value.length-1).replace(/\s/g, '').split(',');
		var opacity = value[3];
		value = value.slice(0, 3).map(function(v, i){
			// rgba(100%, 0%, 50%, 1)
			if(v.indexOf('%') > 0){
				return Math.round(parseInt(v) * 2.55);
			}
			return parseInt(v);
		});

		if(opacity === undefined){
			opacity = 1;
		}
		value.push(Number(opacity));

		return value;
	}
	// #bebebe
	else if(value[0] === '#'){
		// remove the # and turn into array
		value = value.substring(1);

		// #555
		if(value.length === 3){
			// 'f0a' -> 'ff00aa'
			value = value[0] + value[0] + value[1] + value[1] + value[2] + value[2];
		}

		return [parseInt(value.substring(0, 2), 16), parseInt(value.substring(2, 4), 16), parseInt(value.substring(4, 6), 16), 1];
	}
	// 'red'
	else if(value in Delta.colors){
		return Delta.color('#' + Delta.colors[value]);
	}
	// 'rand'
	else if(value === 'rand'){
		return [Math.round(Math.random() * 255), Math.round(Math.random() * 255), Math.round(Math.random() * 255), 1];
	}

	return [0, 0, 0, 0];
};

Delta.angleUnit = 'grad';
Delta.unit = 'px';

var units = 'pt em in cm mm pc ex ch rem v wvh vmin vmax'.split(' ');
var defaultUnits = {
	// my values; may be different on different screens / browsers / devices / etc
	px: 1, ch: 8, cm: 37.78125, em: 16,
	ex: 7.15625, 'in': 96, mm: 3.765625,
	pc: 16, pt: 1.328125, rem: 16, v: 16,
	vmax: 13.65625, vmin: 4.78125, wvh: 16
	// values from p5.js:
	// pt: 1.25
	// pc: 15
	// mm: 3.543307
	// cm: 35.43307
	// in: 90
};

Delta.snapToPixels = 1;

function distance(value, dontsnap){
	if(value === undefined) return;
	if(!value) return 0;
	// todo: snapToPixels === 1 ? return Math.round(...) : ...
	if(Delta.snapToPixels && !dontsnap){
		return Math.round(Delta.distance(value, true) / Delta.snapToPixels) * Delta.snapToPixels;
	}

	if(+value === value){
		if(Delta.unit !== 'px'){
			return Delta.distance( value + '' + Delta.unit );
		}

		return value;
	}

	value += '';
	if(value.indexOf('px') === value.length-2){
		return parseInt(value);
	}

	if(!Delta.units){
		if(!document){
			Delta.units = defaultUnits;
		} else {
			var div = document.createElement('div');
			document.body.appendChild(div); // FF doesn't need this :)
			Delta.units = {};
			units.forEach(function(unit){
				div.style.width = '1' + unit;
				Delta.units[unit] = parseFloat(getComputedStyle(div).width);
			});
			document.body.removeChild(div);
		}
	}

	var unit = value.replace(/[\d\.]+?/g, '');
	value = value.replace(/[^\d\.]+?/g, '');
	if(unit === ''){
		return value;
	}

	if(Delta.snapToPixels === 1){
		return Math.round(Delta.units[unit] * value);
	}
	return Delta.units[unit] * value;
}

Delta.distance = distance;
/**
 * Class
 * Class.AttrMixin
 * Class.EventMixin
 * Class.LinkMixin?
 */
// todo: move everything to utils

// Class
function Class(parent, properties){
	if(!properties){
		properties = parent;
		parent = null;
	}

	var init = function(){
		return this.initialize && this.initialize.apply(this, arguments);
	};

	if(parent){
		// prototype inheriting
		var sklass = function(){};
		sklass.prototype = parent.prototype;
		init.prototype = new sklass();
		init.prototype.superclass = parent.prototype;
		init.prototype.constructor = init;

		init.prototype.super = function(name, args){
			// при вызове super внутри таймаута получим бесконечный цикл
			// по-хорошему, проверять бы arguments.callee.caller === arguments.callee
			// по-плохому, не стоит: это вроде как плохо, и вообще use strict
			if(!this.superclass.superclass || !this.superclass.superclass[name]){
				return this.superclass[name].apply(this, args);
			}

			var superclass = this.superclass; // нужно подумать, можно ли это сделать иначе
			this.superclass = this.superclass.superclass;
			var result = superclass[name].apply(this, args);
			this.superclass = parent.prototype;
			return result;
		};
	}

	if(properties.mixins){
		properties.mixins.forEach(function(mixinName){
			extend(init.prototype, Class.mixins[mixinName]);
		});
	}

	extend(init.prototype, properties);

	return init;
}

Class.mixins = {
	AttrMixin : {
		attrs : {},
		attrHooks : {},
		attr : function(name, value){
			// if name is arr then map
			if(name.constructor === Array){
				// Array.isArray is too slow in V8
				return name.map(function(attr){
					return this.attr(attr);
				}, this);
			}

			// if name is obj then forEach
			if(name.constructor !== String){
				Object.keys(name).forEach(function(attrName){
					this.attr(attrName, name[attrName]);
				}, this);
				return this;
			}

			// if value is not defined then get
			if(value === undefined){ // if arguments.length === 1
				if(this.attrHooks[name] && this.attrHooks[name].get){
					return this.attrHooks[name].get.call(this);
				}
				return this.attrs[name];
			}

			// else set
			this.attrs[name] = value;
			if(this.attrHooks[name] && this.attrHooks[name].set){
				this.attrHooks[name].set.call(this, value);
			}
			return this;
		}
	},

	TransformableMixin : {
		attrHooks : {
			// transform = [1, 0, 0, 1, 0, 0]
			// transform = 'attributes'
			// transform = 'translate(1,1) rotate(45)'
			transform : {
				set : function(value){
					if(value === null){
						this.attrs.matrix = null;
					} else {
						this.attrs.matrix = 'dirty';
					}
					this.update();
				}
			},

			transformOrder: {set: updateTransformSetter},
			pivot: {set: updateTransformSetter},

			translate : {
				get : function(){
					return this.attrs.translate || [0, 0];
				},
				set : updateTransformSetter
			},

			rotate : {
				get : function(){
					return this.attrs.rotate || 0;
				},
				set : updateTransformSetter
			},

			scale : {
				get : function(){
					return this.attrs.scale || [1, 1];
				},
				set : updateTransformSetter
			},

			skew : {
				get : function(){
					return this.attrs.skew || [0, 0];
				},
				set : updateTransformSetter
			}
		},

		calcMatrix : function(){
			var matrix, transform = this.attrs.transform;

			if(transform.constructor === Array){
				matrix = new Float32Array(transform); //new Transform2D(transform[0], transform[1], transform[2],
					//transform[3], transform[4], transform[5]);
			} else if(transform === 'attributes'){
				matrix = new Float32Array([1, 0, 0, 1, 0, 0]);
				(this.attrs.transformOrder || Delta.transformOrder).split(' ').forEach(function(tr){
					var attr = this.attrs[tr];
					if(!attr){
						return;
					}
					this.transformFunctions[tr].call(this, matrix, attr.constructor === Array ? attr : [attr]);
				}, this);
			} else {
				matrix = new Float32Array([1, 0, 0, 1, 0, 0]);
				Delta.strParse.functions(transform).forEach(function(func){
					this.transformFunctions[func.method].call(this, matrix, func.args);
				}, this);
			}

			return this.attrs.matrix = matrix;
		},

		transformFunctions : {
			pivot : function(pivot){
				if(pivot && pivot.indexOf(';') > -1){
					pivot = pivot.split(';');
					// todo: distance
					return [
						Number(pivot[0].trim()),
						Number(pivot[1].trim())
					];
				}

				return this.corner(pivot || this.attrs.pivot, {
					transform: 'none'
				});
			},

			translate : function(matrix, args){
				var x = Number(args[0]),
					y = Number(args[1]);
				if(args[2]){
					// args[2] is called 'independent'
					matrix[4] += x;
					matrix[5] += y;
				} else {
					matrix[4] = matrix[0] * x + matrix[2] * y + matrix[4];
					matrix[5] = matrix[1] * x + matrix[3] * y + matrix[5];
				}
			},

			matrix : function(matrix, matrix2){
				var a = matrix[0],
					b = matrix[1],
					c = matrix[2],
					d = matrix[3],
					e = matrix[4],
					f = matrix[5];
				matrix[0] = a * matrix2[0] + c * matrix2[1];
				matrix[1] = b * matrix2[0] + d * matrix2[1];
				matrix[2] = a * matrix2[2] + c * matrix2[3];
				matrix[3] = b * matrix2[2] + d * matrix2[3];
				matrix[4] = a * matrix2[4] + c * matrix2[5] + e;
				matrix[5] = b * matrix2[4] + d * matrix2[5] + f;
			},

			lmatrix : function(matrix, matrix2){
				this.transformFunctions.matrix.call(this, matrix2, matrix);
			},

			rotate : function(matrix, args){
				var pivot = this.transformFunctions.pivot.call(this, args[1]),
					angle = Number(args[0]) * Math.PI / 180,
					cos = Math.cos(angle),
					sin = Math.sin(angle);

				this.transformFunctions.matrix.call(this, matrix, [
					cos, sin, -sin, cos,
					-pivot[0] * cos + pivot[1] * sin + pivot[0],
					-pivot[0] * sin - pivot[1] * cos + pivot[1]]);
			},

			scale : function(matrix, args){
				if(isNaN(args[1])){
					args[2] = args[1];
					args[1] = args[0];
				}
				var x = Number(args[0]),
					y = Number(args[1]),
					pivot = this.transformFunctions.pivot.call(this, args[2]);

				this.transformFunctions.matrix.call(this, matrix, [
					x, 0, 0, y,
					-pivot[0] * x + pivot[0],
					-pivot[1] * y + pivot[1]]);
			},

			skew : function(matrix, args){
				if(isNaN(args[1])){
					args[2] = args[1];
					args[1] = args[0];
				}
				var x = Math.tan(Number(args[0]) * Math.PI / 180),
					y = Math.tan(Number(args[1]) * Math.PI / 180),
					pivot = this.transformFunctions.pivot.call(this, args[2]);

				this.transformFunctions.matrix.call(this, matrix, [
					1, y, x, 1,
					-pivot[1] * x,
					-pivot[0] * y]);
			}

			// reflect(alpha) -- reflects the plain by the line with angle = alpha
			// [cos 2a, sin 2a, sin 2a, -cos 2a]
		}
	},

	// todo: AnimatableMixin depending on the AttrMixin
	// must be defined at Animation.js

	EventMixin : {
		listeners : {},

		// for inspiration:
		// http://benalman.com/news/2010/03/jquery-special-events/
		// http://learn.jquery.com/events/event-extensions/
		eventHooks : {},

		// hooks for add & remove are commented cause they dont seem to be neccessary
		on : function(event, options, callback){
			// if event is obj then keys(event) foreach
			if(event.constructor !== String){
				Object.keys(event).forEach(function(eventName){
					this.on(eventName, event[eventName]);
				}, this);
				return this;
			}

			// if options is not obj then callback = options
			if(options){
				if(options.constructor === Function){
					// event, callback
					callback = options;
					options = null;
				} else if(options.constructor === String){
					// event, methodName, arg1, arg2...
					Array.prototype.splice.call(arguments, 1, 0, null);
				}
			}

			// if callback is string then process quick call
			if(callback.constructor === String){
				callback = wrapQuickCall(arguments);
			}

			// if event isnt inited then init it
			if(!this.listeners[event]){
				this.listeners[event] = [];
				if(this.eventHooks[event] && this.eventHooks[event].init){
					this.eventHooks[event].init.call(this, event);
				}
			}

			// add the callback (with options)
			this.listeners[event].push({
				callback: callback,
				options: options
			});

			// call the hook
			/* if(this.eventHooks[event] && this.eventHooks[event].add){
				this.eventHooks[event].add.call(this, options, callback, event);
			} */

			return this;
		},

		off : function(event, callback){
			var listeners = this.listeners[event],
				hooks = this.eventHooks[event];

			if(listeners){
				if(callback){
					// if callback then remove it
					for(var i = 0; i < listeners.length; i++){
						if(listeners[i].callback === callback){
							listeners.splice(i, 1);
							break;
						}
					}

					if(hooks){
						/* if(hooks.remove){
							hooks.remove.call(this, callback, event);
						} */
						if(!listeners.length && hooks.teardown){
							this.listeners[event] = null;

							hooks.teardown.call(this, event);
						}
					}
				} else {
					// otherwise remove all callbacks
					this.listeners[event] = null;

					if(hooks && hooks.teardown){
						hooks.teardown.call(this, event);
					}
				}
			}

			return this;
		},

		fire : function(event, data, checker){
			var listeners = this.listeners[event];

			if(listeners){
				if(checker){
					listeners = listeners.filter(checker, this);
				}

				listeners.forEach(function(callbackData){
					callbackData.callback.call(this, data);
				}, this);
			}

			return this;
		}
	},

// gradients, patterns, clip
// todo: not neccessary
	LinkMixin : {
		links : [],
		pushLink : function(){},
		callLinks : function(funcName){}
	}
};

Delta.transformOrder = 'translate rotate scale skew';

function wrapQuickCall(args){
	var name = args[2];
	return function(){
		return this[name].apply(this, Array.prototype.slice.call(args, 3));
	};
}

function updateTransformSetter(value){
	this.attrs.matrix = 'dirty';
	this.update();
}

Class.attr = function(name, value){
	if(Array.isArray(name)){
		// getter attr(['attr1', 'attr2'])
		return name.map(function(name){
			return this.attr(name);
		}, this);
	} else if(name + '' !== name){
		// setter attr({ attr1: val1, attr2: val2 });
		Object.keys(name).forEach(function(key){
			this.attr(key, name[key]);
		}, this);
		return this;
	}

	// afaik its not good to use arguments?
	if(arguments.length === 1){
		// getter attr('attr1')
		if(this.attrHooks[name] && this.attrHooks[name].get){
			return this.attrHooks[name].get.call(this);
		}
		return this.attrs[name];
	}

	// setter attr('attr1', 'val1')
	if(this.attrHooks[name] && this.attrHooks[name].set){
		var result = this.attrHooks[name].set.call(this, value);
		if(result !== null){ // replace to result !== Delta._doNotSetProperty;
			// сжатие _-свойств минимизатором можно обойти через Delta['_doNot...'] = ...
			this.attrs[name] = result === undefined ? value : result;
		}
	} else {
		this.attrs[name] = value;
	}

	return this;
};

// {{dont include Renderer.js}}

var Context;

Context = function(canvas){
	this.canvas    = canvas;
	this.context   = canvas.getContext('2d');
	this.elements  = [];
	this.listeners = {};
	this.attrs     = {
		transform: 'attributes',
		pivot: 'center'
	};
	this.cache     = {};

	this.updateNow = this.updateNow.bind(this);
};

Context.prototype = {
	// Elements
	object : function(object){
		if(object.constructor === Function){
			object = {draw: object};
		}
		return this.push(extend(new Drawable(), object));
	},

	rect : function(){
		return this.push(new Rect(arguments));
	},

	circle : function(){
		return this.push(new Circle(arguments));
	},

	path : function(){
		return this.push(new Path(arguments));
	},

	image : function(){
		return this.push(new Picture(arguments));
	},

	text : function(){
		return this.push(new Text(arguments));
	},

	// Path slices
	line : function(fx, fy, tx, ty, stroke){
		return this.path([[fx, fy], [tx, ty]], null, stroke);
	},

	quadratic : function(fx, fy, tx, ty, hx, hy, stroke){
		return this.path([[fx, fy], [tx, ty, hx, hy]], null, stroke);
	},

	bezier : function(fx, fy, tx, ty, h1x, h1y, h2x, h2y, stroke){
		return this.path([[fx, fy], [tx, ty, h1x, h1y, h2x, h2y]], null, stroke);
	},

	arcTo : function(fx, fy, tx, ty, radius, clockwise, stroke){
		return this.path([[fx, fy], ['arcTo', fx, fy, tx, ty, radius, clockwise]], null, stroke);
	},

	// Fills
	useCache : false,
	gradient : function(type, colors, from, to){
		return new Gradient(type, colors, from, to, this);
	},

	pattern : function(image, repeat){
		return new Pattern(image, repeat, this);
	},

	// Methods
	push : function(element){
		element.context = this;
		this.elements.push(element);

		if(element.draw){
			var ctx = this.context;
			ctx.save();
			// todo: dpi
			if(this.attrs.matrix){
				var matrix = this.attrs.matrix !== 'dirty' ? this.attrs.matrix : this.calcMatrix();
				ctx.setTransform(matrix[0], matrix[1], matrix[2],
					matrix[3], matrix[4], matrix[5]);
			} else {
				ctx.setTransform(1, 0, 0, 1, 0, 0);
			}
			element.draw(ctx);
			ctx.restore();
		}

		element.update = element.updateFunction;

		return element;
	},

	update : function(){
		if(this._willUpdate || this.elements.length === 0){
			return;
		}

		this._willUpdate = true;
		requestAnimationFrame(this.updateNow);
	},

	updateNow : function(){
		var ctx = this.context;
		ctx.save();
		// todo: check out what way to clear canvas is faster
		// maybe just this.canvas.width = this.canvas.width;
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

		// todo: dpi
		if(this.attrs.matrix){
			// if transform then m11 /= dpi, m22 /= dpi
			// if not then setTransform(1 / dpi, 0, 0, 1 / dpi, 0, 0)
			var matrix = this.attrs.matrix !== 'dirty' ? this.attrs.matrix : this.calcMatrix();
			ctx.setTransform(matrix[0], matrix[1], matrix[2],
				matrix[3], matrix[4], matrix[5]);
		}

		this.elements.forEach(function(element){
			element.draw(ctx);
		});

		ctx.restore();
		this._willUpdate = false;
	},

	getObjectInPoint : function(x, y, mouse){
		var elements = this.elements,
			i = elements.length;

		while(i--){
		// mouse=true : ignore elements with interaction = false
		// todo: rename to pointerEvents?
			if( elements[i].isPointIn && (elements[i].attrs.interaction || !mouse) &&
				elements[i].isPointIn(x, y, 'mouse') ){
				return elements[i];
			}
		}
		return null;
	},

	each : function(func){
		if(func + '' === func){
			var args = slice.call(arguments, 1),
				funcName = func;
			func = function(elem){
				elem[funcName].apply(elem, args);
			};
		}
		// slice is neccessary when removing obs
		this.elements.slice().forEach(func, this);
		return this;
	},

	// Events
/*	hoverElement : null,
	focusElement : null,

	listener : function(event){
		if(this.listeners[event]){
			return this.listeners[event];
		}

		this.listeners[event] = [];

		if(this.eventsHooks[event]){
			(this.eventsHooks[event].setup || this.eventsHooks[event]).call(this, event);
		}

		return this.listeners[event];
	},

	// todo: писать eventHooks: extend({ mouseover, mouseout, etc }, (function(){ return all other mouse evts })())?
	// вроде менее очевидно даже
	eventsHooks : {
		mouseover : function(){
			if(!this.listeners['mouseout']){
				this.listenerCanvas('mouseout');
				this.listenerSpecial('mouseover', 'mouseout', 'hover', 'mousemove');
				this.listener('mouseout');
			}
		},
		mouseout: function(){
			if(!this.listeners['mouseover']){
				this.listenerCanvas('mouseover');
				this.listenerSpecial('mouseover', 'mouseout', 'hover', 'mousemove');
				this.listener('mouseover');
			}
		},
		focus : function(){
			if(!this.listeners['blur']){
				this.listenerCanvas('blur');
				this.listenerSpecial('focus', 'blur', 'focus', 'mousedown');
				this.listener('blur');
			}
		},
		blur: function(){
			if(!this.listeners['focus']){
				this.listenerCanvas('focus');
				this.listenerSpecial('focus', 'blur', 'focus', 'mousedown');
				this.listener('focus');
			}
		}
	},

	// for mouseover/mouseout and focus/blur
	listenerSpecial : function(over, out, name, baseevent){
		// mouseover, mouseout, hover, mousemove
		// focus, blur, focus, mousedown
		name += 'Element';
		this.on(baseevent, function(e){
			var current = e.targetObject,
				last = this[name];

			if(last != current){
				if(last && last.fire){
					e.targetObject = last;
					last.fire(out, e);
				}
				if(current && current.fire){
					e.targetObject = current;
					current.fire(over, e);
				}
				this[name] = current;
			}
		});
		return this;
	},

	listenerCanvas : function(event){
		this.canvas.addEventListener(event, function(e){
			var propagation = true;

			e.cancelContextPropagation = function(){
				propagation = false;
			};

			if(event === 'mouseout'){
				e.targetObject = this.hoverElement;
				this.hoverElement = null;

				var coords = this.contextCoords(e.clientX, e.clientY);
				e.contextX = coords[0];
				e.contextY = coords[1];

				if(e.targetObject && e.targetObject.fire){
					if(!e.targetObject.fire('mouseout', e)){
						e.stopPropagation();
						e.preventDefault();
					}
				}
			} else {
				// negative contextX / contextY when canvas has a border
				// not a bug, it's a feature :)
				if(+e.clientX === e.clientX){
					this._processPointParams(e, event, e);
				}
				['touches', 'changedTouches', 'targetTouches'].forEach(function(prop){
					if(e[prop]){
						Array.prototype.forEach.call(e[prop], function(touch){
							this._processPointParams(touch, event, e);
						}, this);
					}
				}, this);
			}

			if(propagation && !this.fire(event, e)){
				e.stopPropagation();
				e.preventDefault();
			}
		}.bind(this));
	},

	// todo: make up a more good name (contains 'Event')
	_processPointParams: function(point, name, event){
		var coords = this.contextCoords(point.clientX, point.clientY);
		point.contextX = coords[0];
		point.contextY = coords[1];

		point.targetObject = this.getObjectInPoint(point.contextX, point.contextY, true);
		if(point.targetObject && point.targetObject.fire){
			if(!point.targetObject.fire(name, event)){
				event.stopPropagation();
				event.preventDefault();
			}
		}
	},

	on : function(event, options, callback){
		if(event + '' !== event){
			Object.keys(event).forEach(function(eventName){
				this.on(eventName, event[eventName]);
			});
			return this;
		}

		if(!callback){
			callback = options;
			options = null;
		}

		callback.options = options;

		// Quick calls are not supported!

		(this.listeners[event] || this.listener(event)).push(callback);
		return this;
	},

	off : function(event, callback){
		if(!callback){
			this.listeners[event] = [];
		}

		this.listeners[event].splice(this.listeners[event].indexOf(callback), 1);
		return this;
	},

	fire : function(event, data, checker){
		if(!this.listeners[event]){
			return this;
		}

		var listeners = this.listeners[event];
		if(checker){
			listeners = listeners.filter(checker, this);
		}

		listeners.forEach(function(callback){
			callback.call(this, data);
		}, this);
		return this;
	}, */

	// translates screen coords to context coords
	contextCoords: function(x, y){
		var coords = Delta.coordsOfElement(this.canvas);
		return [x - coords.x, y - coords.y];
	},

	// Attrs
/*	attr: Class.attr,
	attrHooks: {
		width: {
			get: function(){
				return this.canvas.width;
			},
			set: function(value){
				this.canvas.width = value;
				// if dpi != 1 && !canvas.style.width
				// or simpler: if this.attrs.dpi !== undefined
				this.canvas.style.width = this.canvas.width / (this.attrs.dpi || 1) + 'px';
				// if (newWidth > width):
				this.update();
			}
		},

		height: {
			get: function(){
				return this.canvas.height;
			},
			set: function(value){
				this.canvas.height = value;
				this.canvas.style.height = this.canvas.height / (this.attrs.dpi || 1) + 'px';
				// if (newHeight > height):
				this.update();
			}
		},

		// https://www.html5rocks.com/en/tutorials/canvas/hidpi/
		// https://stackoverflow.com/questions/19142993/how-draw-in-high-resolution-to-canvas-on-chrome-and-why-if-devicepixelratio
		// http://www.html5gamedevs.com/topic/732-retina-support/
		dpi: {
			get: function(){
				return this.attrs.dpi || 1;
			},
			set: function(value){
				this.canvas.style.width = this.canvas.width / value + 'px';
				this.canvas.style.height = this.canvas.height / value + 'px';
				this.update();
			}
		},

		smooth: {
			get: function(value){
				var ir = this.canvas.style.imageRendering;
				return ir !== 'pixelated' && ir !== 'crisp-edges';
			},
			set: function(value){
				this.canvas.style.imageRendering = value ? 'initial' : 'pixelated';
			}
		},

		transform: {
			set: function(value){
				this.cache.transform = null;
				this.update();
			}
		},

		translate: {
			get: function(){
				return this.attrs.translate || [0, 0];
			},
			set: function(value){ // todo: not duplicate at all attrs
				if(this.attrs.transform === 'attributes'){
					this.cache.transform = null;
					this.update();
				}
			}
		},

		rotate: {
			get: function(){
				return this.attrs.rotate || 0;
			},
			set: function(){
				if(this.attrs.transform === 'attributes'){
					this.cache.transform = null;
					this.update();
				}
			}
		},

		scale: {
			get: function(){
				return this.attrs.scale || [1, 1];
			},
			set: function(){
				if(this.attrs.transform === 'attributes'){
					this.cache.transform = null;
					this.update();
				}
			}
		},

		skew: {
			get: function(){
				return this.attrs.skew || [0, 0];
			},
			set: function(){
				if(this.attrs.transform === 'attributes'){
					this.cache.transform = null;
					this.update();
				}
			}
		}
	}, */

	// Transforms
	getTransform: function(){
		if(this.cache.transform){
			return this.cache.transform;
		}

		var matrix = Delta.parseTransform(this.attrs, this);
		this.cache.transform = matrix;
		return matrix;
	},

	corner: function(corner){
		return [
			this.canvas.width * Delta.corners[corner][0],
			this.canvas.height * Delta.corners[corner][1]
		];
	}
};

// Events
Object.assign(Context.prototype, Class.mixins['EventMixin'], {
	hoverElement : null,
	eventHooks: {}
});

Delta.browserCommonEvent = {
	init : function(event){
		if(this.eventHooks[event].canvas){
			this.canvas.addEventListener(event,
				this.listeners['_canvasListener_' + event] = this.eventHooks[event].canvas.bind(this));
		}
	},

	teardown : function(event){
		requestAnimationFrame(function(){
			if(!this.listeners[event]){
				this.canvas.removeEventListener(event, this.listeners['_canvasListener_' + event]);
			}
		}.bind(this));
	},

	canvas : function(e){
		e.cancelContextPropagation = function(){};
		this.fire(e.type, e);
	}
};

// todo: check if there's event.touches at phones in mouse events (click and etc)
Delta.browserMouseEvent = Object.assign({}, Delta.browserCommonEvent, {
	canvas : function(e){
		var propagation = true;

		e.cancelContextPropagation = function(){
			propagation = false;
		};

		// negative contextX / contextY possible when canvas has a border
		// not a bug, it's a feature :)
		var coords = this.contextCoords(e.clientX, e.clientY);
		e.contextX = coords[0];
		e.contextY = coords[1];
		// bug:
		// if e.type === 'mouseout' => targetObject is current hoverElement
		e.targetObject = this.getObjectInPoint(e.contextX, e.contextY, true);

		if(e.targetObject && e.targetObject.fire){
			e.targetObject.fire(e.type, e);
		}

		if(propagation){
			this.fire(e.type, e);
		}
	}
});

Delta.browserTouchEvent = Object.assign({}, Delta.browserCommonEvent, {
	canvas : function(e){
		var propagation = true;

		e.cancelContextPropagation = function(){
			propagation = false;
		};

		['touches', 'changedTouches', 'targetTouches'].forEach(function(prop){
			if(e[prop]){
				Array.prototype.forEach.call(e[prop], function(touch){
					var coords = this.contextCoords(touch.clientX, touch.clientY);
					touch.contextX = coords[0];
					touch.contextY = coords[1];

					// todo: make it as getter? it may cost a lot
					touch.targetObject = this.getObjectInPoint(touch.contextX, touch.contextY, true);
				}, this);
			}
		}, this);

		// fixme: not sure if that is a right way to call them
		Array.prototype.forEach.call(e.touches, function(touch){
			if(touch.targetObject && touch.targetObject.fire){
				e.targetObject.fire(e.type, e);
			}
		}, this);

		if(propagation){
			this.fire(e.type, e);
		}
	}
});

var eventKindsListeners = window.document ? {
	mouse : Delta.browserMouseEvent,
	touch : Delta.browserTouchEvent,
	pointer : Delta.browserCommonEvent,
	keyboard : Delta.browserCommonEvent
} : {};

Object.keys(browserEvents).forEach(function(eventsKind){
	browserEvents[eventsKind].forEach(function(event){
		Context.prototype.eventHooks[event] = eventKindsListeners[eventsKind];

		Context.prototype[event] = function(callback){
			return (
				callback.constructor === Function
			) ? this.on(event, callback) : (
				callback.constructor === String
			) ? this.on.apply(this, [event].concat(slice.call(arguments))) : this.fire(callback);
		};
	});
});

// Attrs
Object.assign(Context.prototype, Class.mixins['AttrMixin'], Class.mixins['TransformableMixin'], {
	attrHooks : Object.assign({}, Class.mixins['TransformableMixin'].attrHooks, {
		width : {
			get : function(){
				return this.canvas.width;
			},
			set : function(value){
				this.canvas.width = value;
				// if dpi != 1 && !canvas.style.width
				// or simpler: if this.attrs.dpi !== undefined
				this.canvas.style.width = this.canvas.width / (this.attrs.dpi || 1) + 'px';
				// if (newWidth > width):
				this.update();
			}
		},

		height : {
			get : function(){
				return this.canvas.height;
			},
			set : function(value){
				this.canvas.height = value;
				this.canvas.style.height = this.canvas.height / (this.attrs.dpi || 1) + 'px';
				// if (newHeight > height):
				this.update();
			}
		},

		// https://www.html5rocks.com/en/tutorials/canvas/hidpi/
		// https://stackoverflow.com/questions/19142993/how-draw-in-high-resolution-to-canvas-on-chrome-and-why-if-devicepixelratio
		// http://www.html5gamedevs.com/topic/732-retina-support/
		dpi : {
			get : function(){
				return this.attrs.dpi || 1;
			},
			set : function(value){
				this.canvas.style.width = this.canvas.width / value + 'px';
				this.canvas.style.height = this.canvas.height / value + 'px';
				this.update();
			}
		},

		smooth : {
			get : function(value){
				var ir = this.canvas.style.imageRendering;
				return ir !== 'pixelated' && ir !== 'crisp-edges';
			},
			set : function(value){
				this.canvas.style.imageRendering = value ? 'initial' : 'pixelated';
			}
		}
	})
});

Delta.Context = Context;

Delta.contexts = {
	'2d': Context
};

// todo: move into utils
var temporaryCanvas;

function getTemporaryCanvas(width, height){
	if(!temporaryCanvas){
		temporaryCanvas = document.createElement('canvas');
	}
	temporaryCanvas.width = width;
	temporaryCanvas.height = height;
	return temporaryCanvas;
}

function DrawableAttrHooks(attrs){
	// it seems deepExtend is not neccessary
	extend(this, attrs);
}

function updateSetter(){
	this.update();
}

function Drawable(args){
	this.listeners = {};
	// todo: попробовать заменить styles на массив
	// проходить по нему приходится гораздо чаще, чем изменять
	// (потенциально)
	// или просто кэшировать Object.keys
	this.styles = {};
	this.cache = {};
	this.attrs = {
		interaction: true,
		visible: true,
		transform: 'attributes',
		pivot: 'center'
	};

	if(this.argsOrder){
		this.processArguments(args, this.argsOrder);
	}
}

Drawable.prototype = {
	initialize: Drawable,
	// mixin: [Class.AttrMixin, Class.EventMixin]
	// to gradients & patterns: [Class.LinkMixin]

	// actual update function
	updateFunction : function(){
		if(this.context){
			this.context.update();
		}
		// if this.onUpdate then this.fire('update')
		// neccessary for clips and so on
		return this;
	},

	// update function for the state before the first draw
	update : function(){
		return this;
	},

	/*
		default: {
			attrs: true, styles: true, // note they re same
			clip: true,
			transform: true,
			fills: true // clone gradients, patterns?
		}
	  */
	clone : function(attrs, styles, events){
		// todo: replace arguments to one config {styles: false, matrix: true}
		// todo: test on all obs
		var clone = new this.constructor([], this.context);
		// todo: необходим deepClone везде

		if(attrs === false){
			clone.attrs = this.attrs;
		} else {
			clone.attrs = extend({}, this.attrs);
		}

		if(styles === false){
			clone.styles = this.styles;
			clone.matrix = this.matrix;
		} else {
			clone.styles = extend({}, this.styles);
			// must gradients be cloned?
			// yep, they should
			if(this.matrix){
				clone.matrix = this.matrix.slice();
			}
		}

		if(events === false){
			clone.listeners = this.listeners;
		} else {
			clone.listeners = extend({}, this.listeners);
		}

		// if this.context:
		return this.context.push(clone);
	},

	remove : function(){
		// todo: stop animation
		this.context.elements.splice(this.context.elements.indexOf(this), 1);
		this.update();
		this.context = null;
		return this;
	},

	// Attributes
/*	attr: Class.attr,

	attrHooks: DrawableAttrHooks.prototype = {
		z: {
			get: function(){
				return this.context.elements.indexOf(this);
			},
			set: function(value){
				var elements = this.context.elements;
				if(value === 'top'){
					value = elements.length;
				}

				elements.splice(this.context.elements.indexOf(this), 1);
				elements.splice(value, 0, this);
				this.update();
			}
		},

		visible: {
			set: function(){
				this.update();
			}
		},

		fill: {
			get: function(){
				// а градиенты?
				return this.styles.fillStyle;
			},
			set: function(value){
				// if(oldValue is gradient) oldValue.unbind(this);
				this.styles.fillStyle = value;
				this.update();
			}
		},

		// fillRule?

		stroke: {
			set: function(value){
				Drawable.processStroke(value, this.styles);
				this.update();
			}
		},

// todo: запихнуть всё относящееся к stroke в stroke
		strokeMode: {
			get: function(){
				return this.attrs.strokeMode || 'over';
			},
			set: function(value){
				this.update();
			}
		},

		shadow: {
			set: function(value){
				Drawable.processShadow(value, this.styles);
				this.update();
			}
		},

		opacity: {
			get: function(){
				return this.styles.globalAlpha !== undefined ? this.styles.globalAlpha : 1;
			},
			set: function(value){
				this.styles.globalAlpha = +value;
				this.update();
			}
		},

		composite: {
			get: function(){
				return this.styles.globalCompositeOperation;
			},
			set: function(value){
				this.styles.globalCompositeOperation = value;
				this.update();
			}
		},

		clip: {
			set: function(value){
				value.context = this.context;
				this.attrs.clip = value; // is it neccessary?
				this.update();
			}
		},

		cursor: {
			set: function(value){
				// this._setCursorListener();
				// this._teardownCursorListener();
			}
		},

		transform: {
			set: function(value){
				this.cache.transform = null;
				this.update();
			}
		},

		translate: {
			get: function(){
				return this.attrs.translate || [0, 0];
			},
			set: function(value){
				if(this.attrs.transform === 'attributes'){
					this.cache.transform = null;
					this.update();
				}
			}
		},

		rotate: {
			get: function(){
				return this.attrs.rotate || 0;
			},
			set: function(){
				if(this.attrs.transform === 'attributes'){
					this.cache.transform = null;
					this.update();
				}
			}
		},

		scale: {
			get: function(){
				return this.attrs.scale || [1, 1];
			},
			set: function(){
				if(this.attrs.transform === 'attributes'){
					this.cache.transform = null;
					this.update();
				}
			}
		},

		skew: {
			get: function(){
				return this.attrs.skew || [0, 0];
			},
			set: function(){
				if(this.attrs.transform === 'attributes'){
					this.cache.transform = null;
					this.update();
				}
			}
		}
	}, */

	// Transforms
	getTransform : function(){
		if(this.cache.transform){
			return this.cache.transform;
		}

		var matrix = Delta.parseTransform(this.attrs, this);
		this.cache.transform = matrix;
		return matrix;
	},

// Object -> ArgumentObject?
	processObject : function(object, arglist){
		// todo: вынести в отдельный объект
		['opacity', 'composite', 'clip', 'visible', 'interaction', 'shadow',
		'z', 'transform', 'transformOrder', 'rotate', 'skew', 'scale'].forEach(function(prop){
			if(object[prop] !== undefined){
				this.attr(prop, object[prop]);
			}
		}, this);

		return arglist.map(function(name){
			return object[name];
		});
	},

	processArguments : function(args, arglist){
		if(args[0].constructor === Object){
			this.attr(args[0]);
		} else {
			var object = {};
			arglist.forEach(function(argName, i){
				if (args[i] !== undefined) {
					object[argName] = args[i];
				}
			}, this);
			this.attr(object);
		}
	},

	// Before -> Pre
	isPointInBefore : function(x, y, options){
		if(options){
			if(options.transform !== false){
				var transform = this.getTransform();
				if(!Delta.isIdentityTransform(transform)){
					var inverse = Delta.inverseTransform(transform);
					return Delta.transformPoint(inverse, [x, y]);
				}
			}
		}

		return [x, y, options];
	},

	// Bounds
	boundsReducers : {
		order : 'accuracy transform stroke tight',
		accuracy : function(value){
			// todo: fix
			if(value === 'precise'){
				return (this.preciseBounds || this.roughBounds).call(this);
			}
			if(value === 'rough'){
				return (this.roughBounds || this.preciseBounds).call(this);
			}
		},

		stroke : function(value, bounds){
			var lineWidthHalf = this.styles.lineWidth;
			if(!lineWidthHalf || value === 'ignore'){
				return bounds;
			}

			lineWidthHalf /= 2;
			if(value === '-'){
				lineWidthHalf = -lineWidthHalf;
			}

			bounds.lt[0] -= lineWidthHalf;
			bounds.lt[1] -= lineWidthHalf;
			bounds.lb[0] -= lineWidthHalf;
			bounds.rt[1] -= lineWidthHalf;
			bounds.lb[1] += lineWidthHalf;
			bounds.rt[0] += lineWidthHalf;
			bounds.rb[0] += lineWidthHalf;
			bounds.rb[1] += lineWidthHalf;

			return bounds;
		},

		transform : function(value, bounds){
			var contextMatrix = this.context && this.context.attrs.matrix,
				selfMatrix = this.attrs.matrix,
				matrix;
			if(value === 'full' && contextMatrix && selfMatrix){
				if(contextMatrix === 'dirty'){
					contextMatrix = this.context.calcMatrix();
				}
				if(selfMatrix === 'dirty'){
					selfMatrix = this.calcMatrix();
				}
				matrix = Delta.transform(contextMatrix, selfMatrix);
			} else if((value === 'context' || value === 'full') && contextMatrix){
				matrix = contextMatrix === 'dirty' ? this.context.calcMatrix() : contextMatrix;
			} else if((value === 'self' || value === 'full') && selfMatrix){
				matrix = selfMatrix === 'dirty' ? this.calcMatrix() : selfMatrix;
			}

			if(value === 'none' || !matrix){
				return {
					lt: [bounds.x1, bounds.y1],
					lb: [bounds.x1, bounds.y2],
					rt: [bounds.x2, bounds.y1],
					rb: [bounds.x2, bounds.y2]
				};
			}

			var lt = Delta.transformPoint(matrix, [bounds.x1, bounds.y1]),
				lb = Delta.transformPoint(matrix, [bounds.x1, bounds.y2]),
				rt = Delta.transformPoint(matrix, [bounds.x2, bounds.y1]),
				rb = Delta.transformPoint(matrix, [bounds.x2, bounds.y2]);

			return {
				lt: lt,
				lb: lb,
				rt: rt,
				rb: rb
			};
		},

		tight : function(value, tight){
			if(value){
				return tight;
			}

			var minx = Math.min(tight.lt[0], tight.lb[0], tight.rt[0], tight.rb[0]),
				miny = Math.min(tight.lt[1], tight.lb[1], tight.rt[1], tight.rb[1]),
				maxx = Math.max(tight.lt[0], tight.lb[0], tight.rt[0], tight.rb[0]),
				maxy = Math.max(tight.lt[1], tight.lb[1], tight.rt[1], tight.rb[1]);
			return new Bounds(minx, miny, maxx - minx, maxy - miny);
		}
	},

	bounds : function(options){
		options = Object.assign({
			accuracy : 'precise', // precise, rough, available (precise if it is)
			transform : 'full', // full, context, self, none
			stroke : 'ignore', // +, -, ignore
			tight: false // if true returns tight box from transform, if false then modifies it to non-tight
			// additions: clip, ...
		}, options);

		return this.boundsReducers.order.split(' ').reduce(function(result, caller){
			if(options[caller] === undefined){
				return result;
			}

			return this.boundsReducers[caller].call(this, options[caller], result, options);
		}.bind(this), null);
	},

	corner : function(corner, bounds){
		// todo: remove
		if(Array.isArray(corner)){
			return corner;
		}

		// todo: transformed state
		bounds = bounds instanceof Bounds ? bounds : this.bounds(bounds); // зачем?
		return [
			bounds.x + bounds.w * Delta.corners[corner][0],
			bounds.y + bounds.h * Delta.corners[corner][1]
		];
	},
/*
	// Events
	on : function(event, options, callback){
		if(event + '' !== event){
			for(var key in event) if(has(event, key)){
				this.on(key, event[key]);
			}
		}

		if(typeof options === 'function'){
			callback = options;
			options = null;
		} else if(options + '' === options){
			Array.prototype.splice.call(arguments, 1, 0, null);
		}

		if(callback + '' === callback){
			callback = wrap(arguments, 2);
		}

		this.context.listener(event);
		// todo: прокидывать отсюда событие канвасу, а он пусть подсчитывает линки и удаляет обработчики, когда нужно
		(this.listeners[event] || (this.listeners[event] = [])).push(callback);
		return this;
	},

	off : function(event, callback){
		if(!event){
			this.listeners = {};
			return this;
		}

		if(!callback){
			this.listeners[event] = null;
			return this;
		}

		this.listeners[event].splice(this.listeners[event].indexOf(callback), 1);

		return this;
	},

	fire : function(event, data, checker){
		if(!this.listeners[event]){
			return this;
		}

		var listeners = this.listeners[event];
		if(checker){
			listeners = listeners.filter(checker, this);
		}

		listeners.forEach(function(callback){
			callback.call(this, data);
		}, this);
		return this;
	}, */

	// Drawing (2D Context)
	preDraw : function(ctx){
		ctx.save();

		Object.keys(this.styles).forEach(function(key){
			ctx[key] = this.styles[key];
		}, this);

		if(this.attrs.matrix){
			var matrix = this.attrs.matrix !== 'dirty' ? this.attrs.matrix : this.calcMatrix();
			ctx.transform(matrix[0], matrix[1], matrix[2],
				matrix[3], matrix[4], matrix[5]);
		}

		// если какие-то особые штуки, то пишем их не в styles, а в attrs
		// и тут их проверяем
/*
		var style = this.styles;
		// styles
		// note1: we might cache Object.keys
		// note2: we should hold gradients / patterns in attrs not in styles
		Object.keys(style).forEach(function(key){ // it is created each redraw!
			ctx[key] = style[key]; // and replace it to for
		});

		if(style.fillStyle && style.fillStyle.toCanvasStyle){
			ctx.fillStyle = style.fillStyle.toCanvasStyle(ctx, object)
		}
		if(style.strokeStyle && style.strokeStyle.toCanvasStyle){
			ctx.strokeStyle = style.strokeStyle.toCanvasStyle(ctx, object);
		}

		if(style.lineDash){
			if(ctx.setLineDash){ // webkit
				// there's also available ctx.lineDashOffset
				ctx.setLineDash(style.lineDash);
			} else {
				ctx.mozDash = style.lineDash;
			}
		}

		// clip
		if(this.attrs.clip){
			if(this.attrs.clip.matrix){
				ctx.save();
				ctx.transform.apply(ctx, this.attrs.clip.matrix);
				this.attrs.clip.processPath(ctx);
				ctx.restore();
			} else {
				this.attrs.clip.processPath(ctx);
			}
			// несколько фигур, склиппеных последовательно, складываются
			ctx.clip();
		}

		var transform = this.getTransform();
		if(!Delta.isIdentityTransform(transform)){
			ctx.transform(transform[0], transform[1], transform[2], transform[3], transform[4], transform[5]);
		} */
	},

	postDraw : function(ctx){
		var style = this.styles;
		/*var strokeMode = this.attrs.strokeMode || 'over';
		if(strokeMode === 'clipInsideUnder' && style.strokeStyle){
			ctx.clip();
			ctx.stroke();
		}
		if(strokeMode === 'under' && style.strokeStyle){
			ctx.stroke();
		}

		if(style.fillStyle){
			ctx.fill();
		}

		if(strokeMode === 'over' && style.strokeStyle){
			ctx.stroke();
		}
		if(strokeMode === 'clipInsideOver' && style.strokeStyle){
			ctx.clip();
			ctx.stroke();
		}
		if(strokeMode === 'clip' && style.strokeStyle){
			// i have no idea
		//	ctx.scale(5, 1.5);
		//	ctx.stroke();
		} */
		if(this.attrs.fill){
			ctx.fill(this.attrs.fillRule);
		}
		if(this.attrs.stroke){
			ctx.stroke();
		}
		ctx.restore();
	},

	// Rasterization
	toDataURL : function(type, bounds){
		if(bounds === undefined){
			if(typeof this.bounds === 'function'){
				bounds = this.bounds();
			} else {
				throw 'Object #' + this.attr('z') + ' can\'t be rasterized: need the bounds.';
			}
		}

		if(type === undefined){
			type = 'image/png';
		} else if(type in Delta.fileTypes){
			type = Delta.fileTypes[type];
		}

		// todo: other renderers support
		// как насчёт отрицательных x, y
		var canvas = getTemporaryCanvas(bounds.width, bounds.height),
			context = canvas.getContext('2d');

		context.setTransform(1, 0, 0, 1, -bounds.x, -bounds.y);
		// там подключается renderer, что не прокатит для объектов чисто в памяти ( Graphics2D.rect(x,y,w,h) )
		this.draw(context);
		return canvas.toDataURL(type.type || type, type.quality || 1);
	},

	toBlob : function(type, quality, bounds, callback){
		;
	},

	toImageData : function(bounds){
		if(bounds === undefined){
			if(typeof this.bounds === 'function'){
				bounds = this.bounds();
			} else {
				throw 'Object #' + this.z() + ' can\'t be rasterized: need the bounds.';
			}
		}

		var canvas = getTemporaryCanvas(bounds.width, bounds.height),
			context = canvas.getContext('2d');

		context.setTransform(1, 0, 0, 1, -bounds.x, -bounds.y);
		this.draw(context);
		return context.getImageData(0, 0, bounds.width, bounds.height);
	},

	// Animation
	animate : function(attr, value, options){
		// attr, value, duration, easing, callback
		// attrs, duration, easing, callback
		// attr, value, options
		// attrs, options
		if(attr + '' !== attr){
			// todo:
			// the fx ob wiil not represent others
			// object.fx.stop() will stop only one anim
			if(+value === value || !value){
				options = {duration: value, easing: options, callback: arguments[3]};
			} else if(typeof value === 'function'){
				options = {callback: value};
			} else {
				options = value;
			}

			Object.keys(attr).forEach(function(key, i){
				this.animate(key, attr[key], options);
				if(i === 0){
					options.queue = false;
					options.callback = null;
				}
			}, this);
			return this;
		}

		if(!this.attrHooks[attr] || !this.attrHooks[attr].anim){
			throw 'Animation for "' + attr + '" is not supported';
		}

		if(+options === options || !options){
			options = {duration: options, callback: arguments[4], easing: arguments[3]};
		} else if(typeof options === 'function'){
			options = {callback: options};
		}

		var fx = new Animation(
			options.duration,
			options.easing,
			options.callback
		);

		fx.prop = attr;
		fx.tick = this.attrHooks[attr].anim;
		fx.tickContext = this;
		fx.prePlay = function(){
			this.fx = fx;
			this.attrHooks[attr].preAnim.call(this, fx, value);
		}.bind(this);

		// is used to pause / cancel anims
		fx.elem = this;
		if(options.name){
			fx.name = options.name;
		}

		var queue = options.queue;
		if(queue !== false){
			if(queue === true || queue === undefined){
				if(!this._queue){
					this._queue = [];
				}
				queue = this._queue;
			} else if(queue instanceof Drawable){
				queue = queue._queue;
			}
			fx.queue = queue;
			queue.push(fx);
			if(queue.length > 1){
				return this;
			}
		}

		fx.play();

		return this;
	},

	pause : function(name){
		if(!this._paused){
			this._paused = [];
		}

		// pause changes the original array
		// so we need slice
		Animation.queue.slice().forEach(function(anim){
			if(anim.elem === this && (anim.name === name || !name)){
				anim.pause();
				this._paused.push(anim);
			}
		}, this);
		return this;
	},

	continue : function(name){
		if(!this._paused){
			return;
		}

		this._paused.slice().forEach(function(anim, index){
			if(!name || anim.name === name){
				anim.continue();
				this._paused.splice(index, 1);
			}
		}, this);

		return this;
	}
};

Drawable.AttrHooks = DrawableAttrHooks;

Drawable.processStroke = function(stroke, style){
	if(stroke + '' === stroke){
		// remove spaces between commas
		stroke = stroke.replace(/\s*\,\s*/g, ',').split(' ');

		var opacity, l = stroke.length,
			joinSet = false,
			capSet = false;

		while(l--){
			if(reFloat.test(stroke[l])){
				opacity = parseFloat(stroke[l]);
			} else if(isNumberLike(stroke[l])){
				style.lineWidth = Delta.distance(stroke[l]);
			} else if(stroke[l] === 'round'){
				if(!joinSet){
					style.lineJoin = 'round';
				}
				if(!capSet){
					style.lineCap = style.lineCap || 'round';
				}
			} else if(stroke[l] === 'miter' || stroke[l] === 'bevel'){
				joinSet = true;
				style.lineJoin = stroke[l];
			} else if(stroke[l] === 'butt' || stroke[l] === 'square'){
				capSet = true;
				style.lineCap = stroke[l];
			} else if(stroke[l][0] === '['){
				style.lineDash = stroke[l].substr(1, stroke[l].length - 2).split(',');
			} else if(stroke[l] in Delta.dashes){
				style.lineDash = Delta.dashes[stroke[l]];
			} else if(stroke[l].lastIndexOf('ml') === stroke[l].length - 2){
				style.miterLimit = +stroke[l].slice(0, stroke[l].length - 2);
			} else if(stroke[l].indexOf('do') === 0){
				// todo: check about cross-browser support
				// mozDashOffset
				// webkitLineDashOffset
				style.lineDashOffset = Delta.distance(stroke[l].slice(2));
			} else {
				style.strokeStyle = stroke[l];
			}
		}
		if(opacity){
			stroke = Delta.color(style.strokeStyle);
			stroke[3] = opacity;
			style.strokeStyle = 'rgba(' + stroke.join(',') + ')';
		}
	} else {
		if(stroke.color !== undefined){
			style.strokeStyle = stroke.color;
		}
		if(stroke.opacity !== undefined && style.strokeStyle){
			var parsed = Delta.color(style.strokeStyle);
			parsed[3] = stroke.opacity;
			style.strokeStyle = 'rgba(' + parsed.join(',') + ')';
		}
		if(stroke.width !== undefined){
			style.lineWidth = Delta.distance(stroke.width);
		}
		if(stroke.join !== undefined){
			style.lineJoin = stroke.join;
		}
		if(stroke.cap !== undefined){
			style.lineCap = stroke.cap;
		}
		if(stroke.miterLimit !== undefined){
			style.miterLimit = stroke.miterLimit;
		}
		if(stroke.dash !== undefined){
			if(stroke.dash in Delta.dashes){
				style.lineDash = Delta.dashes[stroke.dash];
			} else {
				style.lineDash = stroke.dash;
			}
		}
		if(stroke.dashOffset !== undefined){
			style.lineDashOffset = Delta.distance(stroke.dashOffset);
		}
	}
};

Drawable.processShadow = function(shadow, style){
	if(shadow + '' === shadow){
		var shadowProps = ['shadowOffsetX', 'shadowOffsetY', 'shadowBlur'];
		// remove spaces between commas
		shadow = shadow.replace(/\s*\,\s*/g, ',').split(' ');
		for(var i = 0; i < shadow.length; i++){
			if(isNaN(+shadow[i][0])){
				style.shadowColor = shadow[i];
			} else {
				style[shadowProps.shift()] = Delta.distance(shadow[i]);
			}
		}
	} else {
		if(shadow.x !== undefined){
			style.shadowOffsetX = Delta.distance(shadow.x);
		}
		if(shadow.y !== undefined){
			style.shadowOffsetY = Delta.distance(shadow.y);
		}
		if(shadow.blur !== undefined){
			style.shadowBlur = Delta.distance(shadow.blur || 0);
		}
		if(shadow.color){
			style.shadowColor = shadow.color;
		}
	}
};

// Events
Object.assign(Drawable.prototype, Class.mixins['EventMixin'], {
	eventHooks: {}
});

Drawable.browserCommonEvent = {
	init : function(event){
		if(this.context){
			this.context.eventHooks[event].init.call(this.context, event);
		}
	},

	teardown : function(event){
		if(this.context){
			this.context.eventHooks[event].teardown.call(this.context, event);
		}
	}
};

Array.prototype.concat.call(browserEvents.mouse, browserEvents.touch,
	browserEvents.pointer, browserEvents.keyboard).forEach(function(eventName){
	Drawable.prototype.eventHooks[eventName] = Drawable.browserCommonEvent;
	Drawable.prototype[eventName] = Context.prototype[eventName];
});

Drawable.browserMouseOverOut = function(event){
	if(this.hoverElement !== event.targetObject){
		var prev = this.hoverElement;
		this.hoverElement = event.targetObject;

		if(prev && prev.fire){
			prev.fire('mouseout', event);
		}
		if(event.targetObject && event.targetObject.fire){
			event.targetObject.fire('mouseover', event);
		}
	}
};

Drawable.prototype.eventHooks.mouseover = Drawable.prototype.eventHooks.mouseout = {
	init : function(event){
		if(this.context && !this.context.listeners._specialMouseOverOutHook_){
			this.context.listeners._specialMouseOverOutHook_ = Drawable.browserMouseOverOut;
			this.context.on('mousemove', Drawable.browserMouseOverOut);
		}
	},

	teardown : function(event){
		if(this.context){
			this.context.listeners._specialMouseOverOutHook_ = null;
			this.context.off('mousemove', Drawable.browserMouseOverOut);
		}
	}
};

// Attrs
Object.assign(Drawable.prototype, Class.mixins['AttrMixin'], Class.mixins['TransformableMixin'], {
	attrHooks : DrawableAttrHooks.prototype = Object.assign({}, Class.mixins['TransformableMixin'].attrHooks, {
		z : {
			get : function(){
				return this.context.elements.indexOf(this);
			},
			set : function(value){
				var elements = this.context.elements;
				if(value === 'top'){
					value = elements.length;
				}

				elements.splice(this.context.elements.indexOf(this), 1);
				elements.splice(value, 0, this);
				this.update();
			}
		},

		visible : {
			set : updateSetter
		},

		clip : {
			// todo: if value.changeable then value.on('update', this.update)
			set : updateSetter
		},

		// note: value = null is an official way to remove styles
		fill : {
			set : function(value){
				// todo: if value.changeable then value.on('change', this.update)
				this.styles.fillStyle = value;
				this.update();
			}
		},

		fillRule : {
			set : updateSetter
		},

		stroke : {
			set : function(value){
				// todo: it must annihilate previous stroke params first
				if(value.constructor === String){
					// remove spaces between commas
					value = value.replace(/\s*\,\s*/g, ',').split(' ');

					var opacity,
						l = value.length,
						joinSet = false,
						capSet = false,
						color;

					while(l--){
						if(reFloat.test(value[l])){
							opacity = parseFloat(value[l]);
						} else if(isNumberLike(value[l])){
							this.styles.lineWidth = Delta.distance(value[l]);
						} else if(value[l] === 'round'){
							if(!joinSet){
								this.styles.lineJoin = 'round';
							}
							if(!capSet){
								this.styles.lineCap = 'round';
							}
						} else if(value[l] === 'miter' || value[l] === 'bevel'){
							joinSet = true;
							this.styles.lineJoin = value[l];
						} else if(value[l] === 'butt' || value[l] === 'square'){
							capSet = true;
							this.styles.lineCap = value[l];
						} else if(value[l][0] === '['){
							;
				//style.lineDash = stroke[l].substr(1, stroke[l].length - 2).split(',');
						} else if(Delta.dashes[value[l]]){
							;
						} else if(value[l].lastIndexOf('ml') === value[l].length - 2){
							;
						} else if(value[l].lastIndexOf('do') === value[l].length - 2){
							// todo: check about cross-browser support
							// mozDashOffset
							// webkitLineDashOffset
							//style.lineDashOffset = Delta.distance(stroke[l].slice(2));
							this.styles.lineDashOffset = Delta.distance(value[l].slice(0, value[l].length - 2));
						} else {
							color = value[l];
							// this.style('strokeStyle', value[l]);
						}
					}

					if(color){
						if(opacity){
							color = Delta.color(color);
							color[3] = opacity;
							color = 'rgba(' + color.join(',') + ')';
						}
						this.styles.strokeStyle = color;
					}
				} else {
					;
				}
				/*
	if(stroke + '' === stroke){
		// remove spaces between commas
		stroke = stroke.replace(/(\s*\,\s*)/g, ',').split(' '); // without braces regexp

		var opacity, l = stroke.length,
			joinSet = false,
			capSet = false;

		while(l--){
			if(reFloat.test(stroke[l])){
				opacity = parseFloat(stroke[l]);
			} else if(isNumberLike(stroke[l])){
				style.lineWidth = Delta.distance(stroke[l]);
			} else if(stroke[l] === 'round'){
				if(!joinSet){
					style.lineJoin = 'round';
				}
				if(!capSet){
					style.lineCap = style.lineCap || 'round';
				}
			} else if(stroke[l] === 'miter' || stroke[l] === 'bevel'){
				joinSet = true;
				style.lineJoin = stroke[l];
			} else if(stroke[l] === 'butt' || stroke[l] === 'square'){
				capSet = true;
				style.lineCap = stroke[l];
			} else if(stroke[l][0] === '['){
				style.lineDash = stroke[l].substr(1, stroke[l].length - 2).split(',');
			} else if(stroke[l] in Delta.dashes){
				style.lineDash = Delta.dashes[stroke[l]];
			} else if(stroke[l].lastIndexOf('ml') === stroke[l].length - 2){
				style.miterLimit = +stroke[l].slice(0, stroke[l].length - 2);
			} else if(stroke[l].indexOf('do') === 0){
				// todo: check about cross-browser support
				// mozDashOffset
				// webkitLineDashOffset
				style.lineDashOffset = Delta.distance(stroke[l].slice(2));
			} else {
				style.strokeStyle = stroke[l];
			}
		}
		if(opacity){
			stroke = Delta.color(style.strokeStyle);
			stroke[3] = opacity;
			style.strokeStyle = 'rgba(' + stroke.join(',') + ')';
		}
	} else {
		if(stroke.color !== undefined){
			style.strokeStyle = stroke.color;
		}
		if(stroke.opacity !== undefined && style.strokeStyle){
			var parsed = Delta.color(style.strokeStyle);
			parsed[3] = stroke.opacity;
			style.strokeStyle = 'rgba(' + parsed.join(',') + ')';
		}
		if(stroke.width !== undefined){
			style.lineWidth = Delta.distance(stroke.width);
		}
		if(stroke.join !== undefined){
			style.lineJoin = stroke.join;
		}
		if(stroke.cap !== undefined){
			style.lineCap = stroke.cap;
		}
		if(stroke.miterLimit !== undefined){
			style.miterLimit = stroke.miterLimit;
		}
		if(stroke.dash !== undefined){
			if(stroke.dash in Delta.dashes){
				style.lineDash = Delta.dashes[stroke.dash];
			} else {
				style.lineDash = stroke.dash;
			}
		}
		if(stroke.dashOffset !== undefined){
			style.lineDashOffset = Delta.distance(stroke.dashOffset);
		}
	} */
			}
		},

		opacity : {
			get : function(){
				return this.attrs.opacity === undefined ? 1 : this.attrs.opacity;
			},
			set : function(value){
				this.styles.globalAlpha = +value;
				this.update();
			}
		},

		composite : {
			set : function(value){
				this.styles.globalCompositeOperation = value;
				this.update();
			}
		},


	})
});


Delta.Drawable = Drawable;

// var anim = Delta.animation(300, 500, options);
// anim.start(value => dosmth(value));

// https://mootools.net/core/docs/1.6.0/Fx/Fx
Animation = new Class({

	initialize: function(duration, easing, callback){
		this.duration = duration || Animation.default.duration;
		if(easing + '' === easing){
			if(easing.indexOf('(') > -1){
				this.easingParam = +easing.split('(')[1].split(')')[0];
				easing = easing.split('(')[0];
			}
			this.easing = Animation.easing[easing];
		} else {
			this.easing = easing || Animation.easing.default;
		}
		this.callback = callback;
	},

	play: function(tick, context){
		if(this.prePlay){
			this.prePlay();
		}
		if(tick){
			this.tick = tick;
		}
		if(context){
			this.tickContext = context;
		}

		this.startTime = Date.now();
		this.endTime = this.startTime + this.duration;
		if(!Animation.queue.length){
			requestAnimationFrame(Animation.do);
		}
		Animation.queue.push(this);
	},

	pause: function(){
		this.pauseTime = Date.now();
		Animation.queue.splice(Animation.queue.indexOf(this), 1);
	},

	continue: function(){
		var delta = this.pauseTime - this.startTime;
		this.startTime = Date.now() - delta;
		this.endTime = this.startTime + this.duration;

		if(!Animation.queue.length){
			requestAnimationFrame(Animation.do);
		}
		Animation.queue.push(this);
	}

});

Animation.queue = [];

Animation.do = function(){
	var fx, t,
		now = Date.now();

	for(var i = 0; i < Animation.queue.length; i++){
		fx = Animation.queue[i];
		t = (now - fx.startTime) / fx.duration;

		if(t < 0){
			continue;
		}

		if(t > 1){
			t = 1;
		}

		fx.now = now;
		fx.pos = fx.easing(t, fx.easingParam);
		fx.tick.call(fx.tickContext, fx);

		if(t === 1){
			if(fx.callback){
				// call him in requestAnimFrame?
				// it must be called after the last update, i think
				fx.callback.call(fx.tickContext, fx);
			}

			if(fx.queue){
				fx.queue.shift();
				if(fx.queue.length){
					// init the next anim in the que
					fx.queue[0].play();
				}
			}
			Animation.queue.splice(Animation.queue.indexOf(fx), 1);
		}
	}

	if(Animation.queue.length){
		requestAnimationFrame(Animation.do);
	}
};

// Some tick functions
Drawable.prototype.attrHooks['_num'] = {
	preAnim: function(fx, endValue){
		fx.startValue = this.attr(fx.prop);
		fx.delta = endValue - fx.startValue;

		if(endValue + '' === endValue){
			if(endValue.indexOf('+=') === 0){
				fx.delta = +endValue.substr(2);
			} else if(endValue.indexOf('-=') === 0){
				fx.delta = -endValue.substr(2);
			}
		}
	},

	anim: function(fx){
		this.attrs[fx.prop] = fx.startValue + fx.delta * fx.pos;
		this.update();
	}
};

Drawable.prototype.attrHooks['_numAttr'] = {
	preAnim: Drawable.prototype.attrHooks._num.preAnim,

	anim: function(fx){
		this.attr(fx.prop, fx.startValue + fx.delta * fx.pos);
	}
};

// Easing functions
Animation.easing = {

	linear: function(x){
		return x;
	},

	swing: function(x){
		return 0.5 - Math.cos(x * Math.PI) / 2;
	},

	sqrt: function(x){
		return Math.sqrt(x);
	},

	pow: function(t, v){
		return Math.pow(t, v || 6);
	},

	expo: function(t, v){
		return Math.pow(v || 2, 8 * t - 8);
	},

	sigmoid : function(t, v){
		// return 1 / (1 + Math.exp(v * (t - 0.5))) / (1 / (1 + Math.exp(v / 2)));

		v = -(v || 5);
		return (1 + Math.exp(v / 2)) / (1 + Math.exp(v * (t - 0.5)));
	},

	circ: function(t){
		return 1 - Math.sin(Math.acos(t));
	},

	sine: function(t){
		return 1 - Math.cos(t * Math.PI / 2);
	},

	back: function(t, v){
		return Math.pow(t, 2) * ((v || 1.618) * (t - 1) + t);
	},

	bounce: function(t){
		for(var a = 0, b = 1; 1; a += b, b /= 2){
			if(t >= (7 - 4 * a) / 11){
				return b * b - Math.pow((11 - 6 * a - 11 * t) / 4, 2);
			}
		}
	},

	elastic: function(t, v){
		return Math.pow(2, 10 * --t) * Math.cos(20 * t * Math.PI * (v || 1) / 3);
	},

	bezier: function(t, v){
		// todo
	},

	// [tension, elastic]

};

Animation.easing.default = Animation.easing.swing; // todo: move to Animation.default

['quad', 'cubic', 'quart', 'quint'].forEach(function(name, i){
	Animation.easing[name] = function(t){
		return Math.pow(t, i + 2);
	};
});

Object.keys(Animation.easing).forEach(function(ease){
	Animation.easing[ease + 'In'] = Animation.easing[ease];
	Animation.easing[ease + 'Out'] = function(t, v){
		return 1 - Animation.easing[ease](1 - t, v);
	};
	Animation.easing[ease + 'InOut'] = function(t, v){
		if(t >= 0.5){
			return Animation.easing[ease](2 * t, v) / 2;
		} else {
			return (2 - Animation.easing[ease](2 * (1 - t), v)) / 2;
		}
	};
});

Animation.default = {
	duration: 500
};

Delta.animation = function(duration, easing, callback){
	return new Animation(duration, easing, callback);
};

Rect = new Class(Drawable, {
	argsOrder: ['x', 'y', 'width', 'height', 'fill', 'stroke'],

	attrHooks: new DrawableAttrHooks({
		x: {set: updateSetter},
		y: {set: updateSetter},
		width: {set: updateSetter},
		height: {set: updateSetter},

		x1: {
			get: function(){
				return this.attrs.x;
			},
			set: function(value){
				this.attrs.width += (this.attrs.x - value);
				this.attrs.x = value;
				this.update();
				return null;
			}
		},
		y1: {
			get: function(){
				return this.attrs.y;
			},
			set: function(value){
				this.attrs.height += (this.attrs.y - value);
				this.attrs.y = value;
				this.update();
				return null;
			}
		},
		x2: {
			get: function(){
				return this.attrs.x + this.attrs.width;
			},
			set: function(value){
				this.attrs.width = value - this.attrs.x;
				this.update();
				return null;
			}
		},
		y2: {
			get: function(){
				return this.attrs.y + this.attrs.height;
			},
			set: function(value){
				this.attrs.height = value - this.attrs.y;
				this.update();
				return null;
			}
		}
	}),

	// For history:
	// this variation is faster
	// very very faster!
	// if you change attrs of 100 000 elements
	// then all x-ses will work in ~ 7 ms
	// all attr-s — in ~ 100 ms
	/* x: function(val){
		if(val === undefined){
			return this.attrs.x;
		}
		this.attrs.x = val;
		return this.update();
	}, */

	isPointIn : function(x, y, options){
		var point = this.isPointInBefore(x, y, options);
		x = point[0];
		y = point[1];
		return x > this.attrs.x && y > this.attrs.y && x < this.attrs.x + this.attrs.width && y < this.attrs.y + this.attrs.height;
	},

	preciseBounds : function(){
		return new Bounds(
			this.attrs.x,
			this.attrs.y,
			this.attrs.width,
			this.attrs.height
		);
	},
/*
	bounds: function(transform, around){
		return this.super('bounds', [
			[this.attrs.x, this.attrs.y, this.attrs.width, this.attrs.height],
			transform, around
		]);
	}, */

	draw : function(ctx){
		if(this.attrs.visible){
			this.preDraw(ctx);

			if(this.attrs.fill){
				ctx.fillRect(
					this.attrs.x,
					this.attrs.y,
					this.attrs.width,
					this.attrs.height
				);
			}
			if(this.attrs.stroke){
				ctx.strokeRect(
					this.attrs.x,
					this.attrs.y,
					this.attrs.width,
					this.attrs.height
				);
			}

			ctx.restore();
		}
	},

	processPath : function(ctx){
		ctx.beginPath();
		ctx.rect(this.attrs.x, this.attrs.y, this.attrs.width, this.attrs.height);
	}

});

['x', 'y', 'width', 'height', 'x1', 'x2', 'y1', 'y2'].forEach(function(propName, i){
	var attr = Drawable.prototype.attrHooks[i > 3 ? '_numAttr' : '_num'];
	Rect.prototype.attrHooks[propName].preAnim = attr.preAnim;
	Rect.prototype.attrHooks[propName].anim = attr.anim;
});

Delta.rect = function(){
	return new Rect(arguments);
};

Delta.Rect = Rect;

Circle = new Class(Drawable, {
	argsOrder: ['cx', 'cy', 'radius', 'fill', 'stroke'],

	attrHooks: new DrawableAttrHooks({
		cx: {set: updateSetter},
		cy: {set: updateSetter},
		radius: {set: updateSetter}
	}),

	isPointIn : function(x, y, options){
		options = (options === 'mouse' ? this.attrs.interactionProps : options) || {};
		var point = this.isPointInBefore(x, y, options);
		x = point[0];
		y = point[1];
		var stroke = options.stroke ? (this.styles.lineWidth || 0) / 2 : 0;
//		if(options.fill === false && Math.pow(x - this.attrs.cx, 2) + Math.pow(y - this.attrs.cy, 2) <= Math.pow(this.attrs.radius - stroke, 2)){
//			return false;
//		}
		return (Math.pow(x - this.attrs.cx, 2) + Math.pow(y - this.attrs.cy, 2)) <= Math.pow(this.attrs.radius + stroke, 2);
	},

	preciseBounds : function(){
		return new Bounds(
			this.attrs.cx - this.attrs.radius,
			this.attrs.cy - this.attrs.radius,
			this.attrs.radius * 2,
			this.attrs.radius * 2
		);
	},
/*
	bounds: function(transform, around){
		return this.super('bounds', [
			[this.attrs.cx - this.attrs.radius, this.attrs.cy - this.attrs.radius, this.attrs.radius * 2, this.attrs.radius * 2],
			transform, around
		]);
	}, */

	draw : function(ctx){
		if(this.attrs.visible){
			this.preDraw(ctx);
			ctx.beginPath();
			ctx.arc(
				this.attrs.cx,
				this.attrs.cy,
				Math.abs(this.attrs.radius),
				0,
				Math.PI * 2,
				true
			);
			this.postDraw(ctx);
		}
	},

	processPath: function(ctx){
		ctx.beginPath();
		ctx.arc(this.attrs.cx, this.attrs.cy, Math.abs(this.attrs.radius), 0, Math.PI * 2, true);
	}

});

Circle.prototype.roughBounds = Circle.prototype.preciseBounds;

Circle.args = ['cx', 'cy', 'radius', 'fill', 'stroke'];

['cx', 'cy', 'radius'].forEach(function(propName){
	Circle.prototype.attrHooks[propName].preAnim = Drawable.prototype.attrHooks._num.preAnim;
	Circle.prototype.attrHooks[propName].anim = Drawable.prototype.attrHooks._num.anim;
});

Delta.circle = function(){
	return new Circle(arguments);
};

Delta.Circle = Circle;

function CurveAttrHooks(attrs){
	extend(this, attrs); // todo: deepExtend neccessary?
}

Curve = new Class({
	initialize: function(method, funcAttrs, path){
		this.method = method;
		this.path = path;
		this.attrs = {};
		this.attrs.args = funcAttrs;
		if(Curve.canvasFunctions[method]){
			this.attrHooks = Curve.canvasFunctions[method].attrHooks;
		}
	},

	// General Curve methods
	attrHooks: CurveAttrHooks.prototype = {
		args: {
			set: function(){
				this.update();
			}
		}
	},

	attr: Class.attr,

	clone: function(){
		var clone = Delta.curve(this.method, this.attrs.args);
		extend(clone.attrs, this.attrs); // todo: deepExtend
		return clone;
	},

	// Path specific functions:

	startAt: function(){
		var index = this.path.attrs.d.indexOf(this);
		return index === 0 ? [0, 0] : this.path.attrs.d[index - 1].endAt();
	},

	endAt: function(){
		if(!Curve.canvasFunctions[this.method].endAt){
			return null;
		}
		return Curve.canvasFunctions[this.method].endAt(this.attrs.args);
	},

	update: function(){
		if(this.path){
			this.path.update();
		}
		return this;
	},

	// Canvas Curve methods
	bounds: function(prevEnd){
		if(!Curve.canvasFunctions[this.method].bounds){
			return null;
		}
		if(!prevEnd){
			prevEnd = this.startAt();
		}
		return Curve.canvasFunctions[this.method].bounds(prevEnd, this.attrs.args);
	},

	process: function(ctx){
		ctx[this.method].apply(ctx, this.attrs.args);
	}
});

Curve.AttrHooks = CurveAttrHooks;

// todo: rename to canvasMethods
Curve.canvasFunctions = {
	moveTo: {
		attrHooks: makeAttrHooks(['x', 'y']),
		endAt: function(attrs){
			return attrs.slice();
		}
	},
	lineTo: {
		attrHooks: makeAttrHooks(['x', 'y']),
		bounds: function(from, attrs){
			return [from[0], from[1], attrs[0], attrs[1]];
		},
		endAt: function(attrs){
			return attrs.slice();
		}
	},
	quadraticCurveTo: {
		attrHooks: makeAttrHooks(['hx', 'hy', 'x', 'y']),
		bounds: function(from, attrs){
			var minX = Math.min(from[0], attrs[0], attrs[2]);
			var minY = Math.min(from[1], attrs[1], attrs[3]);
			var maxX = Math.max(from[0], attrs[0], attrs[2]);
			var maxY = Math.max(from[1], attrs[1], attrs[3]);
			return [minX, minY, maxX, maxY];
		},
		endAt: function(attrs){
			return attrs.slice(2);
		}
	},
	bezierCurveTo: {
		attrHooks: makeAttrHooks(['h1x', 'h1y', 'h2x', 'h2y', 'x', 'y']),
		bounds: function(from, attrs){
			var minX = Math.min(from[0], attrs[0], attrs[2], attrs[4]);
			var minY = Math.min(from[1], attrs[1], attrs[3], attrs[5]);
			var maxX = Math.max(from[0], attrs[0], attrs[2], attrs[4]);
			var maxY = Math.max(from[1], attrs[1], attrs[3], attrs[5]);
			return [minX, minY, maxX, maxY];
		},
		endAt: function(attrs){
			return attrs.slice(4);
		}
	},
	arc: {
		attrHooks: makeAttrHooks(['x', 'y', 'radius', 'start', 'end', 'clockwise']),
		bounds: function(from, attrs){
			var x = attrs[0],
				y = attrs[1],
				radius = attrs[2],
				start = attrs[3],
				end = attrs[4],
				clockwise = attrs[5];
				// todo: support 'from'
			return [x - radius, y - radius, x + radius, y + radius];
			// не учитывается старт-энд
			// нужно собрать точки начало, конец и между ними через 90 градусов каждую по модулю
			// хочется функцию Bounds.fromPoints(array)
		},
		endAt: function(attrs){
			var x = attrs[0],
				y = attrs[1],
				radius = attrs[2],
				delta = attrs[4] - attrs[3];

			if(attrs[5]){
				delta = -delta;
			}
			return [
				x + Math.cos(delta) * radius,
				y + Math.sin(delta) * radius
			];
		}
	},
	arcTo: {
		attrHooks: makeAttrHooks(['x1', 'y1', 'x2', 'y2', 'radius', 'clockwise'])
	}
};

function makeAttrHooks(argList){
	var attrHooks = new CurveAttrHooks({});
	for(var i = 0; i < argList.length; i++){
	/*	attrHooks[argList[arg]] = {
			get: function(){
				return this.attrs.args[i];
			},
			set: function(value){
				this.attrs.args[i] = value;
				this.update();
			}
		}; */
	}
/*	argList.forEach(function(arg, i){
		attrHooks[arg] = {
			get: function(){
				return this.attrs.args[i];
			},
			set: function(value){
				this.attrs.args[i] = value;
				this.update();
			}
		};
	});*/
	return attrHooks;
}

// todo: move to path?
Curve.fromArray = function(array, path){
	if(array === true){
		return closePath;
	}

	if(array[0] in Delta.curves){
		return Delta.curve(array[0], array.slice(1), path);
	}

	return new Curve({
		'2': 'lineTo',
		'4': 'quadraticCurveTo',
		'6': 'bezierCurveTo'
	}[array.length], array, path);
};

Delta.curves = {
	moveTo: Curve,
	lineTo: Curve,
	quadraticCurveTo: Curve,
	bezierCurveTo: Curve,
	arc: Curve,
	arcTo: Curve,
	closePath: Curve
};

Delta.Curve = Curve;

Delta.curve = function(method, attrs, path){
	return new Delta.curves[method](method, attrs, path);
};
// {{dont include CurveMath.js}}
// {{dont include CurveCatmull.js}}
// {{dont include CurveHermite.js}}
// {{dont include CurveGeneralBezier.js}}
// {{dont include CurveLagrange.js}}
// {{dont include CurveRibbon.js}}
// {{dont include CurvePolyline.js}}

Path = new Class(Drawable, {
	initialize : function(args){
		if(args[0].constructor !== Object){
			if(args[1].constructor !== Number){
				args[3] = args[1];
				args[4] = args[2];
				args[1] = args[2] = undefined;
			}
		}

		this.super('initialize', arguments);
	},

	argsOrder: ['d', 'x', 'y', 'fill', 'stroke'],

	attrHooks: new DrawableAttrHooks({
		d: {set: updateSetter},
		x: {set: updateSetter},
		y: {set: updateSetter}
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

	// todo: move to attrs?
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
		var point = this.isPointInBefore(x, y, options);
		x = point[0];
		y = point[1];

		var ctx = this.context.context;
		ctx.save();

		var transform = this.getTransform();
		if(!Delta.isIdentityTransform(transform)){
			ctx.transform(transform[0], transform[1], transform[2], transform[3], transform[4], transform[5]);
		}

		if(this.attrs.x || this.attrs.y){
			ctx.translate(this.attrs.x || 0, this.attrs.y || 0);
		}
		this.attrs.d.forEach(function(curve){
			curve.process(ctx);
		});
		var result = ctx.isPointInPath(x, y);
		ctx.restore();
		return result;
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

	process : function(ctx){
		ctx.beginPath();
		this.attrs.d.forEach(function(curve){
			curve.process(ctx);
		});
	},

	draw : function(ctx){
/*		if(this.attrs.visible){
			this.preDraw(ctx);

			if(this.attrs.x || this.attrs.y){
				// todo: will it be affected by previous transformations (the path itself, the canvas)?
				ctx.translate(this.attrs.x || 0, this.attrs.y || 0);
			}

			this.process(ctx);

			this.postDraw(ctx);
		} */
	}

} );

Path.args = ['d', 'x', 'y', 'fill', 'stroke'];

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
// {{dont include Path.Math.js}}
// {{dont include Path.SVG.js}}

Picture = new Class(Drawable, {

	// todo: image format libcanvas-like:
	// '/files/img/hexes.png [150:100]{0:0}'
	initialize : function(args){
		this.super('initialize', arguments);

		if(isObject(args[0])){
			args = this.processObject(args[0], Picture.args);
		}

		this.attrs.image = Picture.parse(args[0]);
		this.attrs.x = args[1];
		this.attrs.y = args[2];
		this.attrs.width = args[3] === undefined ? 'auto' : args[3];
		this.attrs.height = args[4] === undefined ? 'auto' : args[4];
		if(args[5]){
			this.attrs.crop = args[5];
		}

		this.attrs.image.addEventListener('load', function(event){
			this.update();
			this.fire('load', event);
		}.bind(this));

		this.attrs.image.addEventListener('error', function(e){
			this.fire('error', event);
		}.bind(this));
	},

	attrHooks: new DrawableAttrHooks({
		image: {
			set: function(value){
				value = Picture.parse(value);

				if(value.complete){
					this.update();
				}

				value.addEventListener('load', function(event){
					this.update();
					this.fire('load', event);
				}.bind(this));

				return value;
			}
		},

		x: {
			set: function(value){
				this.attrs.x = value;
				this.update();
			}
		},

		y: {
			set: function(value){
				this.attrs.y = value;
				this.update();
			}
		},

		width: {
			set: function(value){
				this.attrs.width = value;
				this.update();
			}
		},

		height: {
			set: function(value){
				this.attrs.height = value;
				this.update();
			}
		},

		crop: {
			set: function(value){
				this.attrs.crop = value;
				this.update();
			}
		},

		smooth: {
			get: function(){
				return this.styles[smoothPrefix(this.context.context)] || this.context.context[smoothPrefix(this.context.context)];
			},
			set: function(value){
				this.styles[smoothPrefix(this.context.context)] = !!value;
				this.update();
			}
		}
	}),

	remove: function(){
		this.super('remove');
		// todo:
		// what if user want to push the ctx.image again?
		// should be able to restore the link to blob
		// the blob is still saved in the image.blob, just needs to call domurl.createObjectURL again
		if(this.attrs.image.blob){
			domurl.revokeObjectURL(this.attrs.image.blob);
		}
	},

	getRealSize: function(){
		var w = this.attrs.width,
			h = this.attrs.height;

		// they both are auto by default because saving proportions is by default true
		if(w === 'auto' && h === 'auto'){
			w = h = 'native';
		}

		if(w === 'auto'){
			w = this.attrs.image.width * (h / this.attrs.image.height);
		} else if(w === 'native'){
			w = this.attrs.image.width;
		}

		if(h === 'auto'){
			h = this.attrs.image.height * (w / this.attrs.image.width);
		} else if(h === 'native'){
			h = this.attrs.image.height;
		}

		return [w, h];
	},

	bounds: function(transform, around){
		var size = this.getRealSize();
		return this.super('bounds', [
			[this.attrs.x, this.attrs.y, size[0], size[1]],
			transform, around
		]);
	},

	isPointIn : function(x, y){
		var point = this.isPointInBefore(x, y, options);
		x = point[0];
		y = point[1];

		var size = this.getRealSize();
		return x > this.attrs.x && y > this.attrs.y && x < this.attrs.x + size[0] && y < this.attrs.y + size[1];
	},

	draw : function(ctx){
		if(this.attrs.visible && this.attrs.image.complete){
			this.context.renderer.pre(ctx, this.styles, this.matrix, this);

			var params = [this.attrs.image, this.attrs.x, this.attrs.y];
			var width = this.attrs.width,
				height = this.attrs.height,
				crop = this.attrs.crop;

			if((this.attrs.width === 'auto' || this.attrs.width === 'native') ||
				(this.attrs.height === 'auto' || this.attrs.height === 'native')){
				var size = this.getRealSize();
				width  = size[0];
				height = size[1];
			}

			if(crop){
				ctx.drawImage(
					this.attrs.image,
					crop[0], crop[1],
					crop[2], crop[3],

					this.attrs.x, this.attrs.y,
					width, height
				);
			} else if(
				(this.attrs.width === 'auto' || this.attrs.width === 'native') &&
				(this.attrs.height === 'auto' || this.attrs.height === 'native')) {
				ctx.drawImage(
					this.attrs.image,
					this.attrs.x, this.attrs.y
				);
			} else {
				ctx.drawImage(
					this.attrs.image,
					this.attrs.x, this.attrs.y,
					width, height
				);
			}
			ctx.restore();
		}
	}

});

var smoothWithPrefix;
function smoothPrefix(ctx){
	[
		'mozImageSmoothingEnabled',
		'webkitImageSmoothingEnabled',
		'msImageSmoothingEnabled',
		'imageSmoothingEnabled'
	].forEach(function(name){
		if(name in ctx){
			smoothWithPrefix = name;
		}
	});

	smoothPrefix = function(){
		return smoothWithPrefix;
	};
	return smoothWithPrefix;
}

Picture.args = ['image', 'x', 'y', 'width', 'height', 'crop'];

Picture.parse = function(image){
	if(image + '' === image){
		if(image[0] === '#'){
			return document.getElementById(image.substr(1));
		} else if(image[0] === '<svg'){
			var blob = new Blob([image], {type: 'image/svg+xml;charset=utf-8'});
			image = new Image();
			image.src = domurl.createObjectURL(blob);
			image.blob = blob;
		} else {
			var imageObject = new Image();
			imageObject.src = image;
			return imageObject;
		}
	}
	return image;
};

Delta.image = function(){
	return new Picture(arguments);
};

Delta.Image = Picture;

var defaultBaseline = 'top';

Text = new Class(Drawable, {
/*	initialize : function(args){
		this.super('initialize', arguments);

		if(isObject(args[0])){
			// надо просто расширять в прототипе какой-то объект со свойствами,
			// к которому обращается processObject
			// чтобы это всё шло в attr
			if(args[0].align){
				this.attrs.align = args[0].align;
				this.styles.textAlign = args[0].align;
			}

			if(args[0].baseline){
				this.attrs.baseline = args[0].baseline;
			} else {
				this.attrs.baseline = defaultBaseline;
			}

			if(args[0].breaklines !== undefined){
				this.attrs.breaklines = args[0].breaklines;
			} else {
				this.attrs.breaklines = true;
			}

			if(args[0].lineHeight !== undefined){
				this.attrs.lineHeight = args[0].lineHeight;
			} else {
				this.attrs.lineHeight = 'auto';
			}

			if(args[0].maxStringWidth !== undefined){
				this.attrs.maxStringWidth = args[0].maxStringWidth;
			} else {
				this.attrs.maxStringWidth = Infinity;
			}

			if(args[0].blockWidth !== undefined){
				this.attrs.blockWidth = args[0].blockWidth;
			} else {
				this.attrs.blockWidth = Infinity;
			}

			if(args[0].boundsMode){
				this.attrs.boundsMode = args[0].boundsMode;
			} else {
				this.attrs.boundsMode = 'inline';
			}

			if(args[0].text){
				args[0].text = args[0].text;
			}

			// todo
			// change to: this.attrs.boundsMode = args[0].boundsMode || 'inline';
			// and so on

			args = this.processObject(args[0], Text.args);
		} else {
			this.attrs.baseline = defaultBaseline;
			this.attrs.breaklines = true;
			this.attrs.lineHeight = 'auto';
			this.attrs.maxStringWidth = Infinity; // in the draw: if this.attrs.maxStringWidth < Infinity then ...
			this.attrs.blockWidth = Infinity;
			this.attrs.boundsMode = 'inline';
		}

		this.styles.textBaseline = this.attrs.baseline;

		this.attrs.text = args[0] + '';
		this.attrs.x = args[1];
		this.attrs.y = args[2];
		this.attrs.font = Text.parseFont(args[3] || Text.font);
		this.styles.font = Text.genFont(this.attrs.font);
		if(args[4]){
			this.styles.fillStyle = args[4];
		}
		if(args[5]){
			this.attr('stroke', args[5]);
			// this.styles.stroke = args[5];
			// Drawable.processStroke(args[5], this.styles);
		}

	}, */
	argsOrder: ['text', 'x', 'y', 'font', 'fill', 'stroke'],

	// Context2D specific stuff:

	attrHooks: new DrawableAttrHooks({
		text: {
			set: function(value){
				this.lines = null;
				this.update();
				return value + '';
			}
		},

		x: {set: updateSetter},
		y: {set: updateSetter},

		font: {
			set: function(value){
				/* extend(this.attrs.font, Text.parseFont(value));
				this.styles.font = Text.genFont(this.attrs.font);
				this.update();
				return null;*/
			}
		},

		align: {
			get: function(){
				return this.styles.textAlign || 'left';
			},
			set: function(value){
				this.styles.textAlign = value;
				this.update();
				return null;
			}
		},

		baseline: {
			get: function(){
				return this.styles.textBaseline;
			},
			set: function(value){
				this.styles.textBaseline = value;
				this.update();
				return null;
			}
		},

		breaklines: {
			set: function(){
				this.update();
			}
		},

		lineHeight: {
			set: function(){
				this.lines = null;
				this.update();
			}
		},

		maxStringWidth: {
			set: function(){
				this.update();
			}
		},

		blockWidth: {
			set: function(){
				this.lines = null;
				this.update();
			}
		}
	}),

	lines: null,

	processLines: function(ctx){
		var text = this.attrs.text,
			lines = this.lines = [],

			height = this.attrs.lineHeight === 'auto' ? this.attrs.font.size : this.attrs.lineHeight,
			maxWidth = this.attrs.blockWidth,
			x = maxWidth * (this.styles.textAlign === 'center' ? 1/2 : this.styles.textAlign === 'right' ? 1 : 0),

			rend = this.context.renderer;

		rend.preMeasure(this.styles.font);
		text.split('\n').forEach(function(line){
			if(rend.measure(line) > maxWidth){
				var words = line.split(' '),
					curline = '',
					testline;

				for(var i = 0; i < words.length; i++){
					testline = curline + words[i] + ' ';

					if(rend.measure(testline) > maxWidth){
						lines.push({
							text: curline,
							y: height * lines.length
						});
						curline = words[i] + ' ';
					} else {
						curline = testline;
					}
				}
				lines.push({
					text: curline,
					y: height * lines.length
				});
			} else {
				lines.push({
					text: line,
					y: height * lines.length
				});
			}
		}, this);
		rend.postMeasure();
		return this;
	},

	draw : function(ctx){
		/* if(this.attrs.visible){
			this.context.renderer.pre(ctx, this.styles, this.matrix, this);

			if(!this.attrs.breaklines){
				var width = this.attrs.maxStringWidth < Infinity ? this.attrs.maxStringWidth : undefined;

				if(this.styles.fillStyle){
					ctx.fillText(this.attrs.text, this.attrs.x, this.attrs.y, width);
				}
				if(this.styles.strokeStyle){
					ctx.strokeText(this.attrs.text, this.attrs.x, this.attrs.y, width);
				}
			} else {
				if(!this.lines){
					this.processLines(ctx);
				}

				var x = this.attrs.x,
					y = this.attrs.y;

				if(this.styles.fillStyle && !this.styles.strokeStyle){
					this.lines.forEach(function(line){
						ctx.fillText(line.text, x, y + line.y);
					});
				} else if(this.styles.fillStyle){
					this.lines.forEach(function(line){
						ctx.fillText(line.text, x, y + line.y);
						ctx.strokeText(line.text, x, y + line.y);
					});
				} else {
					this.lines.forEach(function(line){
						ctx.strokeText(line.text, x, y + line.y);
					});
				}
			}
			ctx.restore();
		} */
	},

	isPointIn : function(x, y, options){
		var point = this.isPointInBefore(x, y, options);
		x = point[0];
		y = point[1];

		var bounds = this.bounds(false);
		return x > bounds.x1 && y > bounds.y1 && x < bounds.x2 && y < bounds.y2;
	},

	measure: function(){
		var width;
		// todo: if(this.context is 2d) measure through it else make new 2d context
		if(this.attrs.breaklines){
			if(!this.lines){
				this.processLines(this.context.context);
			}

			this.context.renderer.preMeasure(this.styles.font);
			width = this.lines.reduce(function(prev, cur){
				cur = this.context.renderer.measure(cur.text);
				if(prev < cur){
					return cur;
				}
				return prev;
			}.bind(this), 0);
			this.context.renderer.postMeasure();
		} else {
			this.context.renderer.preMeasure(this.styles.font);
			width = this.context.renderer.measure(this.attrs.text);
			this.context.renderer.postMeasure();
		}
		return width;
	},

	bounds: function(transform, around){
		var bounds,
			blockX = this.attrs.x,
			blockY = this.attrs.y,
			width,
			height = this.attrs.lineHeight === 'auto' ? this.attrs.font.size : this.attrs.lineHeight;

		// text processing
		if(this.attrs.breaklines){
			width = this.attrs.blockWidth;

			if(this.attrs.boundsMode === 'inline' || !isFinite(width)){
				width = this.measure();
			}

			if(!this.lines){
				this.processLines();
			}
			height *= this.lines.length;
		} else {
			width = this.measure();
			if(this.attrs.maxStringWidth < width){
				width = this.attrs.maxStringWidth;
			}
		}

		// modifiers
		var baseline = this.styles.textBaseline,
			align = this.styles.textAlign;

		if(baseline === 'middle'){
			blockY -= this.attrs.font.size / 2;
		} else if(baseline === 'bottom' || baseline === 'ideographic'){
			blockY -= this.attrs.font.size;
		} else if(baseline === 'alphabetic'){
			blockY -= this.attrs.font.size * 0.8;
		}

		if(align === 'center'){
			blockX -= width / 2;
		} else if(align === 'right'){
			blockX -= width;
		}

		return this.super('bounds', [
			[blockX, blockY, width, height], transform, around
		]);
	}

});

Text.font = '10px sans-serif';
Text.args = ['text', 'x', 'y', 'font', 'fill', 'stroke'];

// 'Arial bold 10px' -> {family: 'Arial', size: 10, bold: true}
Text.parseFont = function(font){
	if(font + '' === font){
		var object = {
			family: ''
		};
		font.split(' ').forEach(function(part){
			if(part === 'bold'){
				object.bold = true;
			} else if(part === 'italic'){
				object.italic = true;
			} else if(reNumberLike.test(part)){
				object.size = Delta.distance(part);
			} else {
				object.family += ' ' + part;
			}
		});

		object.family = object.family.trim();
		return object;
	}
	return font;
};

// {family: 'Arial', size: 10, bold: true} -> 'bold 10px Arial'
Text.genFont = function(font){
	var string = '';
	if(font.italic){
		string += 'italic ';
	}
	if(font.bold){
		string += 'bold ';
	}
	return string + (font.size || 10) + 'px ' + (font.family || 'sans-serif');
};

Delta.text = function(){
	return new Text(arguments);
};

Delta.Text = Text;

Gradient = new Class({
	initialize: function(type, colors, from, to, context){
		this.context = context;

		if(type + '' !== type){
			to = from;
			from = colors;
			colors = type;
			type = 'linear';
		}

		if(!Gradient.types[type]){
			throw 'Unknown gradient type "' + type + '"';
		}

		this.type = type;
		this.attrs = {
			from: from,
			to: to,
			colors: Gradient.parseColors(colors)
		};
		this.binds = [];

		if(Gradient.types[this.type]){
			this.attrHooks = extend( //  тут надо наследовать через прототипы, а не так
				extend({}, this.attrHooks),
				Gradient.types[this.type].attrHooks
			);

			if(Gradient.types[this.type].initialize){
				Gradient.types[this.type].initialize.call(this);
			}
		}
	},

	attr: Class.attr,

	attrHooks: {
		colors: {
			set: function(value){
				this.update();
				return Gradient.parseColors(value);
			}
		}
	},

	color: function(t, value){
		if(value !== undefined){
			this.attrs.colors[t] = value;
			return this.update();
		}
		if(this.attrs.colors[t]){
			return Delta.color(this.attrs.colors[t]);
		}

		var colors = this.attrs.colors,
			keys = Object.keys(colors).sort(); // is this sort sorting them right? as numbera or as strings?

		if(t < keys[0]){
			return Delta.color(colors[keys[0]]);
		} else if(t > keys[keys.length - 1]){
			return Delta.color(colors[keys[keys.length - 1]]);
		}

		for(var i = 0; i < keys.length; i++){
			if(+keys[i] > t){
				var c1 = Delta.color(colors[keys[i - 1]]),
					c2 = Delta.color(colors[keys[i]]);
				t = (t - +keys[i - 1]) / (+keys[i] - +keys[i - 1]);
				return [
					c1[0] + (c2[0] - c1[0]) * t + 0.5 | 0,
					c1[1] + (c2[1] - c1[1]) * t + 0.5 | 0,
					c1[2] + (c2[2] - c1[2]) * t + 0.5 | 0,
					+(c1[3] + (c2[3] - c1[3]) * t).toFixed(2)
				];
			}
		}
	},

	update: function(){
		// this.binds.forEach(elem => elem.update());
		this.context.update();
		return this;
	},

	toCanvasStyle: function(ctx, element){
		return Gradient.types[this.type].toCanvasStyle.call(this, ctx, element);
	}
});

Gradient.parseColors = function(colors){
	if(!Array.isArray(colors)){
		return colors;
	}

	var stops = {},
		step = 1 / (colors.length - 1);
	colors.forEach(function(color, i){
		stops[step * i] = color;
	});
	return stops;
};

// Linear and radial gradient species
Gradient.types = {
	// todo: allow to pass promises (add light promises fallback into Delta)
	linear: {
		attrHooks: {
			from: {
				set: function(value){
					this.update();
					return value;
				}
			},
			to: {
				set: function(value){
					this.update();
					return value;
				}
			}
		},

		toCanvasStyle: function(ctx, element){
			return this.context.renderer.makeGradient(
				this.context,
				'linear',
				element.corner(this.attrs.from),
				element.corner(this.attrs.to),
				this.attrs.colors
			);
		}
	},

	radial: {
		initialize: function(){
			// from-to -> radius, center, etc
			if(this.attrs.from && Array.isArray(this.attrs.from)){
				this.attrs.startRadius = this.attrs.from[2] || 0;
				this.attrs.from = this.attrs.from.slice(0, 2);
			} else {
				if(!this.attrs.from){
					this.attrs.from = 'center';
				}
				this.attrs.startRadius = 0;
			}

			if(this.attrs.to && Array.isArray(this.attrs.to)){
				this.attrs.radius = this.attrs.to[2] || 'auto';
				this.attrs.to = this.attrs.to.slice(0, 2);
			} else {
				if(!this.attrs.to){
					this.attrs.to = this.attrs.from;
				}
				this.attrs.radius = 'auto';
			}
		},

		attrHooks: {
			from: {
				set: function(value){
					if(Array.isArray(value) && value.length > 2){
						this.attrs.startRadius = value[2];
						value = value.slice(0, 2);
					}
					this.update();
					return value;
				}
			},

			to: {
				set: function(value){
					if(Array.isArray(value) && value.length > 2){
						this.attrs.radius = value[2];
						value = value.slice(0, 2);
					}
					this.update();
					return value;
					// returns do not work!
				}
			},

			radius: {
				set: function(value){
					this.update();
					return value;
				}
			},

			startRadius: {
				set: function(value){
					this.update();
					return value;
				}
			}
		},

		toCanvasStyle: function(ctx, element){
			var from = element.corner(this.attrs.from),
				to = element.corner(this.attrs.to);

			return this.context.renderer.makeGradient(
				this.context,
				'radial',
				[from[0], from[1], this.attrs.startRadius],
				[to[0], to[1], this.attrs.radius === 'auto' ? element.bounds().height : this.attrs.radius],
				this.attrs.colors
			);
		}
	}
};

Delta.Gradient = Gradient;
// {{dont include GradientDiamond.js}}

Pattern = new Class({
	initialize: function(image, repeat, context){
		this.image = Picture.parse(image);
		this.repeat = repeat;
		this.context = context;

		this.image.addEventListener('load', function(e){
			this.update();

			if(this.image.blob){
				domurl.revokeObjectURL(blob);
			}
		}.bind(this));

		// todo: error process
		// todo: check imageSmoothingEnabled, imageSmoothingQuality
	},

	update: function(){
		this.context.update();
		return this;
	},

	toCanvasStyle: function(ctx){
		if(!this.image.complete){
			return 'transparent';
		}

		return ctx.createPattern(this.image, this.repeat || 'repeat');
	}
});

// https://developer.mozilla.org/en-US/docs/Web/API/CanvasPattern/setTransform

Delta.Pattern = Pattern;

// {{dont include Animation.Along.js}}
// {{dont include Animation.Morph.js}}

// {{dont include Context.WebGL.js}}
// {{dont include Rect.WebGL.js}}
// {{dont include Path.WebGL.js}}

// {{dont include Editor.js}}
// {{dont include Editor.Draggable.js}}
// {{dont include Editor.Transform.js}}

// {{dont include SVGExport.js}}

// {{dont include CurveGradient.js}}
// {{dont include EnhancedShadows.js}}

// {{dont include Intersections.js}}

// {{dont include MouseEvents.js}}

/* Context.prototype.push = function(element){
	element.context = this;
	this.elements.push(element);

	if(element.draw){
		// может, this.draw(element) ?
		var ctx = this.context;
		ctx.save();
		if(this.matrix){
			ctx.setTransform(
				this.matrix[0],
				this.matrix[1],
				this.matrix[2],
				this.matrix[3],
				this.matrix[4],
				this.matrix[5]
			);
		} else {
			ctx.setTransform(1, 0, 0, 1, 0, 0);
		}
		element.draw(ctx);
		ctx.restore();
	}

	element.update = element.updateFunction;

	return element;
};

// clip inside:

/* ctx.fillStyle = 'red';
ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)';
ctx.lineWidth = 50;

ctx.beginPath();
ctx.moveTo(280, 200);
ctx.arc(200, 200, 80, 0, 6.29);
ctx.fill();

if(1){
ctx.beginPath();
ctx.moveTo(280, 200);
ctx.arc(200, 200, 80, 0, 6.29);
ctx.lineTo(500, 200);
ctx.lineTo(500, 0);
ctx.lineTo(0, 0);
ctx.lineTo(0, 500);
ctx.lineTo(0, 500);
ctx.lineTo(500, 500);
ctx.lineTo(500, 200);
	ctx.clip();
}
ctx.beginPath();
ctx.moveTo(280, 200);
ctx.arc(200, 200, 80, 0, 6.29);
ctx.stroke();
 */

// shadow inside (works only with paths):

/* ctx.fillStyle = 'blue';
ctx.fillRect(10, 10, 200, 200);

ctx.fillStyle = 'red';
ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)';
ctx.lineWidth = 50;

ctx.beginPath();
ctx.moveTo(280, 200);
ctx.arc(200, 200, 80, 0, 6.29);
ctx.fill();
ctx.clip();

if(1){
var coef = 1000;
ctx.translate(0, -coef);
ctx.shadowOffsetX = 0;
ctx.shadowOffsetY = 5 + coef;
ctx.shadowBlur = 10;
ctx.shadowColor = 'black';
ctx.fillStyle = 'rgba(255, 255, 255, 1)';
ctx.beginPath();
ctx.moveTo(280, 200);
ctx.arc(200, 200, 80, 0, 6.29);
ctx.lineTo(500, 200);
ctx.lineTo(500, 0);
ctx.lineTo(0, 0);
ctx.lineTo(0, 500);
ctx.lineTo(0, 500);
ctx.lineTo(500, 500);
ctx.lineTo(500, 200);
ctx.fill();
} */


Delta.version = "1.9.0";

Delta.query = function(query, context, index, element){
	if(query + '' === query){
		query = (element || document).querySelectorAll(query)[index || 0];
	}
	return new Delta.contexts[context || '2d'](query.canvas || query);
};

Delta.id = function(id, context){
	return new Delta.contexts[context || '2d'](document.getElementById(id));
};

if(typeof module === 'object' && typeof module.exports === 'object'){
	module.exports = Delta;
} else if(typeof define === 'function' && define.amd){
	define('Delta', [], function(){
		return Delta;
	});
} else if(window) {
	window.Delta = Delta;
	// if (typeof global === 'object') global.Delta = Delta;
} else {
	/* try {
		export default Delta;
	} catch(e){
		;
	} */
}

})(typeof window !== 'undefined' ? window : this);