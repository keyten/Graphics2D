/*  DeltaJS Core {{version}}
 *
 *  Author: {{author}}
 *  Last edit: {{date}}
 *  License: {{license}}
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
// {{include utils.js}}
// {{include Class.js}}

// {{dont include Renderer.js}}

// {{include Context.js}}

Delta.contexts = {
	'2d': Context
};

// {{include Drawable.js}}

// {{include Animation.js}}

// {{include Rect.js}}

// {{include Circle.js}}

// {{include Curve.js}}
// {{dont include CurveMath.js}}
// {{dont include CurveCatmull.js}}
// {{dont include CurveHermite.js}}
// {{dont include CurveGeneralBezier.js}}
// {{dont include CurveLagrange.js}}
// {{dont include CurveRibbon.js}}
// {{dont include CurvePolyline.js}}

// {{include Path.js}}
// {{dont include Path.Math.js}}
// {{dont include Path.SVG.js}}

// {{include Image.js}}

// {{include Text.js}}

// {{include Gradient.js}}
// {{dont include GradientDiamond.js}}

// {{include Pattern.js}}

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

// {{include Adapter.Canvas.js}}

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