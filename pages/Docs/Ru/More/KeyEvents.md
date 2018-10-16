**Концепт (пока не реализовано):**

События:
 - keyholdon
 - keyholdoff

Фильтры событий:
 - Клавиши и сочетания клавиш
 - Связки клавиш (X > Enter > X (0.5)). Число в скобках - макс время в секундах между нажатиями

.on('keydown(X > Enter > X (5))')

/*
	Using:
		- .on('keydown(Shift+K, 5, Delete)#anyid', func);
		- .changeEvent('anyid', 'delete', 'Shift+L');
		- .changeEvent('anyid', 'add', '8');
		- .changeEvent('anyid', 'off');
		- .changeEvent('anyid', 'on');

		- .on('mousedown(x: 0 10, y: 0 50)#anyid', func); -- coordinates on object or ctx
		- .on('mousemove(minDelta: 5, maxDelta: 8)', func);
		- .on('mousedrag', func);
		- .changeEvent('anyid', 'minDelta', 0);
 */