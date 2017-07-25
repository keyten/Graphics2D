Image.Filter
===================

Позволяет применить пиксельный фильтр к объекту Image.
### Применение
```js
image.filter(function(r, g, b, a){
    var average = (r + g + b) / 3;
    return [average, average, average, a];
});
```

### Built-in фильтры
Можно добавить фильтр однажды, чтобы использовать несколько раз.
```js
Graphics2D.filters['grayscale'] = function(r, g, b, a){
    var average = (r + g + b) / 3;
    return [average, average, average, a];
};
```
И затем:
```js
image.filter('grayscale');
```

### Параметры
Можно передавать параметры в фильтр:
```js
function lighten(r, g, b, a, params){
    return [r + params.value, g + params.value, b + params.value, a];
}

image.filter(lighten, { value: 10 });
```
Или же:
```js
Graphics2D.filters['lighten'] = function(r, g, b, a, params){
    return [r + params.value, g + params.value, b + params.value, a];
};

image.filter('lighten', { value: 10 });
```

### Оптимизация
 - Если изображение выходит за границы canvas, будет обработана только видимая часть.
 - Применение фильтра *заменяет* изображение. Таким образом, при следующей отрисовке фильтр не будет пересчитываться заново, вместо этого изображение будет заново отрисовано с уже применённым фильтром.

В планах стек фильтров, но там кэширование тоже будет.
