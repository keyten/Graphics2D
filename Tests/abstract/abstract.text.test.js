// TODO: css values
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
	// tofix: it SHOULDN'T SET font = Text.font by default
	// but it should return it in getter
	assert.deepEqual(
		text.attr('font'),
		// tofix
		Delta.Text.parseFont(Delta.Text.font),
		"Check if Delta.text sets Text.font by default"
	);

	text = Delta.text('Hello, world', 10, 20, 'Arial 10px');
	assert.deepEqual(
		text.attr(['text', 'x', 'y', 'font']),
		// tofix: нужно единообразие - как в stroke и shadow
		['Hello, world', 10, 20, {family: 'Arial', size: 10}],
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
		[undefined, 'blue 3px'],
		"Check if Delta.text sets [fill = null, stroke] right"
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
		// tofix
		Delta.Text.parseFont(Delta.Text.font),
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
		['Hello, world', 10, 20, {family: 'Arial', size: 15}],
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
});

QUnit.test('font parsing', function(assert){
	var text = Delta.text('', 0, 0);

	text.attr('font', 'Arial 10px italic bold');
	assert.deepEqual(
		text.attr('font'),
		{
			family: 'Arial',
			size: 10,
			italic: true,
			bold: true
		},
		"Check if font works right"
	);

	// tofix: shouldn't extend previous font!
	// make text.attr('font.size', '2em') instead
	// font converting is just a Context2D stuff by the way
	// as well as the breaking lines stuff
	text.attr('font', 'Arial Black 10px');
	assert.deepEqual(
		text.attr('font'),
		{
			family: 'Arial Black',
			size: 10,
			// tofix
			italic: true,
			bold: true
		},
		"Check if font supports multiword font names"
	);

	text.attr('font', '2em');
	assert.deepEqual(
		text.attr('font'),
		{
			size: 32,
			// tofix
			family: '',
			italic: true,
			bold: true
		},
		"Check if font supports css sizes"
	);

	text.attr('font', { family: 'Courier', size: 10, italic: true });
	assert.deepEqual(
		text.attr('font'),
		{
			family: 'Courier',
			size: 10,
			italic: true,
			// tofix
			bold: true
		},
		"Check if font supports hashes"
	);
});
