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

// {{include ellipse.js}}
// {{include polygon.js}}
// {{include star.js}}
// {{include roundrect.js}}


//# Curves

// {{include catmullrom.js}}
// {{include bezier.js}}
// {{include curves.js}}
// {{don't include paths.js}}

//# Animation
// {{include pathanim.js}} // -- bezier

//# Images

// {{include filter.js}}
// {{include imageanim.js}}
// {{don't include sprite.js}}
// {{don't include composites.js}}

//# SVG

// {{don't include svgpath.js}}


//# Utilities

// {{include fullscreen.js}}
// {{don't include layers.js}}
// {{don't include particles.js}}
// {{don't include camera.js}}
// {{don't include events_keyboard.js}}

$.Ellipse = Ellipse;
$.Polygon = Polygon;
$.Star = Star;
$.ImageAnim = ImageAnim;

})( typeof window !== 'undefined' ? window : this, Graphics2D );