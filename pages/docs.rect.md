Rect
===================
A rect. Parameters: `x`, `y` (left top corner coords), `width`, `height`.
	var rect = ctx.rect(10, 10, 200, 200, 'red', 'blue 2px');

Or
	var rect = ctx.rect({
		x: 10,
		y: 10,
		width: 200,
		height: 200,

		fill: 'red',
		stroke: 'blue 2px'
	});

## Methods
### x, y, width, height
Sets / returns properties.
	rect.x(); // -> 10
	rect.x(20);

	rect.y(); // -> 10
	rect.y(20);

	rect.width(); // -> 200
	rect.width(100);

	rect.height(); // -> 200
	rect.height(100);

### x1, y1, x2, y2
Top left corner and right bottom corner.
	rect.x1(); // -> 10
	rect.x1(0); // x: 0, width: 210

	rect.y1(); // -> 10
	rect.y1(0); // y: 0, height: 210

	rect.x2(); // -> 210
	rect.x2(200); // x: 0, width: 200

	rect.y2();
	rect.y2(200); // y: 0, height: 200

## Object
`Graphics2D.Rect` -- class.
	rect.width === Graphics2D.Rect.prototype.width;

`Graphics2D.rect` -- abstract objects without context.
	var rect = Graphics2D.rect(100, 100, 100, 100);
	rect.fill('red');
	rect.rotate(45);
	ctx.push(rect);