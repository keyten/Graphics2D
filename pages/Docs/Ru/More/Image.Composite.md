**Концепт (пока не реализовано):**
Image.Composite
===================

Позволяет назначать произвольный blend-mode для картинки.

### Использование
```js
image.composite(function(r1, g1, b1, r2, g2, b2){
    return [Math.min(r1 + r2, 255), Math.min(g1 + g2, 255), Math.min(b1 + b2, 255)];
});
```

### Built-in composites
Можно добавить blend-mode в список, чтобы использовать несколько раз:
```js
Delta.composites['multiply'] = function(r1, g1, b1, r2, g2, b2){
    return [Math.min(r1 * r2, 255), Math.min(g1 * g2, 255), Math.min(b1 * b2, 255)];
};
```
И затем использовать:
```js
image.composite('multiply');
```
Если устанавливаемого таким образом blend-mode не окажется в `Delta.composites`, то будет применён стандартный браузерный blend-mode (с помощью `globalCompositeOperation`) с тем же именем.
