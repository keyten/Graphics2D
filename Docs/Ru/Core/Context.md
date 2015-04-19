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

#### update
```js
ctx.update();
```
Обновляет холст. Требуется, если вы вручную хотите изменять внутренние параметры объектов и т.п.

#### getObjectInPoint(x, y)
```js
ctx.getObjectInPoint(10, 10);
```
Возвращает объект, находящийся в точке `(x; y)`. Не учитывает невидимые объекты -- а это только скрытые методом `hide`. Все остальные (полностью прозрачные, лишённые обводки и заливки и т.п.) учитываются.

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

#### off(event, [func])
```js
ctx.on('click', anyfunc);
ctx.off('click', anyfunc);
ctx.off('click');
```
Убирает обработчик события с холста.

#### fire(event, [object])
```js
ctx.on('click', function(data){ console.log(data.text); });
ctx.fire('click', {text:'anytext'});
```
Запускает все установленные обработчики события.

### Алиасы
```js
ctx.click(function(){ console.log(3); });
ctx.click(); // = fire('click');
```
`click`, `dblclick`, `mousedown`, `mouseup`, `mousemove`, `mouseover`, `mouseout`, `mousewheel`, `focus`, `blur` -- все возможные алиасы.

### Элементы
```js
ctx.rect(10, 10, 200, 200, 'black');
```
Различные объекты также создаются с помощью методов контекста, однако эта тема более подробно будет рассмотрена в самих объектах.

Пока же вот эти методы: `rect`, `circle`, `path`, `image`, `text`, `textblock`, `gradient`, `pattern`.