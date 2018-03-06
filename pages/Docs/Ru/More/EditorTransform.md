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
	proportionalScale: true, // works with shift if true. works always if scale false
	skew: false,
	proportionalSkew: true,
	proportionalModifier: 'shift',
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

Sends events:
 - transformstart (mousedown on control) { type: 'translate', control: 'object' / 'lt', pivot: null / 'lt' / [array with coords] }
 - transformend
 - transform