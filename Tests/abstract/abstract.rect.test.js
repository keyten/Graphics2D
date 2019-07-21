QUnit.module('Core.Rect');
QUnit.test('attribute create', function(assert){
	var rect;

	rect = Delta.rect(1, 2, 3, 4);
	assert.ok(
		rect instanceof Delta.Rect,
		"Check if Delta.rect creates valid Delta.Rect"
	);
	assert.deepEqual(
		rect.attr(['x', 'y', 'width', 'height']),
		[1, 2, 3, 4],
		"Check if Delta.rect sets [x, y, width, height] right"
	);

	rect = Delta.rect(1, 2, 3, 4, 'red', 'blue 3px');
	assert.deepEqual(
		rect.attr(['fill', 'stroke']),
		['red', 'blue 3px'],
		"Check if Delta.rect sets [fill, stroke] right"
	);

	rect = Delta.rect(1, 2, 3, 4, 'blue');
	assert.deepEqual(
		rect.attr(['fill', 'stroke']),
		['blue', undefined],
		"Check if Delta.rect sets [fill, stroke = undefined] right"
	);

	rect = Delta.rect(1, 2, 3, 4, null, 'blue 3px');
	assert.deepEqual(
		rect.attr(['fill', 'stroke']),
		[null, 'blue 3px'],
		"Check if Delta.rect sets [fill = null, stroke] right"
	);

	rect = Delta.rect('1px', '2pt', '3em', '4in', 'red', 'blue 3px');
	assert.deepEqual(
		rect.attr(['x', 'y', 'width', 'height']),
		[1, 3, 48, 384],
		"Check if Delta.rect supports css values in [x, y, width, height]"
	);
});

QUnit.test('hash create', function(assert){
	var rect;

	rect = Delta.rect({
		x: 1,
		y: 2,
		width: 3,
		height: 4
	});
	assert.ok(
		rect instanceof Delta.Rect,
		"Check if Delta.rect creates valid Delta.Rect"
	);
	assert.deepEqual(
		rect.attr(['x', 'y', 'width', 'height']),
		[1, 2, 3, 4],
		"Check if Delta.rect sets [x, y, width, height] right"
	);

	rect = Delta.rect({
		x: 1,
		y: 2,
		width: 3,
		height: 4,

		fill: 'red',
		stroke: 'blue 3px',
		opacity: 0.4,
		shadow: '2px 2px black',
		rotate: 45
	});
	assert.deepEqual(
		rect.attr(['fill', 'stroke', 'opacity', 'shadow', 'rotate']),
		['red', 'blue 3px', 0.4, '2px 2px black', 45],
		"Check if Delta.rect sets extra properties (fill, stroke, opacity, shadow, rotate)"
	);

	rect = Delta.rect({
		x: '1px',
		y: '2pt',
		width: '3em',
		height: '4in'
	});
	assert.deepEqual(
		rect.attr(['x', 'y', 'width', 'height']),
		[1, 3, 48, 384],
		"Check if Delta.rect supports css values in [x, y, width, height]"
	);
});

QUnit.test('attrs x1, y1, x2, y2', function(assert){
	var rect = Delta.rect(10, 20, 100, 110);

	assert.deepEqual(
		rect.attr(['x1', 'y1', 'x2', 'y2']),
		[10, 20, 110, 130],
		"Check if rect gets [x1, y1, x2, y2] right"
	);

	rect.attr('x1', 0);
	assert.deepEqual(
		rect.attr(['x', 'y', 'width', 'height']),
		[0, 20, 110, 110],
		"Check if rect changes x1 right"
	);

	rect.attr('x1', 50);
	rect.attr('x2', 300);
	assert.deepEqual(
		rect.attr(['x', 'y', 'width', 'height']),
		[50, 20, 250, 110],
		"Check if rect changes x2 right"
	);

	rect.attr({
		x1: '1px',
		y1: '2pt',
		x2: '3em',
		y2: '4in'
	});
	assert.deepEqual(
		rect.attr(['x1', 'y1', 'x2', 'y2']),
		[1, 3, 48, 384],
		"Check if [x1, y1, x2, y2] support css values"
	);
});

QUnit.test('methods', function(assert){
	var rect;

	rect = Delta.rect(10, 20, 30, 40);
	assert.equal(
		rect.isPointIn(0, 0),
		false,
		"Check if isPointIn works right"
	);
	assert.equal(
		rect.isPointIn(30, 30),
		true,
		"Check if isPointIn works right"
	);
	assert.deepEqual(
		Object.assign({}, rect.bounds()),
		{
			x: 10,
			y: 20,
			width: 30, w: 30,
			height: 40, h: 40,

			x1: 10,
			y1: 20,
			x2: 40,
			y2: 60,

			cx: 25,
			cy: 40
		},
		"Check if bounds works right"
	);

	rect = Delta.rect(100, 100, -50, -50);
	assert.equal(
		rect.isPointIn(70, 70),
		true,
		"Check if isPointIn works right with negative size"
	);
	assert.equal(
		rect.isPointIn(120, 120),
		false,
		"Check if isPointIn works right with negative size"
	);
	assert.equal(
		rect.isPointIn(40, 40),
		false,
		"Check if isPointIn works right with negative size"
	);

	rect = Delta.rect(1, 2, 3, 4);
	var clone = rect.clone();
	assert.ok(
		clone instanceof Delta.Rect,
		"Check if clone is valid Delta.Rect"
	);
	assert.deepEqual(
		clone.attr(['x', 'y', 'width', 'height']),
		rect.attr(['x', 'y', 'width', 'height']),
		"Check if clone has the same geometry attrs"
	);
});
