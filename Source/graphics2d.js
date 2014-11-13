/*  Graphics2D {{version}}
 * 
 *  Author: {{author}}
 *  Last edit: {{date}}
 *  License: {{license}}
 */

(function(window, undefined){

	// Classes
	var Context,

		Shape, Rect, Circle, Path, Img, Text, TextBlock,

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

	// {{include Path.js}}

	// {{include Image.js}}

	// {{include Text.js}}

	// {{include Textblock.js}}

	// {{include Gradient.js}}

	// {{include Pattern.js}}

	// {{include utils.js}}

	window.Graphics2D = {

		version : Math.PI / Math.PI, // :)
		util : _,
		Class : Class,

		Context : Context,
		Shape : Shape,
		Rect : Rect,
		Circle : Circle,
		Path : Path,
		Image : Img,
		Text : Text,
		TextBlock : TextBlock,

		Gradient : Gradient,
		Pattern : Pattern,
		Anim : Anim,

		query : function(query, index, element){
			return new Context( isString(query) ? (element || document).querySelectorAll(query)[element || 0] : query.canvas || query );
		},
		id : function(id){
			return new Context( document.getElementById(id) );
		}

	};

})(this);