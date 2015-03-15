/*  Graphics2D {{version}}
 * 
 *  Author: {{author}}
 *  Last edit: {{date}}
 *  License: {{license}}
 */

(function(window, undefined){

	// The main graphics2D class
	var $ = {};

	// Classes
	var Context,

		Shape, Rect, Circle, Curve, Path, Img, Text, TextBlock,

		Gradient, Pattern, Anim, Bounds;

	// Local variables
	var emptyFunc = function(){},
		_ = {},
		toString = Object.prototype.toString,
		requestAnimationFrame =
				window.requestAnimationFrame		||
				window.webkitRequestAnimationFrame	||
				window.mozRequestAnimationFrame		||
				window.oRequestAnimationFrame		||
				window.msRequestAnimationFrame		||
				window.setTimeout,
		cancelAnimationFrame =
				window.cancelAnimationFrame			||
				window.webkitCancelAnimationFrame	||
				window.mozCancelAnimationFrame		||
				window.oCancelAnimationFrame		||
				window.msCancelAnimationFrame		||

				window.cancelRequestAnimationFrame			||
				window.webkitCancelRequestAnimationFrame	||
				window.mozCancelRequestAnimationFrame		||
				window.oCancelRequestAnimationFrame			||
				window.msCancelRequestAnimationFrame		||

				window.clearTimeout;


// {{include Context.js}}

// {{include Shape.js}}

// {{include Rect.js}}

// {{include Circle.js}}

// {{include Curve.js}}

// {{include Path.js}}

// {{include Image.js}}

// {{include Text.js}}

// {{include Textblock.js}}

// {{include Gradient.js}}

// {{include Pattern.js}}

// {{include utils.js}}

	$.version = Math.PI / 3.490658503988659;

	$.query = function(query, index, element){
		// TODO: test
		return new Context( isString(query) ? (element || document).querySelectorAll(query)[index || 0] : query.canvas || query );
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

})( typeof window !== 'undefined' ? window : this );