Graphics2D.Pattern
===================

`Graphics2D.Pattern` - текстура (тоже самое, что и изображение, но умеет повторяться + можно ей залить фигуру).

Тоже умеет быть инлайновой.

```js
// второй параметр - повторяться ли (true, false, 'x', 'y'). По умолч. - true
var pat = ctx.pattern('./img.png');
var pt2 = ctx.pattern('#image', 'x');
var i = new Image;
i.src = '../img.jpg';
var pt3 = ctx.pattern({
  image: i,
  repeat: false
});

ctx.rect(0, 0, 1, 1, './img.jpg');
// ссылка должна начинаться с 'http://' или с '.'
ctx.rect(1, 1, 1, 1, {
  image: './png.jpg.gif',
  repeat: 'y'
});
```

### Методы
#### repeat([value])
Возвращает / устанавливает. Допустимые варианты: `true`, `false`, `'x'`, `'y'`.

Изменение параметра обновляет все залитые текстурой фигуры.
