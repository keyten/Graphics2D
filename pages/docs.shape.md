Shape
===================

Abstract class for shapes (all drawing objects inherits it).

You can create any object in two ways:

	// parameters
	ctx.rect(10, 10, 200, 200, 'black', '2px blue');

	// or object
	ctx.rect({
	    x: 10,
	    y: 10,
	    width: 200,
	    height: 200,
	    fill: 'black',
	    stroke: '2px blue',
	    opacity: 0.5 // additional property
	});

Available properties: `opacity`, `composite`, `visible`, `clip`.

Btw, you can create hidden objects - they will respond to events.

And you can use css units:

	ctx.rect('10pt', '10pt', '0.5em', '1em');

#### fill
Filling of the object:

	rect.fill('red');
	rect.fill(); // -> 'red'

Object with `colors` property is gradient.

	rect.fill({ colors:['red', 'green'], from:'top', to:'bottom' });
	rect.fill().from(); // -> 'top'

Image, object with `image` property, string starts from `http://`, `https://`, `./`, `../`, `data:image/`, `<svg` - is pattern.

	rect.fill('./image.jpg');

#### stroke
Object stroke:

	rect.stroke(); // -> { fill : 'black', width : 2 }
	rect.stroke({ fill:'red' });
	rect.stroke('black 4pt');

**Note: width - always in pixels.**

Available parameters:
 - `width` -- `2px`, `0.5em`, `8`...
 - `color` -- `#f00`, `green`, `rgb(0, 0, 0)`...
 - `join` -- `miter` / `bevel` / `round`.
 - `cap` -- `butt` / `square` / `round`.
 - `dash` -- `[1,2,2]`, `shortdash`, `shortdot`, `shortdashdot`, `shortdashdotdot`, `dot`, `dash`, `longdash`, `dashdot`, `longdashdot`, `longdashdotdot`.
 - opacity -- only in string; example: `green 0.5` instead of `rgba(0, 128, 0, 0.5)`.

	rect.stroke('0.5em round square [1,2] green 0.5');

Removing stroke:

	rect.stroke(null);

#### opacity
Opacity (float from 0 to 1).

#### composite
Blend mode.

Standart: `source-over`, `source-atop`, `source-in`, `source-out`, `destination-over`, `destination-atop`, `destination-in`, `destination-out`, `lighter`, `darker`, `copy`, `xor`.

In some browsers can be using: `normal`, `multiply`, `screen`, `overlay`, `darken`, `lighten`, `color-dodge`, `color-burn`, `hard-light`, `soft-light`, `difference`, `exclusion`, `hue`, `saturation`, `color`, `luminosity`.

W3C: http://dev.w3.org/fxtf/compositing-1
MDN: http://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Compositing

#### hide, show
Makes the object hidden / visible.

#### cursor
Sets a cursor to object:

	rect.cursor('pointer');
	rect.cursor(); // -> 'pointer'

Removing:

	rect.cursor(null);

#### z
Z-index.

In Graphics2D z-index -- is the element index in context elements collection. Each element has his unique z-index; objects with larger z-index will be drawn over objects with less z-index.

	var a = ctx.rect(10, 10, 200, 200);
	var b = ctx.circle(100, 100, 50);
	a.z(); // -> 0
	b.z(); // -> 1

	b.z(0);
	b.z(); // -> 0
	a.z(); // -> 1

You can also use `top` value:

	rect.z('top');

#### isPointIn(x, y)
Returns `true` if point *(x, y)* is in the shape.

#### clip(object)
Adds clip.

	var rect = ctx.rect(10, 10, 100, 100, 'red'),
		circle = ctx.circle(10, 10, 50);

	rect.clip(circle);
	rect.clip(); // -> circle

Removing clip:

	rect.clip(null);

And:

	// clipping by rect
	object.clip(x, y, width, height);

	// clipping by circle
	object.clip(cx, cy, radius);

	// clipping by path
	object.clip([[10, 10], [100, 100], [100,10], true]);

	// clipping by custom path
	object.clip({
		processPath : function(ctx){
			ctx.beginPath();
			ctx.moveTo(0, 0);
			ctx.lineTo(100, 0);
			ctx.lineTo(50, 100);
			ctx.closePath();
		}
	});

You can change the clip:

	object.clip(100, 100, 100, 100);
	object.clip().animate('rotate', 45);

#### clone(instance, events)
Clones object.

Instance = true: don't clone the style (any style changing will change the clone too). 
Events = true: don't clone the events.

	var r = ctx.rect(10, 10, 50, 50, 'red');
	var g = r.clone();
	var b = r.clone(true); // b is an instance

	g.fill('green'); // now g is green, r and b still is red
	b.fill('blue');  // then r is blue too, because `b` is instance of `r`

#### shadow(style)
With object:

	element.shadow({
		x: 0, y: 5, blur: 5, color:'gray'
	});

**Note: you can use `opacity` property.**

One parameter:

	element.shadow('x', '10px');
	element.shadow('x'); // -> 10

CSS-style:

	element.shadow('1px 1px 2px red');

Removing:

	element.shadow(null);

#### corner(corner, options)
Returns coords of the corner on object bounds.

	element.corner('top right'); // -> [x, y]

Options: transform (true / false), stroke (true / false). See `bounds`.

	element.corner('center', {
		transform: true,
		stroke: false
	});

Also:

	element.corner({ from:'bottom left', x:10, y:10 });
	// bottom left + [10, 10]

	element.corner({ from:'bottom left', x:10, y:10 }, { stroke:'exclude', transform:false });

#### bounds(options)
Returns bound box of the object.
`points` at options:

	object.bounds('points'); // -> { lt:[x, y], rt, lb, rb }
	// lt = left top, rb = right bottom

Or options is object with transform (true / false) and stroke (true / false / `exclude`).

	var b = object.bounds();
	var b = object.bounds({ transform: true, stroke: 'exclude' });

#### remove()
Removes the object.

#### mouse(state)
Switches on / off mouse events on element.

	rect.mouse(false);

### on( event, function )
Adds listener to element. Event object have 3 special properties.

	circle.on('click', function(e){
		// this == circle
		e.targetObject; // == circle
		e.contextX; // mouse coordinates on context
		e.contextY;
	});

*Note: you can use timers:*

	circle.on(1000, function(e){
		// this == circle
	});

*Quick calls:*

	circle.on('click', 'fill', 'red');

	// or:

	circle.on('click', function(){
		this.fill('red');
	});

### once( event, function )
Listener, that will be removed after first call.

### off( [event, [function]] )
Removes: 1. One listener. 2. All the listeners of an event. 3. All the listeners.

	shape.off('click', callback);
	shape.off('click');
	shape.off();

### fire( event, [data] )
Calls all the listeners of event.

	shape.on('click', function(data){
		console.log(data.text);
	});

	shape.fire('click', { text:'anytext' });
	// -> 'anytext' to console

### Aliases
With argument = `on`, without = `fire`.

	ctx.click(function(e){
		console.log(3);
	});
	ctx.click(); // = ctx.fire('click');

Available aliases:
 - `click`
 - `dblclick`
 - `mousedown`
 - `mouseup`
 - `mousemove`
 - `mouseover`
 - `mouseout`
 - `mousewheel`
 - `focus`
 - `blur`
 - `touchstart`
 - `touchmove`
 - `touchend`
 - `keypress`
 - `keydown`
 - `keyup`

#### draw( context2D )
Draws an object to the native 2D context.

	var context = canvas.getContext('2d');
	object.draw(context);

#### transform( m11, m21, m12, m22, m13, m23, [pivot] )
Sets a transform:

	shape.transform();
	// -> [m11, m21, m12, m22, m13, m23]

	shape.transform(1, 0, 0, 1, 0, 0);
	// nothing changed

	shape.transform(2, 0, 0, 0.5, 0, 0);
	// scale to 2 by x and to 0.5 by y

	shape.transform(1, 0, 0, 1, 10, 20);
	// translate to [10, 20]

	var pid4 = Math.PI / 4;
	shape.transform(Math.cos(pid4), Math.sin(pid4), -Math.sin(pid4), Math.cos(pid4), 0, 0);
	// rotate to 45 deg

	shape.transform(1, Math.tan(Math.PI / 4), Math.tan(Math.PI / 6), 1, 0, 0);
	// skew to 45 deg (pi/4) by y and to 30 deg (pi/6) by x

With pivot:

	var pid4 = Math.PI / 4;
	shape.transform(Math.cos(pid4), Math.sin(pid4), -Math.sin(pid4), Math.cos(pid4), 0, 0, 'center');
	// rotation around the shape's center

Removing:

	shape.transform(null);

#### scale( x, y, [pivot] )

	shape.scale(2);
	// to 2 by x, y

	shape.scale(2, 3);
	// to 2 by x and to 3 by y

	// with pivot (by default -- 'center')
	shape.scale(2, 'top left');
	shape.scale(2, 2, 'center');

#### rotate( angle, [pivot] )

	shape.rotate(45);

	// around the top left corner
	shape.rotate(10, 'top left');

	// radians:
	Graphics2D.angleUnit = 'rad';
	shape.rotate( Math.PI / 3 );

#### skew( x, y, [pivot] )
Also angles (degrees by default).

	shape.skew(10); // by x and y

	shape.skew(10, 10);

	shape.skew(10, 'top left');

	shape.skew(45, 0, 'top');

	Graphics2D.angleUnit = 'rad';
	shape.skew( Math.PI / 3, 0 );

#### translate( x, y )
Translates.

#### toDataURL( [type, [bounds] ] )
Bounds needed if the object hasn't `_bounds` method.

	img = shape.toDataURL('image/jpeg');
	img = shape.toDataURL('image/png', shape2.bounds() );

#### rasterize( [type, [bounds]] )
Rasterizes object.

	var raster = path.rasterize();
	path.remove();
	path = raster;

*Note: rasters are faster then big paths and complex objects with gradients, patterns, transforms and other.*
Example:

	// generate chaotic gradient
	var gradient = ctx.gradient(['red', 'green'], 'top', 'bottom');
	for(var i = 0; i < 50; i++)
		gradient.color(i / 50, randcolor());

	// the shape
	var path = ctx.path([[0, 0]], gradient, 'blue 3px');
	for(var i = 0; i < 50; i++)
		path.lineTo( Math.random() * 300, Math.random() * 300 );

	path.scale(0.5);

	// we will animate the raster instead of the path
	var raster = path.rasterize();
	path.remove();

	setInterval(function(){

		raster.rotate(1);

	}, 10);

	function randcolor(){
		return 'rgb(' + [Math.floor(Math.random() * 255), Math.floor(Math.random() * 255), Math.floor(Math.random() * 255)].join(',') + ')';
	}

#### animate( property, value, duration, easing, callback )

	shape.animate('rotate', 45);

	// duration = 1000 ms (1s)
	shape.animate('scale', 2, 1000);

	// easing
	shape.animate('translate', [0, 100], 500, 'bounceOut');

	// callback
	shape.animate('opacity', 0, 1000, 'sine', function(){
		this.remove();
	});

With properties in object:

	shape.animate({
		opacity: 1,
		translate: [-10, 10],
		rotate: 45,
		origin: 'top' // origin for transform
	}, 1000, 'elasticOut');

With parameters in object:
	
	shape.animate('rotate', 10, {
		duration: 450,
		easing: function(n){
			// n is a percent of the animation
			// (float, from 0 to 1)
			return Math.sin(n * Math.PI);
		}
	});

	shape.animate({
		rotate: 10,
		scale: 2,
		origin: [0, 0]
	}, {
		duration: 1000
	});

Queues:
	
	shape.animate('fill', 'red');
	shape.animate('stroke', '10pt green');

	// ignoring the queue:
	shape.animate('rotate', 30, {
		queue: false
	});