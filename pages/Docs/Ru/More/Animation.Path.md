# Animation.Path
Анимация превращения одного пути в другой, либо одной кривой в другую.

Анимирует параметры кривых друг между другом, поэтому кривые должны быть одного типа (можно анимировать bezierCurveTo в bezierCurveTo, но нельзя bezierCurveTo в quadraticCurveTo), а в случае анимаций путей — оба пути должны состоять из одинакового количества кривых одинакового типа.

Использование:
```js
// Кривые
curve.animate('args', anotherCurve);
// или
curve.animate('args', [10, 10, 200, 200, 100, 100]);
// или
curve.animate('args', {
	x: 10,
	y: 10
});

// Пути
path.animate('path', anotherPath);
```

## Примеры

```js
var path = ctx.path([
	[10, 10],
	[100, 250, 200, 200] // кривая с 4 аргументами — типа quadraticCurveTo
]);

path.curve(1).animate('args', ctx.curve('quadraticCurveTo', [100, 10, 200, 200]));
```