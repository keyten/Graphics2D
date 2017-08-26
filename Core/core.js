/*  Graphics2D Core {{version}}
 *
 *  Author: {{author}}
 *  Last edit: {{date}}
 *  License: {{license}}
 */

(function(window, undefined){

// The main graphics2D class
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
	extend = Object.assign ? Object.assign : function(dest, source){
		var keys = Object.keys(source),
			l = keys.length;
		while(l--){
			dest[keys[l]] = source[keys[l]];
		}
		return dest;
	}, // Object.assign is not deep as well as the polyfill

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

// {{include Renderer.js}}

// {{include Context.js}}

Delta.contexts = {
	'2d': Context
};

// {{include math.js}}

// {{include Drawable.js}}
// {{include Attrs.Transform.js}}

// {{include Animation.js}}

// {{include Rect.js}}

// {{include Circle.js}}

// {{include Curve.js}}
// {{include Curve.Math.js}}
// {{include Curve.Catmull.js}}
// {{include CurveHermite.js}}
// {{include Math.Line.js}}
// {{include Math.Quadratic.js}}
// {{include Math.Bezier.js}}

// {{include Path.js}}
// {{include Path.Math.js}}
// {{include Path.SVG.js}}

// {{include Image.js}}

// {{include Text.js}}

// {{include Gradient.js}}

// {{include Pattern.js}}

// {{include utils.js}}
// {{include Animation.Along.js}}
// {{include Animation.Morph.js}}
// {{include Curve.Approx.js}}

// {{include Context.WebGL.js}}
// {{include Rect.WebGL.js}}
// {{include Path.WebGL.js}}

// {{include Editor.Draggable.js}}
// {{include Editor.Transform.js}}

// {{include SVGExport.js}}

// {{include CurveGradient.js}}

Delta.version = "{{version}}";

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