**Концепт (пока не реализовано):**

### Анимация

```js
// clones gradient, animates the clone and in the end sets gradient = target
element.animate('gradient', {
	...params
})

gradient.animateTo(...params);
```

Params:
 — gradient — градиент, к которому идёт переход
 - addColorPoints (true) — добавлять несуществующие цвета между градиентами (например, градиент 0, 1 -> 0, 0.5, 1 - в первый )
 - mapStops — переместить цвета (например, 0 red, 1 blue -> 0 red, 0.5 blue => mapStops = { 1: 0.5 })

Обязательно либо gradient, либо mapStops

Можно надобавлять stops за пределами 0 и 1 (если так можно, если нет, то надо эмулировать размерами) и анимировать их в видимую область