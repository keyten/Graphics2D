/*  Graphics2D Core {{version}}
 *
 *  Author: {{author}}
 *  Last edit: {{date}}
 *  License: {{license}}
 */

(function(window, undefined){

// The main graphics2D class
var $ = {},

// Classes
	Context,
	Drawable,
	Animation,
	Rect, Circle, Curve, Path, Picture, Raster, Text,
	Gradient, Pattern,

// Local variables
	document = window.document,
	emptyFunc = function(){},
	toString = Object.prototype.toString,
	slice = Array.prototype.slice,
	has = Function.prototype.call.bind(Object.prototype.hasOwnProperty),
	reFloat = /^\d*\.\d+$/,
	reNumberLike = /^(\d+|(\d+)?\.\d+)(em|ex|ch|rem|vw|vh|vmin|vmax|cm|mm|in|px|pt|pc)?$/,
	domurl = window.URL || window.webkitURL || window,

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

$.renderers = {};

// {{include Renderer.js}}

// {{include Context.js}}

// {{include Drawable.js}}

// {{include Animation.js}}

// {{include Rect.js}}

// {{include Circle.js}}

// {{include Curve.js}}

// {{include Path.js}}

// {{include Image.js}}

// {{include Raster.js}}

// {{don't include Text.js}}

// {{include Gradient.js}}

// {{include Pattern.js}}

// {{include utils.js}}

$.version = Math.PI / 3.490658503988659;

$.query = function(query, index, element, renderer){
	return new Context( (query + '' === query) ? (element || window.document).querySelectorAll(query)[index || 0] : query.canvas || query, renderer );
};

$.id = function(id, renderer){
	return new Context( document.getElementById(id), renderer );
};

if(typeof module === 'object' && typeof module.exports === 'object'){
	module.exports = $;
} else if(typeof define === 'function' && define.amd){
	// todo: define with a name?
	define([], function(){
		return $;
	});
} else {
	window.Graphics2D = $;
}

})(typeof window !== 'undefined' ? window : this);