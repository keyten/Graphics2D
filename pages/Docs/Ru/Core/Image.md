## Инициализация
```js
ctx.image(image, x, y, [width, height, crop]);

ctx.text({
	image, x, y, width, height, crop, smooth
});

Delta.text(...);
```

## Параметры
 - `image`
 - `x`
 - `y`
 - `width`
 - `height`
 - `crop`

Значения `width` / `height`: по умолчанию 'auto'.

Если оба значения 'auto', у картинки родные размеры.

Значение 'native' — взять родной размер.

Значение 'auto' у одного из свойств с числовым у другого — сохранить пропорции.

## Методы
 - `getRealSize()` — возвращает размеры рисунка.