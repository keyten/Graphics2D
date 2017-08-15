## Добавляет поддержку SVG-путей

```js
ctx.path('M10,10 L200,200 z');
```

## Новые виды кривых
```js
path.moveBy(x, y)
path.lineBy(x, y)
path.horizontalLineTo(x)
path.horizontalLineBy(x)
path.verticalLineTo(y)
path.verticalLineBy(y)
path.quadraticCurveBy
path.bezierCurveBy
path.shorthandCurveTo // quadratic?
path.smoothCurveTo // cubic?
path.shorthandCurveBy
path.smoothCurveBy
path.svgArcCurve

// также можно так:
var path = ctx.path([
	[10, 10],
	['lineBy', 0, 100]
]);
```

Объект команды SVG => имена кривых находится в `Delta.SVG.curves`:
```js
Delta.SVG.curves['L']; // 'lineTo'
Delta.SVG.curves['l']; // 'lineBy'

// можно расширять, например:
Delta.SVG.curves['R'] = 'catmullTo';
Delta.curves['catmullTo'] = Delta.class(Delta.Curve, {
    draw: function(){
        // ...
    }
});
```