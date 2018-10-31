QUnit.module('Core.Path');
QUnit.test('attribute create', function(assert){
	var path;

	path = Delta.path([
		[10, 10],
		[100, 100]
	]);
	assert.ok(
		path instanceof Delta.Path,
		"Check if Delta.path creates valid Delta.Path"
	);
	// tofix: d should return the same value
	// but path.curves() should return the curves
	// tofix: x, y, should return 0, 0 by def
	/* assert.deepEqual(
		path.attr(['d', 'x', 'y']),
		[[
			[10, 10],
			[100, 100]
		], 0, 0],
		"Check if Delta.path sets [d, x = default, y = default] right"
	); */

	path = Delta.path([
		[10, 10],
		[100, 100]
	], 10, 15);
	assert.deepEqual(
		path.attr([/* 'd', */'x', 'y']),
		[10, 15],
		"Check if Delta.path sets [x, y] right"
	);

	path = Delta.path([
		[10, 10],
		[100, 100]
	], 'blue', 'red 5px');
	assert.deepEqual(
		path.attr(['fill', 'stroke']), // x, y = default
		['blue', 'red 5px'],
		"Check if Delta.path sets [fill, stroke] right"
	);

	path = Delta.path([
		[10, 10],
		[100, 100]
	], 'blue');
	assert.deepEqual(
		path.attr(['fill', 'stroke']), // x, y = default
		['blue', undefined],
		"Check if Delta.path sets [fill, stroke = undefined] right"
	);

	path = Delta.path([
		[10, 10],
		[100, 100]
	], null, 'red 5px');
	assert.deepEqual(
		path.attr(['fill', 'stroke']), // x, y = default
		[undefined, 'red 5px'],
		"Check if Delta.path sets [fill = undefined, stroke] right"
	);

	path = Delta.path([
		[10, 10],
		[100, 100]
	], 10, 15, 'blue', 'red 5px');
	assert.deepEqual(
		path.attr(['x', 'y', 'fill', 'stroke']),
		[10, 15, 'blue', 'red 5px'],
		"Check if Delta.path sets [x, y, fill, stroke] right"
	);

	path = Delta.path();
	assert.deepEqual(
		path.attr('d'),
		[],
		"Check if Delta.path creates empty path"
	);
});

QUnit.test('hash create', function(assert){
	var path;

	path = Delta.path({
		d: [
			[10, 10],
			[100, 100]
		]
	});
	assert.ok(
		path instanceof Delta.Path,
		"Check if Delta.path creates valid Delta.Path"
	);
	// tofix: d should return the same value
	// but path.curves() should return the curves
	// tofix: x, y, should return 0, 0 by def
	/* assert.deepEqual(
		path.attr(['d', 'x', 'y']),
		[[
			[10, 10],
			[100, 100]
		], 0, 0],
		"Check if Delta.path sets [d, x = default, y = default] right"
	); */

	path = Delta.path({
		d: [
			[10, 10],
			[100, 100]
		],
		x: 10,
		y: 15
	});
	assert.deepEqual(
		path.attr([/* 'd', */'x', 'y']), // tofix
		[10, 15],
		"Check if Delta.path sets [x, y] right"
	);

	path = Delta.path({
		x: 9
	});
	assert.deepEqual(
		path.attr('d'),
		[],
		"Check if Delta.path sets empty d right"
	);

	path = Delta.path([
		[10, 10],
		[100, 100]
	], 'blue');
	assert.deepEqual(
		path.attr(['fill', 'stroke']), // x, y = default
		['blue', undefined],
		"Check if Delta.path sets [fill, stroke = undefined] right"
	);

	// tofix
/*	path = Delta.path({
		fill: 'red',
		stroke: 'blue 3px',
		opacity: 0.4,
		shadow: '2px 2px black',
		rotate: 45
	});
	assert.deepEqual(
		path.attr(['fill', 'stroke', 'opacity', 'shadow', 'rotate']),
		['red', 'blue 3px', 0.4, '2px 2px black', 45],
		"Check if Delta.path sets extra properties (fill, stroke, opacity, shadow, rotate)"
	); */
});

QUnit.only('curves parsing', function(assert){
	var path, curve;

	path = Delta.path();
	assert.deepEqual(
		path.curves(),
		[],
		"Check undefined"
	);

	// tofix: d should return the same
	curve = Delta.curve('moveTo', 10, 10);
	path = Delta.path(curve);
	/*assert.deepEqual(
		path.curves(),
		[curve],
		"Check curve"
	); */
	assert.equal(
		curve.path,
		path,
		"Check if curve has connection with path"
	);
});
