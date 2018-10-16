**Концепт (пока не реализовано):**

```js
// прямое рисование пикселями
var mesh = ctx.mesh(coords, fill);

// заливка
var grad = ctx.gradient('mesh', [
	{ type: 'line', start: [100, 100], end: [200, 200], color: 'red', weight: 2 },
	{ type: 'line', start: [100, 200], end: [200, 100], colorStart: 'blue', colorEnd: 'green' },
	{ type: 'point', center: [0, 0] }, // можно сделать эллипс, если считать не совсем по теореме пифагора, а там отдельно координаты вроде
	{ type: 'function', distance: (x, y) => 0.1, color: 'blue' }
], {
	distanceFunc: t => t * t, // можно такое даже для каждого объекта отдельно делать
	resultWeightFunc: t => Math.sqrt(t) // проблемы с переносом в webgl возникнут
	// или можно так: distanceFunc: 'exp'
});
var circle = ctx.circle(100, 100, 50, grad);
```