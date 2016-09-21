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
	Shape, Rect, Circle, Curve, Path, Img, Text, TextBlock,
	Gradient, Pattern, Bounds, Style,

// Local variables
	document = window.document,
	emptyFunc = function(){},
	toString = Object.prototype.toString,
	slice = Array.prototype.slice,
	reFloat = /^\d*\.\d+$/,
	domurl = window.URL || window.webkitURL || window,

	_ = new emptyFunc,
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
// {{include WebGL.js}}

// {{include Renderer.js}}

// {{include context.js}}

// {{include style.js}}

// {{include shape.js}}

// {{include rect.js}}

// {{include circle.js}}

// {{include curve.js}}

// {{include path.js}}

// {{include image.js}}

// {{include text.js}}

// {{include gradient.js}}

// {{include pattern.js}}

// {{include utils.js}}

$.Context = Context;
$.Shape = Shape;
$.Rect = Rect;
$.Circle = Circle;
$.Curve = Curve;
$.Path = Path;
$.Image = Img;
$.Text = Text;
$.TextBlock = TextBlock;
$.Gradient = Gradient;
$.Pattern = Pattern;

$.version = Math.PI / 3.490658503988659;

$.query = function(query, index, element, renderer){
	return new Context( isString(query) ? (element || window.document).querySelectorAll(query)[index || 0] : query.canvas || query, renderer );
};

$.id = function(id, renderer){
	return new Context( document.getElementById(id), renderer );
};

if( typeof module === 'object' && typeof module.exports === 'object' ){
	module.exports = $;
} else if( typeof define === 'function' && define.amd ){
	define([], function(){ return $; });
} else {
	window.Graphics2D = $;
}

})( typeof window !== 'undefined' ? window : this );