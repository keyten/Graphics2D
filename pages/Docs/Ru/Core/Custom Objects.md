# Наследование Delta.Drawable

Метод контекста `ctx.object` позволяет создать объект с произвольной функцией рисования и другими параметрами, унаследовав его при этом от Delta.Drawable. Это более низкоуровневый способ рисовать, чем обычные объекты.

Давайте создадим простой объект, который умеет рисоваться (для этого нужно определить функцию `draw`):
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

## Атрибуты
У всех унаследованных от `Delta.Drawable` классов есть метод `attr`.

Можно перехватывать его вызовы с помощью объекта attrHooks:
```js
var cross = ctx.object({
	attrHooks: {
		get: function(){
			;
		},
		set: function(){
			this.update();
		}
	}
});
```

О чём рассказать:
 - attrHooks
 - eventHooks
 - isPointIn и обработка событий мыши
 — bounds, трансформации

## Наследство Drawable
Перечислить функции, которые работают и упомянуть, что для них нужно.