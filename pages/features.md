Features
=============================

### Object-oriented
Use objects instead of redraw loop:
	var rect = context.rect(10, 10, 200, 200, 'black');
	rect.x(40); // new coordinates
	rect.y(30);
	rect.stroke('3px blue');

### Events
	rect.on('click', function(e){
		rect.x1(e.contextX);
	});

### Caching
Rasterization:
	var object = ctx.rect(100, 100, 100, 100, {
		colors: ['red', 'green', 'blue'],
		from: 'top',
		to: 'bottom'
	}, '4px blue').rotate(45);
	var raster = object.rasterize();
	// and you can use raster instead of object:
	// raster is image, it's lighter to draw

### Animation
Animation...

### Touch devices support
Touch events; ...

### HDPI devices
Just use relative css units:
	var rect = context.rect('10pt', '10pt', '2em', '2em', {
		// gradient
		from: 'top left',
		to: 'bottom right',
		colors: ['green', 'blue']
	});

### API style
jQuery-style:
	var value = rect.x(); // getter
	rect.x( value + 5 ); // setter
	// setters call context redraw

Quick calls:
	rect.click('fill', 'red');
	// instead of:
	rect.click(function(){
		this.fill('red');
	});

### Shapes, creating your shapes & classes
XX basic shapes: rect, circle, in Core; ellipse, round rect, polygon, star in More.
And you can make new shapes:
	...

### Serialization, deserialization
	// serialize
	var els = JSON.stringify( ctx.elements );

	// deserialize
	ctx.elements = JSON.parse( els );