Graphics2D.Circle
===================

`Graphics2D.Circle` -- круг.

### Создание
```js
// cx, cy, radius, [fill], [stroke]
ctx.circle(300, 300, 100, 'black')
ctx.circle({
  cx: 300,
  cy: 300,
  radius: 200,
  fill:'red'
});
```

### Методы
#### cx, cy, radius
```js
var circ = ctx.circle(200, 200, 50);
rect.cx(); // -> 200
rect.radius(100);
rect.radius(); // -> 100
```
При вызове без параметров - возвращают. С параметром - устанавливают.