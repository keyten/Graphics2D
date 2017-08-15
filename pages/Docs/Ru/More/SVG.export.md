## Добавляет экспорт в SVG

```js
rect.toSVG({
    quickCalls: true, // нет, быстрым вызовам совершенно точно необходимо добавить поддержку контекстов!
    filters: true,

    format: 'string' // string / blob / XML (really XML obs made with document.createElementNS)
});

path.getAsSVG({
    relativeToAbsolute: false
}); // если есть посторонние функции, не поддерживаемые в свг, то нужно вызвать path.convertForeignCurvesToBezier().getAsSVG()
// или не, пусть лучше оно само

ctx.toSVG();
```
