**Концепт (пока не реализовано):**

HSV, HSB, CMYK, Lab

```js
var color = Delta.color('lab(0, 1, 1)');
ctx.rect(0, 0, 1, 1, color);

color.set('red');

color.getAs('rgb');
color.distance('blue', 'hsvPythagorian');
```