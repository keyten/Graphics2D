Delta.Context
===================

Свой собственный контекст библиотеки, с помощью которого и можно рисовать. Его можно получить так:
```js
var ctx = Delta(document.getElementById('foo'));
var ctx = Delta.id('element'); // canvas с id element
var ctx = Delta.query('canvas', 0); // первый canvas на странице
```

Класс контекста: `Delta.Context`.
### Элементы
Различные элементы можно создавать прямо на холсте:

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

Градиент:
```js
ctx.gradient(type, colors, from, to);
```

Паттерн (повторяющийся рисунок):
```js
ctx.pattern(image, repeat);
```

Произвольный объект со своей функцией рисования:
```js
ctx.object(data);
```

Также есть несколько алиасов, которые на самом деле создают path.
```js
ctx.line(x1, y1, x2, y2, [stroke]);
ctx.quadratic(x1, y1, x2, y2, hx, hy, [stroke]);
ctx.bezier(x1, y1, x2, y2, h1x, h1y, h2x, h2y, [stroke]);
ctx.arcTo(x1, y1, x2, y2, radius, clockwise, [stroke]);
```

Подробно о каждом объекте — в его разделе документации.

### Методы
Все методы возвращают сам контекст, если не требуется иного. Это позволяет создавать цепочки вызовов:
```js
ctx.on(‘click’, firstListener)
   .on(‘click’, secondListener)
   .attr('rotate', 45)
   .attr('translate', [10, 10]);
```

#### on(event, func)
Ставит обработчик события на canvas.

Для событий мыши передаёт в обработчик браузерный объект события, но добавляет в него 3 своих свойства:
- `targetObject` - объект контекста, на котором находится мышь (либо `null`).
- `contextX`, `contextY` - координаты мыши на canvas (например, левый верхний угол canvas - это `contextX = contextY = 0`).

```js
ctx.on('click', function(event){
    if(event.targetObject){
        event.targetObject.attr(‘fill’, ’red');
    } else {
        ctx.circle({
            cx: event.contextX,
            cy: event.contextY,
            fill: 'blue'
        });
    }
});
```

В случае touch-событий эти свойства добавляются в каждый объект в `event.touches`, `event.changedTouches`, `event.targetTouches`.

В `this` обработчика — контекст DeltaJS.

*Примечание: если у canvas есть border, события мыши будут ловиться и на нём, но с отрицательными contextX / contextY.*

#### off(event, [func])
```js
// TODO: написать более близкий к жизни пример
ctx.on('click', someFunc);

function someFunc(){
    alert('Hello, Delta!');
    ctx.off('click', someFunc); // убирает обработчик someFunc
}

// по событию mousewheel удаляем все обработчики клика
ctx.on('mousewheel', function(){
    ctx.off('click');
});
```
Убирает либо конкретный обработчик события, либо все обработчики события.

#### fire(event, [data])
```js
ctx.on(‘someCustomEvent’, function(data){ console.log(data.text); });

ctx.fire(‘someCustomEvent’, {text:'anytext'});
```
Запускает все установленные обработчики события.

#### getObjectInPoint(x, y)
```js
ctx.getObjectInPoint(10, 10);
```
Возвращает объект, находящийся в точке `(x; y)`, либо `null`, если такого нет.
Если передать третьим параметром `true`, проигнорирует объекты, у которых параметр `interaction` в `false`.

#### contextCoords(x, y)
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

*Но лучше это делать через ctx.on('click', ...) и contextX / contextY:*
```js
ctx.on(‘click’, function(event){
    if(event.contextX === 10 && event.contextY === 10){
        console.log(‘Ура!’);
    }
});
```

#### each


#### update
Принудительно обновляет холст. Обычно он обновляется сам, когда меняются свойства объектов, но если вы хотите вручную изменять внутренние параметры объектов и т.п., может пригодиться. Например:

```js
var rect = ctx.rect(10, 10, 200, 200, ‘red’);
// а вот если вызвать rect.attr(‘fill’, ‘blue’), холст обновится сам
rect.style.fillStyle = ‘blue’;
ctx.update();
```

### Алиасы событий
```js
ctx.click(function(){ console.log(3); });
// вместо ctx.on(‘click’, function(){ console.log(3); });

ctx.click();
// вместо ctx.fire('click');
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

### Трансформации
Можно трансформировать весь холст. Везде кроме `translate` можно задавать pivot - точку, которая останется на месте при деформации.
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

Возможные pivot-ы. Считаются относительно boundbox-а фигуры:
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

*Примечание: речь о контексте с 2D-рендером. WebGL-контекст имеет дополнительные свойства и методы.*