Path
===================
A path (contains curves).
	var path = ctx.path([
		[10, 10],
		[200, 200],
		[400, 10]
	], 'red', 'blue 5');

 - First point -- moveTo.
 - 2 arguments -- lineTo.
 - 4 arguments -- quadraticCurveTo.
 - 6 arguments -- bezierCurveTo.
 - `true` -- closePath.

 - First argument is string -- curve.

	var path = ctx.path([
		[10, 10],
		['arc', 100, 100, ...]
	]);

 - Curve:
	var path = ctx.path([
		new Graphics2D.Curve('lineTo', [10, 10])
	]);

## Methods
### curve
Returns / replaces a curve.
	var curve = path.curve(1);
	curve.x(); // -> 200

	// replace 2nd curve to moveTo
	path.curve(1, ['moveTo', 100, 100]);

	// replace 2nd curve to two curves
	path.curve(1, [[100, 100], ['moveTo', 200, 200]])

### curves
Returns / replaces all the curves.
	var curves = path.curves();
	// array with Curve objects

	path.curves([[100, 100], [200, 200]]);

### before
Puts a curve before other.
	// put a lineTo before 2nd
	path.before(1, [100, 100]);

### after
Puts a curve after.

### remove
Removes a curve.
	// remove the 2nd curve
	path.remove(1);

	// without parameters -- removes the path, inherited from Shape
	path.remove();

### push
Pushes a curve. Is used by other functions.
	path.push( new Graphics2D.Curve('lineTo', [100, 100]) );

### add
Adds a curve.
	path.add('lineTo', [200, 200]);

### Curve functions
 - `moveTo(x, y)`.
 - `lineTo(x, y)`.
 - `quadraticCurveTo(hx, hy, x, y)`.
 - `bezierCurveTo(h1x, h1y, h2x, h2y, x, y)`.
 - `arc(x, y, radius, start, end, clockwise)`.
 - `arcTo(x1, y1, x2, y2, radius, clockwise)`.
 - `closePath`.

	path.moveTo(100, 100);
	path.lineTo(200, 200);
	path.quadraticCurveTo(300, 200, 300, 100);
	path.closePath();

### merge
Merges a path with other.
	path.merge(path2);

## Object
`Graphics2D.Path` -- class.
	path.curve === Graphics2D.Path.prototype.curve;

`Graphics2D.path` -- abstract object without context.
	var path = Graphics2D.path([]);
	path.moveTo(10, 10);
	path.lineTo(200, 200);
	path.fill('red');
	
	ctx.push(path);