**Концепт (пока не реализовано):**

```js
curve.attr({
	external: true,
	drawMethod: 'chunks', // chunks - линия от толщины делится на чанки и рисуется ими (можно делать curveGradient или там функцию заливки, которая будет принимать чанк); curve - обычное рисование кривой
	fill: ctx.gradient('curve', ['red', 'blue']),
	fillAngle: 90,
	width: 10,
	inverted: false
});

```