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
Delta.filters['grayscale'] = function(r, g, b, a){
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
Delta.filters['lighten'] = function(r, g, b, a, params){
    return [r + params.value, g + params.value, b + params.value, a];
};

image.filter('lighten', { value: 10 });
```

Получить все фильтры:
```js
image.filter(); // -> []
```

Убрать все фильтры:
```js
image.filter(null);
```

Отключить / включить все фильтры:
```js
image.filter('disable' / 'enable');

// работа со стеком фильтров:
image.filter('splice', 1, 3, 5);
// обычные функции массивов (проверяются, если соотв. фильтра нет), после которых вызывается update
```

### Оптимизация
 - Если изображение выходит за границы canvas, будет обработана только видимая часть. /но нужно разрешить фильтрам отключать эту функцию, gaussian blur, например/
 — Фильтр кэшируется как imageData. При добавлении фильтра в него отправляется уже закэшированная imageData и перезаписывается результатом. Можно включить кэширование всего стека.