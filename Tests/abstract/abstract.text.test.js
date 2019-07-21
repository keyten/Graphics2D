QUnit.module('Core.Text');
QUnit.test('attribute create', function(assert){
	var text;

	text = Delta.text('Hello, world', 10, 20);
	assert.ok(
		text instanceof Delta.Text,
		"Check if Delta.text creates valid Delta.Text"
	);
	assert.deepEqual(
		text.attr(['text', 'x', 'y']),
		['Hello, world', 10, 20],
		"Check if Delta.text sets [text, x, y] right"
	);
	assert.deepEqual(
		text.attr('font'),
		Delta.Text.font,
		"Check if Delta.text sets Text.font by default"
	);

	text = Delta.text('Hello, world', 10, 20, 'Arial 10px');
	assert.deepEqual(
		text.attr(['text', 'x', 'y', 'font']),
		['Hello, world', 10, 20, 'Arial 10px'],
		"Check if Delta.text sets font right"
	);

	text = Delta.text('Hello, world', 10, 20, 'Arial 10px', 'red', 'blue 3px');
	assert.deepEqual(
		text.attr(['fill', 'stroke']),
		['red', 'blue 3px'],
		"Check if Delta.text sets [fill, stroke] right"
	);

	text = Delta.text('Hello, world', 10, 20, null, 'blue');
	assert.deepEqual(
		text.attr(['fill', 'stroke']),
		['blue', undefined],
		"Check if Delta.text sets [fill, stroke = undefined] right"
	);

	text = Delta.text('Hello, world', 10, 20, null, null, 'blue 3px');
	assert.deepEqual(
		text.attr(['fill', 'stroke']),
		[null, 'blue 3px'],
		"Check if Delta.text sets [fill = null, stroke] right"
	);

	text = Delta.text('Hello, world', '3em', '4in');
	assert.deepEqual(
		text.attr(['x', 'y']),
		[48, 384],
		"Check if Delta.text supports css values in [x, y]"
	);
});

QUnit.test('hash create', function(assert){
	var text;

	text = Delta.text({
		text: 'Hello, world',
		x: 10,
		y: 20
	});
	assert.ok(
		text instanceof Delta.Text,
		"Check if Delta.text creates valid Delta.Text"
	);
	assert.deepEqual(
		text.attr(['text', 'x', 'y']),
		['Hello, world', 10, 20],
		"Check if Delta.text sets [text, x, y] right"
	);
	assert.deepEqual(
		text.attr('font'),
		Delta.Text.font,
		"Check if Delta.text sets Text.font by default"
	);

	text = Delta.text({
		text: 'Hello, world',
		x: 10,
		y: 20,
		font: 'Arial 15px'
	});
	assert.deepEqual(
		text.attr(['text', 'x', 'y', 'font']),
		// tofix
		['Hello, world', 10, 20, 'Arial 15px'],
		"Check if Delta.text sets font right"
	);


	text = Delta.text({
		text: 'Hello, world',
		x: 10,
		y: 20,
		font: 'Arial 15px',

		fill: 'red',
		stroke: 'blue 3px',
		opacity: 0.4,
		shadow: '2px 2px black',
		rotate: 45
	});
	assert.deepEqual(
		text.attr(['fill', 'stroke', 'opacity', 'shadow', 'rotate']),
		['red', 'blue 3px', 0.4, '2px 2px black', 45],
		"Check if Delta.text sets extra properties (fill, stroke, opacity, shadow, rotate)"
	);

	text = Delta.text({
		text: 'Hello, world',
		x: '3em',
		y: '4in'
	});
	assert.deepEqual(
		text.attr(['x', 'y']),
		[48, 384],
		"Check if Delta.text supports css values in [x, y]"
	);
});

QUnit.test('font parsing', function(assert){
	assert.deepEqual(
		Delta.Text.parseFont('Arial 10px italic bold'),
		{
			family: 'Arial',
			size: 10,
			italic: true,
			bold: true
		},
		"Check if complex font is parsed right"
	);

	assert.deepEqual(
		Delta.Text.parseFont('Arial Black 10px'),
		{
			family: 'Arial Black',
			size: 10
		},
		"Check if multiword font name is parsed right"
	);

	assert.deepEqual(
		Delta.Text.parseFont('2em'),
		{
			size: 32,
			family: ''
		},
		"Check if css size is parsed right"
	);

	assert.deepEqual(
		Delta.Text.parseFont({family: 'Courier', size: 10, italic: true}),
		{
			family: 'Courier',
			size: 10,
			italic: true
		},
		"Check if parsing supports hashes"
	);
});

QUnit.test('attributes', function(assert){
	var text = Delta.text('Hello, world', 10, 20);

	text.attr('text', 12345)
	assert.equal(
		text.attr('text'),
		'12345',
		"Check if text is converted to string"
	);

	assert.equal(
		text.attr('align'),
		'left',
		"Check if align is left by default"
	);

	assert.equal(
		text.attr('baseline'),
		Delta.Text.baseline,
		"Check if baseline is Delta.Text.baseline by default"
	);
});

QUnit.test('string mode attributes', function(assert){
	var text = Delta.text('Hello, world', 10, 20);

	assert.equal(
		text.attr('mode'),
		'string',
		"Check if mode = string by default"
	);

	assert.equal(
		text.attr('maxStringWidth'),
		Infinity,
		"Check if maxStringWidth = Infinity by default"
	);

	text.attr('maxStringWidth', '3pt')
	assert.deepEqual(
		text.attr('maxStringWidth'),
		4,
		"Check if maxStringWidth supports css values"
	);
});

QUnit.test('block mode attributes', function(assert){
	var text = Delta.text({
		text: 'Hello, world',
		x: 10,
		y: 20,
		mode: 'block'
	});

	assert.equal(
		text.attr('trimLines'),
		true,
		"Check if trimLines = true by default"
	);

	assert.equal(
		text.attr('lineHeight'),
		'auto',
		"Check if lineHeight = auto by default"
	);

	text.attr('lineHeight', '3pt')
	assert.deepEqual(
		text.attr('lineHeight'),
		4,
		"Check if lineHeight supports css values"
	);

	assert.equal(
		text.attr('blockWidth'),
		Infinity,
		"Check if blockWidth = Infinity by default"
	);

	text.attr('blockWidth', '3pt')
	assert.deepEqual(
		text.attr('blockWidth'),
		4,
		"Check if blockWidth supports css values"
	);
});

// note: this all may not work with no browser
QUnit.test('methods', function(assert){
	var text = Delta.text('Hello, world', 10, 20);

	var width = text.measure();
	assert.equal(
		typeof width,
		'number',
		"Check if measure() returns valid number"
	);

	// note: this number may depend on the platform / browser
	assert.equal(
		width | 0,
		51,
		"Check if measure() returns ~ 51"
	);

	assert.equal(
		text.isPointIn(0, 0),
		false,
		"Check if isPointIn works right"
	);
	assert.equal(
		text.isPointIn(35, 25),
		true,
		"Check if isPointIn works right"
	);
	assert.deepEqual(
		Object.assign({}, text.bounds()),
		{
			cx: 35.983333587646484,
			cy: 25,

			x: 10,
			y: 20,
			width: 51.96666717529297, w: 51.96666717529297,
			height: 10, h: 10,

			x1: 10,
			y1: 20,
			x2: 61.96666717529297,
			y2: 30
		},
		"Check if bounds works right"
	);

	text = Delta.text('Text', 1, 2, 'Arial 5em');
	var clone = text.clone();
	assert.ok(
		clone instanceof Delta.Text,
		"Check if clone is valid Delta.Text"
	);
	assert.deepEqual(
		clone.attr(['text', 'x', 'y', 'font']),
		text.attr(['text', 'x', 'y', 'font']),
		"Check if clone has the same geometry attrs"
	);
});
