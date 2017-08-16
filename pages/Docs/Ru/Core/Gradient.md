## Инициализация
```js
ctx.gradient(colors, from, to);
// на самом деле для разных видов градиентов может быть разное количество аргументов, там сначала arguments отдаётся на растерзание типу градиента, и лишь потом вытаскивается context
ctx.gradient(type, colors, from, to);

ctx.gradient({
  type, colors, [from, to / center, radius, etc]
});

Delta.gradient(...);
```

## Параметры
 - `colors`
 - `from`, `to`
 - для радиальных: `center`, `radius` (по умолч. `auto` - наименьший из длин в bounds()), `startRadius` (по умолч. 0), `highlight` ([0, 0] - смещение from от center)

## Методы
 - `clone()`.
 - `colors(t, [value])`.

## Инлайновые градиенты
```js
ctx.rect(10, 10, 200, 200, {
    colors, etc
});
```

/*
### Отдельный момент
Изменение градиента обновляет все залитые им фигуры. Например:
```js
var grad = ctx.gradient('linear', ['red', 'blue'], 'top', 'bottom');
var rect = ctx.rect(10, 10, 200, 200, grad);
grad.color(0.5, 'yellow'); // rect обновится с новым градиентом
```

А также можно сделать так:
```js
rect.fill().color(0); // -> ...
```

Стоит быть осторожным, если вы заливаете одним градиентом несколько объектов сразу.
*/