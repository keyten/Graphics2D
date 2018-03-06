**Концепт (пока не реализовано):**

```js
var hex = Delta.hexProjection({
	baseLength : 74,
	chordLength: 37,
	hexHeight  : 98
});
hex.pointToRgb(...);
hex.rgbToPoint(x, y, optionalPoint = [0, 1, 2, 3, 4, 5]);

// или
var hex = ctx.hex({
	bounds: [],

	...,

	images: {
		...
	} // fills hexes with patterns

	or

	content: ctx.polygon(...),
	attrs: {
		'0 0 0': { fill: './city.jpg' },
		'1 0 0': { opacity: 0.5 }
	}
	// тут можно и values, как в tileEngine
});

hex.on('click', e => {
	// e.hex - {r, g, b, element}
});

hex.on('click', {r: 3, g: 0, b: 0}, e => ...);

hex.getPoly(0, 0, 1);
```

Класс hexPoly, который описывает гекс.
```js
hex.poly(0, 0, 0); // -> hexPoly
```