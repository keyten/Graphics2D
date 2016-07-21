Graphics2D.Context
===================

`Graphics2D.Context` -- это свой собственный контекст библиотеки, который можно получить так:
```js
var ctx = Graphics2D.id('element'); // canvas с id element
var ctx = Graphics2D.query('canvas', 0); // первый canvas на странице
// можно передать и сам элемент
var ctx = Graphics2D.query( document.getElementById('foo') );
```

### Методы
Все методы возвращают сам контекст, если не требуется иного.

#### getObjectInPoint(x, y)
```js
ctx.getObjectInPoint(10, 10);
```
Возвращает объект, находящийся в точке `(x; y)`, либо `null`, если такого нет.  
Если передать третьим параметром `true`, проигнорирует объекты, у которых отключена обработка мыши.

#### on(event, func)
```js
ctx.on('click', function(e){
    e.targetObject.fill('red');
    x = e.contextX;
    y = e.contextY;
});
```
Ставит обработчик события на холст. Помимо прочего, расширяет объект `event` (переменная `e` в примере) 3 свойствами:
- `targetObject` - на каком объекте холста находится мышь.
- `contextX`, `contextY` - координаты мыши на холсте.

Можно ставить таймер (контекст передаётся в `this`):
```js
ctx.on(1000, function(){
    // do something
});

// аналогично:
window.setTimeout(function(){
    // do something
}.bind(ctx), 1000);
```

#### off(event, [func])
```js
ctx.on('click', anyfunc);
ctx.off('click', anyfunc);
ctx.off('click');
```
Убирает обработчик события с холста.

#### fire(event, [data])
```js
ctx.on('click', function(data){ console.log(data.text); });
ctx.fire('click', {text:'anytext'});
```
Запускает все установленные обработчики события.

#### update
```js
ctx.update();
```
Обновляет холст. Требуется, если вы вручную хотите изменять внутренние параметры объектов и т.п.

### Алиасы
```js
ctx.click(function(){ console.log(3); });
ctx.click(); // = fire('click');
```
`click`, `dblclick`, `mousedown`, `mouseup`, `mousemove`, `mouseover`, `mouseout`, `mousewheel`, `focus`, `blur` -- все возможные алиасы.

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
ctx.gradient;
```

Паттерн (повторяющийся рисунок):
```js
ctx.pattern;
```
