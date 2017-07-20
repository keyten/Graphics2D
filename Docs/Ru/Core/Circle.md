Delta.Circle
===================

`Delta.Circle` — круг.

Параметры: `cx`, `cy`, `radius' — координаты центра и радиус.

### Создание
Можно создать двумя способами — передавая список аргументов или же объект с параметрами. Во втором случае можно дополнительно передать свойства `opacity`, `composite`, `clip`, `visible`.
```js
// cx, cy, [fill], [stroke]
ctx.circle(200, 200, 50, 'black');

ctx.circle({
    cx: 200,
    y: 200,
    radius: 50,

    // любой из следующих параметров необязателен
    fill: 'red',
    stroke: 'blur 3px round'
});
```

### Параметры
Можно получать или изменять текущие параметры фигуры с помощью функции `attr`:

#### cx, cy, radius
```js
var circ = ctx.circle(200, 200, 50);

rect.attr('cx'); // -> 200
rect.attr('radius', 100);
rect.attr('radius'); // -> 100
```