# Delta.Context

Свой собственный контекст библиотеки, с помощью которого и можно рисовать. Его можно получить так:
```js
var ctx = Delta(document.getElementById('foo'));
var ctx = Delta.id('element'); // canvas с id element
var ctx = Delta.query('canvas', 0); // первый canvas на странице
```

Класс контекста: `Delta.Context`.

## Элементы
У контекста есть функции, которые создают и возвращают объекты на нём.

Прямоугольник:
```js
ctx.rect(x, y, width, height, [fill, stroke]);
```

Круг:
```js
ctx.circle(centerX, centerY, radius, [fill, stroke]);
```

Путь:
```js
ctx.path(data, [fill, stroke]);
```

Изображение:
```js
ctx.image(x, y, [width, height, crop]);
```

Текст:
```js
ctx.text(text, x, y, [font, fill, stroke]);
```

Произвольный объект со своей функцией рисования:
```js
ctx.object(data);
```

Градиент:
```js
ctx.gradient(type, colors, from, to);
```

Паттерн (повторяющийся рисунок):
```js
ctx.pattern(image, repeat);
```

Также есть несколько алиасов, которые на самом деле создают path.
```js
ctx.line(x1, y1, x2, y2, [stroke]);
ctx.quadratic(x1, y1, x2, y2, hx, hy, [stroke]);
ctx.bezier(x1, y1, x2, y2, h1x, h1y, h2x, h2y, [stroke]);
ctx.arcTo(x1, y1, x2, y2, radius, clockwise, [stroke]);
```

## Свойства

### Свойство useCache
Если установить в `true`, контекст будет кэшировать градиенты. Прирост производительности от этого кажется сомнительным, так что по умолчанию стоит в `false`.

*Работает только в canvas-рендере.*

### Свойство elements
Массив всех объектов контекста.

```js
var ctx = Delta(canvas);
var circle = ctx.circle(0, 0, 0);

ctx.elements.length; // 1
ctx.elements[0] === circle; // true
```

При изменении нужно вызвать метод `update`.
```js
ctx.elements.splice(1, 1);
ctx.update();
```

### Свойство canvas
### Свойство context

## Методы
Все методы возвращают сам контекст, если не требуется иного. Это позволяет создавать цепочки вызовов:
```js
ctx.on('click', firstListener)
   .on('click', secondListener)
   .rotate(1)
   .translate(10, 10);
```

### Метод each(func)
Вызывает `func` в цикле для каждого объекта контекста. В `this` передаётся контекст.
```js
ctx.each(function(element){
    element.remove();
});
```
Удаление объектов из `ctx.elements` не мешает исполнению цикла.

### Метод push(object)
Позволяет добавить объект в `ctx.elements` (и список перерисовки контекста).

```js
var rect = Delta.rect(200, 200, 10, 10, 'black');
ctx.push(rect);

// работает как
ctx.rect(200, 200, 10, 10, 'black');
```

### Метод on(event, func)
Добавляет обработчик события на canvas. Передаёт в обработчик браузерный объект события, но добавляет в него 3 своих свойства:
- `targetObject` - объект DeltaJS, на котором находится мышь (либо `null`).
- `contextX`, `contextY` - координаты мыши на canvas (так, например, левый верхний угол canvas - это `contextX = contextY = 0`).

```js
ctx.on('click', function(event){
    if(event.targetObject){
        // при клике по кругу круг будет перекрашиваться в красный
        event.targetObject.attr('fill', 'red');
    } else {
        // при клике по пустому месту на нём появится синий круг
        ctx.circle({
            cx: event.contextX,
            cy: event.contextY,
            radius: 20,
            fill: 'blue'
        });
    }
});
```

В случае touch-событий эти свойства добавляются в каждый объект в `event.touches`, `event.changedTouches`, `event.targetTouches`.

В `this` обработчика — контекст DeltaJS.

*Примечание:* если у canvas есть border, события мыши будут ловиться и на нём, но иногда с отрицательными contextX / contextY.

### Метод off(event, [func])
Если передано 2 параметра, убирает `func` как обработчик события `event`.

Если передан 1 параметр — убирает все обработчики события `event`.

```js
ctx.on('click', onContextClick);

function onContextClick(event){
    console.log('Hello, Delta!');

    ctx.off('click', onContextClick);
    // если вызвать ctx.off('click'), удалятся вообще все обработчики кликов
}
```

### Метод fire(event, [data])
Запускает все установленные обработчики события `event`, передавая в обработчик `data`.
```js
ctx.on('someCustomEvent', function(data){
    console.log(data.text);
});

ctx.fire('someCustomEvent', {
    text: 'anytext'
});
```

Позволяет, в том числе, эмулировать браузерные события (`click`, `mousemove` и т.п.), но только для установленных через `ctx.on` обработчиков.

### Метод getObjectInPoint(x, y)
```js
ctx.getObjectInPoint(10, 10);
```
Возвращает объект, находящийся в точке `(x; y)`, либо `null`, если такого нет.

Если передать третьим параметром `true`, проигнорирует объекты, у которых параметр `interaction` в `false`.

### Метод contextCoords(x, y)
Транслирует экранные координаты (`event.clientX` и `event.clientY`) в координаты контекста. Возвращает массив с координатами.

Например, мы хотим отловить клик в координатах (10, 10) на контексте:
```js
canvas.addEventListener('click', function(event){
    var coords = ctx.contextCoords(event.clientX, event.clientY);
    if(coords[0] === 10 && coords[1] === 10){
        console.log('Ура!');
    }
});
```

Этот код эквивалентен такому:
```js
ctx.on('click', function(event){
    if(event.contextX === 10 && event.contextY === 10){
        console.log('Ура!');
    }
});
```

*Пояснение:* **координаты контекста** — это такие (декартовы) координаты, в которых левая верхняя точка canvas равна (0, 0) а правая — ширине и высоте canvas. В события мыши и тач-события приходят экранные координаты (`clientX`, `clientY`). Чтобы определить, находятся ли они внутри какой-то фигуры на canvas, нужно преобразовать их в координаты контекста. Для установленных через `ctx.on` обработчиков это делается автоматически.

### Метод serialize([quickCalls])
### Метод deserialize([quickCalls])

### Внутренний метод update
Принудительно перерисовывает контекст (в requestAnimationFrame, игнорирует повторные вызовы до отрисовки; без всего этого метод `updateNow`).

Обычно контекст обновляется сам, когда меняются свойства объектов. Но если вы хотите вручную изменять внутренние параметры объектов, он может пригодиться. Например:

```js
var rect = ctx.rect(10, 10, 200, 200, 'red');
// если вызвать rect.attr('fill', 'blue'), холст обновится сам
rect.style.fillStyle = 'blue';
ctx.update();
```
Не вызывайте его без необходимости.

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
Можно трансформировать весь холст. Везде кроме `translate` можно задавать pivot - точку, которая останется на месте при трансформации.
```js
ctx.translate(x, y);

ctx.rotate(45); // поворот на 45 градусов вокруг центра
ctx.rotate(1, 'left top'); // на 1 градус вокруг верхней левой точки

ctx.scale(factor); // масштаб в factor раз по обоим осям (вокруг центра)
ctx.scale(x, y); // масштаб в x и y раз по осям (вокруг центра)
ctx.scale(factor, 'left top'); // масштаб вокруг верхней левой точки
ctx.scale(x, y, 'left top');

ctx.skew(factor); // скос на factor градусов
ctx.skew(x, y);
ctx.skew(factor, 'left top');
ctx.skew(x, y, 'left top');
```

Кроме того, можно трансформировать с помощью матрицы:
```js
ctx.transform(m11, m21, m12, m22, m13, m23);
```

Сама текущая матрица находится в `ctx.matrix` (все вышеперечисленные методы её изменяют). Либо `null`.

Возможные pivot-ы. Считаются относительно boundbox-а канваса:
 - `left` - центр левой стороны.
 - `right` - центр правой стороны.
 - `top` - центр верхней стороны.
 - `bottom` - центр нижней стороны.
 - `left top`, `top left`, `lt`, `tl` - верхний левый угол.
 - `left bottom`, `bottom left`, `lb`, `bl` - нижний левый.
 - `right top`, `top right`, `rt`, `tr` - верхний правый.
 - `right bottom`, `bottom right`, `rb`, `br` - нижний правый.

Также можно передать координаты точки. Например:
```js
ctx.rotate(90, [0, 0]);
```

Можно сбросить матрицу трансформации до единичной:
```js
ctx.transform(null);
```

## Примечание
Здесь речь о контексте с 2D-рендером. При рисовании с помощью другого рендера возвращается другой контекст (например, в случае WebGL-рендера это `Delta.GLContext`), реализующий те же методы и, возможно, разные свои.