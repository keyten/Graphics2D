# Наследование Delta.Drawable

Метод контекста `ctx.object` позволяет создать объект с произвольной функцией рисования и другими параметрами, унаследовав его при этом от Delta.Drawable. Это более низкоуровневый способ рисовать.

Чтобы научить объект рисоваться, необходимо определить функцию `draw`:
```js
ctx.object({
    draw: function(ctx){
        ctx.beginPath();
        ctx.moveTo(...);

        ctx.fillStyle = 'red'; // в разделе attrHooks модифицировать до произвольного цвета в attrs
        ctx.fill();
    }
});
```

О чём рассказать:
 - attrHooks
 - eventHooks
 - isPointIn и обработка событий мыши