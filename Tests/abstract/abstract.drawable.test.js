// TODO: css values
QUnit.module('Core.Drawable');

QUnit.test('attribute stroke', function(assert){
	var drawable;

	drawable = new Delta.Drawable()
		.attr('stroke', '2px red');
	assert.equal(
		drawable.attr('stroke'),
		'2px red',
		"Check if attr stroke sets and returns simple string value."
	);
	assert.deepEqual(
		[
			drawable.styles,
			drawable.attrs.strokeDash,
			drawable.attrs.strokeDashOffset
		],
		[
			{
				strokeStyle: 'red',
				lineWidth: 2
			},
			undefined,
			undefined
		],
		"Check if attr stroke with simple value sets styles right."
	);

	drawable = new Delta.Drawable()
		.attr('stroke', '10pt rgba(255, 0, 255, 0.52) 0.9 round bevel 10ml [20, 20] 5do');
	assert.equal(
		drawable.attr('stroke'),
		'10pt rgba(255, 0, 255, 0.52) 0.9 round bevel 10ml [20, 20] 5do',
		"Check if attr stroke sets and returns complex string value."
	);
	assert.deepEqual(
		[
			drawable.styles,
			drawable.attrs.strokeDash,
			drawable.attrs.strokeDashOffset
		],
		[
			{
				strokeStyle: 'rgba(255,0,255,0.9)',
				lineWidth: 13,
				lineJoin: 'bevel',
				lineCap: 'round',
				miterLimit: 10
			},
			['20', '20'],
			5
		],
		"Check if attr stroke with complex value sets styles right."
	);

	drawable = new Delta.Drawable()
		.attr('stroke', '10pt rgba(255, 0, 255, 0.52) 0.9 round bevel 10ml [20, 20] 5do')
		.attr('stroke', null);
	assert.equal(
		drawable.attr('stroke'),
		null,
		"Check if setting null removes value."
	);
	assert.deepEqual(
		[
			drawable.styles.strokeStyle,
			drawable.styles.lineWidth,
			drawable.styles.lineJoin,
			drawable.styles.lineCap,
			drawable.styles.miterLimit,
			drawable.attrs.strokeDash,
			drawable.attrs.strokeDashOffset
		],
		[
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined
		],
		"Check if setting null removes styles."
	);

	drawable = new Delta.Drawable()
		.attr('stroke', {
			color: 'green',
			opacity: 0.5,
			width: '15pt',
			cap: 'round',
			join: 'bevel',
			miterLimit: 10,
			dash: 'dot',
			dashOffset: 3
		});
	assert.deepEqual(
		drawable.attr('stroke'),
		{
			color: 'green',
			opacity: 0.5,
			width: '15pt',
			cap: 'round',
			join: 'bevel',
			miterLimit: 10,
			dash: 'dot',
			dashOffset: 3
		},
		"Check if attr stroke sets and returns object value."
	);
	assert.deepEqual(
		[
			drawable.styles.strokeStyle,
			drawable.styles.lineWidth,
			drawable.styles.lineJoin,
			drawable.styles.lineCap,
			drawable.styles.miterLimit,
			drawable.attrs.strokeDash,
			drawable.attrs.strokeDashOffset
		],
		[
			'rgba(0,128,0,0.5)',
			20,
			'bevel',
			'round',
			10,
			[1, 3],
			3
		],
		"Check if attr stroke with complex value sets styles right."
	);
});

QUnit.test('attribute shadow', function(assert){
	var drawable;

	drawable = new Delta.Drawable()
		.attr('shadow', '10px 20px red');
	assert.equal(
		drawable.attr('shadow'),
		'10px 20px red',
		"Check if returns its string value"
	);
	assert.deepEqual(
		drawable.styles,
		{
			shadowOffsetX: 10,
			shadowOffsetY: 20,
			shadowColor: 'red'
		},
		"Check if no-blur sets styles right"
	);

	drawable = new Delta.Drawable()
		.attr('shadow', '10px 20px 5px red');
	assert.deepEqual(
		drawable.styles,
		{
			shadowOffsetX: 10,
			shadowOffsetY: 20,
			shadowBlur: 5,
			shadowColor: 'red'
		},
		"Check if with-blur sets styles right"
	);

	drawable = new Delta.Drawable()
		.attr('shadow', '10px 20px red')
		.attr('shadow', null);
	assert.deepEqual(
		drawable.styles,
		{},
		"Check if setting null removes styles"
	);

	drawable = new Delta.Drawable()
		.attr('shadow', '10px 20px 5px red')
		.attr('shadow', '1 2 blue');
	assert.deepEqual(
		drawable.styles,
		{
			shadowOffsetX: 1,
			shadowOffsetY: 2,
			shadowColor: 'blue'
		},
		"Check if changing value sets styles right"
	);

	drawable = new Delta.Drawable()
		.attr('shadow', {x: 10, y: 20, color: 'blue', blur: 3});
	assert.deepEqual(
		drawable.attr('shadow'),
		{x: 10, y: 20, color: 'blue', blur: 3},
		"Check if returns its object value"
	);
	assert.deepEqual(
		drawable.styles,
		{
			shadowOffsetX: 10,
			shadowOffsetY: 20,
			shadowBlur: 3,
			shadowColor: 'blue'
		},
		"Check if object sets styles right"
	);

	drawable = new Delta.Drawable()
		.attr('shadow', '10px 5px 8px green')
		.attr('shadow', {x: 1, y: 2, color: 'blue'});
	assert.deepEqual(
		drawable.styles,
		{
			shadowOffsetX: 1,
			shadowOffsetY: 2,
			shadowColor: 'blue'
		},
		"Check if object replaces string value"
	);
});

QUnit.test('attribute opacity', function(assert){
	var drawable;

	drawable = new Delta.Drawable()
		.attr('opacity', 0);
	assert.equal(
		drawable.attr('opacity'),
		0,
		"Check if returns its value"
	);
	assert.deepEqual(
		drawable.styles,
		{
			globalAlpha: 0
		},
		"Check if sets styles right"
	);

	drawable = new Delta.Drawable()
		.attr('opacity', '.9');
	assert.equal(
		drawable.attr('opacity'),
		0.9,
		"Check if converses its value to number"
	);
	assert.deepEqual(
		drawable.styles,
		{
			globalAlpha: 0.9
		},
		"Check if sets styles right with string passed"
	);
});

QUnit.test('attribute composite', function(assert){
	var drawable;

	drawable = new Delta.Drawable()
		.attr('composite', 'xor');
	assert.equal(
		drawable.attr('composite'),
		'xor',
		"Check if returns its value"
	);
	assert.deepEqual(
		drawable.styles,
		{
			globalCompositeOperation: 'xor'
		},
		"Check if sets styles right"
	);
});

QUnit.test('attribute filter', function(assert){
	var drawable;

	drawable = new Delta.Drawable()
		.attr('filter', 'blur(5px)');
	assert.equal(
		drawable.attr('filter'),
		'blur(5px)',
		"Check if returns its simple value"
	);
	assert.deepEqual(
		drawable.styles,
		{
			filter: 'blur(5px)'
		},
		"Check if sets styles right with simple value"
	);
});

/*
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
}); */
