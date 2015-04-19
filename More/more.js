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
		extend = $.extend;

	var Ellipse, Polygon, Star,

	pi2 = Math.PI * 2,
	emptyFunc = function(){};

// {{include ellipse.js}}

// {{include polygon.js}}

// {{include star.js}}

// {{include roundrect.js}}


// {{include catmullrom.js}}

// {{include bezier.js}}

// {{include curves.js}}

// {{include animation.js}}


// {{include filter.js}}

// {{include fullscreen.js}}

// {{include imageanim.js}}

// {{don't include sprite.js}}

// {{don't include layers.js}}

// {{don't include particles.js}}

// {{don't include svgpath.js}}

// {{don't include composites.js}}

// {{include events_keyboard.js}}

$.Ellipse = Ellipse;
$.Polygon = Polygon;
$.Star = Star;
$.ImageAnim = ImageAnim;

})( typeof window !== 'undefined' ? window : this, Graphics2D );