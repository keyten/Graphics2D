**Концепт (пока не реализовано):**

```js
var iso = Delta.isometricProjection(0.866, 0.5, 0.866);

var proj = Delta.isometricProjection({
	factor: [0.866, 0.5, 0.866],
	start: [10, 10],
	size: [5, 1, 1]
});

proj.to3D(x, y, optionalZ);
proj.toIsometric(x, y, z);
```

Maybe in the future:
```js
var iso = ctx.isometric(...);
var plane = iso.plane(...);
var box = iso.box(...);
...
```