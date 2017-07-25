Graphics2D.Polygon
===================

Создаёт [правильный многоугольник](https://ru.wikipedia.org/wiki/Правильный_многоугольник) с указанным числом сторон, радиусом и центром.

### Создание
```js
ctx.polygon(cx, cy, radius, sides, 'black');
```
```js
ctx.polygon({
    cx: 300,
    cy: 300,
    radius: 200,
    sides: 5,

    fill:'red'
});
```

### Методы
#### cx, cy, radius, sides
Возвращают / изменяют координаты центра, радиус, количество сторон.

*Примечание: cx, cy, radius, sides можно анимировать.*
