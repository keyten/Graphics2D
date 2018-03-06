**Концепт (пока не реализовано):**
## Инициализация

```js
rect.draggable();
```

## Команды:
```js
rect.draggable('init');
rect.draggable('disable');
rect.draggable('enable');
rect.draggable('destroy'); // note: destroy also removes all draggable parameters

rect.draggable({
	// default values:
	axis: null / 'x' / 'y', // движение только по одной координате
	inBounds: boundsObject / drawable, // движение в пределах прямоугольника
	cursor: 'crosshair', // just a css value
	cursorAt: 'lt' (any corner value) / { bottom: 0 }, <- todo: сделать такое в corner (bottom обнуляется, а left остаётся)

	moveWith: drawable / array, // если назначить этот параметр, то все объекты в нём будут перемещаться на столько же, на сколько переместился и оригинальный
	delay: 100, // Time in milliseconds after mousedown until dragging should start
	distance: number (теорема Пифагора) / array with coords, // Distance in pixels after mousedown the mouse must move before dragging should start
	grid: number / array, // Snaps the dragging helper to a grid, every x and y pixels
	helper: null / 'clone' / drawable, // Allows for a helper element to be used for dragging display.
	helperOpacity: 0.5, // does not work with helper = null,

	snap: true / drawable / [drawables], // note: snap is impossible with grid enable
	snapMode: 'both' / 'inner' / 'outer', // how about do that for each element?
	snapTolerance: 20,
	stack: [drawables], // несколько объектов, которые меняют z-index, становясь друг над другом при драге
	stackReturnZ: false, // возвращать ли прежний z при dragend объекту в стеке
	zIndex: null // z-index for helper being dragged (можно даже 'top', как в обычном Drawable::attr('z')) — несовместимо со stack
});

rect.draggable('revert', [duration, easing, callback, etc]); // возвращает элемент туда, где он был до последнего драга
// например:
rect.on('dragend', 'draggable', 'revert');
```

Sends events:
 - dragstart (mousedown on control) <- in event obj { objectX, objectY, helper }
 - dragend
 - drag