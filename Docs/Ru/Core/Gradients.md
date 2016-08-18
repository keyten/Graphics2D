Graphics2D.Gradient
===================

`Graphics2D.Gradient` - градиент.

Градиенты бывают линейные (`linear`) и радиальные (`radial`).

У линейных есть 2 точки - начало и конец.

У радиальных - эти точки ещё и имеют радиус. Кроме того, можно регулировать другими параметрами - `center` (центр), `hilite` (смещение, блик), `radius` (конечный радиус), `startRadius` (начальный радиус), `destination` (вместо радиуса - точка, до которой распространяется градиент).

```js
var g = ctx.gradient('linear', ['green', 'blue'], 'top', 'bottom');
var j = ctx.gradient('radial', { "0": 'blue', "0.5": 'red' }, [100,100,0], [100,100,100]);
var l = ctx.gradient({
  type: 'radial',
  colors: ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple'],
  center: 'center',
  startRadius: 10,
  radius: 100
});

ctx.rect(0, 0, 10, 10, g);
```

Кроме того, мы можем создать инлайновый градиент.
```js
ctx.rect(0, 0, 10, 10, {
  colors: ['red', 'transparent'],
  from: 'top',
  to: 'bottom',
  type: 'linear'
});
```

### Методы
#### colorMix(index)
Высчитывает средний цвет (возвращает массив).
```js
ctx.gradient('linear', ['white', 'black'], 'top', 'bottom')
    .colorMix(0.5); // -> [128, 128, 128, 1]
```

#### color(index, [value])
Возвращает / устанавливает цвет.
```js
grad.color(0); // -> "red"
grad.color(0, 'green');
```

#### colors([value])
Все цвета (возвращает в виде хэша `{индекс:цвет}`).
```js
grad.colors(); // -> {0:'red', 0.5:'green', 1:'blue'}
grad.colors(['red', 'blue']);
```

#### from / to
Возвращает / устанавливает. Работают все точки, как и у трансформаций (`left top`, `top`, `tl`, `[0,0]`, `{x:10, y:10}`).

С радиальными градиентами юзать массивы из 3 значений.

#### startRadius([value]) / radius([value])
#### center([x, y]) / hilite([x, y]) / destination([x, y])
Возвращают / устанавливают. Для `center` / `hilite` / `destination` можно передать 2 координаты, либо массив из 2 координат.


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
