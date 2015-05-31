Text
===================
A text. Parameters: `text`, `[font]`, `x`, `y`, `fill`, `stroke`.

	var text = ctx.text('Hello, world\n:)', 10, 10, 'black');
	var text2 = ctx.text('Kyle Katarn, at your service...', 'Arial 12pt', 10, 50, 'red');

Or

	var text = ctx.text({
		text: loremIpsumText,
		font: 'Arial 15pt',
		x: 10,
		y: 10,

		align: 'center',
		width: 100,
		baseline: 'top',

		fill: 'blue'
	});

*Note: if you're using width (the block's width), then adding auto breaklines.*

## Methods
### x, y
Sets / returns properties.

	text.x(); // -> 10
	text.x(20);

	text.y(); // -> 10
	text.y(20);

### width
The block's max width.

	text.width(); // -> 200
	text.width(100);

Or the text width:

	var t = ctx.text('Hey, G2D :P', 10, 10);
	t.width(); // -> (number in pixels)

### breaklines
Boolean.

	text.breaklines(false);

### font

	text.font(); // -> { family (string), size (int), bold, italic (bool) }

	text.font(true); // -> 'Arial 12px'

	text.font('Comic Sans MS 2px bold');
	// or:
	text.font('bold 2px Comic Sans MS');
	// or:
	text.font('Comic 2px Sans bold MS');

	// P.S. Don't use Comic Sans

	// text.font({ family: 'Arial', bold: true });

### align
Default: `left`. Also: `center`, `right`.

	text.align();
	text.align('center');

### baseline
Vertical align.

## Object
`Graphics2D.Text` -- class.

	text.width === Graphics2D.Text.prototype.width;

`Graphics2D.text` -- abstract objects without context.

	var text = Graphics2D.text('There is no spoon', 10, 10);
	text.fill('red');
	text.rotate(3);
	ctx.push(text);