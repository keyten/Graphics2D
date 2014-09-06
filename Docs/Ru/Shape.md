Graphics2D.Shape
===================

`Graphics2D.Shape` -- объект, от которого наследуются другие рисуемые (`Rect`, `Circle`, `Path`, `Image`, `Text`, `TextBlock`) объекты.

Давайте рассмотрим их общие параметры.

### Создание
Несколько моментов. Пример:
```js
ctx.rect(10, 10, 200, 200, 'black', '2px black round');
```
Во всех объектах мы сначала передаём параметры самой фигуры, а после - заливку и обводку. Синтаксис обводки подробнее чуть позже. И заливки.

Кроме этого, мы можем передать объект, а с ним и дополнительные параметры:
```js
ctx.rect({
  x: 10,
  y: 10,
  width: 200,
  height: 200,
  fill: 'black',
  
  opacity:0.8,
  composite:'xor'
});
```
Параметры: `opacity`, `composite`, `visible`, `mask`.

Кстати, большинство параметров умеет принимать CSS-координаты:
```js
ctx.rect('10pt', '10pt', '0.5em' '1em');
```

### Методы:

#### fill([value])
Возвращает заливку элемента, либо устанавливает.
```js
rect.fill('red');
rect.fill(); // -> 'red'
```
Кроме этого... мы можем нарисовать сразу градиент:
```js
rect.fill({ colors:['red', 'green', 'black'], from:'top', to:'bottom' });
rect.fill().from(); // -> 'top'
```
А, ну и текстуру:
```js
rect.fill('./image.jpg');
```
За параметрами текстуры и градиента -- в их разделы.

#### stroke([value])
Возвращает объект с параметрами обводки, либо же её устанавливает.
```js
rect.stroke();
// -> {color, width, cap, join, dash}
rect.stroke('2px red');
rect.stroke('5px'); // изменяются только указанные параметры
rect.stroke();
// -> {color:'red', width:5} -- ширина уже просто-число
```
Собственно, возможные параметры:
- `width` / ширина -- `2px`, `0.5em`, `8` и т.п.
- `color` / цвет -- `#f00`, `green`, `rgb(0,0,0)` и т.п.
- `join`  / тип соединений -- `miter`, `bevel`, `round`.
- `cap`   / тип скруглений -- `butt`, `square`, `round`.
- `dash`  / пунктир -- `[1,2,2]`, `shortdash`, `shortdot`, `shortdashdot`, `shortdashdotdot`, `dot`, `dash`, `longdash`, `dashdot`, `longdashdot`, `longdashdotdot`.
- прозрачность -- `0.5`, `.3` -- всегда только float, указывается только в текстовом варианте, вычисляется сразу же (сделано для удобства -- например, `green 0.5`).
```js
rect.stroke('0.5em round square [1,2] green 0.5');
```
А ещё можно так:
```js
rect.stroke({ color:'black', width:'4px', cap:'butt', join:'round', dash:'dot' });
```

#### opacity([value])
Возвращает / устанавливает прозрачность (число от 0 до 1).

#### composite([value])
Возвращает / устанавливает функцию наложения. Варианты: `source-over`, `source-atop`, `source-in`, `source-out`, `destination-over`, `destination-atop`, `destination-in`, `destination-out`, `lighter`, `darker`, `copy`, `xor`.

Некоторые браузеры поддерживают немного больше (`normal`, `multiply`, `screen`, `overlay`, `darken`, `lighten`, `color-dodge`, `color-burn`, `hard-light`, `soft-light`, `difference`, `exclusion`, `hue`, `saturation`, `color`, `luminosity`), в любом случае вот стандарт: http://dev.w3.org/fxtf/compositing-1

#### hide() / show()
Делают элемент видимым (`show`) или невидимым (`hide`). Без анимации и т.п. Кроме того, невидимый элемент не реагирует на события (в отличие от полностью прозрачного).

#### cursor(value)
```js
rect.cursor('pointer');
```
Устанавливает курсор при наведении на элемент. *(пока работает не всегда корректно)*

#### z([value])
Возвращает z-index элемента, либо устанавливает.

Z-index в понятии Graphics2D -- это просто индекс элемента (а, соответственно, и каким по счёту отрисовывается):
```js
var a = ctx.rect(10, 10, 200, 200);
var b = ctx.circle(100, 100, 50);
a.z(); // -> 0
b.z(); // -> 1

b.z(0);
b.z(); // -> 0
a.z(); // -> 1
```

#### isPointIn(x, y)
Возвращает `true`, если точка `(x; y)` находится внутри объекта.

#### bounds
Возвращает прямоугольник (хитбокс) объекта. Содержит координаты левой верхней точки (`x`, `y` / `x1`, `y1`), правой нижней (`x2`, `y2`), ширину и высоту (`width`, `height` / `w`, `h`), координаты центра (`cx`, `cy`).

### События
Функции `on(event, func)`, `off(event, [func])`, `fire(event, [object])`, а также алиасы `click`, `dblclick`, `mousedown`, `mouseup`, `mousemove`, `mouseover`, `mouseout`, `mousewheel`, `focus`, `blur` работают абсолютно аналогично соответствующим функциям контекста, ну и вообще вряд ли нуждаются в объяснении.

### Трансформации
Все трансформации (кроме `translate`) принимают параметр `pivot` -- центр трансформации (например, в случае с `rotate` -- вокруг какой точки происходит вращение). Можно передать как абсолютные координаты (`[0,0]`, `{x:10, y:10}`), так и одну из точек фигуры: `left`, `right`, `top`, `bottom`, `left top` / `top left` / `lt` / `tl` и т.д.

По умолчанию точка -- центр фигуры.
#### scale
```js
rect.scale(2);
rect.scale(0.5, 0.5);
rect.scale(2, 'left top');
rect.scale(0.5, 0.5, 'center');
```
Увеличивает фигуру, можно передать как по x,y разные размеры, так и одинаковые.

#### rotate
```js
rect.rotate(45);
rect.rotate(10, 'left');
```
Поворачивает фигуру, указываются градусы (можно перевести градусы в радианы как `degree / 180 * Math.PI`, а налогично наоборот `rad / Math.PI * 180`).

#### skew
```js
rect.skew(10, 0);
rect.skew(5);
rect.skew(-10, 0, 'left');
rect.skew(-5, 'top');
```
"Сдвигает" фигуру. Указываются градусы.

#### translate(x, y)
```js
rect.translate(10, 10);
```
Сдвигает фигуру по осям координат. Полезно, когда мы по-разному трансформировали фигуру, у неё смещаются оси координат, и простое изменение её координат даст нам немного неожиданное поведение.

#### transform
```js
rect.transform(2, 0, 0, 1.5, 0, 0); // вокруг центра
rect.transform(0.5, 0, 0, 0.75, 0, 0, 'top');
```
Трансформирует фигуру. Как это делается, подробнее здесь: http://www.intuit.ru/studies/courses/1063/210/lecture/5434?page=5

### Анимация
Функция `animate`:
```js
rect.animate('width', '2em');
// param, value, duration, easing, after
rect.animate('width', 200,  3000, 'bounceOut', function(){ this.fill('blue'); });

rect.animate({ width:200, x:0 }, 3000, 'bounceOut', afterfunc);
rect.animate({ fill: 'red', stroke:'4px' }, {
 duration: 1000,
 easing: function(x){ return Math.pow(x, 4) },
 after: function(){ this.hide() }
});
```
Вроде бы всё понятно. Доступные параметры для анимирования:
- `opacity`
- `fill` (без поддержки градиентов и текстур)
- `stroke` (только цвет и ширина)
- `crop` -- для изображений
- `x`, `y`, `width`, `height`, `cx`, `cy`, `radius` -- параметры фигур
- `rotate`, `scale`, `scaleX`, `scaleY`, `skew`, `skewX`, `skewY`, `translate`, `translateX`, `translateY` -- трансформации. Все только вокруг центра фигуры, по-другому пока никак. Вот так: `skew:[10,3]` писать нельзя (пока что), нужно так: `skewX:10, skewY:3`.

Можно добавить свои...