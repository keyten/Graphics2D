/*  Graphics2D Core 1.9.0
 *
 *  Author: Dmitriy Miroshnichenko aka Keyten <ikeyten@gmail.com>
 *  Last edit: 02.12.2017
 *  License: MIT / LGPL
 */

(function(window, undefined){

// The main graphics2D class
var Delta = {},

// Classes
	Context,
	Drawable, // todo: var DOMImage = Image, Image = class...
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
	extend = Object.assign ? Object.assign : function(dest, source){
		var keys = Object.keys(source),
			l = keys.length;
		while(l--){
			dest[keys[l]] = source[keys[l]];
		}
		return dest;
	}, // Object.assign is not deep as well as the polyfill

// DOM
	eventsToInteract = [
		// mouse
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
		'focus',
		// keyboard
		'keypress',
		'keydown',
		'keyup',
		// touch
		'touchstart',
		'touchmove',
		'touchend',
		'touchcancel',
		// pointer
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
	this.x2 = x + w;
	this.y2 = y + h;
	this.cx = x + w / 2;
	this.cy = y + h / 2;
}

Delta.bounds = function(x, y, width, height){
	return new Bounds(x, y, width, height);
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

Delta.class = Class;
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

Delta.renderers['2d'] = {

	// renderer.init(g2dcontext, canvas);
	init: function(delta, canvas){
		delta.context = canvas.getContext('2d');
		delta.cache = {}; // for gradients
	},

	preRedraw: function(ctx, delta){
		ctx.save();
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
		if(delta.matrix){
			ctx.setTransform.apply(ctx, delta.matrix);
		}
	},

	preDraw: function(ctx, delta){
		ctx.save();
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		if(delta.matrix){
			ctx.setTransform.apply(ctx, delta.matrix);
		}
	},

	postDraw: function(ctx){
		ctx.restore();
	},

	// params = [cx, cy, radius]
	drawCircle: function(params, ctx, style, matrix, object){
		this.pre(ctx, style, matrix, object);
		ctx.beginPath();
		ctx.arc(params[0], params[1], Math.abs(params[2]), 0, Math.PI * 2, true);
		this.post(ctx, style);
	},

	// params = [x, y, width, height]
	drawRect: function(params, ctx, style, matrix, object){
		this.pre(ctx, style, matrix, object);
		if(style.fillStyle){
			ctx.fillRect(params[0], params[1], params[2], params[3]);
		}
		if(style.strokeStyle){
			ctx.strokeRect(params[0], params[1], params[2], params[3]);
		}
		ctx.restore();
	},

	// params is an array of curves
	drawPath: function(params, ctx, style, matrix, object){
		this.pre(ctx, style, matrix, object);
		if(params[1] || params[2]){
			ctx.translate(params[1] || 0, params[2] || 0);
		}
		ctx.beginPath();
		params[0].forEach(function(curve){
			curve.process(ctx);
		});
		this.post(ctx, style);
	},

	// params = [image, x, y]
	// params = [image, x, y, w, h]
	// params = [image, x, y, w, h, cx, cy, cw, ch]
	drawImage: function(params, ctx, style, matrix, object){
		this.pre(ctx, style, matrix, object);
		switch(params.length){
			// with size
			case 5: {
				ctx.drawImage(params[0], params[1], params[2], params[3], params[4]);
			} break;

			// with size & crop
			case 9: {
				ctx.drawImage(
					params[0],
					params[5], params[6],
					params[7], params[8],

					params[1], params[2],
					params[3], params[4]
				);
			} break;

			// without size
			default: {
				ctx.drawImage(params[0], params[1], params[2]);
			} break;
		}
		ctx.restore();
	},

	drawData: function(params, ctx, style, matrix, object){
		ctx.putImageData(params[0], params[1], params[2]);
	},

	// params = [text, x, y]
	drawTextLines: function(params, ctx, style, matrix, object){
		this.pre(ctx, style, matrix, object);
		var func;
		if(style.fillStyle && !style.strokeStyle){
			func = function(line){
				ctx.fillText(line.text, params[1], params[2] + line.y);
			};
		} else if(style.fillStyle){
			func = function(line){
				ctx.fillText(line.text, params[1], params[2] + line.y);
				ctx.strokeText(line.text, params[1], params[2] + line.y);
			};
		} else {
			func = function(line){
				ctx.strokeText(line.text, params[1], params[2] + line.y);
			};
		}
		params[0].forEach(func);
		ctx.restore();
	},

	// params = [text, x, y]
	drawText: function(params, ctx, style, matrix, object){
		this.pre(ctx, style, matrix, object);
		// lolwat
		// why did i do that
		if(style.fillStyle && !style.strokeStyle){
			ctx.fillText(params[0], params[1], params[2], params[3]);
		} else if(style.fillStyle){
			ctx.fillText(params[0], params[1], params[2]);
			ctx.strokeText(params[0], params[1], params[2]);
		} else {
			ctx.strokeText(params[0], params[1], params[2]);
		}
		ctx.restore();
	},

	makeGradient: function(delta, type, from, to, colors){
		var hash;
		if(delta.useCache){
			hash = this.hashGradient(type, from, to, colors);
			if(delta.cache[hash]){
				return delta.cache[hash];
			}
		}

		var grad;
		if(type === 'linear'){
			grad = delta.context.createLinearGradient(from[0], from[1], to[0], to[1]);
		} else {
			grad = delta.context.createRadialGradient(from[0], from[1], from[2], to[0], to[1], to[2]);
		}

		Object.keys(colors).forEach(function(offset){
			grad.addColorStop(offset, colors[offset]);
		});

		if(delta.useCache){
			delta.cache[hash] = grad;
		}

		return grad;
	},

	// with caching works in chromes worser
	hashGradient: function(type, from, to, colors){
		var hash;
		colors = JSON.stringify(colors);

		if(type === 'linear'){
			if(from[0] === to[0]){
				hash = ['ver', from[1], to[1], colors];
			} else if(from[1] === to[1]){
				hash = ['hor', from[0], to[0], colors];
			} else {
				hash = [from[0], from[1], to[0], to[1], colors];
			}
		} else {
			hash = [
				from[0], from[1], from[2],
				to[0], to[1], to[2],
				colors
			];
		}

		return hash.join(';');
	},

	pre: function(ctx, style, matrix, object){
		ctx.save();

		// styles
		Object.keys(style).forEach(function(key){
			ctx[key] = style[key];
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
		if(object.attrs.clip){
			if(object.attrs.clip.matrix){
				ctx.save();
				ctx.transform.apply(ctx, object.attrs.clip.matrix);
				object.attrs.clip.processPath(ctx);
				ctx.restore();
			} else {
				object.attrs.clip.processPath(ctx);
			}
			ctx.clip();
		}

		if(matrix){
			ctx.transform(
				matrix[0], matrix[1], matrix[2],
				matrix[3], matrix[4], matrix[5]
			);
		}
	},

	post: function(ctx, style){
		if(style.fillStyle){
			ctx.fill();
		}
		if(style.strokeStyle){
			ctx.stroke();
		}
		ctx.restore();
	},

	// text
	_currentMeasureContext: null,
	preMeasure: function(font){
		this._currentMeasureContext = getTemporaryCanvas(1, 1).getContext('2d');
		this._currentMeasureContext.save();
		this._currentMeasureContext.font = font;
	},
	measure: function(text){
		return this._currentMeasureContext.measureText(text).width;
	},
	postMeasure: function(){
		this._currentMeasureContext.restore();
		this._currentMeasureContext = null;
	}
};

var Context;

Context = function(canvas){
	this.canvas    = canvas;
	this.context   = canvas.getContext('2d');
	this.elements  = [];
	this.listeners = {};
	this.attrs = {
		transform: 'attributes'
	};
	this.cache = {};

// rudiment
	this.renderer = Delta.renderers['2d'];

	// why not updateNow = ...?
	this.updateNowBounded = this.updateNow.bind(this);
};

Context.prototype = {

	// Elements
	object: function(object){
		return this.push(extend(new Drawable(), object));
	},

	rect: function(){
		return this.push(new Rect(arguments, this));
	},

	circle: function(){
		return this.push(new Circle(arguments, this));
	},

	path: function(){
		return this.push(new Path(arguments, this));
	},

	image: function(){
		return this.push(new Picture(arguments, this));
	},

	text: function(){
		return this.push(new Text(arguments, this));
	},

	// Path slices
	line: function(fx, fy, tx, ty, stroke){
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
	useCache: false,
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
	},

	update : function(){
		if(this._willUpdate){
			return;
		}

		this._willUpdate = true;
		requestAnimationFrame(this.updateNowBounded);
	},

	updateNow : function(){
		var ctx = this.context;
		ctx.save();
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
		var transform = this.getTransform();
		var dpi = this.attrs.dpi || 1;
		if(!Delta.isIdentityTransform(transform)){
			ctx.setTransform(transform[0] / dpi, transform[1], transform[2], transform[3] / dpi, transform[4], transform[5]);
		} else if(dpi !== 1){
			ctx.setTransform(1 * dpi, 0, 0, 1 * dpi, 0, 0);
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
	hoverElement : null,
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
	},

	// translates screen coords to context coords
	contextCoords: function(x, y){
		var coords = Delta.coordsOfElement(this.canvas);
		return [x - coords.x, y - coords.y];
	},

	// Attrs
	attr: Class.attr,
	attrHooks: {
		width: {
			get: function(){
				return this.canvas.width;
			},
			set: function(value){
				this.canvas.width = value;
				this.canvas.style.width = this.canvas.width / (this.attrs.dpi || 1) + 'px';
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

		// smooth: changing image-rendering css property

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
	},

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

eventsToInteract.forEach(function(eventName){
	if(!Context.prototype.eventsHooks[eventName]){
		Context.prototype.eventsHooks[eventName] = function(){
			this.listenerCanvas(eventName);
		};
	}

	Context.prototype[eventName] = function(callback){
		return this[
			typeof callback === 'function' || callback + '' === callback ? 'on' : 'fire'
		].apply(this, [eventName].concat(slice.call(arguments)));
	};
});

Delta.Context = Context;

Delta.contexts = {
	'2d': Context
};

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
	extend(this, attrs); // todo: deepExtend neccessary?
}

Drawable = new Class({
	initialize: function(args){
		this.listeners = {};
		this.styles = {};
		this.cache = {};
		this.attrs = {
			interaction: true,
			visible: true,
			transform: 'attributes'
		};
	},

	// actual update function
	updateFunction: function(){
		if(this.context){
			this.context.update();
		}
		return this;
	},

	// update function for the state before the first draw
	update: function(){
		return this;
	},

	clone : function(attrs, styles, events){
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
	attr: Class.attr,

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
				return this.styles.fillStyle;
			},
			set: function(value){
				// if(oldValue is gradient) oldValue.unbind(this);
				this.styles.fillStyle = value;
				this.update();
			}
		},

		stroke: {
			set: function(value){
				Drawable.processStroke(value, this.styles);
				this.update();
			}
		},

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
	},

	// Transforms
	getTransform: function(){
		if(this.cache.transform){
			return this.cache.transform;
		}

		var matrix = Delta.parseTransform(this.attrs, this);
		this.cache.transform = matrix;
		return matrix;
	},

	processObject: function(object, arglist){
		['opacity', 'composite', 'clip', 'visible', 'interaction',
		'z', 'transform', 'transformOrder', 'rotate', 'skew', 'scale'].forEach(function(prop){
			if(object[prop] !== undefined){
				this.attr(prop, object[prop]);
			}
		}, this);

		return arglist.map(function(name){
			return object[name];
		});
	},

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
	bounds: function(rect, transform, around){
		// todo:
		// 'rough' / 'precise'
		// 'stroke-with' / 'stroke-out'
		// 'clip-exclude'
		// 'self' / 'transformed' / 'tight'
		// self - only self transforms
		// transformed - self & context

		// example: 'rough tight'

		if((around === 'fill' || !around) && this.styles.strokeStyle){
			var weight = (this.styles.lineWidth || 1) / 2;
			if(around === 'strokeExclude'){
				weight = -weight;
			}
			rect[0] -= weight;
			rect[1] -= weight;
			rect[2] += weight * 2;
			rect[3] += weight * 2;
		}

		if(transform !== false && this.matrix){
			var tight = [
				// left top
				Delta.transformPoint(this.matrix, [rect[0], rect[1]]),
				// right top
				Delta.transformPoint(this.matrix, [rect[0] + rect[2], rect[1]]),
				// left bottom
				Delta.transformPoint(this.matrix, [rect[0], rect[1] + rect[3]]),
				// right bottom
				Delta.transformPoint(this.matrix, [rect[0] + rect[2], rect[1] + rect[3]])
			];

			if(transform === 'tight'){
				return tight;
			}

			rect[0] = Math.min(tight[0][0], tight[1][0], tight[2][0], tight[3][0]);
			rect[1] = Math.min(tight[0][1], tight[1][1], tight[2][1], tight[3][1]);
			rect[2] = Math.max(tight[0][0], tight[1][0], tight[2][0], tight[3][0]) - rect[0];
			rect[3] = Math.max(tight[0][1], tight[1][1], tight[2][1], tight[3][1]) - rect[1];
		}

		return new Bounds(rect[0], rect[1], rect[2], rect[3]);
	},

	corner : function(corner, bounds){
		// todo: remove
		if(Array.isArray(corner)){
			return corner;
		}

		bounds = bounds instanceof Bounds ? bounds : this.bounds(bounds);
		return [
			bounds.x + bounds.w * Delta.corners[corner][0],
			bounds.y + bounds.h * Delta.corners[corner][1]
		];
	},

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
	},

	// Drawing (2D Context)
	preDraw: function(ctx){
		ctx.save();

		var style = this.styles;
		// styles
		// note1: we might cache Object.keys
		// note2: we should hold gradients / patterns in attrs not in styles
		Object.keys(style).forEach(function(key){
			ctx[key] = style[key];
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
		}
	},

	postDraw: function(ctx){
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
		if(style.fillStyle){
			ctx.fill(this.attrs.fillRule);
		}
		if(style.strokeStyle){
			ctx.stroke();
		}
		ctx.restore();
	},

	// Rasterization
	toDataURL: function(type, bounds){
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

	toBlob: function(type, quality, bounds, callback){
		;
	},

	toImageData: function(bounds){
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
	animate: function(attr, value, options){
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

	pause: function(name){
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

	continue: function(name){
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

});

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

Delta.Drawable = Drawable;

// events aliases
eventsToInteract.forEach(function(eventName){
	Drawable.prototype[eventName] = Context.prototype[eventName];
});

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

	initialize : function(args, context){
		this.super('initialize', arguments);

		if(isObject(args[0])){
			args = this.processObject(args[0], Rect.args);
		}

		this.attrs.x = args[0];
		this.attrs.y = args[1];
		this.attrs.width = args[2];
		this.attrs.height = args[3];
		if(args[4]){
			this.styles.fillStyle = args[4];
		}
		if(args[5]){
			this.attrs.stroke = args[5];
			Drawable.processStroke(args[5], this.styles);
		}
	},

	attrHooks: new DrawableAttrHooks({
		x: {
			set: function(value){
				this.update();
			}
		},
		y: {
			set: function(value){
				this.update();
			}
		},
		width: {
			set: function(value){
				this.update();
			}
		},
		height: {
			set: function(value){
				this.update();
			}
		},

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

	bounds: function(transform, around){
		return this.super('bounds', [
			[this.attrs.x, this.attrs.y, this.attrs.width, this.attrs.height],
			transform, around
		]);
	},

	draw : function(ctx){
		if(this.attrs.visible){
			this.preDraw(ctx);

			if(this.styles.fillStyle){
				ctx.fillRect(
					this.attrs.x,
					this.attrs.y,
					this.attrs.width,
					this.attrs.height
				);
			}
			if(this.styles.strokeStyle){
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

Rect.args = ['x', 'y', 'width', 'height', 'fill', 'stroke'];
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

	initialize : function(args, context){
		this.super('initialize', arguments);

		if(isObject(args[0])){
			args = this.processObject(args[0], Circle.args);
		}

		this.attrs.cx = args[0];
		this.attrs.cy = args[1];
		this.attrs.radius = args[2];
		if(args[3]){
			this.styles.fillStyle = args[3];
		}
		if(args[4]){
			this.attrs.stroke = args[4];
			Drawable.processStroke(args[4], this.styles);
		}
	},

	attrHooks: new DrawableAttrHooks({
		cx: {
			set: function(value){
				this.update();
			}
		},
		cy: {
			set: function(value){
				this.update();
			}
		},
		radius: {
			set: function(value){
				this.update();
			}
		}
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

	bounds: function(transform, around){
		return this.super('bounds', [
			[this.attrs.cx - this.attrs.radius, this.attrs.cy - this.attrs.radius, this.attrs.radius * 2, this.attrs.radius * 2],
			transform, around
		]);
	},

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
	argList.forEach(function(arg, i){
		attrHooks[arg] = {
			get: function(){
				return this.attrs.args[i];
			},
			set: function(value){
				this.attrs.args[i] = value;
				this.update();
			}
		};
	});
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
Curve.epsilon = 0.0001;
Curve.detail = 10;
		// слишком многословно
		// надо сделать во всём модуле локальную переменную для canvasFunctions
		// а мб и для отдельных её элементов

// Curve utilities
extend(Curve.prototype, {
	// renamed from before
	prev: function(){
		if(!this.path){
			return null;
		}

		var d = this.path.attr('d');
		var index = d.indexOf(this);

		if(index < 1){
			return null;
		}
		return d[index - 1];
	},

	next: function(){
		if(!this.path){
			return null;
		}

		var d = this.path.attr('d');
		var index = d.indexOf(this);

		if(index === d.length - 2){
			return null;
		}
		return d[index + 1];
	}
});

// General Curve methods
extend(Curve.prototype, {
	tangentAt: function(t, epsilon, startPoint){
		// supports canvas curves
		if(Curve.canvasFunctions[this.method] && Curve.canvasFunctions[this.method].tangentAt){
			return Curve.canvasFunctions[this.method].tangentAt(this, startPoint);
		}

		if(!epsilon){
			epsilon = Curve.epsilon;
		}

		var t1 = t - epsilon,
			t2 = t + epsilon;

		if(t1 < 0){
			t1 = 0;
		}
		if(t2 > 1){
			t2 = 1;
		}

		var point1 = this.pointAt(t1, startPoint),
			point2 = this.pointAt(t2, startPoint);

		return Math.atan2(point2[1] - point1[1], point2[0] - point1[0]) * 180 / Math.PI;
	},

	normalAt: function(t, epsilon, startPoint){
		return this.tangentAt(t, epsilon, startPoint) - 90;
	},

	flatten: function(detail, start){
		if(!start){
			start = this.startAt();
		}

		var lines = [];

		for(var i = 1; i <= detail; i++){
			lines.push(
				Delta.curve('lineTo', this.pointAt(i / detail, start), this.path)
			);
		}

		var curves = this.path.attr('d');
		curves.splice.apply(curves, [curves.indexOf(this), 1].concat(lines));
		this.path.attr('d', curves);
		return this;
	},

	// like reduce
	// todo: check if this function neccessary
	approx: function(detail, func, value){
		var startPoint = this.startAt();
		var lastPoint = startPoint;
		for(var i = 1; i <= detail; i++){
			value = func(value, lastPoint, lastPoint = this.pointAt(i / detail, startPoint), i);
		}
		return value;
	},

	length: function(detail, startPoint){
		// supports canvas curves
		if(Curve.canvasFunctions[this.method] && Curve.canvasFunctions[this.method].length){
			return Curve.canvasFunctions[this.method].length(this, startPoint);
		}

		if(!detail){
			detail = Curve.detail;
		}

		// http://pomax.github.io/bezierinfo/legendre-gauss.html#n2
		var lengthIntegrate = this.lengthIntegrate || (Curve.canvasFunctions[this.method] && Curve.canvasFunctions[this.method].lengthIntegrate);
		if(lengthIntegrate){
			// We use legendre-gauss approximation
			return integrate(lengthIntegrate, 0, 1, detail);
		} else {
			// We just approximate the curve with lines
		}

		var length = 0,
			lastPoint = startPoint || this.startAt(),
			point;
		for(var i = 1; i <= detail; i++){
			point = this.pointAt(i / detail);
			length += Math.sqrt(Math.pow(point[1] - lastPoint[1], 2) + Math.pow(point[0] - lastPoint[0], 2));
			lastPoint = point;
		}
		return length;
	},

	nearest: function(x, y, detail, startPoint){
		// supports canvas curves
		if(Curve.canvasFunctions[this.method] && Curve.canvasFunctions[this.method].nearest){
			return Curve.canvasFunctions[this.method].nearest(this, startPoint);
		}

		if(!detail){
			detail = Curve.detail;
		}

		if(!startPoint){
			startPoint = this.startAt();
		}

		// todo: gradient descent
		var point,
			min = Infinity,
			minPoint,
			minI,
			distance;
		for(var i = 0; i <= detail; i++){
			point = this.pointAt(i / detail, startPoint);
			distance = Math.sqrt(Math.pow(point[0] - x, 2) + Math.pow(point[1] - y, 2));
			if(distance < min){
				minPoint = point;
				minI = i;
				min = distance;
			}
		}

		return {
			point: minPoint,
			t: minI / detail,
			distance: min
		};
	},

	bounds: function(startPoint, detail){
		if(!startPoint){
			startPoint = this.startAt();
		}

		// supports canvas curves
		if(Curve.canvasFunctions[this.method].bounds){
			return Curve.canvasFunctions[this.method].bounds(startPoint, this.attrs.args);
		}

		if(!detail){
			detail = Curve.detail;
		}

		// todo: how about binary search?

		var point,

			minX = Infinity,
			minY = Infinity,
			maxX = -Infinity,
			maxY = -Infinity;

		for(var t = 0; t <= detail; t++){
			point = this.pointAt(t / detail, startPoint);
			if(minX > point[0]){
				minX = point[0];
			}
			if(minY > point[1]){
				minY = point[1];
			}
			if(maxX < point[0]){
				maxX = point[0];
			}
			if(maxY < point[1]){
				maxY = point[1];
			}
		}

		return [minX, minY, maxX, maxY];
	},

	intersections: function(curve){
		;
	}
});

// Canvas Curve methods
extend(Curve.prototype, {
	pointAt: function(t, startPoint){
		var fn = Curve.canvasFunctions[this.method];

		if(fn && fn.pointAt){
			return fn.pointAt(this, t, startPoint);
		}

		throw "The method \"pointAt\" is not supported for \"" + this.method + "\" curves";
	},

	splitAt: function(t, startPoint){
		var fn = Curve.canvasFunctions[this.method];

		if(fn && fn.splitAt){
			return fn.splitAt(this, t, startPoint);
		}

		throw "The method \"splitAt\" is not supported for \"" + this.method + "\" curves";
	}
});

// MoveTo
extend(Curve.canvasFunctions.moveTo, {
	pointAt: function(curve, t, startPoint){
		return curve.attrs.args;
	},

	length: function(){
		return 0;
	}
});

// LineTo
extend(Curve.canvasFunctions.lineTo, {
	pointAt: function(curve, t, startPoint){
		if(!startPoint){
			startPoint = curve.startAt();
		}
		return [
			startPoint[0] + t * (curve.attrs.args[0] - startPoint[0]),
			startPoint[1] + t * (curve.attrs.args[1] - startPoint[1]),
		];
	},

	tangentAt: function(curve, startPoint){
		if(!startPoint){
			startPoint = curve.startAt();
		}
		// x = x0 + (x1 - x0)t
		// y = y0 + (y1 - y0)t
		return Math.atan2(curve.attrs.args[1] - startPoint[1], curve.attrs.args[0] - startPoint[0]) / Math.PI * 180;
	},

	splitAt: function(curve, t, startPoint){
		if(!startPoint){
			startPoint = curve.startAt();
		}

		var point = Curve.canvasFunctions.lineTo.pointAt(curve, t, startPoint);
		return {
			start: [
				startPoint,
				point
			],
			end: [
				point,
				[curve.attrs.args[0], curve.attrs.args[1]]
			]
		};
	},

	length: function(curve, startPoint){
		if(!startPoint){
			startPoint = curve.startAt();
		}

		var dx = curve.attrs.args[0] - startPoint[0],
			dy = curve.attrs.args[1] - startPoint[1];

		return Math.sqrt(dx * dx + dy * dy);
	}
});

// QuadraticCurveTo
extend(Curve.canvasFunctions.quadraticCurveTo, {
	pointAt: function(curve, t, startPoint){
		if(!startPoint){
			startPoint = curve.startAt();
		}
		var i = 1 - t;
		return [
			i * i * startPoint[0] + 2 * t * i * curve.attrs.args[0] + t * t * curve.attrs.args[2],
			i * i * startPoint[1] + 2 * t * i * curve.attrs.args[1] + t * t * curve.attrs.args[3],
		];
	},

	tangentAt: function(curve, startPoint){
		if(!startPoint){
			startPoint = curve.startAt();
		}
	},

	splitAt: function(curve, t, startPoint){
		if(!startPoint){
			startPoint = curve.startAt();
		}

		var i = 1 - t;
		var point = Curve.canvasFunctions.quadraticCurveTo.pointAt(curve, t, startPoint);
		return {
			start: [
				startPoint,
				[
					t * p[0] + i * startPoint[0],
					t * p[1] + i * startPoint[1]
				],
				point
			],
			end: [
				point,
				[
					t * p[2] + i * p[0],
					t * p[3] + i * p[1]
				],
				[
					p[2],
					p[3]
				]
			]
		};
	},

	// note: check a curve ([x, y, x, y, x, y])
	length: function(curve, startPoint){
		if(!startPoint){
			startPoint = curve.startAt();
		}

		var x0 = startPoint[0],
			y0 = startPoint[1],
			x1 = curve.attrs.args[0],
			y1 = curve.attrs.args[1],
			x2 = curve.attrs.args[2],
			y2 = curve.attrs.args[3],

			ax = x0 - 2 * x1 + x2,
			bx = x1 - x0,
			ay = y0 - 2 * y1 + y2,
			by = y1 - y0,

			A = ax * ax + ay * ay,
			B = ax * bx + ay * by,
			C = bx * bx + by * by;

		function integral(t){
			// the quadratic curve is just a straight line
			if(A * C === B * B){
				// note: works bad with lines where handle is not inside the line
				// from [0, 0], to [50, 50] with handle [100, 100] for ex.
				return 2 * Math.sqrt(A) * Math.abs(t * t / 2 + B * t / A);
			}

			return (
				(A * C - B * B) * Math.log(
					Math.sqrt(A) * Math.sqrt(A * t * t + 2 * B * t + C) + A * t + B
				) +
				Math.sqrt(A) * (A * t + B) * Math.sqrt(t * (A * t + 2 * B) + C)
			) / Math.pow(A, 3/2);
		}

		return integral(1) - integral(0);
	},

	bounds: function(startPoint, attrs){
		var x0 = startPoint[0],
			y0 = startPoint[1],
			hx = attrs[0],
			hy = attrs[1],
			x2 = attrs[2],
			y2 = attrs[3],
			tx = (x0 - hx) / (x2 - 2 * hx + x0),
			ty = (y0 - hy) / (y2 - 2 * hy + y0),
			extrX, extrY;

		if(tx >= 0 && tx <= 1){
			extrX = [
				Math.pow(1 - tx, 2) * x0 + 2 * (1 - tx) * tx * hx + tx * tx * x2,
				Math.pow(1 - tx, 2) * y0 + 2 * (1 - tx) * tx * hy + tx * tx * y2
			];
		}

		if(ty >= 0 && ty <= 1){
			extrY = [
				Math.pow(1 - ty, 2) * x0 + 2 * (1 - ty) * ty * hx + ty * ty * x2,
				Math.pow(1 - ty, 2) * y0 + 2 * (1 - ty) * ty * hy + ty * ty * y2
			];
		}

		return [
			Math.min(x0, x2, extrX ? extrX[0] : Infinity, extrY ? extrY[0] : Infinity),
			Math.min(y0, y2, extrX ? extrX[1] : Infinity, extrY ? extrY[1] : Infinity),
			Math.max(x0, x2, extrX ? extrX[0] : -Infinity, extrY ? extrY[0] : -Infinity),
			Math.max(y0, y2, extrX ? extrX[1] : -Infinity, extrY ? extrY[1] : -Infinity)
		];
	}
});

// BezierCurveTo
extend(Curve.canvasFunctions.bezierCurveTo, {
	pointAt: function(curve, t, startPoint){
		if(!startPoint){
			startPoint = curve.startAt();
		}
		var i = 1 - t;
		return [
			i * i * i * startPoint[0] + 3 * t * i * i * curve.attrs.args[0] + 3 * t * t * i * curve.attrs.args[2] + t * t * t * curve.attrs.args[4],
			i * i * i * startPoint[1] + 3 * t * i * i * curve.attrs.args[1] + 3 * t * t * i * curve.attrs.args[3] + t * t * t * curve.attrs.args[5]
		];
	},

	tangentAt: function(curve, startPoint){
		if(!startPoint){
			startPoint = curve.startAt();
		}
	},

	splitAt: function(curve, t, startPoint){
		if(!startPoint){
			startPoint = curve.startAt();
		}

		var i = 1 - t;
		var point = Curve.canvasFunctions.bezierCurveTo.pointAt(curve, t, startPoint);
		return {
			start: [
				startPoint,
				[
					t * p[0] + i * startPoint[0],
					t * p[1] + i * startPoint[1]
				],
				[
					t * t * p[2] + 2 * t * i * p[0] + i * i * startPoint[0],
					t * t * p[3] + 2 * t * i * p[1] + i * i * startPoint[1]
				],
				point
			],
			end: [
				point,
				[
					t * t * p[4] + 2 * t * i * p[2] + i * i * p[0],
					t * t * p[5] + 2 * t * i * p[3] + i * i * p[1]
				],
				[
					t * p[4] + i * p[2],
					t * p[5] + i * p[3]
				],
				[
					p[4],
					p[5]
				]
			]
		};
	},

	lengthIntegrate: function(t, startPoint){
		;
	},

	bounds: function(startPoint, attrs){
		var x0 = startPoint[0],
			y0 = startPoint[1],
			x1 = attrs[0],
			y1 = attrs[1],
			x2 = attrs[2],
			y2 = attrs[3],
			x3 = attrs[4],
			y3 = attrs[5],

			ax = 3 * (-x0 + 3 * x1 - 3 * x2 + x3),
			ay = 3 * (-y0 + 3 * y1 - 3 * y2 + y3),
			bx = 6 * (x0 - 2 * x1 + x2),
			by = 6 * (y0 - 2 * y1 + y2),
			cx = 3 * (x1 - x0),
			cy = 3 * (y1 - y0),

			dxrt = Math.sqrt(bx * bx - 4 * ax * cx),
			dyrt = Math.sqrt(by * by - 4 * ay * cy),

			extrX1, extrX2, extrY1, extrY2;

		function bezierPoint(t){
			return t >= 0 && t <= 1 && [
				Math.pow(1 - t, 3) * x0 + 3 * Math.pow(1 - t, 2) * t * x1 + 3 * (1 - t) * t * t * x2 + t * t * t * x3,
				Math.pow(1 - t, 3) * y0 + 3 * Math.pow(1 - t, 2) * t * y1 + 3 * (1 - t) * t * t * y2 + t * t * t * y3
			];
		}

		extrX1 = bezierPoint((-bx + dxrt) / (2 * ax));
		extrX2 = bezierPoint((-bx - dxrt) / (2 * ax));
		extrY1 = bezierPoint((-by + dyrt) / (2 * ay));
		extrY2 = bezierPoint((-by - dyrt) / (2 * ay));

		return [
			Math.min(x0, x3, extrX1 ? extrX1[0] : Infinity, extrX2 ? extrX2[0] : Infinity,
				extrY1 ? extrY1[0] : Infinity, extrY2 ? extrY2[0] : Infinity),
			Math.min(y0, y3, extrX1 ? extrX1[1] : Infinity, extrX2 ? extrX2[1] : Infinity,
				extrY1 ? extrY1[1] : Infinity, extrY2 ? extrY2[1] : Infinity),
			Math.max(x0, x3, extrX1 ? extrX1[0] : -Infinity, extrX2 ? extrX2[0] : -Infinity,
				extrY1 ? extrY1[0] : -Infinity, extrY2 ? extrY2[0] : -Infinity),
			Math.max(y0, y3, extrX1 ? extrX1[1] : -Infinity, extrX2 ? extrX2[1] : -Infinity,
				extrY1 ? extrY1[1] : -Infinity, extrY2 ? extrY2[1] : -Infinity)
		];
	}
});

// Flattening
extend(Curve.prototype.attrHooks, {
	flatten: {
		set: function(){
			this.update();
		}
	}
});

var oldCurveProcess = Curve.prototype.process;
Curve.prototype.process = function(ctx){
	if(!this.attrs.flatten){
		return oldCurveProcess.apply(this, arguments);
	}

	var detail = this.attrs.flatten;
	var start = this.startAt();
	var point;
	for(var i = 1; i <= detail; i++){
		point = this.pointAt(i / detail, start);
		ctx.lineTo(point[0], point[1]);
	}
};

// Legendre-Gauss integration
var abscissas = [
	[0.5773502691896257],
	[0, 0.7745966692414834],
	[0.33998104358485626, 0.8611363115940526],
	[0, 0.5384693101056831, 0.906179845938664],
	[0.2386191860831969, 0.6612093864662645, 0.932469514203152],
	[0, 0.4058451513773972, 0.7415311855993945, 0.9491079123427585],
	[0.1834346424956498, 0.525532409916329, 0.7966664774136267, 0.9602898564975363],
	[0, 0.3242534234038089, 0.6133714327005904, 0.8360311073266358, 0.9681602395076261],
	[0.14887433898163122, 0.4333953941292472, 0.6794095682990244, 0.8650633666889845, 0.9739065285171717],
	[0, 0.26954315595234496, 0.5190961292068118, 0.7301520055740494, 0.8870625997680953, 0.978228658146057],
	[0.1252334085114689, 0.3678314989981802, 0.5873179542866175, 0.7699026741943047, 0.9041172563704749, 0.9815606342467192],
	[0, 0.2304583159551348, 0.44849275103644687, 0.6423493394403402, 0.8015780907333099, 0.9175983992229779, 0.9841830547185881],
	[0.10805494870734367, 0.31911236892788974, 0.5152486363581541, 0.6872929048116855, 0.827201315069765, 0.9284348836635735, 0.9862838086968123],
	[0, 0.20119409399743451, 0.3941513470775634, 0.5709721726085388, 0.7244177313601701, 0.8482065834104272, 0.937273392400706, 0.9879925180204854],
	[0.09501250983763744, 0.2816035507792589, 0.45801677765722737, 0.6178762444026438, 0.755404408355003, 0.8656312023878318, 0.9445750230732326, 0.9894009349916499]
];

var weights = [
	[1],
	[0.8888888888888888, 0.5555555555555556],
	[0.6521451548625461, 0.34785484513745385],
	[0.5688888888888889, 0.47862867049936647, 0.23692688505618908],
	[0.46791393457269104, 0.3607615730481386, 0.17132449237917036],
	[0.4179591836734694, 0.3818300505051189, 0.27970539148927664, 0.1294849661688697],
	[0.362683783378362, 0.31370664587788727, 0.22238103445337448, 0.10122853629037626],
	[0.3302393550012598, 0.31234707704000286, 0.26061069640293544, 0.1806481606948574, 0.08127438836157441],
	[0.29552422471475287, 0.26926671930999635, 0.21908636251598204, 0.1494513491505806, 0.06667134430868814],
	[0.2729250867779006, 0.26280454451024665, 0.23319376459199048, 0.18629021092773426, 0.1255803694649046, 0.05566856711617366],
	[0.24914704581340277, 0.2334925365383548, 0.20316742672306592, 0.16007832854334622, 0.10693932599531843, 0.04717533638651183],
	[0.2325515532308739, 0.22628318026289723, 0.2078160475368885, 0.17814598076194574, 0.13887351021978725, 0.09212149983772845, 0.04048400476531588],
	[0.2152638534631578, 0.2051984637212956, 0.18553839747793782, 0.15720316715819355, 0.12151857068790319, 0.08015808715976021, 0.03511946033175186],
	[0.2025782419255613, 0.19843148532711158, 0.1861610000155622, 0.16626920581699392, 0.13957067792615432, 0.10715922046717194, 0.07036604748810812, 0.03075324199611727],
	[0.1894506104550685, 0.18260341504492358, 0.16915651939500254, 0.14959598881657674, 0.12462897125553388, 0.09515851168249279, 0.062253523938647894, 0.027152459411754096]
];

// ported with all the optimizations from paperjs
function integrate(f, a, b, n){
	var x = abscissas[n - 2],
		w = weights[n - 2],
		A = (b - a) * 0.5,
		B = A + a,
		i = 0,
		m = (n + 1) >> 1,
		sum = n & 1 ? w[i++] * f(B) : 0; // Handle odd n
	while (i < m) {
		var Ax = A * x[i];
		sum += w[i++] * (f(B + Ax) + f(B - Ax));
	}
	return A * sum;
}
var CurveCatmull = new Class(Curve, {
	initialize: function(method, attrs, path){
		this.super('initialize', arguments);
		if(!attrs[6]){
			this.attrs.args[6] = 0.5;
		}
	},

	attrHooks: new CurveAttrHooks({
		h1x: {
			set: function(value){
				this.attrs.args[0] = value;
				this.update();
			}
		},
		h1y: {
			set: function(value){
				this.attrs.args[1] = value;
				this.update();
			}
		},
		h2x: {
			set: function(value){
				this.attrs.args[2] = value;
				this.update();
			}
		},
		h2y: {
			set: function(value){
				this.attrs.args[3] = value;
				this.update();
			}
		},
		x: {
			set: function(value){
				this.attrs.args[4] = value;
				this.update();
			}
		},
		y: {
			set: function(value){
				this.attrs.args[5] = value;
				this.update();
			}
		},
		tension: {
			set: function(value){
				this.attrs.args[6] = value;
				this.update();
			}
		}
	}),

	pointAt: function(t, start){
		if(!start){
			start = this.startAt();
		}

		// P(t) = (2t³ - 3t² + 1)p0 + (t³ - 2t² + t)m0 + ( -2t³ + 3t²)p1 + (t³ - t²)m1
		// Где p0, p1 - центральные точки сплайна, m0, m1 - крайние точки сплайна: (m0 - p0 - p1 - m1)

		var args = this.attrs.args,
			x1 = start[0],
			y1 = start[1],
			h1x = args[0],
			h1y = args[1],
			h2x = args[2],
			h2y = args[3],
			x2 = args[4],
			y2 = args[5];

		return [
			0.5 * ((-h1x + 3 * x1 - 3 * x2 + h2x)*t*t*t
				+ (2 * h1x - 5 * x1 + 4 * x2 - h2x)*t*t
				+ (-x1 + x2) * t
				+ 2 * x1),
			0.5 * ((-h1y + 3 * y1 - 3 * y2 + h2y)*t*t*t
				+ (2 * h1y - 5 * y1 + 4 * y2 - h2y)*t*t
				+ (-y1 + y2) * t
				+ 2 * y1)
		];
	},

	endAt: function(){
		return [this.attrs.args[4], this.attrs.args[5]];
	},

	tangentAt: function(t, start){
		if(!start){
			start = this.startAt();
		}

		var args = this.attrs.args,
			x1 = start[0],
			y1 = start[1],
			h1x = args[0],
			h1y = args[1],
			h2x = args[2],
			h2y = args[3],
			x2 = args[4],
			y2 = args[5];

		return Math.atan2(
			0.5 * (3 * t * t * (-h1y + 3 * y1 - 3 * y2 + h2y)
				+ 2 * t * (2 * h1y - 5 * y1 + 4 * y2 - h2y)
				+ (-h1y + y2)),
			0.5 * (3 * t * t * (-h1x + 3 * x1 - 3 * x2 + h2x)
				+ 2 * t * (2 * h1x - 5 * x1 + 4 * x2 - h2x)
				+ (-h1x + x2))
		) / Math.PI * 180;
	},

	process: function(ctx){
		var start = this.startAt(),
			args = this.attrs.args,
			x1 = start[0],
			y1 = start[1],
			h1x = args[0],
			h1y = args[1],
			h2x = args[2],
			h2y = args[3],
			x2 = args[4],
			y2 = args[5];

		var bezier = catmullRomToCubicBezier(x1, y1, h1x, h1y, h2x, h2y, x2, y2, args[6]);
		ctx.bezierCurveTo(bezier[2], bezier[3], bezier[4], bezier[5], bezier[6], bezier[7]);
	}
});

function catmullRomToCubicBezier(x1, y1, h1x, h1y, h2x, h2y, x2, y2, tension){
	var catmull = [
		h1x, h1y, // 0, 1
		x1, y1, // 2, 3
		x2, y2, // 4, 5
		h2x, h2y // 6, 7
	];

	var bezier = [
		catmull[2], catmull[3],
		catmull[2] + (catmull[4] - catmull[0]) / (6 * tension),
		catmull[3] + (catmull[5] - catmull[1]) / (6 * tension),
		catmull[4] - (catmull[6] - catmull[2]) / (6 * tension),
		catmull[5] - (catmull[7] - catmull[3]) / (6 * tension),
		catmull[4], catmull[5]
	];

	return bezier;
}

// catmull rom is a special case of the hermite spline
function catmullRomToHermite(x1, y1, h1x, h1y, h2x, h2y, x2, y2){
	return {
		h0: [x1, y1], // start point
		h1: [x2, y2], // end point
		h2: [(x2 - h1x) / 2, (y2 - h1y) / 2], // derivative at start point
		h3: [(h2x - x1) / 2, (h2y - y1) / 2] // derivative at end point
	};
}

// возвращает то что можно запихнуть в path.push(...)
// надо научить быть closed (нужно чтобы первая и последняя точка равнялись)
Delta.Curve.catmullSpline = function(points, closed, tension){
	return points.map(function(point, i){
		if(i === 0){
			return point;
		}

		var prev = points[i - 2] || points[i - 1];
		var next = points[i + 1] || point;

		return [
			'catmullTo',
			prev[0], prev[1],
			next[0], next[1],
			point[0], point[1],
			tension
		];
	});
}

Delta.curves['catmullTo'] = CurveCatmull;
var CurveHermite = new Class(Curve, {
	initialize: function(method, attrs, path){
		this.super('initialize', arguments);
		// h1x, h1y, h2x, h2y, x, y, [detail]
	},

	attrHooks: new CurveAttrHooks({
		h1x: {
			set: function(value){
				this.attrs.args[4] = value;
				this.update();
			}
		},
		h1y: {
			set: function(value){
				this.attrs.args[5] = value;
				this.update();
			}
		},
		h2x: {
			set: function(value){
				this.attrs.args[0] = value;
				this.update();
			}
		},
		h2y: {
			set: function(value){
				this.attrs.args[1] = value;
				this.update();
			}
		},
		h3x: {
			set: function(value){
				this.attrs.args[2] = value;
				this.update();
			}
		},
		h3y: {
			set: function(value){
				this.attrs.args[3] = value;
				this.update();
			}
		}
	}),

	pointAt: function(t, start){
		if(!start){
			start = this.startAt();
		}

		var args = this.attrs.args,
			h0x = start[0],
			h0y = start[1],
			h2x = args[0],
			h2y = args[1],
			h3x = args[2],
			h3y = args[3],
			h1x = args[4],
			h1y = args[5];

		var a = [
			2 * h0x - 2 * h1x + h2x + h3x,
			2 * h0y - 2 * h1y + h2y + h3y
		];
		var b = [
			-3 * h0x + 3 * h1x - 2 * h2x - h3x,
			-3 * h0y + 3 * h1y - 2 * h2y - h3y
		];
		var c = [h2x, h2y];
		var d = [h0x, h0y]

		return [
			t * t * t * a[0] + t * t * b[0] + t * c[0] + d[0],
			t * t * t * a[1] + t * t * b[1] + t * c[1] + d[1]
		];
	},

	endAt: function(){
		return [this.attrs.args[4], this.attrs.args[5]];
	},

	tangentAt: function(t, start){
		/* if(!start){
			start = this.startAt();
		}

		var args = this.attrs.args,
			x1 = start[0],
			y1 = start[1],
			h1x = args[0],
			h1y = args[1],
			h2x = args[2],
			h2y = args[3],
			x2 = args[4],
			y2 = args[5];

		return Math.atan2(
			0.5 * (3*t * t * (-h1y + 3 * y1 - 3 * y2 + h2y)
				+ 2 * t * (2 * h1y - 5 * y1 + 4 * y2 - h2y)
				+ (-h1y + y2)),
			0.5 * (3 * t * t * (-h1x + 3 * x1 - 3 * x2 + h2x)
				+ 2 * t * (2 * h1x - 5 * x1 + 4 * x2 - h2x)
				+ (-h1x + x2))
		) / Math.PI * 180; */
	},

	process: function(ctx){
		this.approx(100, function(value, prev, cur, i){
			if(i === 0){
				ctx.moveTo(prev[0], prev[1]);
			}
			ctx.lineTo(cur[0], cur[1]);
		});
	}
});

// todo: hermite for a custom grid
// https://ru.wikipedia.org/wiki/Сплайн_Эрмита
// Delta.Path.hermiteGrid(points)
// возвращает то что можно запихнуть в path.push(...)

// Cardinal spline
// Ti = a * ( Pi+1 - Pi-1 )
// CatmullRom spline
// Ti = 0.5 * ( P i+1 - Pi-1 )

// Kochanek–Bartels spline:
// https://en.wikipedia.org/wiki/Kochanek–Bartels_spline

Delta.curves['hermiteTo'] = CurveHermite;
//# Bezier Curves
var GeneralBezier = new Class(Curve, {
	initialize: function(method, attrs, path){
		this.super('initialize', arguments);
		this.attrs.detail = 30;
	},

	attrHooks: new CurveAttrHooks({
		args: {
			set: function(value){
				this._x = this._y = null;
				this.update();
			}
		},

		detail: {
			set: function(value){
				this.update();
			}
		}
	}),

	_processCoords: function(){
		var x = [], y = [];
		this.attrs.args.forEach(function(coord, i){
			if(i % 2 === 0){
				x.push(coord);
			} else {
				y.push(coord);
			}
		});
		this._x = x;
		this._y = y;
	},

	pointAt: function(t, start){
		if(!start){
			start = this.startAt();
		}

		if(!this._x || !this._y){
			this._processCoords();
		}

		var x = [start[0]].concat(this._x),
			y = [start[1]].concat(this._y);

		return [
			bezier(x, t),
			bezier(y, t)
		];
	},

	endAt: function(){
		return this.attrs.args.slice(this.attrs.args.length - 2);
	},

	process: function(ctx){
		if(!this._x || !this._y){
			this._processCoords();
		}

		var start = this.startAt(),
			x = [start[0]].concat(this._x),
			y = [start[1]].concat(this._y),
			detail = this.attrs.detail;
			// сейчас при каждом вызове все координаты точек вычисляются заново
			// это тяжело
			// не нужно так

		ctx.moveTo(start[0], start[1]);

		for(var i = 1; i <= detail; i++){
			ctx.lineTo(
				// сейчас два вызова bezier -> два цикла
				// оптимизировать в один
				bezier(x, i / detail),
				bezier(y, i / detail)
			);
		}
	}
});

function factorial(n){
	if(n <= 1){
		return 1;
	}

	n++;

	var res = 1;
	while(--n){
		res *= n;
	}

	return res;
}

function C(i, m){
	return factorial(m) / (factorial(i) * factorial(m - i));
}

Delta.combinations = C;
Delta.factorial = factorial;

function bezier(points, t){
	var len = points.length,
		m = len - 1,
		i = 0,
		l = 1 - t,
		result = 0;
	for(; i < len; i++){
		result += C(i, m) * Math.pow(t, i) * Math.pow(l, m - i) * points[i];
	}
	return result;
}

Delta.curves['bezier'] = GeneralBezier;
var CurveLagrange = new Class(Curve, {
	initialize: function(method, attrs, path){
		this.super('initialize', arguments);
		this.attrs.detail = 30;
	},

	attrHooks: new CurveAttrHooks({
		args: {
			set: function(value){
				if(this.attrs.t && this.attrs.t.length * 2 !== value.length + 2){
					this.attrs.t = null;
				}
				this.update();
			}
		},

		// t for x / y can be divided but iam not sure its neccessary
		t: {
			get: function(){
				if(!this.attrs.t){
					var ts = [];
					var l = this.attrs.args.length / 2;
					for(var i = 0; i <= l; i++){
						ts.push(i / l);
					}
					return ts;
				}
				return this.attrs.t;
			},
			set: function(value){
				this.update();
			}
		},

		detail: {
			set: function(value){
				this.update();
			}
		}
	}),

	pointAt: function(t, start){
		if(!start){
			start = this.startAt();
		}

		if(t === 0){
			return start;
		} else if(t === 1){
			return this.endAt();
		}

		var ts = this.attr('t');
		var points = start.concat(this.attrs.args);
		var x = 0;
		var y = 0;
		for(var i = 0; i < points.length; i += 2){
			var pointIndex = i / 2;
			var basisVal = 1;
			for(var j = 0; j < ts.length; j++){
				if(j !== pointIndex){
					basisVal *= ((t - ts[j]) / (ts[pointIndex] - ts[j]));
				}
			}
			x += basisVal * points[i];
			y += basisVal * points[i + 1];
		}
		return [x, y];
	},

	endAt: function(){
		return this.attrs.args.slice(this.attrs.args.length - 2);
	},

	process: function(ctx){
		var start = this.startAt(),
			args = this.attrs.args,
			detail = this.attrs.detail;

		ctx.moveTo(start[0], start[1]);

		for(var i = 1; i <= detail; i++){
			var point = this.pointAt(i / detail);
			ctx.lineTo(point[0], point[1]);
		}
	}
});

function attrHooksProcess(attrName, i){
	CurveLagrange.prototype.attrHooks[attrName] = {
		get: function(){
			return this.attrs.args[i];
		},

		set: function(value){
			this.attrs.args[i] = value;
			this.update();
		}
	};
}

Delta.curves['lagrange'] = CurveLagrange;
/* GPL License
 * Ported from LibCanvas
 * "Artem Smirnov <art543484@ya.ru>"
 * "Shock <shocksilien@gmail.com>"
 * https://github.com/theshock/libcanvas/blob/master/Source/Plugins/Curves.js
 */
Delta.drawRibbonCurve = function(ctx, params){
	var step = params.step || 0.2;
	var prev = params.point(-step);
	var prevDrawPoints;
	var drawPoints;
	for(var t = -step; t < 1.02; t += step){
		var cur = params.point(t);
		drawPoints = getDrawPoints(prev, cur, 10, -1);
		if(t >= step){
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(prevDrawPoints[0].x, prevDrawPoints[0].y)
			ctx.lineTo(prevDrawPoints[1].x, prevDrawPoints[1].y);
			ctx.lineTo(drawPoints[1].x, drawPoints[1].y);
			ctx.lineTo(drawPoints[0].x, drawPoints[0].y);
			ctx.fillStyle = randcolor();
			ctx.fill();
			ctx.stroke();
		}
		prevDrawPoints = drawPoints;
		prev = cur;
	}
};

Curve.prototype.attrHooks.ribbon = {
	set: function(){
		this.update();
	}
};

Curve.prototype.attrHooks.ribbonGradient = {
	set: function(){
		this.update();
	}
};

// Curve работает на process; надо переопределять process и вызывать из него draw
var oldCurveDraw = Curve.prototype.draw;
Curve.prototype.draw = function(){
	if(!this.attrs.ribbon || !this.attrs.ribbonGradient || !this.pointAt){
		oldCurveDraw.apply(this, arguments);
	}
	// ...
};

// curve.attr('ribbon', true);
// curve.attr('ribbonGradient', ctx.gradient('ribbon', 'horizontal' / 'vertical', colors, tStart = 0, tEnd = 1, etc));

// or:
// path.attr('ribbon', true)
// path.attr('ribbonGradient', ...);
// В свою очередь, должен быть абстрактный (не привязанный к канвасу!) класс Gradient
function getDrawPoints(prev, cur, width, inverted){
	var w = cur.x - prev.x,
		h = cur.y - prev.y,
		dist = Math.sqrt(w * w + h * h),

		sin = h / dist,
		cos = w / dist,

		dx = sin * width,
		dy = cos * width;

	return [{
		x: cur.x + dx,
		y: cur.y + dy * inverted
	}, {
		x: cur.x - dx,
		y: cur.y - dy * inverted
	}];
}


function abc() {

// The following text contains bad code and due to it's code it should not be readed by ANYONE!

var
	Transition = atom.Transition,
	Color = atom.Color,
	EC = {};

/** @returns {atom.Color} */
EC.getColor = function (color) {
	return new Color(color || [0,0,0,1]);
};

EC.getPoints = function (prevPos, pos, width, inverted) {
	var
		w    = pos.x-prevPos.x,
		h    = pos.y-prevPos.y,
		dist = atom.math.hypotenuse(w, h),

		sin = h / dist,
		cos = w / dist,

		dx = sin * width,
		dy = cos * width;

	return [
		new Point(pos.x + dx, pos.y + dy*inverted),
		new Point(pos.x - dx, pos.y - dy*inverted)
	];
};

EC.getGradientFunction = function (attr) {
	switch (typeof attr.gradient) {
		case 'undefined' :
			return atom.fn.lambda( EC.getColor(attr.color) );

		case 'function' :
			return attr.gradient;

		default :
			var gradient = { fn: attr.gradient.fn || 'linear' };

			if (typeof gradient.fn != 'string') {
				throw new Error('LibCanvas.Context2D.drawCurve -- unexpected type of gradient function');
			}

			gradient.from = EC.getColor(attr.gradient.from);
			gradient.to   = EC.getColor(attr.gradient.to  );

			var diff = gradient.from.diff( gradient.to );

			return function (t) {
				var factor = Transition.get(gradient.fn)(t);
				return gradient.from.shift( diff.clone().mul(factor) ).toString();
			};
	}
};

// возвращает width(t)
EC.getWidthFunction = function (attr) {
	attr.width = attr.width || 1;
	switch (typeof attr.width) {
		case 'number'  : return atom.fn.lambda(attr.width);
		case 'function': return attr.width;
		case 'object'  : return EC.getWidthFunction.range( attr.width );
		default: throw new TypeError('LibCanvas.Context2D.drawCurve -- unexpected type of width');
	}
};

EC.getWidthFunction.range = function (width) {
	if(!width.from || !width.to){
		throw new Error('LibCanvas.Context2D.drawCurve -- width.from or width.to undefined');
	}
	var diff = width.to - width.from;
	return function(t){
		return width.from + diff * Transition.get(width.fn || 'linear')(t);
	}
};

// возвращает точки кривой
EC.curvesFunctions = [
	function (p, t) { // linear
		return {
			x:p[0].x + (p[1].x - p[0].x) * t,
			y:p[0].y + (p[1].y - p[0].y) * t
		};
	},
	function (p,t) { // quadratic
		var i = 1-t;
		return {
			x:i*i*p[0].x + 2*t*i*p[1].x + t*t*p[2].x,
			y:i*i*p[0].y + 2*t*i*p[1].y + t*t*p[2].y
		};
	},
	function (p, t) { // qubic
		var i = 1-t;
		return {
			x:i*i*i*p[0].x + 3*t*i*i*p[1].x + 3*t*t*i*p[2].x + t*t*t*p[3].x,
			y:i*i*i*p[0].y + 3*t*i*i*p[1].y + 3*t*t*i*p[2].y + t*t*t*p[3].y
		};
	}
];

Context2D.prototype.drawCurve = function (obj) {
	var points = atom.array.append( [Point(obj.from)], obj.points.map(Point), [Point(obj.to)] );

	var gradientFunction = EC.getGradientFunction(obj),             //Getting gradient function
		widthFunction    = EC.getWidthFunction(obj),                //Getting width function
		curveFunction    = EC.curvesFunctions[ obj.points.length ]; //Getting curve function

	if (!curveFunction) throw new Error('LibCanvas.Context2D.drawCurve -- unexpected number of points');

	var step = obj.step || 0.02;

	var invertedMultipler = obj.inverted ? 1 : -1;

	var controlPoint, prevContorolPoint,
		drawPoints  , prevDrawPoints   ,
		width , color, prevColor, style;

	prevContorolPoint = curveFunction(points, -step);

	for (var t=-step ; t<1.02 ; t += step) {
		controlPoint = curveFunction(points, t);
		color = gradientFunction(t);
		width = widthFunction(t) / 2;

		drawPoints = EC.getPoints(prevContorolPoint, controlPoint, width, invertedMultipler);

		if (t >= step) {
			// #todo: reduce is part of array, not color
			var diff = EC.getColor(prevColor).diff(color);

			if ( (diff.red + diff.green + diff.blue) > 150 ) {
				style = this.createLinearGradient(prevContorolPoint, controlPoint);
				style.addColorStop(0, prevColor);
				style.addColorStop(1,     color);
			} else {
				style = color;
			}

				this
					.set("lineWidth",1)
					.beginPath(prevDrawPoints[0])
					.lineTo   (prevDrawPoints[1])
					.lineTo   (drawPoints[1])
					.lineTo   (drawPoints[0])
					.fill  (style)
					.stroke(style);
		}
		prevDrawPoints    = drawPoints;
		prevContorolPoint = controlPoint;
		prevColor         = color;
	}
	return this;
};

};
var CurveApprox = new Class(Curve, {
	initialize: function(method, attrs, path, detail){
		this.super('initialize', arguments);
		this.attrs.detail = detail;
	},

	genPoints: function(startPoint){
		var detail = this.attrs.detail || Curve.detail;
		var points = [startPoint || this.startAt()];
		for(var i = 1; i <= detail; i++){
			points.push(this.pointAt(i / detail, points[0]));
		}
		return points;
	},

	process: function(ctx){
		if(!this._points){
			this._points = this.genPoints();
		}

		this._points.forEach(function(point){
			ctx.lineTo(point[0], point[1]);
		});
	}
});

Delta.CurveApprox = CurveApprox;

var CurvePolyline = new Class(Curve, {
	initialize: function(method, attrs, path){
		this.super('initialize', arguments);
		this.attrs = {
			args: attrs
		};
	},

	process: function(ctx){
		this.attrs.args.forEach(function(point){
			ctx.lineTo(point[0], point[1]);
		});
	}
});

Delta.CurvePolyline = CurvePolyline;

Path = new Class(Drawable, {

	initialize : function(args, context){
		this.super('initialize', arguments);

		if(isObject(args[0])){
			args = this.processObject(args[0], Path.args);
		}

		this.attrs.d = Path.parse(args[0], this);

		// parseInt is neccessary bcs isNaN('30px') -> true
		if(isNaN(parseInt(args[1]))){
			// todo: distances (and in attrHooks too)
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
// requires Curve.Math

// todo: transforms support
extend(Path.prototype, {

    length: function(){
        return this.attrs.d.reduce(function(sum, curve){
            return sum + curve.length();
        }, 0);
    },

    startAt: function(){
        return this.pointAt(0);
    },

    curveAt: function(t){
        if(t < 0 || t > 1){
            return null;
        }
        var curves = this.attrs.d;
        if(t === 1){
            // must return the last (geometric! not moveTo) curve
            t = 1 - Number.EPSILON;
        }
        var len = this.length();
        var currentLen = 0;
        for(var i = 0; i <= curves.length; i++){
            if(currentLen / len > t){
                return curves[i - 1];
            }
            currentLen += curves[i].length();
        }
        return null;
    },

    _pathToCurveParams: function(t){
        if(t < 0 || t > 1){
            // todo: add values < 0 and > 1 for elasticOut animation
            return null;
        }
        var curves = this.attrs.d;

        var len = this.length();
        var lenStart;
        var lenEnd = 0;
        var curve;
        for(var i = 0; i <= curves.length; i++){
            if(lenEnd / len > t){
                curve = curves[i - 1];
                break;
            }
            lenStart = lenEnd;
            lenEnd += curves[i].length();
        }

        return {
            t: (t - lenStart / len) / ((lenEnd - lenStart) / len),
            curve: curve
        };
    },

    pointAt: function(t){
        if(t === 1){
            // must return the end of the last geometric (! not moveTo!) curve
            return this.curveAt(1).endAt();
        }
        var curveParams = this._pathToCurveParams(t);
        return curveParams.curve.pointAt(curveParams.t);
    },

    tangentAt: function(t){
        if(t === 1){
            t = 1 - Number.EPSILON;
        }
        var curveParams = this._pathToCurveParams(t);
        return curveParams.curve.tangentAt(curveParams.t);
    },

    normalAt: function(t){
        if(t === 1){
            t = 1 - Number.EPSILON;
        }
        var curveParams = this._pathToCurveParams(t);
        return curveParams.curve.normalAt(curveParams.t);
    },

    nearest: function(x, y, detail){
        return this.attrs.d.reduce(function(current, curve){
            var nearest = curve.nearest(x, y, detail);
            if(nearest.distance < current.distance){
                return nearest;
            }
            return current;
        }, {
            point: null,
            t: 0,
            distance: Infinity
        });
    }

});
// todo: redefine Path.draw for passing current last coordinates into process function
// or add this into Core Path
// smth like curve.__lastCoordinates = [...]
// or
// this.__lastCoordinates = [...]
// and in curve:
// this.path.__lastCoordinates[0] + this.x...

// SVG Curves
extend(Delta.curves, {
	// todo: add everywhere pointAt and etc
	// they should be possible to animate

	moveBy: new Class(Curve, {
		process: function(ctx){
			var lastPoint = this.startAt();
			ctx.moveTo(lastPoint[0] + this.attrs.args[0], lastPoint[1] + this.attrs.args[1]);
		},

		endAt: function(){
			var lastPoint = this.startAt();
			return [lastPoint[0] + this.attrs.args[0], lastPoint[1] + this.attrs.args[1]];
		},

		pointAt: function(){
			return this.endAt();
		}
	}),

	lineBy: new Class(Curve, {
		process: function(ctx){
			var lastPoint = this.startAt();
			ctx.lineTo(lastPoint[0] + this.attrs.args[0], lastPoint[1] + this.attrs.args[1]);
		},

		endAt: function(){
			var lastPoint = this.startAt();
			return [lastPoint[0] + this.attrs.args[0], lastPoint[1] + this.attrs.args[1]];
		},

		pointAt: function(t, start){
			;
		}
	}),

	horizontalLineTo: new Class(Curve, {
		process: function(ctx){
			var lastPoint = this.startAt();
			ctx.lineTo(this.attrs.args[0], lastPoint[1]);
		},

		endAt: function(){
			var lastPoint = this.startAt();
			return [this.attrs.args[0], lastPoint[1]];
		}
	}),

	horizontalLineBy: new Class(Curve, {
		process: function(ctx){
			var lastPoint = this.startAt();
			ctx.lineTo(lastPoint[0] + this.attrs.args[0], lastPoint[1]);
		},

		endAt: function(){
			var lastPoint = this.startAt();
			return [lastPoint[0] + this.attrs.args[0], lastPoint[1]];
		}
	}),

	verticalLineTo: new Class(Curve, {
		process: function(ctx){
			var lastPoint = this.startAt();
			ctx.lineTo(lastPoint[0], this.attrs.args[0]);
		},

		endAt: function(){
			var lastPoint = this.startAt();
			return [lastPoint[0], this.attrs.args[0]];
		}
	}),

	verticalLineBy: new Class(Curve, {
		process: function(ctx){
			var lastPoint = this.startAt();
			ctx.lineTo(lastPoint[0], lastPoint[1] + this.attrs.args[0]);
		},

		endAt: function(){
			var lastPoint = this.startAt();
			return [lastPoint[0], lastPoint[1] + this.attrs.args[0]];
		}
	}),

	quadraticCurveBy: new Class(Curve, {
		getQuadraticParameters: function(){
			var lastPoint = this.startAt();
			return [
				lastPoint[0] + this.attrs.args[0],
				lastPoint[1] + this.attrs.args[1],
				lastPoint[0] + this.attrs.args[2],
				lastPoint[1] + this.attrs.args[3]
			];
		},

		process: function(ctx){
			var p = this.getQuadraticParameters();
			ctx.quadraticCurveTo(p[0], p[1], p[2], p[3]);
		},

		endAt: function(){
			var p = this.getQuadraticParameters();
			return [p[2], p[3]];
		}
	}),

	shorthandQuadraticCurveTo: new Class(Curve, {
		getQuadraticParameters: function(){
			var lastCurve = this.prev();
			var lastPoint = lastCurve.endAt();
			var tangentDelta;

			if(lastCurve.method === 'quadraticCurveTo'){
				lastCurve = lastCurve.attrs.args;
			} else if(lastCurve.getQuadraticParameters){
				lastCurve = lastCurve.getQuadraticParameters();
			} else {
				lastCurve = null;
			}

			if(lastCurve){
				tangentDelta = [
					lastCurve[2] - lastCurve[0],
					lastCurve[3] - lastCurve[1],
				];
			} else {
				tangentDelta = [0, 0];
			}

			return [
				lastPoint[0] + tangentDelta[0],
				lastPoint[1] + tangentDelta[1],
				this.attrs.args[0],
				this.attrs.args[1],
			];
		},

		process: function(ctx){
			var p = this.getQuadraticParameters();
			ctx.quadraticCurveTo(p[0], p[1], p[2], p[3]);
		},

		endAt: function(){
			var p = this.getQuadraticParameters();
			return [p[2], p[3]];
		}
	}),

	shorthandQuadraticCurveBy: new Class(Curve, {
		getQuadraticParameters: function(){
			var lastCurve = this.prev();
			var lastPoint = lastCurve.endAt();
			var tangentDelta;

			if(lastCurve.method === 'quadraticCurveTo'){
				lastCurve = lastCurve.attrs.args;
			} else if(lastCurve.getQuadraticParameters){
				lastCurve = lastCurve.getQuadraticParameters();
			} else {
				lastCurve = null;
			}

			if(lastCurve){
				tangentDelta = [
					lastCurve[2] - lastCurve[0],
					lastCurve[3] - lastCurve[1],
				];
			} else {
				tangentDelta = [0, 0];
			}

			return [
				lastPoint[0] + tangentDelta[0],
				lastPoint[1] + tangentDelta[1],
				lastPoint[0] + this.attrs.args[0],
				lastPoint[1] + this.attrs.args[1],
			];
		},

		process: function(ctx){
			var p = this.getQuadraticParameters();
			ctx.quadraticCurveTo(p[0], p[1], p[2], p[3]);
		},

		endAt: function(){
			var p = this.getQuadraticParameters();
			return [p[2], p[3]];
		}
	}),

	bezierCurveBy: new Class(Curve, {
		getBezierParameters: function(){
			var lastPoint = this.startAt();
			return [
				lastPoint[0] + this.attrs.args[0],
				lastPoint[1] + this.attrs.args[1],
				lastPoint[0] + this.attrs.args[2],
				lastPoint[1] + this.attrs.args[3],
				lastPoint[0] + this.attrs.args[4],
				lastPoint[1] + this.attrs.args[5]
			];
		},

		process: function(ctx){
			var p = this.getBezierParameters();
			ctx.bezierCurveTo(p[0], p[1], p[2], p[3], p[4], p[5]);
		},

		endAt: function(){
			var p = this.getBezierParameters();
			return [p[4], p[5]];
		}
	}),

	shorthandCurveTo: new Class(Curve, {
		getBezierParameters: function(){
			var lastCurve = this.prev();
			var lastPoint = lastCurve.endAt();
			var tangentDelta;
			// add quadratic support?

			// possibly this will work will all the functions which can be approximated as bezier
			if(lastCurve.getBezierParameters){
				lastCurve = lastCurve.getBezierParameters();
			} else if(lastCurve.method === 'bezierCurveTo'){
				lastCurve = lastCurve.attrs.args;
			} else {
				lastCurve = null;
			}

			if(lastCurve){
				tangentDelta = [
					lastCurve[4] - lastCurve[2],
					lastCurve[5] - lastCurve[3]
				];
			} else {
				tangentDelta = [0, 0];
			}

			return [
				lastPoint[0] + tangentDelta[0],
				lastPoint[1] + tangentDelta[1],
				this.attrs.args[0],
				this.attrs.args[1],
				this.attrs.args[2],
				this.attrs.args[3],
			];
		},

		process: function(ctx){
			var p = this.getBezierParameters();
			ctx.bezierCurveTo(p[0], p[1], p[2], p[3], p[4], p[5]);
		},

		endAt: function(){
			var p = this.getBezierParameters();
			return [p[4], p[5]];
		}
	}),

	shorthandCurveBy: new Class(Curve, {
		getBezierParameters: function(){
			var lastCurve = this.prev();
			var lastPoint = lastCurve.endAt();
			var tangentDelta;
			if(lastCurve.getBezierParameters){
				lastCurve = lastCurve.getBezierParameters();
			} else if(lastCurve.method === 'bezierCurveTo'){
				lastCurve = lastCurve.attrs.args;
			} else {
				lastCurve = null;
			}

			if(lastCurve){
				tangentDelta = [
					lastCurve[4] - lastCurve[2],
					lastCurve[5] - lastCurve[3]
				];
			} else {
				tangentDelta = [0, 0];
			}

			return [
				lastPoint[0] + tangentDelta[0],
				lastPoint[1] + tangentDelta[1],
				lastPoint[0] + this.attrs.args[0],
				lastPoint[1] + this.attrs.args[1],
				lastPoint[0] + this.attrs.args[2],
				lastPoint[1] + this.attrs.args[3],
			];
		},

		process: function(ctx){
			var p = this.getBezierParameters();
			ctx.bezierCurveTo(p[0], p[1], p[2], p[3], p[4], p[5]);
		},

		endAt: function(){
			var p = this.getBezierParameters();
			return [p[4], p[5]];
		}
	}),

	ellipticalArcTo: new Class(Curve, {
		process: function(ctx){
			// rx, ry x-axis-rotation large-arc-flag, sweep-flag, x,y
			var rx = this.attrs.args[0],
				ry = this.attrs.args[1],
				rot = this.attrs.args[2],
				large = this.attrs.args[3] === 1,
				sweep = this.attrs.args[4] === 1,
				x = this.attrs.args[5],
				y = this.attrs.args[6],

				start = this.startAt();

			var segs = arcToSegments(x, y, rx, ry, large, sweep, rot, start[0], start[1]);
			segs.forEach(function(segment){
				segment = segmentToBezier.apply(this, segment);
				ctx.bezierCurveTo.apply(ctx, segment);
			});

			// from cakejs from inkscape svgtopdf
			function arcToSegments(x, y, rx, ry, large, sweep, th, ox, oy) {
				th = th * (Math.PI/180)
				var sin_th = Math.sin(th)
				var cos_th = Math.cos(th)
				rx = Math.abs(rx)
				ry = Math.abs(ry)
				var px = cos_th * (ox - x) * 0.5 + sin_th * (oy - y) * 0.5
				var py = cos_th * (oy - y) * 0.5 - sin_th * (ox - x) * 0.5
				var pl = (px*px) / (rx*rx) + (py*py) / (ry*ry)
				if (pl > 1) {
				  pl = Math.sqrt(pl)
				  rx *= pl
				  ry *= pl
				}

				var a00 = cos_th / rx
				var a01 = sin_th / rx
				var a10 = (-sin_th) / ry
				var a11 = (cos_th) / ry
				var x0 = a00 * ox + a01 * oy
				var y0 = a10 * ox + a11 * oy
				var x1 = a00 * x + a01 * y
				var y1 = a10 * x + a11 * y

				var d = (x1-x0) * (x1-x0) + (y1-y0) * (y1-y0)
				var sfactor_sq = 1 / d - 0.25
				if (sfactor_sq < 0) sfactor_sq = 0
				var sfactor = Math.sqrt(sfactor_sq)
				if (sweep == large) sfactor = -sfactor
				var xc = 0.5 * (x0 + x1) - sfactor * (y1-y0)
				var yc = 0.5 * (y0 + y1) + sfactor * (x1-x0)

				var th0 = Math.atan2(y0-yc, x0-xc)
				var th1 = Math.atan2(y1-yc, x1-xc)

				var th_arc = th1-th0
				if (th_arc < 0 && sweep == 1){
				  th_arc += 2*Math.PI
				} else if (th_arc > 0 && sweep == 0) {
				  th_arc -= 2 * Math.PI
				}

				var segments = Math.ceil(Math.abs(th_arc / (Math.PI * 0.5 + 0.001)))
				var result = []
				for (var i=0; i<segments; i++) {
				  var th2 = th0 + i * th_arc / segments
				  var th3 = th0 + (i+1) * th_arc / segments
				  result[i] = [xc, yc, th2, th3, rx, ry, sin_th, cos_th]
				}

				return result
			}

			function segmentToBezier(cx, cy, th0, th1, rx, ry, sin_th, cos_th) {
				var a00 = cos_th * rx
				var a01 = -sin_th * ry
				var a10 = sin_th * rx
				var a11 = cos_th * ry

				var th_half = 0.5 * (th1 - th0)
				var t = (8/3) * Math.sin(th_half * 0.5) * Math.sin(th_half * 0.5) / Math.sin(th_half)
				var x1 = cx + Math.cos(th0) - t * Math.sin(th0)
				var y1 = cy + Math.sin(th0) + t * Math.cos(th0)
				var x3 = cx + Math.cos(th1)
				var y3 = cy + Math.sin(th1)
				var x2 = x3 + t * Math.sin(th1)
				var y2 = y3 - t * Math.cos(th1)
				return [
				  a00 * x1 + a01 * y1,      a10 * x1 + a11 * y1,
				  a00 * x2 + a01 * y2,      a10 * x2 + a11 * y2,
				  a00 * x3 + a01 * y3,      a10 * x3 + a11 * y3
				];
			}
		},

		endAt: function(){
			return [
				this.attrs.args[5],
				this.attrs.args[6]
			];
		}
	})
});

// SVG Parsing
Delta.SVGCurves = {
	M: 'moveTo',
	m: 'moveBy',
	L: 'lineTo',
	l: 'lineBy',
	H: 'horizontalLineTo',
	h: 'horizontalLineBy',
	V: 'verticalLineTo',
	v: 'verticalLineBy',
	C: 'bezierCurveTo',
	c: 'bezierCurveBy',
	S: 'shorthandCurveTo',
	s: 'shorthandCurveBy',
	Q: 'quadraticCurveTo',
	q: 'quadraticCurveBy',
	T: 'shorthandQuadraticCurveTo',
	t: 'shorthandQuadraticCurveBy',
	A: 'ellipticalArcTo',
	a: 'ellipticalArcBy',
	Z: 'closePath',
	z: 'closePath'
};

Delta.SVGCurvesLengths = {
	M: 2,
	m: 2,
	L: 2,
	l: 2,
	H: 1,
	h: 1,
	V: 1,
	v: 1,
	C: 6,
	c: 6,
	S: 4,
	s: 4,
	Q: 4,
	q: 4,
	T: 2,
	t: 2,
	A: 7,
	a: 7,
	Z: 0,
	z: 0
};

var pathParseOld = Path.parse;
Path.parse = function(data, path, firstIsNotMove){
	if(data + '' !== data){
		return pathParseOld(data, path, firstIsNotMove);
	}

	var result = [];
	data.match(/[a-zA-Z](\s*-?\d+\,?|\s*-?\d*\.\d+\,?)*/g).forEach(function(curve, index){
		var command = curve[0];
		if(!Delta.SVGCurves[command]){
			throw 'Unknown SVG curve command "' + command + '"';
		}

		// replacing anything like .7.8 to .7,.8
		curve = curve.replace(/(\.\d+)\./g, '$1,.');

		var args = curve.match(/-?\d+?\.\d+|-?\d+/g);
		if(args){
			args = args.map(Number);
		} else {
			args = [];
		}

		var len = Delta.SVGCurvesLengths[command];
		while(args.length > len){
			result.push(
				Delta.curve(Delta.SVGCurves[command], args.slice(0, len), path)
			);

			args = args.slice(len);
		}
		result.push(
			Delta.curve(Delta.SVGCurves[command], args, path)
		);
	});
	return result;
};

Object.keys(Delta.SVGCurves).forEach(function(key){
	var name = Delta.SVGCurves[key];
	if(!Path.prototype[name]){
		Path.prototype[name] = function(){
			return this.push(name, Array.prototype.slice.call(arguments), this);
		};
	}
});


Picture = new Class(Drawable, {

	// todo: image format libcanvas-like:
	// '/files/img/hexes.png [150:100]{0:0}'
	initialize : function(args, context){
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
		// what if user want to push the image again?
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
	['mozImageSmoothingEnabled', 'webkitImageSmoothingEnabled', 'msImageSmoothingEnabled', 'imageSmoothingEnabled'].forEach(function(name){
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

	initialize : function(args, context){
		this.super('initialize', arguments);

		if(isObject(args[0])){
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
				args[0].string = args[0].text;
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

		this.attrs.string = args[0] + '';
		this.attrs.x = args[1];
		this.attrs.y = args[2];
		this.attrs.font = Text.parseFont(args[3] || Text.font);
		this.styles.font = Text.genFont(this.attrs.font);
		if(args[4]){
			this.styles.fillStyle = args[4];
		}
		if(args[5]){
			this.styles.stroke = args[5];
			Drawable.processStroke(args[5], this.styles);
		}

	},

	attrHooks: new DrawableAttrHooks({
		string: {
			set: function(value){
				this.lines = null;
				this.update();
				return value + '';
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
		},

		font: {
			set: function(value){
				extend(this.attrs.font, Text.parseFont(value));
				this.styles.font = Text.genFont(this.attrs.font);
				this.update();
				return null;
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
		var text = this.attrs.string,
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
		if(this.attrs.visible){
			this.context.renderer.pre(ctx, this.styles, this.matrix, this);

			if(!this.attrs.breaklines){
				var width = this.attrs.maxStringWidth < Infinity ? this.attrs.maxStringWidth : undefined;

				if(this.styles.fillStyle){
					ctx.fillText(this.attrs.string, this.attrs.x, this.attrs.y, width);
				}
				if(this.styles.strokeStyle){
					ctx.strokeText(this.attrs.string, this.attrs.x, this.attrs.y, width);
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
		}
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
			width = this.context.renderer.measure(this.attrs.string);
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
Text.args = ['string', 'x', 'y', 'font', 'fill', 'stroke'];

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
			this.attrHooks = extend(
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
Gradient.types.diamond = {
	// todo: parameters like in circle (size, angle, etc)
	toCanvasStyle: function(ctx, element){
		// todo: bounds('untransformed');
		var bounds = element.bounds(),
			canvas = getTemporaryCanvas(bounds.width, bounds.height),
			context = canvas.getContext('2d'),
			w = bounds.width / 2,
			h = bounds.height / 2,
			lt = context.createLinearGradient(w, h, 0, 0),
			rt = context.createLinearGradient(w, h, w * 2, 0),
			lb = context.createLinearGradient(w, h, 0, h * 2),
			rb = context.createLinearGradient(w, h, w * 2, h * 2),
			colors = this.attrs.colors;

		// it's adaptive
		Object.keys(colors).forEach(function(offset){
			lt.addColorStop(offset, colors[offset]);
			rt.addColorStop(offset, colors[offset]);
			lb.addColorStop(offset, colors[offset]);
			rb.addColorStop(offset, colors[offset]);
		});

		context.fillStyle = lt;
		context.fillRect(0, 0, w, h);
		context.fillStyle = rt;
		context.fillRect(w, 0, w, h);
		context.fillStyle = lb;
		context.fillRect(0, h, w, h);
		context.fillStyle = rb;
		context.fillRect(w, h, w, h);

		var img = new Image;
		img.src = canvas.toDataURL('image/png');

		return ctx.createPattern(img, 'no-repeat');
		/* return this.context.renderer.makeGradient(
			this.context,
			'linear',
			element.corner(this.attrs.from),
			element.corner(this.attrs.to),
			this.attrs.colors
		); */
	}
};

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

// {moduleName Animation.Along}
// {requires Math.Curve}

Drawable.prototype.attrHooks.along = {
	preAnim: function(fx, data){
		var curve = data.curve;
		if(data instanceof Curve || data instanceof Path){
			curve = data;
			data = {};
		}
		var corner = data.corner || 'center';

		corner = this.corner(corner, data.cornerOptions || {
			transform: 'ignore'
		});
		if(data.offset){
			corner[0] -= data.offset[0];
			corner[1] -= data.offset[1];
		}
		fx.initialCoords = corner;
		fx.curve = curve;
		if(!data.dynamic){
			// true if the curve is changed while animation
			// and along animation works like dynamic for some curves always
			fx.startCurvePoint = curve.startAt();
		}
		this.attr('rotatePivot', corner);
		if(+data.rotate === data.rotate){
			this.attr('rotate', data.rotate);
		} else if(data.rotate === true){
			fx.rotate = true;
		}
		fx.addRotate = data.addRotate || 0;
	},

	anim: function(fx){
		var point = fx.curve.pointAt(fx.pos, fx.startCurvePoint);
		point[0] -= fx.initialCoords[0];
		point[1] -= fx.initialCoords[1];
		this.attr('translate', point);
		if(fx.rotate === true){
			this.attr('rotate', fx.curve.tangentAt(fx.pos, null, fx.startCurvePoint) + fx.addRotate);
		}
	}
};
// {moduleName Animation.Morph}
// {requires Curve.Math, Curve.Approx}

Path.prototype.attrHooks.morph = {
	preAnim: function(fx, data){
		var curve = data.curve,
			to = data.to,

			start = curve.startAt(), // иногда кидает ошибку, если несколько анимаций морфа
			index = curve.path.attr('d').indexOf(curve);

		// заменяем кривую на её аппроксимацию
		fx.startCurve = curve;
		fx.endCurve = Path.parse(to, null, true)[0]; // todo: multiple curves & paths
		fx.detail = data.detail || Curve.detail || 10;

		fx.startPoints = [start];
		fx.endPoints = [fx.endCurve.pointAt(0, start)];

		for(var i = 1; i <= fx.detail; i++){
			fx.startPoints.push(curve.pointAt(i / fx.detail, start));
			fx.endPoints.push(fx.endCurve.pointAt(i / fx.detail, start));
		}

		fx.polyline = new CurvePolyline('polyline', fx.startPoints, curve.path);
		fx.index = index;

		curve.path.curve(index, fx.polyline);
	},

	anim: function(fx){
		// noise animation
		// maybe plugin after
		/* fx.curve._points = fx.curve._points.map(function(point, i){
			return [
				fx.startPoints[i][0],
				fx.startPoints[i][1] + Math.random() * 10
			];
		}); */

		fx.polyline.attr('args', fx.polyline.attr('args').map(function(point, i){
			return [
				fx.startPoints[i][0] + (fx.endPoints[i][0] - fx.startPoints[i][0]) * fx.pos,
				fx.startPoints[i][1] + (fx.endPoints[i][1] - fx.startPoints[i][1]) * fx.pos
			];
		}));

		if(fx.pos === 1){
			fx.startCurve.path.curve(fx.index, fx.endCurve);
		}
	}
};

var GLContext;

// всё, где комментарий "// {{debug}}", нужно убрать из прода (todo: встроить {{debug}} ... {{/debug}} в grunt модуль)
/*
Основные оптимизации:
 - Рисовать объекты с одним буфером вместе.
 - Рисовать более ближние объекты первыми.
 */

GLContext = new Class(Context, {
	initialize: function(canvas){
		// WebGL
		this.gl = this._getAndPrepareGLContext(canvas);
		if(!this.gl){
			return new Delta.contexts['2d'](canvas);
		}
		this.shaders = {};
		this.buffers = {};

		// Context
		this.canvas    = canvas;
		this.elements  = [];
		this.listeners = {};
		// array for not yet drawn obs
		this._missing  = [];

		// todo: this.drawMissing = this.drawMissing.bind(this)
		this.drawMissingBound = this.drawMissing.bind(this);
		this.updateNowBounded = this.updateNow.bind(this);
	},

	_getAndPrepareGLContext: function(canvas){
		var gl;

		if(gl = canvas.getContext('webgl'));
		else if(gl = canvas.getContext('experimental-webgl'));
		else if(gl = canvas.getContext('webkit-3d'));
		else if(gl = canvas.getContext('moz-webgl'));
		else {
			// webgl is not supported
			return null;
		}

		// проверить, нужно ли вообще эту функцию вызывать
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.clearColor(1, 0.8, 0.9, 1); // maybe 0,0,0,0?
		gl.clear(gl.COLOR_BUFFER_BIT);
		return gl;
	},

	// Methods
	push : function(element){
		element.context = this;
		this.elements.push(element);

		if(element.shadersRequired){
			element.shadersRequired.forEach(function(shaderName){
				this.initShader(shaderName);
			}.bind(this));
		}

		if(element.drawGL){
			this._missing.push(element);
			if(!this._willDrawMissing){
				requestAnimationFrame(this.drawMissingBound);
				this._willDrawMissing = true;
			}
			// надо исполнять в следующем тике, чтобы сгруппировать объекты с одним буфером вместе
			// а в этом тике надо компилировать все нужные для запушенного объекта шейдеры
			// причём там рисуем в обратном порядке => последний скомпиленный шейдер, уже подключенный в gl
			// и используется первым :P
			// element.drawGL(this.gl);
		}

		return element;
	},

	initShader: function(name){
		if(this.shaders[name]){
			return;
		}

		if(!GLContext.shadersFactory[name]){
			throw "The shader \"" + name + "\" is not exist.";
		}

		this.shaders[name] = GLContext.shadersFactory[name](this.gl, this);
	},

	drawMissing: function(){
		this._willDrawMissing = false;

		// Рисовать нужно с depth-буфером и в обратном порядке (чтобы gl-ю приходилось меньше рисовать).
		// Кроме того, подключенный последним шейдер будет заюзан в таком порядке первым.
		// Кроме того, нужно группировать объекты по шейдерам / буферам.
		// Но пока не всё понятно в случае с depthtest с blending mode
		var gl = this.gl;
		this._missing.forEach(function(element){
			element.drawGL(gl);
		});
	}

});

GLContext.shadersFactory = {
	'fragment-common': function(gl){
		return Delta.createShader(gl, gl.FRAGMENT_SHADER, [
			'#ifdef GL_ES',
				'precision highp float;',
			'#endif',

			'varying vec4 vColor;', // а этот шейдер типа не умеет в униформы?
			'void main(void){',
				'gl_FragColor = vec4(vColor[0] / 255.0, vColor[1] / 255.0, vColor[2] / 255.0, vColor[3]);',
			'}'
		].join('\n'));;
	}
};

// GL utilities
Delta.createShader = function(gl, type, source){
	var shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	// {{debug}}
	if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
		var log = gl.getShaderInfoLog(shader);
		gl.deleteShader(shader);
		throw "Shader compilation error: " + log;
	}
	// {{/debug}}
	return shader;
}

Delta.contexts['gl'] = GLContext;
GLContext.shadersFactory['vertex-rect'] = function(gl){
	return Delta.createShader(gl, gl.VERTEX_SHADER, [
		'attribute vec2 aVertexPosition;',
		'uniform vec4 rectCoords;',
		'uniform vec4 uColor;',
		'varying vec4 vColor;',
		 'float canvasWidth = ' + gl.canvas.width + '.0;',
		 'float canvasHeight = ' + gl.canvas.height + '.0;',

		'void main(void){',
			'vColor = uColor;',
			'gl_Position = vec4(',
				// тут можно поделить на canvasWidth всё сразу
				'(aVertexPosition[0] * rectCoords[2] / canvasWidth) - 1.0 + rectCoords[2] / canvasWidth + (rectCoords[0] * 2.0 / canvasWidth),',
				'(aVertexPosition[1] * rectCoords[3] / canvasHeight) + 1.0 - rectCoords[3] / canvasHeight - (rectCoords[1] * 2.0 / canvasHeight),',
				'1.0,',
				'1.0',
			');',
		'}'
	].join('\n'));
};

GLContext.shadersFactory['program-rect'] = function(gl, delta){
	var program = gl.createProgram();
	gl.attachShader(program, delta.shaders['vertex-rect']);
	gl.attachShader(program, delta.shaders['fragment-common']);
	gl.linkProgram(program);

	// {{debug}}
	if(!gl.getProgramParameter(program, gl.LINK_STATUS)){
		throw "Could not initialize shaders";
	}
	// {{/debug}}

	// if(delta._lastProgram !== delta.shaders['program-rect']) ...
	gl.useProgram(program);
	program.uColor = gl.getUniformLocation(program, 'uColor');
	program.rectCoords = gl.getUniformLocation(program, 'rectCoords');
	program.v_aVertexPosition = gl.getAttribLocation(program, 'aVertexPosition');
	gl.enableVertexAttribArray(program.v_aVertexPosition);
	return program;
}

Rect.prototype.shadersRequired = ['fragment-common', 'vertex-rect', 'program-rect'];

Rect.prototype.drawGL = function(gl){
	var delta = this.context;

	if(!delta.buffers['rect']){
		var vertexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
			-1, -1,
			1, 1,
			1, -1,

			-1, -1,
			1, 1,
			-1, 1
		]), gl.STATIC_DRAW);

		delta.buffers['rect'] = vertexBuffer;
	}

	var color = Delta.color(this.styles.fillStyle);

	gl.uniform4f(
		delta.shaders['program-rect'].uColor,
		color[0],
		color[1],
		color[2],
		color[3]
	);

	gl.uniform4f(
		delta.shaders['program-rect'].rectCoords,
		this.attrs.x,
		this.attrs.y,
		this.attrs.width,
		this.attrs.height
	);

	gl.vertexAttribPointer(delta.shaders['program-rect'].v_aVertexPosition, 2, gl.FLOAT, false, 0, 0);
	gl.drawArrays(gl.TRIANGLES, 0, 6);
};

GLContext.shadersFactory['vertex-path'] = function(gl){
	return Delta.createShader(gl, gl.VERTEX_SHADER, [
		'attribute vec2 aVertexPosition;',
		'uniform vec4 rectCoords;',
		'uniform vec4 uColor;',
		'varying vec4 vColor;',
		'float canvasWidth = ' + gl.canvas.width + '.0;',
		'float canvasHeight = ' + gl.canvas.height + '.0;',

		'void main(void){',
			'vColor = uColor;',
			'gl_Position = vec4(',
				'aVertexPosition[0],',
				'aVertexPosition[1],',
				'1.0,',
				'1.0',
			');',
		'}'
	].join('\n'));
};

GLContext.shadersFactory['program-path'] = function(gl, delta){
	var program = gl.createProgram();
	gl.attachShader(program, delta.shaders['vertex-path']);
	gl.attachShader(program, delta.shaders['fragment-common']);
	gl.linkProgram(program);

	// {{debug}}
	if(!gl.getProgramParameter(program, gl.LINK_STATUS)){
		throw "Could not initialize shaders";
	}
	// {{/debug}}

	// if(delta._lastProgram !== delta.shaders['program-rect']) ...
	gl.useProgram(program);
	program.uColor = gl.getUniformLocation(program, 'uColor');
	program.rectCoords = gl.getUniformLocation(program, 'rectCoords');
	program.v_aVertexPosition = gl.getAttribLocation(program, 'aVertexPosition');
	gl.enableVertexAttribArray(program.v_aVertexPosition);
	return program;
}

Path.prototype.shadersRequired = ['fragment-common', 'vertex-path', 'program-path'];

Path.prototype.drawGL = function(gl){
	var delta = this.context;

	if(!delta.buffers['rect']){
		var vertexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
			0.0, 0.0,
			0.5, 0.5,
			0.5, 0.0,
			0.5, -0.5,
			-1.0, 0.0
		]), gl.STATIC_DRAW);

		delta.buffers['rect'] = vertexBuffer;
	}

	var color = Delta.color(this.styles.fillStyle);
	gl.uniform4f(delta.shaders['program-rect'].uColor, color[0], color[1], color[2], color[3]);
	gl.uniform4f(
		delta.shaders['program-rect'].rectCoords,
		10,
		10,
		200,
		200
	);

	gl.vertexAttribPointer(delta.shaders['program-rect'].v_aVertexPosition, 2, gl.FLOAT, false, 0, 0);
	gl.drawArrays(gl.TRIANGLE_FAN, 0, 5);
};



/* Interface:
 - rect.editor('transform');
 - rect.editor('transform', command); // <- command = enable / disable / rotate / freeze / destroy / etc
 - rect.editor('transform', properties); // sets attrs
 */
extend(Drawable.prototype, {
	editor: function(kind, value, params){
		if(!value){
			value = 'enable';
		}

		if(!Delta.editors[kind]){
			throw 'There\'s no ' + kind + ' editor';
		}

		if(value + '' === value){
			return Delta.editors[kind][value](this, params) || this;
		}
	}
});

Delta.editors = {};

// draggable
var defaultProps = {
	axis: 'both',
	inBounds: null,
	cursor: null,
	cursorAt: null,
	moveWith: [],
	delay: 100,
	distance: 5,
	grid: null,
	helper: null,
	helperFixPosition: true,
	helperAttrs: {
		opacity: 0.5
	},
	zIndex: null,
	zIndexReturn: true
};

Drawable.prototype.draggable = function(method, options){
	// если obj.draggable({ ... }), то это мб не enable / init, а set!
	if(method + '' !== method){
		options = method;
		method = 'init';
	} else if(!method){
		method = 'init';
	}

	return this.draggable[method].call(this, options);
};

Drawable.prototype.draggable.init = function(options){
	if(!options){
		options = {};
	}

	this._draggingOptions = extend(extend({}, defaultProps), options);
	this.draggable.updateMods.call(this);

	this.on('mousedown', draggableElemMousedown);
	window.addEventListener('mouseup', windowMouseup.bind(this));
	window.addEventListener('mousemove', windowMousemove.bind(this));

	// todo: заменить на один обработчик
	// Delta._dragging = {canvas, object}
	// и переменную Delta._draggables = (count of draggable obs)
	// когда она обнуляется, скидываем обработчики событий
	// такая чистка мусора
};

Drawable.prototype.draggable.destroy = function(){};
Drawable.prototype.draggable.enable = function(){};
Drawable.prototype.draggable.disable = function(){};

Drawable.prototype.draggable.updateMods = function(){
	var mods = [];

	if(this._draggingOptions.cursorAt !== 'left top' &&
		this._draggingOptions.cursorAt !== 'lt' &&
		this._draggingOptions.cursorAt !== 'tl'){
		mods.push('cursorAt');
	}

	if(this._draggingOptions.distance){
		mods.push('distance');
	}

	if(this._draggingOptions.delay){
		mods.push('delay');
	}

	if(this._draggingOptions.inBounds){
		if(!(this._draggingOptions.inBounds instanceof Bounds) && this._draggingOptions.inBounds.bounds){
			this._draggingOptions.inBounds = this._draggingOptions.inBounds.bounds();
		}
		mods.push('inBounds');
	}

	if(this._draggingOptions.axis !== 'both'){
		mods.push('axis');
	}

	if(this._draggingOptions.grid){
		if(+this._draggingOptions.grid === this._draggingOptions.grid){
			this._draggingOptions.grid = [
				this._draggingOptions.grid,
				this._draggingOptions.grid
			];
		}
		// just a fix for a common mistake
		if(this._draggingOptions.grid[0] === 0){
			this._draggingOptions.grid[0] = 1;
		}
		if(this._draggingOptions.grid[1] === 0){
			this._draggingOptions.grid[1] = 1;
		}
		mods.push('grid');
	}

	if(this._draggingOptions.moveWith){
		if(!this._draggingOptions.moveWith.length){
			this._draggingOptions.moveWith = [this._draggingOptions.moveWith];
		}
		mods.push('moveWith');
	}

	if(this._draggingOptions.helper){
		mods.push('helper');
	}

	this._draggingOptions.mods = mods;
};

var mods = {
	cursorAt: function(x, y, event){
		var corner = this._draggingOptions.cursorAt;

		if(!corner){
			var delta = [
				this._dragging.downCoords[0] - this._dragging.bounds.x,
				this._dragging.downCoords[1] - this._dragging.bounds.y
			];

			return [
				x - delta[0],
				y - delta[1]
			];
		}

		return [
			x - this._dragging.bounds.width * Delta.corners[corner][0],
			y - this._dragging.bounds.height * Delta.corners[corner][1],
		];
	},

	distance: function(x, y, event){
		if(this._dragging.doNotCheckDistance){
			return [x, y];
		}

		var distance = Math.sqrt(
			Math.pow(this._dragging.downCoords[0] - event.contextX, 2) +
			Math.pow(this._dragging.downCoords[1] - event.contextY, 2)
		);

		if(distance < this._draggingOptions.distance){
			return [
				this._dragging.bounds.x - this._dragging.nativeBounds.x,
				this._dragging.bounds.y - this._dragging.nativeBounds.y
			];
		}

		this._dragging.doNotCheckDistance = true;
		return [x, y];
	},

	delay: function(x, y, event){
		if(this._dragging.doNotCheckDelay){
			return [x, y];
		}

		var delay = Date.now() - this._dragging.downTime;

		if(delay < this._draggingOptions.delay){
			return [
				this._dragging.bounds.x - this._dragging.nativeBounds.x,
				this._dragging.bounds.y - this._dragging.nativeBounds.y
			];
		}

		this._dragging.doNotCheckDelay = true;
		return [x, y];
	},

	inBounds: function(x, y, event){
		// coords of the dragging object
		var coords = [
			x + this._dragging.nativeBounds.x,
			y + this._dragging.nativeBounds.y
		];

		var value = this._draggingOptions.inBounds;
		if(coords[0] < value.x){
			x = value.x - this._dragging.nativeBounds.x;
		} else if(coords[0] + this._dragging.bounds.width > value.x2){
			x = value.x2 - this._dragging.nativeBounds.x - this._dragging.bounds.width;
		}

		if(coords[1] < value.y){
			y = value.y - this._dragging.nativeBounds.y;
		} else if(coords[1] + this._dragging.bounds.height > value.y2){
			y = value.y2 - this._dragging.nativeBounds.y - this._dragging.bounds.height;
		}

		return [x, y];
	},

	axis: function(x, y, event){
		if(this._draggingOptions.axis === 'x'){
			y = this._dragging.bounds.y - this._dragging.nativeBounds.y;
		} else if(this._draggingOptions.axis === 'y'){
			x = this._dragging.bounds.x - this._dragging.nativeBounds.x;
		}
		return [x, y];
	},

	moveWith: function(x, y, event){
		this._draggingOptions.moveWith.forEach(function(element){
			;
		}, this);
		return [x, y];
		// проходим по массиву moveWith, всем ставим translate = -bounds + translation;
	},

	grid: function(x, y, event){
		var grid = this._draggingOptions.grid;
		return [
			x - x % grid[0],
			y - y % grid[1]
		];
	},

	helper: function(x, y, event){
		if(this._dragging.helper){
			if(this._dragging.helperTranslation){
				x += this._dragging.helperTranslation[0];
				y += this._dragging.helperTranslation[1];
			}
			this._dragging.helper.attr('translate', [x, y]);
		}

		return [
			this._dragging.bounds.x - this._dragging.nativeBounds.x,
			this._dragging.bounds.y - this._dragging.nativeBounds.y
		];
	}
};

function draggableElemMousedown(e){
	this._dragging = {
		downCoords: [e.contextX, e.contextY],
		downTime: Date.now(),
		bounds: this.bounds(),
		nativeBounds: this.bounds(false),
		context: this.context
	};

	if(this._draggingOptions.cursor){
		this._dragging.oldCursor = this.context.canvas.style.cursor;
		this.context.canvas.style.cursor = this._draggingOptions.cursor;
	}

	if(this._draggingOptions.zIndex || this._draggingOptions.zIndex === 0){
		this._dragging.zIndexOld = this.attr('z');
		this.attr('z', this._draggingOptions.zIndex);
	}

	if(this._draggingOptions.helper){
		if(this._draggingOptions.helper === 'clone'){
			this._dragging.helper = this.clone();
		} else {
			this._dragging.helper = this._draggingOptions.helper.clone();
			// нужны функции для работы с abstract element place / bounds
			// ну типа element.placeLTtoPoint(x, y)
			// работающие с translate и т.п.
			// они нужны и для лейаутов
			if(this._draggingOptions.helperFixPosition){
				// works with bugs
				var helperBounds = this._dragging.helper.bounds();
				this._dragging.helperTranslation = [
					this._dragging.bounds.x - helperBounds.x,
					this._dragging.bounds.y - helperBounds.y
				];
			}
		}

		if(this._draggingOptions.helperAttrs){
			this._dragging.helper.attr(this._draggingOptions.helperAttrs);
		}

		this._dragging.helper['_meta'] = true; // must be at all the meta obs (made by not the user)
		// todo: make sure it is not spoiled by minimizer
	}

	this.fire('dragstart', e);
}

function windowMouseup(e){
	if(this._dragging){
		if(this._dragging.oldCursor !== undefined){
			this.context.canvas.style.cursor = this._dragging.oldCursor;
			this._dragging.oldCursor = null;
		}

		if(this._dragging.zIndexOld !== undefined && this._draggingOptions.zIndexReturn){
			this.attr('z', this._dragging.zIndexOld);
			this._dragging.zIndexOld = null;
		}

		if(this._dragging.helper){
			this.attr('translate', this._dragging.helper.attr('translate'));
			this._dragging.helper.remove();
			this._dragging.helper = null;
			this._dragging.helperTranslation = null;
		}
	}

	this._dragging = null;
	this.fire('dragend', e);
}

function windowMousemove(e){
	var dragging = this._dragging;

	if(!dragging){
		return;
	}

	var coords = dragging.context.contextCoords(e.clientX, e.clientY);
	event.contextX = coords[0];
	event.contextY = coords[1];
	coords[0] -= dragging.nativeBounds.x;
	coords[1] -= dragging.nativeBounds.y;

	this._draggingOptions.mods.forEach(function(modName){
		coords = mods[modName].call(this, coords[0], coords[1], e);
	}.bind(this));

	this.attr('translate', coords);
	this.fire('drag', e);
}
Delta.editors.__commonControls = {
	style: {
		radius: 5,
		color: '#0af',
		opacity: 0.3
	},

	point: function(x, y){
		return ctx.circle({
			cx: x,
			cy: y,
			radius: this.style.radius,
			fill: this.style.color,
			stroke: this.style.stroke,
			opacity: this.style.opacity
		});
	},

	border: function(x, y, width, height){
		return ctx.rect({
			x: x,
			y: y,
			width: width,
			height: height,
			stroke: this.style.color,
			opacity: this.style.opacity
		});
	}
};

Delta.editors.transform = {
	enable: function(object){
		var bounds = object.bounds();
		if(!object._editorTransform){
			var controls = this.__controls;
			var lt, lb, rt, rb, border;

			object._editorTransform = {
				border: border = controls.border(bounds.x, bounds.y, bounds.width, bounds.height),
				lt: lt = controls.point(bounds.x1, bounds.y1),
				lb: lb = controls.point(bounds.x1, bounds.y2),
				rt: rt = controls.point(bounds.x2, bounds.y1),
				rb: rb = controls.point(bounds.x2, bounds.y2)
			};

			var ltDown, lbDown, rtDown, rbDown;

			window.addEventListener('mouseup', function(){
				ltDown = lbDown = rtDown = rbDown = null;
			});

			window.addEventListener('mousemove', function(e){
				var coords = object.context.contextCoords(e.clientX, e.clientY);
				if(ltDown){
					lt.attr({
						cx: coords[0],
						cy: coords[1]
					});

					lb.attr('cx', coords[0]);
					rt.attr('cy', coords[1]);

					border.attr({
						x1: coords[0],
						y1: coords[1]
					});

					object.transform(null);
					// attr scale?
					object.scale(
						border.attr('width') / ltDown.width,
						border.attr('height') / ltDown.height,
						'rb'
					);
				} else if(lbDown){
					lb.attr({
						cx: coords[0],
						cy: coords[1]
					});

					lt.attr('cx', coords[0]);
					rb.attr('cy', coords[1]);

					border.attr({
						x1: coords[0],
						y2: coords[1]
					});

					object.transform(null);
					// attr scale?
					object.scale(
						border.attr('width') / lbDown.width,
						border.attr('height') / lbDown.height,
						'rt'
					);
				} else if(rtDown){
					;
				} else if(rbDown){
					;
				}
			});

			// todo: add and use editor.draggable
			lt.on('mousedown', function(){
				ltDown = object.bounds();
			});
			lb.on('mousedown', function(){
				lbDown = object.bounds();
			});
			rt.on('mousedown', function(){
				rtDown = object.bounds();
			});
			rb.on('mousedown', function(){
				rbDown = object.bounds();
			});

		} else {
			object._editorTransform.border.attr('visible', true);
			object._editorTransform.lt.attr('visible', true);
			object._editorTransform.lb.attr('visible', true);
			object._editorTransform.rt.attr('visible', true);
			object._editorTransform.rb.attr('visible', true);
			// fix bounds
			// the object could change
		}
	},

	disable: function(object){
		;
	},

	attr: function(name, value){
		// for rect.editor('transform', properties);
	},

	__controls: Delta.editors.__commonControls
};

// Context
Context.prototype.toSVG = function(options){
	options = options || {};

	var svg = {
		root: {
			xmlns: 'http://www.w3.org/2000/svg',
			width: this.canvas.width,
			height: this.canvas.height
		},
		elements: []
	};

	this.elements.forEach(function(element){
		if(element.toSVG){
			svg.elements.push(element.toSVG(svg));
		}
	});

	if(options.format === 'string' || !options.format){
		// how about options.viewBox?
		var svgTag = '<svg xmlns="' + svg.root.xmlns + '" width="' +
				svg.root.width + '" height="' + svg.root.height +
				'" viewBox="0 0 ' + svg.root.width + ' ' + svg.root.height + '">';
		// <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
		return [
			svgTag,
			svg.elements.join('\n'),
			'</svg>'
		].join('\n');
	} else if(options.format === '...'){ // англ. слово "сырой" забыл
		return svg;
	} else if(options.format === 'dom'){
		// var elem = document.createElement('svg');
		;// dom node
	} else if(options.format === 'file'){
		// blob? dataurl?
	} else {
		throw 'Unknown SVG format "' + options.format + '"';
	}
};

// Drawable
var directSVGAttribute = function(value, name){
	return name + '="' + value + '"';
}

// градиенты должны храниться в атрибутах, зачем эта конверсия?
var styleToAttrConversion = {
	fillStyle: 'fill'
};

function rgbToHex(rgb){
	var r = rgb[0].toString(16),
		g = rgb[1].toString(16),
		b = rgb[2].toString(16);

	if(r.length === 1){
		r += r;
	}
	if(g.length === 1){
		g += g;
	}
	if(b.length === 1){
		b += b;
	}

	return '#' + r + g + b;
}

Drawable.prototype.attrHooks.fill.toSVG = function(value, name, svg){
	var fill = this.styles.fillStyle;
	if(fill){
		if(fill + '' === fill){
			fill = Delta.color(fill);
			return 'fill="' + (fill[3] === 1 ? rgbToHex(fill) : ('rgba(' + fill.join(',') + ')')) + '"';
		} else {
			// ...
			// svg.head.push({blablabla})
			// fill.toSVG()
		}
	} else {
		return 'fill="none"';
	}
};

Drawable.prototype.attrHooks.stroke.toSVG = function(value, name, svg){
	var stroke = this.styles.strokeStyle;
	if(!stroke){
		return '';
	}

	var result = '';
	if(stroke + '' === stroke){
		stroke = Delta.color(stroke);
		result = 'stroke="' + (stroke[3] === 1 ? rgbToHex(stroke) : ('rgba(' + stroke.join(',') + ')')) + '"'
	} else {
		// gradients
	}

	if(this.styles.lineWidth){
		result += ' stroke-width="' + this.styles.lineWidth + '"';
	}

	return result;
};

Drawable.prototype.toSVG = function(svg){
	if(!this.svgTagName){
		return '';
	}
	var attrs = Object.keys(this.attrs).reduce(function(result, attrName){
		if(this.attrHooks[attrName] && this.attrHooks[attrName].toSVG){
			return result + ' ' + this.attrHooks[attrName].toSVG.call(this, this.attrs[attrName], attrName, svg);
		}
		return result;
	}.bind(this), '');

	attrs = Object.keys(this.styles).reduce(function(result, attrName){
		attrName = styleToAttrConversion[attrName];
		if(attrName && this.attrHooks[attrName] && this.attrHooks[attrName].toSVG){
			return result + ' ' + this.attrHooks[attrName].toSVG.call(this, this.attrs[attrName], attrName, svg);
		}
		return result;
	}.bind(this), attrs);
	// если fill нет, то нужно поставить fill="none", иначе некоторые элементы заливаются автоматически

	return '<' + this.svgTagName + attrs + '/>';
};

// Rect
Rect.prototype.svgTagName = 'rect';

['x', 'y', 'width', 'height'].forEach(function(paramName){
	Rect.prototype.attrHooks[paramName].toSVG = directSVGAttribute;
});
/*

а теперь будет if(svgDoc.options.quickCalls)

Rect.prototype.toSVG = function(quickCalls, svgContext){
	// svgContext.style.push(...)
	// svgContext.head.push(...)
	// для фильтров и етс
	return (
		'<rect x="' + this.attrs.x + '" y="' + this.attrs.y +
		'" width="' + this.attrs.width + '" height="' + this.attrs.height + '"' +
		this.toSVGGetStyle() + '/>'
	);
}; */

// Circle
Circle.prototype.svgTagName = 'circle';

['cx', 'cy'].forEach(function(paramName){
	Circle.prototype.attrHooks[paramName].toSVG = directSVGAttribute;
});

Circle.prototype.attrHooks.radius.toSVG = function(value){
	return 'r="' + value + '"';
};


// Path
Path.prototype.svgTagName = 'path';
Path.prototype.attrHooks.d.toSVG = function(value, name, svg){
	var result = [];
	this.attrs.d.forEach(function(curve, i){
		result.push(curve.toSVG());
	}, this);
	return 'd="' + result.join(' ') + '"';
};

// Curve
Delta.curvesSVGNames = {
	moveTo: 'M',
	moveBy: 'm',
	lineTo: 'L',
	lineBy: 'l',
	horizontalLineTo: 'H',
	horizontalLineBy: 'h',
	verticalLineTo: 'V',
	verticalLineBy: 'v',
	bezierCurveTo: 'C',
	bezierCurveBy: 'c',
	shorthandCurveTo: 'S',
	shorthandCurveBy: 's',
	quadraticCurveTo: 'Q',
	quadraticCurveBy: 'q',
	shorthandQuadraticCurveTo: 'T',
	shorthandQuadraticCurveBy: 't',
	ellipticalArcTo: 'A',
	ellipticalArcBy: 'a',
	closePath: 'Z'
};

// todo: check about conversion between boolean and 1 / 0
Curve.prototype.toSVG = function(){
	return Delta.curvesSVGNames[this.method] ?
		Delta.curvesSVGNames[this.method] + this.attrs.args.join(',') :
		Curve.canvasFunctions[this.method].toSVG(this);
};

Curve.canvasFunctions.arc.toSVG = function(curve){
	// into ellipticalArcTo
};

Curve.canvasFunctions.arcTo.toSVG = function(curve){
	// into ellipticalArcTo
};

// Image
// toSVG(document){
// 	if(document.options.imagesToDataURL) <- 'all' / 'possible' (loaded not with data url but from rasterize, document Image, etc)
// }
// Text
// Gradient
// Pattern













Delta.drawGradientCurve = function(curve, ctx){
	var point, lastPoint;

	lastPoint = curve.curve(0);
	for(var i = 1; i < curve.detail; i++){
		point = curve.curve(i / curve.detail);
		ctx.beginPath();
		ctx.moveTo(lastPoint[0], lastPoint[1]);
		ctx.lineTo(point[0], point[1]);
		ctx.lineWidth = curve.width(i / curve.detail);
		ctx.stroke();
		lastPoint = point;
	}
};
Drawable.prototype.attrHooks.shadow = {
	set: function(value){
		this._useEnhancedShadow = !(value + '' === value || (
			value.length === undefined &&
			value.opacityDependence !== false &&
			+value.opacity !== value.opacity &&
			+value.size !== value.size));

		if(!this._useEnhancedShadow){
			Drawable.processShadow(value, this.styles);
		} else {
			// todo: make up a good way to delete items
			// without delete
			delete this.styles.shadowOffsetX;
			delete this.styles.shadowOffsetY;
			delete this.styles.shadowBlur;
			delete this.styles.shadowColor;

			if(!value.length){
				value = [value];
			}
		//	this.attrs.shadow = value;
		}

		this.update();
	}
};

var offsetForShadow = 1000;

var pre = Circle.prototype.draw;
Circle.prototype.draw = function(ctx){
	// вполне умещается в переопределение Renderer.pre
	if(this._useEnhancedShadow){
		ctx.save();
		ctx.translate(-offsetForShadow, -offsetForShadow);

		var thisContext = {
			attrs: {
				visible: true
			},
			context: {
				renderer: {
					pre: function(){},
					post: function(){}
				}
			}
		};
		// нам нужны только трансформации на самом деле
		// this.context.renderer.pre(ctx, this.styles, this.matrix, this);
		this.attrs.shadow.forEach(function(shadowElem){
			// нужно бы, чтобы offsetForShadow зависел ещё и от трансформаций самого канваса сейчас
			ctx.shadowOffsetX = (shadowElem.x || 0) + offsetForShadow;
			ctx.shadowOffsetY = (shadowElem.y || 0) + offsetForShadow;
			ctx.shadowColor = shadowElem.color;
			ctx.shadowBlur = shadowElem.blur || 0;
			if(shadowElem.size && shadowElem.size !== 1){
				;
			}
			pre.call(this, ctx);
		}, this);
		ctx.restore();
	}
	pre.call(this, ctx);
};


// boolean
function evenOddRule(x, y, poly){
	var c = false;
	for(var i = 0, j = poly.length - 1; i < poly.length; j = i, i++){
		if((poly[i][1] > y) !== (poly[j][1] > y) &&
			(x < (poly[j][0] - poly[i][0]) * (y - poly[i][1]) / (poly[j][1] - poly[i][1]) + poly[i][0])){
			c = !c;
		}
	}
	return c;
}

function lineIntersection(ax0, ay0, ax1, ay1, bx0, by0, bx1, by1){
	var d = (ax0 - ax1) * (by0 - by1) - (ay0 - ay1) * (bx0 - bx1);
	if(d === 0){
		return [];
	}

	var nx = (ax0 * ay1 - ay0 * ax1) * (bx0 - bx1) - (ax0 - ax1) * (bx0 * by1 - by0 * bx1),
		ny = (ax0 * ay1 - ay0 * ax1) * (by0 - by1) - (ay0 - ay1) * (bx0 * by1 - by0 * bx1);

	return [
		[nx / d | 0, ny / d | 0]
	];
}

function segmentIntersection(ax0, ay0, ax1, ay1, bx0, by0, bx1, by1){
	var d = (ax1 - ax0) * (by0 - by1) - (ay1 - ay0) * (bx0 - bx1);
	if(d === 0){
		return [];
	}

	var t = (bx0 - ax0) * (by0 - by1) - (by0 - ay0) * (bx0 - bx1);
	var w = (ax1 - ax0) * (by0 - ay0) - (bx0 - ax0) * (ay1 - ay0);

	t /= d;
	w /= d;

	if(t < 0 || t > 1 || w < 0 || w > 1){
		return [];
	}

	return [
		[
			ax0 + (ax1 - ax0) * t,
			ay0 + (ay1 - ay0) * t,
			t, w
		]
	];
}

function segmentQuadIntersection(ax0, ay0, ax1, ay1, ax2, ay2, bx0, by0, bx1, by1){
	var lineAngle = Math.atan2(by1 - by0, bx1 - bx0);
}

function pointInRect(x, y, x1, y1, x2, y2){
	return (
		x > x1 && y > y1 && x < x2 && y < y2
	);
}

function rectIntersect(ax1, ay1, ax2, ay2, bx1, by1, bx2, by2){
	/* return (
		((ax1 < bx1 && ay1 < by1) && (ax2 > bx1 && ay2 > by1))
		||
		((bx1 < ax1 && by1 < ay1) && (bx2 > ax1 && by2 > ay1))
	); */
/*
	return (
		pointInRect(ax1, ay1, bx1, by1, bx2, by2)
		||
		pointInRect(ax1, ay2, bx1, by1, bx2, by2)
		||
		pointInRect(ax2, ay1, bx1, by1, bx2, by2)
		||
		pointInRect(ax2, ay2, bx1, by1, bx2, by2)
		||
		// второй не нужно проверять!
		// точка одного во втором => точка второго в 1ом
		// нужно только понять, почему это не всегда работает, и пофиксить
		pointInRect(bx1, by1, ax1, ay1, ax2, ay2)
		||
		pointInRect(bx2, by1, ax1, ay1, ax2, ay2)
		||
		pointInRect(bx1, by2, ax1, ay1, ax2, ay2)
		||
		pointInRect(bx2, by2, ax1, ay1, ax2, ay2)
	); */

	// todo: check about normalizing coords (bx1 should be less than bx2, y analogously)

	// нужно проверять пересечение проекций на оси
	// кажется, как-то так
	return (
		(
			// intersection on x
			(ax1 > bx1 && ax1 < bx2) || (ax2 > bx1 && ax2 < bx2) // wrong? point doesn't have to lay inside projection... or not?
		) && (
			// intersection on y
			(ay1 > by1 && ay1 < by2) || (ay2 > by1 && ay2 < by2)
		)
	);
}

// http://noonat.github.io/intersect/

function polyIntersections(poly1, poly2){
	var intersection;
	return poly1.reduce(function(results, point1, i){
		if(i === 0){
			return results;
		}

		poly2.forEach(function(point2, j){
			if(j === 0){
				return;
			}

			intersection = segmentIntersection(
				poly1[i - 1][0], poly1[i - 1][1], point1[0], point1[1],
				poly2[j - 1][0], poly2[j - 1][1], point2[0], point2[1]
			);

			if(intersection.length !== 0){
				results.push(intersection);
			}
		});
		return results;
	}, []);
}
/*
function polyUnion(poly1, poly2){
	poly1 = poly1.slice();
	poly2 = poly2.slice();
	if(polyOrientArea(poly1) > 0){
		poly1.reverse();
	}
	if(polyOrientArea(poly2) > 0){
		poly2.reverse();
	}

	// note: if there are no intersections should return them both

	var intersection;
	var additions;
	var entry = !evenOddRule(poly1[0][0], poly1[0][1], poly2);
	var i, j;

	var breaker = 0;
	for(i = 1; i < poly1.length; i++){
		if(breaker++ > 50){
			throw 'too much of cicle';
		}

		additions = [];
		for(j = 1; j < poly2.length; j++){
			intersection = segmentIntersection(
				poly1[i - 1][0], poly1[i - 1][1], poly1[i][0], poly1[i][1],
				poly2[j - 1][0], poly2[j - 1][1], poly2[j][0], poly2[j][1]
			);

			if(intersection.length !== 0){
				intersection[0][4] = j;
				additions.push(intersection[0]);
			}
		}

		if(additions.length !== 0){
			// intersections has 't' param in the [2]
			// we should sort them by it bcs intersections must be added in right order
			additions.sort(function(a, b){
				return a[2] > b[2];
			});

			additions.forEach(function(addition){
				addition[5] = entry;
				entry = !entry;
			});

			poly1.splice.apply(poly1, [i, 0].concat(additions));
			i += additions.length;
		}
	}

	var result = [];
	var breaker = 0;
	for(i = 0; i < poly1.length; i++){
		if(breaker++ > 50){
			throw 'too much of cicle';
		}

		result.push(poly1[i]);

		if(poly1[i].length !== 2 && poly1[i][5]){

			// entry is here
			// if(i !== 2) continue;

			var cur = poly1[i],
				next = poly1[i + 1];

			for(j = cur[4]; j !== next[4]; j = j + 1 % poly2.length){
				if(breaker++ > 50){
					throw 'too much of cicle';
				}

				// console.log(j);
				// result.push(poly2[j]);
			}
		}
	}
	console.log(poly2);

	return result;
}
/* In the third phase, the result is generated. The algorithm starts
 * at an unprocessed intersection and picks the direction of traversal
 * based on the entry/exit flag: for an entry intersection it traverses
 * forward, and for an exit intersection it traverses in reverse.
 * Vertices are added to the result until the next intersection is found;
 * the algorithm then switches to the corresponding intersection vertex
 * in the other polygon and picks the traversal direction again using
 * the same rule. If the next intersection has already been processed,
 * the algorithm finishes the current component of the output and starts
 * again from an unprocessed intersection. The output is complete when
 * there are no more unprocessed intersections.
 */

// в greiner-hormann algo нужны полигоны с правильной ориентацией
// поэтому righthandrule
function polyOrientArea(poly){
	var area = 0;
	for(var i = 1; i < poly.length; i++){
		area += (poly[i - 1][0] * poly[i][1] - poly[i - 1][1] * poly[i][0]) / 2;
	}
	return area;
}


Delta.intersections = {};
Delta.intersections.lineIntersection = lineIntersection;
Delta.intersections.segmentIntersection = segmentIntersection;
Delta.intersections.segmentQuadIntersection = segmentQuadIntersection;
Delta.intersections.pointInRect = pointInRect;
Delta.intersections.evenOddRule = evenOddRule;
Delta.intersections.rectIntersect = rectIntersect;
Delta.intersections.polyIntersections = polyIntersections;
// Delta.intersections.polyUnion = polyUnion;

extend(Context.prototype.eventsHooks, {
	// TODO: touch support
	mousedrag: function(){
		var self = this,

			startObject = null,
			lastX = null,
			lastY = null,
			path = null;

		this.on('mousedown', function(e){
			path = [];
			startObject = e.targetObject;
		});

		window.addEventListener('mouseup', function(e){
			if(!path){
				return;
			}

			processEventObject(e, 'mousedragend');

			startObject = null;
			lastX = null;
			lastY = null;
			path = null;
		});

		window.addEventListener('mousemove', function(e){
			if(path === null){
				return;
			}

			e = processEventObject(e, 'mousedrag');
			path.push([e.contextX, e.contextY]);

			lastX = e.contextX;
			lastY = e.contextY;
		});

		function processEventObject(e, eventName){
			e = new MouseDragEvent(e, eventName);

			var propagation = true;

			e.cancelContextPropagation = function(){
				propagation = false;
			};

			e.dragPath = path;
			e.lastX = lastX;
			e.lastY = lastY;
			if(path.length){
				e.startX = path[0][0];
				e.startY = path[0][1];
			} else {
				e.startX = lastX;
				e.startY = lastY;
			}
			e.startObject = startObject;

			// add contextX, contextY
			var coords = self.contextCoords(e.clientX, e.clientY);
			e.contextX = coords[0];
			e.contextY = coords[1];

			// add deltas
			e.deltaX = lastX ? coords[0] - lastX : 0;
			e.deltaY = lastY ? coords[1] - lastY : 0;
			e.delta = Math.sqrt(e.deltaX * e.deltaX + e.deltaY * e.deltaY);

			e.startDeltaX = coords[0] - e.startX;
			e.startDeltaY = coords[1] - e.startY;
			e.startDelta = Math.sqrt(e.startDeltaX * e.startDeltaX + e.startDeltaY * e.startDeltaY);

			var checker = function(listener){
				var options = listener.options;
				if(!options){
					return true;
				}

				if(options.max){
					if(e.delta < options.max){
						return true;
					} else {
						var coefficient = e.delta / options.max;
						var i = 1;
						var delta = e.delta;
						while(delta > options.max){
							delta -= options.max;
							var evt = MouseDragEvent.clone(e);
							evt.contextX = lastX + (e.deltaX / coefficient) * i;
							evt.contextY = lastY + (e.deltaY / coefficient) * i;
							listener.call(null, evt);
							i++;
						}
					}
				}
				//return true;
				//if(options && options.min && e.delta < options.min){
				//	return false;
				//}
				//return true;
				return false;
			};
			/* 	if(d < delta){
		return;
	} else if(d > delta){
		var coef = d / delta;
		var i = 1;
		while(d > delta){
			d -= delta;
			var k = dy/dx;
			draw(
				last[0] + (dx / coef) * i,
				last[1] + (dy / coef) * i,
				getColor(e.clientX, e.clientY)
			);
			i++;
		}
	} else draw(e.clientX, e.clientY, getColor(e.clientX, e.clientY));
 */

			// call the event on the targetObject
			e.targetObject = self.getObjectInPoint(e.contextX, e.contextY, true);
			if(e.targetObject && e.targetObject.fire){
				if(!e.targetObject.fire(eventName, e, checker)){
					event.stopPropagation();
					event.preventDefault();
				}
			}

			if(propagation && !self.fire(eventName, e, checker)){
				e.stopPropagation();
				e.preventDefault();
			}
			return e;
		}
	}
});

Context.prototype.eventsHooks.mousedragend = Context.prototype.eventsHooks.mousedrag;

function MouseDragEvent(originalEvent, eventName){
	MouseDragEvent.propsToClone.forEach(function(prop){
		this[prop] = originalEvent[prop];
	}, this);

	this.originalEvent = originalEvent;
	this.type = eventName;
}

MouseDragEvent.propsToClone = [
	'altKey', 'ctrlKey', 'shiftKey', 'metaKey',
	'button', 'buttons', 'which',
	'clientX', 'clientY', 'layerX', 'layerY', 'pageX', 'pageY',
	'screenX', 'screenY', 'movementX', 'movementY', 'x', 'y',
	'target', 'view', 'timeStamp',
	'mozInputSource', 'mozPressure'
];

MouseDragEvent.clone = function(event){
	return Delta.extend(new MouseDragEvent(event.originalEvent, event.type), event);
};

Delta.MouseDragEvent = MouseDragEvent;

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
} else {
	window.Delta = Delta;
}

})(typeof window !== 'undefined' ? window : this);