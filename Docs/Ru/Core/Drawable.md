# Delta.Drawable

`Delta.Drawable` — абстрактный класс, от которого наследуются все рисуемые объекты: `Rect`, `Circle`, `Path`, `Image`, `Text`, а также кастомные объекты (созданные через `ctx.object`). Про создание кастомных объектов см. здесь.

Здесь перечислены их общие методы, а также некоторые другие общие особенности.

## Создание
Любой объект можно создать двумя способами — передавая список аргументов или же объект с параметрами.

В первом случае первыми передаются параметры самого объекта, затем заливка и обводка (`fill` и `stroke`). Вместо заливки или обводки можно указать `null` или `undefined`.
```js
// квадрат с заливкой и обводкой
ctx.rect(10, 10, 200, 200, 'black', '2px black round');

// квадрат без заливки с обводкой
ctx.rect(200, 200, 30, 30, null, '5pt green');

// квадрат без всего:
ctx.rect(10, 10, 10, 10, null, null);
// или:
ctx.rect(10, 10, 10, 10);
```

Во втором случае можно дополнительно передать значения любых параметров сразу при создании.
```js
ctx.rect({
    x: 10,
    y: 10,
    width: 200,
    height: 200,

    fill: 'black',
    opacity: 0.8,
    composite: 'xor'
});
```

Можно создавать объекты без заливки и обводки, либо со свойством `visible` в `false`: они будут невидимы, но при этом будут реагировать на события мыши (отключается через `obj.attr('interaction', false)`). Подобным образом можно создавать кликабельные области.

## CSS-расстояния
Везде в качестве координат можно указывать CSS-координаты:
```js
var rect = ctx.rect('10pt', '10pt', '0.5em' '1em');
rect.attr('width', '1vw');
```

По умолчанию передаваемые числа считаются пикселями:
```js
ctx.rect(10, 10, 10, 10);
// работает как
ctx.rect('10px', '10px', '10px', '10px');
```

Регулируется свойством `Delta.defaultDistance` (меняйте его до рисования!). По умолчанию равно `px`.
// внутри дельты всё всегда хранится в пикселях, но конвертится обратно внутри геттера attr
// return this.attrs.x / Delta.units[Delta.defaultDistance];

Кроме того, все переданные величины конвертируются в `defaultDistance` и возвращаются в таком виде.
```js
// Delta.defaultDistance = 'px'
rect.attr('x', '20pt');
rect.attr('x'); // -> 26.6562 (20pt in pixels)
```

Многие CSS-координаты (`pt`, `em` и ряд других) независимы от разрешения экрана, что решает проблемы с различыми резрашениями экрана, Ретиной и т.п.
/* непублично
## Свойства

### Внутреннее свойство styles
Содержит стили, которые устанавливаются 2D-контексту перед рисованием. При изменении нужно вызвать метод `update()`.

```js
rect.styles.fillStyle = 'blue';
rect.update();
```

*Работает только в canvas-рендере.*
* /

## Методы

DeltaJS следует “jQuery-way”: например, вместо 2 функций "getAttr" и "setAttr" здесь присутствует одна функция "attr", которая ведёт себя по-разному в зависимости от аргументов. Кроме того, поддерживается чеининг:
```js
shape.attr('fill', 'red')
     .attr('stroke', 'blue 2px')
     .on('click', 'fill', 'blue')
     .rotate(45);
```

### Метод attr(property)
Возвращает значение параметра `property`.
```js
var rect = ctx.rect({
    x: 10,
    y: 15,
    width: 40,
    height: 40
});

rect.attr('x'); // -> 10
```

### Метод attr(property, value)
Устанавливает значение параметра `property` в `value`.
```js
rect.attr('x', 200);
```

Метод `attr` в принципе позволяет получать и устанавливать любые параметры, например:
```js
rect.attr('abcdefg', Math.random());
rect.attr('abcdefg'); // -> 0.8157290380995565
```

Однако на получение / изменение части параметров объекты подписываются. Так, например, `rect` подписан на изменение `x`, `y`, `width`, `height`, а также наследует от Drawable подписку на `fill`, `stroke` и т.п. — при изменении параметра происходит перерисовка объекта.

----
Можно добавлять геттеры и сеттеры (а также аниматоры) в `Delta.Drawable.prototype.attrHooks`. Этот объект является прототипом для `attrHooks` в наследниках класса Drawable (например, `Delta.Rect`), поэтому его изменение затронет также `attrHooks` дочерних классов. Подробнее — в Custom Objects.

### Метод remove
Удаляет объект с контекста (но при этом объект остаётся в памяти, так что его можно использовать в дальнейшем, в т.ч. вставить обратно в контекст).

```js
var rect = ctx.rect(100, 100, 50, 50, 'blue');
rect.remove();

rect.attr('x'); // -> 100
ctx.push(rect); // возвращает объект в контекст
```

### Метод clone([cloneAttrs, [cloneStyles, [cloneEvents]]])
Клонирует объект. Можно клонировать не полностью — например, оставить на два объекта один объект стилей (тогда при изменении стилей одного из объектов будет меняться и второй).
- `cloneAttrs` — параметры.
- `cloneStyles` — стили (и трансформации).
- `cloneEvents` — события.

По умолчанию все равны `true` (клонировать всё).

### Метод bounds(options)
Возвращает boundbox объекта (описанный вокруг объекта прямоугольник).

Параметры такие:
 - `accuracy` - для некоторых объектов может быть затратно посчитать точный boundbox, но легко посчитать некоторый (не сильно) больший. Принимает значения `rough` (примерный), по умолчанию `precise` (точный).
 - `stroke` — учитывать ли обводку. Принимает значения `'ignore'` (вычесть из boundbox), `'-'` (вычесть из boundbox) и `'+'` (прибавить). *тут бы картинку*
 - `transform` — трансформировать ли boundbox. Принимает значения — `'none'` (не трансформировать), `'context'` (только трансформации контекста), `'self'` (только собственные трансформации) и по умолчанию `'full'` (и те и другие).
 - `tight` — если установить в true, вернётся не объект boundbox, а более точный трансформированный объект в форме `{lt: [x, y], lb, rt, rb}`.
 *картинку*

### Метод corner(cornerName, [transform, [around]])
Возвращает точку boundbox объекта по её имени. Например:
```js
var aabb = elem.bounds();

elem.corner('top left');
// вернёт [aabb.x1, aabb.y1]

elem.corner('center');
// вернёт [aabb.cx, aabb.cy]

elem.corner('right bottom');
// вернёт [aabb.x2, aabb.y2]
```

Все возможные точки:
 - `left` - центр левой стороны.
 - `right` - центр правой стороны.
 - `top` - центр верхней стороны.
 - `bottom` - центр нижней стороны.
 - `left top`, `top left`, `lt`, `tl` - верхний левый угол.
 - `left bottom`, `bottom left`, `lb`, `bl` - нижний левый.
 - `right top`, `top right`, `rt`, `tr` - верхний правый.
 - `right bottom`, `bottom right`, `rb`, `br` - нижний правый.

### Метод on(event, func)
// todo: eventHooks

Добавляет объекту обработчик события.

```js
rect.on('click', function(event){
    this.attr('fill', 'blue');
});
```

В `this` обработчика — сам объект.

Как и в случае событий контекста, в `event` есть дополнительные свойства `targetObject`, `contextX`, `contextY`.

Также поддерживаются быстрые вызовы:
```js
rect.on('click', 'remove');
// работает как
rect.on('click', function(){
    this.remove();
})

rect.on('click', 'attr', 'fill', 'blue');
// работает как
rect.on('click', function(){
    this.attr('fill', 'blue');
})
```

### Метод off(event, [func])
Если передано 2 параметра, убирает `func` как обработчик события `event`.

Если передан 1 параметр — убирает все обработчики события `event`.

```js
rect.on('click', onContextClick);

function onContextClick(event){
    console.log('Hello, Delta!');

    rect.off('click', onContextClick);
    // если вызвать rect.off('click'), удалятся вообще все обработчики кликов
}
```

### Метод fire(event, [data])
Запускает все установленные обработчики события `event`, передавая в обработчик `data`.
```js
rect.on('someCustomEvent', function(data){
    console.log(data.text);
});

rect.fire('someCustomEvent', {
    text: 'anytext'
});
```

### Метод toDataURL([mimeType, [quality, [bounds]]])
Рисует объект на канвасе в памяти и возвращает картинку в формате Data:URL.

```js
var rect = ctx.rect(10, 10, 200, 200, 'blue');

var image = rect.toDataURL();
window.open(image);
```

Первым аргументом можно передать формат (по умолчанию png), вторым качество (число между 0 и 1, по умолчанию 1).
```js
rect.toDataURL('png', 0.9);
rect.toDataURL('image/jpeg'); // можно передать mimeType
```

Третьим аргументом можно передать произвольный boundbox для картинки.

### Метод toImageData([bounds])
Рисует объект и возвращает как canvas imageData. Можно передать произвольный boundbox.

### Метод toBlob(type, quality, bounds, callback)
// canvas.toBlob(callback, type, quality)

^ эти 3 метода должны быть у Context

### Метод rasterize(deleteOriginal = true)
Добавляет вместо объекта картинку из toDataURL()

### Метод serialize([quickCalls])
Возвращает объект как JSON.
```js
ctx.rect(10, 10, 200, 200, 'red').serialize(); // -> {}
```

Если параметр `quickCalls = true`, сохраняет также обработчики событий, которые добавлены с помощью быстрых вызовов.
```js
rect.mouseover('attr', 'fill', 'red').
    .mouseout('attr', 'fill', 'blue');

rect.serialize(); // -> {}
```

// если добавить к quickCalls ещё и возможность добавлять контекст, получится совсем мощно
// при добавлении quickCall через on нужно просто где-нибудь дописывать там "listener.serializeString = '...';"
К слову, при быстрых вызовах исключена возможность XSS.

## Параметры
Меняются методом `attr`.

### z
Поддерживаются -1 / +1 мб?.. Но зачем?
Лучше полную поддержку стека объектов.

### fill
fillRule мб в плагинах для path. nonzero / evenodd

### stroke
Поддерживается css-like запись:
```js
rect.attr('stroke', '10px blue round');
```

А также можно передать параметры объектом:
```js
rect.attr('stroke', {
    color: 'black'
}]);
```

*Примечание: * уже установленные свойства не обнуляются при записи других свойств.
```js
rect.attr('stroke', 'blue');
rect.attr('stroke', '5px');
// работает как
rect.attr('stroke', 'blue 5px');
```

Возможные параметры:
- Ширина (`width`) — `2px`, `0.5em`, `8` и т.п.
- Цвет (`color`) — `#f00`, `green`, `rgb(0,0,0)` и т.п.
- Тип соединений (`join`) — `miter`, `bevel`, `round`.
- Тип скруглений (`cap`) — `butt`, `square`, `round`.
- Пунктир (`dash`) — `[1,2,2]`, `shortdash`, `shortdot`, `shortdashdot`, `shortdashdotdot`, `dot`, `dash`, `longdash`, `dashdot`, `longdashdot`, `longdashdotdot`.
- Miter limit (`miterLimit`) — `ml2px`, `ml8` и т.п.

Также в css-like записи можно передать прозрачность (десятичная дробь меньше 1), в этом случае цвет переведётся в RGB. Пример:
```js
rect.attr('stroke', '5px green .5');
// эквивалентно записи
rect.attr('stroke', '5px rgba(0, 128, 0, 0.5)');
```

В не-css записи можно передать в color градиент или паттерн:
```js
// тут пример
```

Можно сбросить все параметры и убрать обводку вовсе, приравняв к null:
```js
rect.attr('stroke', null);
```

### shadow
Тень. Можно передать объект с параметрами:
```js
shape.attr('shadow', {
    x: 0,
    y: 5,
    blur: 5,
    color: 'black',
    opacity: 0.5
});
```

Можно передавать в CSS-форме (`x y blur color`):
```js
shape.attr('shadow', '0 2px 2px red');
```

Можно сбросить, приравняв к null:
```js
rect.attr('shadow', null);
```

### opacity
Прозрачность (число от 0 до 1).

### composite
Функция наложения объектов друг на друга. Варианты: `source-over`, `source-atop`, `source-in`, `source-out`, `destination-over`, `destination-atop`, `destination-in`, `destination-out`, `lighter`, `darker`, `copy`, `xor`.

Некоторые браузеры поддерживают немного больше: `normal`, `multiply`, `screen`, `overlay`, `darken`, `lighten`, `color-dodge`, `color-burn`, `hard-light`, `soft-light`, `difference`, `exclusion`, `hue`, `saturation`, `color`, `luminosity`.

Стандарт: http://dev.w3.org/fxtf/compositing-1

MDN: http://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Compositing

### clip
### visible
Если установить в `false`, объект перестанет отрисовываться.

### interaction
Если установить в `false`, объект перестанет реагировать на события мыши.

### cursor
Курсор на объекте. Любые значения css-свойства `cursor`.

Чтобы отключить, установить в `null`.

### transformMode
strict для attrs + rotatePivot, scalePivot, etc

и free для функций

// не
просто атрибуты сбрасывают всё, что сделано обычными функциями

https://habrahabr.ru/post/278597/

### translation
http://labs.hyperandroid.com/static/CAAT-Samples/demos/demo7/anchors.html для размышлений

### rotation / angle?
### skew
### scale
### matrix

## Алиасы событий
Можно использовать краткую форму для `on` и `fire`:
```js
ctx.click(function(){ console.log(3); });
// работает как ctx.on('click', function(){ console.log(3); });

ctx.click();
// работает как ctx.fire('click');
```
Все возможные алиасы:
 - `click`
 - `dblclick`
 - `mousedown`
 - `mouseup`
 - `mousemove`
 - `mouseover`
 - `mouseout`
 - `mouseenter`
 - `mouseleave`
 - `mousewheel`
 - `focus`
 - `blur`
 - `keypress`
 - `keydown`
 - `keyup`
 - `touchstart`
 - `touchmove`
 - `touchend`
 - `touchcancel`
 - `pointerover`
 - `pointerenter`
 - `pointerdown`
 - `pointermove`
 - `pointerup`
 - `pointercancel`
 - `pointerout`
 - `pointerleave`
 - `gotpointercapture`
 - `lostpointercapture`

## Трансформации

## Анимация

#### fill
Заливка объекта:
```js
rect.fill('red');
rect.fill(); // -> 'red'
```
Объект со свойством `colors` воспринимается как градиент:
```js
rect.fill({
    colors:['red', 'green', 'black'],
    from: 'top',
    to: 'bottom'
});
```
Если передаётся объект со свойством `image`, картинка (обычный dom-элемент `img` или объект `Image`), или же строка, начинающаяся с `http://`, `./`, `../` или `data`, это понимается как текстура.
```js
rect.fill('./image.jpg');
```

При этом создаётся объект `Gradient` или `Pattern`, который можно дальше изменять:
```js
rect.fill({
    colors: ['white', 'black'],
    from: 'top',
    to: 'bottom'
});

rect.fill().color(0.5, 'red');
```

#### stroke
Обводка объекта:
```js
rect.stroke('10px red');
rect.stroke(); // -> {color: 'red', width: 10}
```
Чтобы изменить, можно передать строку или объект:
```js
rect.stroke('0.5em round square [1,2] green 0.5');
rect.stroke({
    color: 'black',
    width: '4px',
    join: 'round',
    cap: 'butt',
    dash: 'dot'
});
```
При этом изменяются только указанные параметры:
```js
rect.stroke('7pt'); // изменит только толщину, не тронув цвет и всё остальное
```

Можно сбросить все параметры (убрать stroke), передав `null`:
```js
rect.stroke(null);
```

#### opacity
Прозрачность (число от 0 до 1).

#### composite

#### hide, show
Делают объект видимым / невидимым. Без анимации, просто отключают его отрисовку.

Ожидается, что невидимый объект не будет реагировать на события, поэтому `hide` / `show` также включают / отключают обработку событий мыши. Если требуется другое поведение, нужно использовать функцию `mouse` после этого.

#### cursor
Устанавливает курсор при наведении мыши на объект. *(пока работает не всегда корректно)*
```js
rect.cursor('pointer');
```

#### z
Z-index объекта.

Z-index в понятии Graphics2D -- просто индекс элемента (а, соответственно, и каким по счёту отрисовывается):
```js
// предполагается, что canvas пуст, так что начальный z-index = 0
var a = ctx.rect(10, 10, 200, 200);
var b = ctx.circle(100, 100, 50);
a.z(); // -> 0
b.z(); // -> 1

b.z(0);
b.z(); // -> 0
a.z(); // -> 1
```
Двух объектов с одинаковым индексом существовать на одном контексте не может.

#### isPointIn(x, y)
Возвращает `true`, если точка `(x; y)` находится внутри объекта / фигуры, иначе `false`.

При этом учитывается сама фигура, а не её прямоугольник.

#### bounds
/*
Возвращает прямоугольник (хитбокс) объекта. Свойства:
 - `x`, `y` или `x1`, `y1` -- координаты левой верхней точки.
 - `x2`, `y2` -- координаты правой нижней точки.
 - `width`, `height` = `w`, `h` -- ширина и высота.
 - `cx`, `cy` -- координаты центра.

Также можно передать объект со свойством `transform` (true / false) и `stroke` (true / false / 'exclude') -- обрабатывать ли трансформацию и обводку ('exclude' исключает размеры обводки из объекта):
```js
var bounds1 = shape.bounds(),
    bounds2 = shape.bounds({ transform: false });
```
По умолчанию `transform: true, stroke: false`. */

#### corner
Возвращает координаты одного из углов объекта:
```js
var coords = shape.corner('left top');
// -> [x, y]
```
Также можно передать объект со свойством `from` и отступом от угла:
```js
shape.corner({ from: 'left top', x: 10, y: 50 });
// -> [x + 10, y + 50]
```

Возможные значения: углы (`left top`, `right top`, `left bottom`, `right bottom`), возможна перестановка слов (`left top` = `top left`), возможны сокращения (`left top` = `lt` = `tl`), также есть середины сторон (`left`, `top`, `right`, `bottom`) и центр (`center`).

#### clip
Маска объекта (фигура, скрывающая часть исходного объекта).

Можно передать любой стандартный объект контекста:
```js
shape.clip( ctx.path([[0, 0], [100, 100], [200, 0]]) );
```

Если передаются 4 аргумента, то создаётся прямоугольник (x, y, width, height). Передаются абсолютные координаты (координаты canvas-а, а не координаты самого объекта):
```js
shape.clip( 0, 0, 30, 30 );
```

3 аргумента -- координаты круга (cx, cy, radius):
```js
shape.clip( 50, 50, 100 );
```

1 аргумент -- путь:
```js
shape.clip([[0, 0], [200, 200], [200, 0]]);
```

Или своя функция:
```js
shape.clip({
    processPath: function(ctx){
        // ctx -- стандартный 2D Context
        ctx.moveTo( 10, 10 );
        ctx.lineTo( 300, 300 );
        ctx.lineTo( 300, 0 );
        ctx.closePath();
    }
});
```

Переданный первым аргументом `null` удаляет маску:
```js
shape.clip(null);
```

#### remove
Удаляет объект из отрисовки контекста (но при этом объект остаётся в памяти, так что его можно использовать в дальнейшем, в т.ч. вставить обратно в контекст):
```js
var rect = ctx.rect( 100, 100, 50, 50, 'blue' );
rect.remove();

rect.x(); // -> 100

ctx.push( rect ); // возвращает объект в контекст
```

#### shadow
### События
Функции:
 - `on(event, func)`
 - `off(event, [func])`
 - `fire(event, [object])`
 - `click`
 - `dblclick`
 - `mousedown`
 - `mouseup`
 - `mousemove`
 - `mouseover`
 - `mouseout`
 - `mousewheel`
 - `focus`
 - `blur`
работают абсолютно аналогично соответствующим функциям контекста.

#### mouse
Включает / отключает обработку событий мыши. Объект, на котором отключена обработка событий мыши, становится "проницаемым": события мыши будут срабатывать на элементах под ним.
```js
// отключаем
shape.mouse(false);

// включаем
shape.mouse(true);
```

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
