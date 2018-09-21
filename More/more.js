/*  DeltaJS More {{version}}
 *
 *  Author: {{author}}
 *  Last edit: {{date}}
 *  License: {{license}}
 */

(function(more){

	if(typeof window !== 'undefined'){
		more(window, window.Delta);
	}

})(function(window, Delta, undefined){

	if(!Delta){
		throw 'Add DeltaJS Core before DeltaJS More';
		return;
	}

// Core classes
var Context = Delta.Context,
	Drawable = Delta.Drawable,
	Animation = Delta.Animation,
	Rect = Delta.Rect,
	Circle = Delta.Circle,
	Curve = Delta.Curve,
	Path = Delta.Path,
	Picture = Delta.Picture,
	Text = Delta.Text,
	Gradient = Delta.Gradient,
	Pattern = Delta.Pattern,

	Class = Delta.Class,

// More classes
	Ellipse, Polygon, Star,

// Local variables
	document = window.document,
	pi2 = Math.PI * 2,
	emptyFunc = function(){};

//# Shapes

// {{dont include Shape.Ellipse.js}}
// {{dont include Shape.Polygon.js}}
// {{dont include Shape.Star.js}}
// {{dont include Shape.RoundRect.js}}
// {{include Group.js}}

//# Typography
// {{dont include Typography.Letters.js}}


//# Curves

// {{dont include Curves.CatmullRom.js}}
// {{dont include Curves.Bezier.js}}
// {{dont include Curves.Utils.js}}
// {{dont include Curves.Gradients.js}}
// {{dont include PathUtils.js}}

//# Animation
// {{dont include Animation.Curves.js}} // -- bezier

//# Images

// {{dont include Filter.js}}
// {{dont include Imageanim.js}}
// {{don't include sprite.js}}
// {{don't include composites.js}}

//# SVG

// {{don't include svgpath.js}}


//# Utilities

// {{dont include Layers.js}}
// {{dont include Fullscreen.js}}
// {{dont include Colors.js}}
// {{don't include layers.js}}
// {{don't include particles.js}}
// {{don't include camera.js}}
// {{don't include events_keyboard.js}}

});