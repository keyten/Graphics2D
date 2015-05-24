Circle
===================
A circle. Parameters: `cx`, `cy` (center x, y), `radius`.
	var circle = ctx.circle(300, 300, 50, 'red', 'blue 2px');

Or
	var circle = ctx.circle({
		cx: 300,
		cy: 300,
		radius: 50,
		fill: 'red',
		stroke: 'blue 2px'
	});

## Methods
### cx, cy, radius
Sets / returns properties.
	circle.cx(); // -> 300
	circle.cx(200);

	circle.cy(); // -> 300
	circle.cy(200);

	circle.radius(); // -> 50
	circle.radius(100);

## Object
`Graphics2D.Circle` -- class.
	circle.radius === Graphics2D.Circle.prototype.radius;

`Graphics2D.circle` -- abstract objects without context.
	var circle = Graphics2D.circle(200, 200, 50);
	var b = circle.bounds();
	
	ctx.push(circle);