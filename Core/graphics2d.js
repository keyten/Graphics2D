/*  Graphics2D {{version}}
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
	Gradient, Pattern, Anim, Bounds,

// Local variables
	emptyFunc = function(){},
	toString = Object.prototype.toString,
	slice = Array.prototype.slice,

	_ = new function(){},
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


// {{include context.js}}

// {{include shape.js}}

// {{include rect.js}}

// {{include circle.js}}

// {{include curve.js}}

// {{include path.js}}

// {{include image.js}}

// {{include text.js}}

// {{include textblock.js}}

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

$.query = function(query, index, element){
	return new Context( isString(query) ? (element || window.document).querySelectorAll(query)[index || 0] : query.canvas || query );
};

$.id = function(id){
	return new Context( document.getElementById(id) );
};

$.util = _;


if( typeof module === 'object' && typeof module.exports === 'object' ){
	module.exports = $;
} else {
	window.Graphics2D = $;
}

if( typeof define === 'function' && define.amd ){
	define( [], function(){ return $; } );
}

})( typeof window !== 'undefined' ? window : this );