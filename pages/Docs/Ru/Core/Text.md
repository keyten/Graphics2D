## Инициализация
```js
ctx.text(string, x, y, [font, fill, stroke]);

ctx.text({
	string, x, y, font, fill, stroke, align, baseline, breaklines, lineHeight
});

Delta.text(...);
```

## Параметры
 - `string`
 - `x`
 - `y`
 - `font`
 - `align`
 - `baseline`
 - `breaklines`
 - `lineHeight`
 - `maxStringWidth` - при breaklines = false
 - `blockWidth` - при условии breaklines = true. По умолчанию Infinity.

## Методы
 - `measure()` — возвращает длину строки