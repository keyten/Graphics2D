/*  Graphics2D More {{version}}
 * 
 *  Author: {{author}}
 *  Last edit: {{date}}
 *  License: {{license}}
 */

(function(window, $, undefined){

	var Context = $.Context,
		Shape = $.Shape,
		Rect = $.Rect,
		Circle = $.Circle,
		Curve = $.Curve,
		Path = $.Path,
		Img = $.Image,
		Text = $.Text,
		TextBlock = $.TextBlock,
		Gradient = $.Gradient,
		Pattern = $.Pattern,
		Class = $.Class,
		isHash = $.isObject,
		isObject = $.isObject,
		isString = $.isString,
		extend = $.extend,
		Bounds = $.Bounds;

	var Ellipse, Polygon, Star,

	pi2 = Math.PI * 2,
	emptyFunc = function(){};

//# Shapes

// {{include Shape.Ellipse.js}}
// {{include Shape.Polygon.js}}
// {{include Shape.Star.js}}
// {{include Shape.RoundRect.js}}


//# Typography
// {{include Typography.Letters.js}}


//# Curves

// {{include Curves.CatmullRom.js}}
// {{include Curves.Bezier.js}}
// {{include Curves.Utils.js}}
// {{include Curves.Gradients.js}}
// {{include PathUtils.js}}

//# Animation
// {{include Animation.Curves.js}} // -- bezier

//# Images

// {{include Filter.js}}
// {{include Imageanim.js}}
// {{don't include sprite.js}}
// {{don't include composites.js}}

//# SVG

// {{don't include svgpath.js}}


//# Utilities

// {{include Layers.js}}
// {{include Fullscreen.js}}
// {{include Colors.js}}
// {{don't include layers.js}}
// {{don't include particles.js}}
// {{don't include camera.js}}
// {{don't include events_keyboard.js}}

})( typeof window !== 'undefined' ? window : this, Graphics2D );