Graphics2D.Fullscreen
===================

Содержит несколько функций, позволяющих легко разворачивать canvas на всю страницу / на весь экран.

`Graphics2D.Context::fullbody` -- развернуть на всю страницу. Один необязательный параметр -- `processResize`, обрабатывать ли изменение размеров окна браузера.
```js
var ctx = Graphics2D.id('example');
ctx.fullbody();
```

`Graphics2D.Context::fullscreen` -- развернуть на весь экран. Один необязательный параметр -- `hideCursor`, скрывать ли курсор.
```js
ctx.fullscreen(true);
```

`Graphics2D.Context::minimize` -- возвращает всё как было, из обоих функций.

`Graphics2D.Context::on('resize', fn);`