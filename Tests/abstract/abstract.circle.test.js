// TODO: css values
QUnit.module('Core.Circle');
QUnit.test('attribute create', function(assert){
	var circle;

	circle = Delta.circle(1, 2, 3);
	assert.ok(
		circle instanceof Delta.Circle,
		"Check if Delta.circle creates valid Delta.Circle"
	);
	assert.deepEqual(
		circle.attr(['cx', 'cy', 'radius']),
		[1, 2, 3],
		"Check if Delta.circle sets [cx, cy, radius] right"
	);

	circle = Delta.circle(1, 2, 3, 'red', 'blue 3px');
	assert.deepEqual(
		circle.attr(['fill', 'stroke']),
		['red', 'blue 3px'],
		"Check if Delta.circle sets [fill, stroke] right"
	);

	circle = Delta.circle(1, 2, 3, 'blue');
	assert.deepEqual(
		circle.attr(['fill', 'stroke']),
		['blue', undefined],
		"Check if Delta.circle sets [fill, stroke = undefined] right"
	);

	circle = Delta.circle(1, 2, 3, null, 'blue 3px');
	assert.deepEqual(
		circle.attr(['fill', 'stroke']),
		[undefined, 'blue 3px'],
		"Check if Delta.circle sets [fill = null, stroke] right"
	);
});

QUnit.test('hash create', function(assert){
	var circle;

	circle = Delta.circle({
		cx: 1,
		cy: 2,
		radius: 3
	});
	assert.ok(
		circle instanceof Delta.Circle,
		"Check if Delta.circle creates valid Delta.Circle"
	);
	assert.deepEqual(
		circle.attr(['cx', 'cy', 'radius']),
		[1, 2, 3],
		"Check if Delta.circle sets [cx, cy, radius] right"
	);

	circle = Delta.circle({
		cx: 1,
		cy: 2,
		radius: 3,

		fill: 'red',
		stroke: 'blue 3px',
		opacity: 0.4,
		shadow: '2px 2px black',
		rotate: 45
	});
	assert.deepEqual(
		circle.attr(['fill', 'stroke', 'opacity', 'shadow', 'rotate']),
		['red', 'blue 3px', 0.4, '2px 2px black', 45],
		"Check if Delta.circle sets extra properties (fill, stroke, opacity, shadow, rotate)"
	);
});

QUnit.test('methods', function(assert){
	var circle = Delta.circle(100, 100, 30);

	assert.equal(
		circle.isPointIn(0, 0),
		false,
		"Check if isPointIn works right"
	);

	assert.equal(
		circle.isPointIn(100, 100),
		true,
		"Check if isPointIn works right"
	);

	assert.deepEqual(
		Object.assign({}, circle.bounds()),
		{
			cx: 100,
			cy: 100,

			x: 70,
			y: 70,
			width: 60, w: 60,
			height: 60, h: 60,

			x1: 70,
			y1: 70,
			x2: 130,
			y2: 130
		},
		"Check if bounds works right"
	);
});
