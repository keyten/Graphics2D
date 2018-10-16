**Концепт (пока не реализовано):**
## Инициализация

```js
rect.editor('transform');
```

## Команды:
```js
rect.editor('transform', 'disable');
rect.editor('transform', 'enable');
rect.editor('transform', 'destroy'); // note: destroy also removes all draggable parameters

rect.editor('transform', {
	// default values:
	freeze: false, // selected but does not interact

	rotate: true,
	translate: true,
	scale: true,
	proportionalScale: 'shift', // works with shift if 'shift'. works always if 'always'
	fromCenter: 'alt',
	skew: false,
	proportionalSkew: true,
	minScale, minRotate, etc
	stepScale, stepRotate,

	pivot: 'center',

	showPivot: false, // a draggable point with pivot, like in photoshop
	// saveProportions: false,
	// how about alt, shift?
	// maybe in future
});

rect.editor('transform', 'getLayout'); // -> { border: controlObj, lt: ..., ... }
```

Fires events:
 - transformstart (mousedown on control) { type: 'translate', control: 'object' / 'lt', controlOb, pivot: null / 'lt' / [array with coords] }
 - transformend
 - transform