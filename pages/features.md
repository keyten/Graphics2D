Features
=============================

### Object-oriented
Use objects instead of redraw loop:
```
var rect = ctx.rect({
	x: 10,
	y: 10,
	width: 200,
	height: 200,
	fill: 'black'
});

// setting width to 100
rect.attr('width', 100);

// adding a stroke
rect.attr('stroke', '3px blue');
```

Delta's API is pretty much like jQuery, it's like jQuery for canvas:
```
var value = rect.attr(); // getter
rect.attr('x', value + 5); // setter
```

### Mouse events
You don't have to compute whether the mouse coords are in your shape. Just process events as you usually do.
```
rect.on('click', e => {
	rect.attr('opacity', Math.random());
});
```

You also can use quick calls:
```
rect.click('fill', 'red');

// same as:
rect.click(function(){
	this.fill('red');
});
```

### Animation
Built-in animation support:
```
var rect = ctx.rect(0, 0, 50, 50, 'blue');
ctx.on('click', e => {
	rect.animate({
		x: e.contextX
	});
});
```

### Paths and curves
Standart canvas curves support. Plugins also add support of Catmull-Rom, Lagrange curves, B-Spline and etc.
```
var path = ctx.path([
	[10, 10], // same as ['moveTo', 10, 10]
	[200, 200], // same as ['lineTo', 200, 200]
	[100, 300, 10, 200], // same as ['quadraticCurveTo', 100, 300, 10, 200]
	['closePath']
], null, '2px green');
```

You also can manipulate curves of the path:
```
var curve = path.curve(2); // quadraticCurveTo

ctx.on('mousemove', e => {
	curve.attr({
		x: e.contextX,
		y: e.contextY
	});
});
```

### Touch devices support
Touch events:
```
ctx.on('touchmove', e => {
	e.touches.forEach(touch => {
		ctx.circle({
			cx: touch.contextX,
			cy: touch.contextY,
			radius: 20,
			fill: 'red'
		});
	});
});
```

### HDPI devices
Use relative css units:
```
var rect = context.rect('10pt', '10pt', '2em', '2em', 'green');
```
Or just change your context dpi:
```
ctx.attr('dpi', 1.5);
```