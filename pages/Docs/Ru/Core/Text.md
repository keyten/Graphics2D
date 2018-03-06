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
 - `font` (Text.font = '10px sans-serif')
 - `align` ('left')
 - `baseline` ('top')
 - `breaklines` (true)
 - `lineHeight` ('auto')
 - `maxStringWidth` - при breaklines = false
 - `blockWidth` - при условии breaklines = true. По умолчанию Infinity.

 - `boundsMode` - `inline` or `block` (возвращать в bounds & isPointIn - blockWidth / maxStringWidth или через measure).

## Методы
 - `measure()` — возвращает длину строки (для breaklines = true возвращает длину наибольшей)
