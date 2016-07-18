// Easing functions
// Mootools :) partially
$.easing = {
	linear : function(x){
		return x;
	},
	root : function(x){
		return Math.sqrt(x);
	},
	pow : function(t, v){
		return Math.pow(t, v || 6);
	},
	expo : function(t, v){
		return Math.pow(v || 2, 8 * t - 8);
	},
	circ : function(t){
		return 1 - Math.sin(Math.acos(t));
	},
	sine : function(t){
		return 1 - Math.cos(t * Math.PI / 2);
	},
	back : function(t, v){
		return Math.pow(t, 2) * ( (v || 1.618) * (t - 1) + t);
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
	$.easing[name] = function(t){ return Math.pow(t, i+2); };
});

function processEasing(func){
	$.easing[i + 'In'] = func;
	$.easing[i + 'Out'] = function(t, v){
		return 1 - func(1 - t, v);
	};
	$.easing[i + 'InOut'] = function(t, v){
		return t <= 0.5 ? func(2 * t, v) / 2 : (2 - func(2 * (1 - t), v)) / 2;
	};
}

for(var i in $.easing){
	// don't make functions within a loop -- jshint
	if(Object.prototype.hasOwnProperty.call($.easing, i))
		processEasing($.easing[i]);
	// todo: make this code better :P
}


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

// Class
function Class(parent, properties, base){

	if(!properties) properties = parent, parent = null;

	var cls = function(){ return (cls.prototype.initialize || emptyFunc).apply(this,arguments); };
	if(parent){

		// go to the parent
		cls = function(){

			if(cls.prototype.__initialize__)
				return cls.prototype.__initialize__.apply(this,arguments);

			var inits = [],
				parent = this.constructor.parent;

			while(parent){
				inits.push(parent.prototype.initialize);
				parent = parent.parent;
			}
			for(var i = inits.length; i--;){
				if(inits[i])
					inits[i].apply(this, arguments);
			}

			if(cls.prototype.initialize && properties.initialize === cls.prototype.initialize)
				return cls.prototype.initialize.apply(this,arguments);
		};


		// prototype inheriting
		var sklass = function(){};
		sklass.prototype = parent.prototype;
		cls.prototype = new sklass();
		cls.parent = parent;
		cls.prototype.constructor = cls;

	}

	// why?
	if(base)
		extend(cls, base);
	if(properties.mixins){
		properties.mixins.forEach(function(mixin){
			extend(cls.prototype, mixin);
		});
	}

	extend(cls.prototype, properties);

	return cls;

}

// utils
function extend(a, b){
	for(var i in b){
		if(Object.prototype.hasOwnProperty.call(b,i))
			a[i] = b[i];
	}
	return a;
}

function argument(index){
	return function(value){
		return this.argument( index, value );
	};
}

// wrapper for quick calls
function wrap(args){
	var fn = args[1];
	args = slice.call(args, 2);
	return function(){
		this[fn].apply(this, args);
	};
}

function trim(str){
	return str.replace(/^\s+/, '').replace(/\s+$/, '');
}

// typeofs
function isString(a){
	return toString.call(a) === '[object String]';
}
function isBoolean(a){
	return toString.call(a) === '[object Boolean]';
}
function isArray(a) {
	return toString.call(a) === '[object Array]';
}
function isObject(a){
	return toString.call(a) === '[object Object]';
}
function isNumber(a){
	return toString.call(a) === '[object Number]';
}
function isNumberLike(value){
	if( isNumber(value) )
		return true;
	if( isString(value) && /^(\d+|(\d+)?\.\d+)(em|ex|ch|rem|vw|vh|vmin|vmax|cm|mm|in|px|pt|pc)?$/.test(value) )
		return true;
	return false;
}
// todo: Pattern.isPatternLike();
function isPatternLike(value){
	return value instanceof Image ||
			(isObject(value) && $.has(value, 'image')) ||
			(isString(value) && !(
				value.indexOf('http://') &&
				value.indexOf('https://') &&
				value.indexOf('./') &&
				value.indexOf('../') &&
				value.indexOf('data:image/') &&
				value.indexOf('<svg')
			) );
}

$.has = Function.prototype.call.bind(Object.prototype.hasOwnProperty);
$.Class = Class;
$.Bounds = Bounds;
$.extend = extend;
$.argument = argument;
$.wrap = wrap;
$.trim = trim;
$.isString = isString;
$.isBoolean = isBoolean;
$.isArray = isArray;
$.isObject = isObject;
$.isNumberLike = isNumberLike;
$.isNumber = isNumber;
$.isPatternLike = isPatternLike;


// constants
$.dashes = {
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

$.corners = {
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

$.colors = { // http://www.w3.org/TR/css3-color/#svg-color
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
	'chucknorris': 'c00000',
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


// Clean functions
$.clone = function(object){
	var result = new object.constructor();
	for(var i in object){
		if($.has(object, i)){
			if(typeof object[i] === 'object' && !(object[i] instanceof Context) && !(object[i] instanceof Image)){
				result[i] = _.clone(object[i]);
			} else {
				result[i] = object[i];
			}
		}
	}
	return result;
};


$.multiply = function(m1, m2){ // multiplies two 2D-transform matrices
	return [
		m1[0] * m2[0] + m1[2] * m2[1],
		m1[1] * m2[0] + m1[3] * m2[1],
		m1[0] * m2[2] + m1[2] * m2[3],
		m1[1] * m2[2] + m1[3] * m2[3],
		m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
		m1[1] * m2[4] + m1[3] * m2[5] + m1[5]
	];
};

// DOM
$.coordsOfElement = function(element){ // returns coords of a DOM element

	var box = element.getBoundingClientRect(),
		style = window.getComputedStyle(element);

	return {
		x: box.left + parseInt(style.borderLeftWidth) + parseInt(style.paddingLeft),
		y: box.top  + parseInt(style.borderTopWidth)  + parseInt(style.paddingTop)
	};

};

$.color = function(value){ // parses CSS-like colors (rgba(255,0,0,0.5), green, #f00...)
	if(value === undefined) return;
	if(!isString(value))
		throw 'Not a color: ' + value.toString();

	// rgba(255, 100, 20, 0.5)
	if(value.indexOf('rgb') === 0){
		value = value.substring(value.indexOf('(') + 1, value.length-1).replace(/\s/g, '').split(',').map(function(v){
			// rgba(100%, 0%, 50%, 1)
			if(v.indexOf('%') > 0)
				return Math.round(parseInt(v) * 2.55);
			return parseInt(v);
		});

		if(value.length === 3)
			value.push(1);

		return value;
	}
	// #bebebe
	else if(value.indexOf('#') === 0){
		// remove the # and turn into array
		value = value.substring(1);

		// #555
		if(value.length === 3)
			// todo: make this code faster & better
			value = value.split('').map(function(v){
				// 'f0a' -> 'ff00aa'
				return v + v;
			}).join('');
			// value = value[0] + value[0] + value[1] + value[1] + value[2] + value[2];

		return [parseInt(value.substring(0, 2), 16), parseInt(value.substring(2, 4), 16), parseInt(value.substring(4, 6), 16), 1];
	}
	// 'red'
	else if(value in $.colors)
		return $.color('#' + $.colors[value]);

	else if(value === 'rand')
		return [Math.round(Math.random() * 255), Math.round(Math.random() * 255), Math.round(Math.random() * 255), 1];

	return [0, 0, 0, 0];
};

$.angleUnit = 'grad';
$.unit = 'px';

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

$.snapToPixels = 0;

function distance(value, dontsnap){
	if(value === undefined) return;
	if(!value) return 0;
	if($.snapToPixels && !dontsnap)
		return Math.round($.distance(value, true) / $.snapToPixels) * $.snapToPixels;

	if( isNumber(value) ){
		if( $.unit !== 'px')
			return $.distance( value + '' + $.unit );

		return value;
	}

	value += '';
	if(value.indexOf('px') === value.length-2)
		return parseInt(value);

	if(!$.units){

		if( !document )
			$.units = defaultUnits;

		else {
			var div = document.createElement('div');
			document.body.appendChild(div); // FF don't need this :)
			$.units = {};
			units.forEach(function(unit){
				div.style.width = '1' + unit;
				$.units[unit] = parseFloat(getComputedStyle(div).width);
			});
			document.body.removeChild(div);
		}
	}

	var unit = value.replace(/[\d\.]+?/g, '');
	value = value.replace(/[^\d\.]+?/g, '');
	if(unit === '')
		return value;
	return Math.round($.units[unit] * value);
}

$.distance = distance;