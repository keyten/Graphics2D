Image.Composite
===================

Позволяет назначать произвольный blend-mode для картинки.

### Использование
```js
image.composite(function(r1, g1, b1, r2, g2, b2){
    return [Math.min(r1 + r2, 255), Math.min(g1 + g2, 255), Math.min(b1 + b2, 255)];
});
```
