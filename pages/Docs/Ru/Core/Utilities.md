# Утилиты

Внутренние функции DeltaJS Core.

### Delta.class
Классы (с поддержкой наследования).

При создании вызывается функция `initialize`.
```js
var Animal = Delta.class({
	initialize: function(kind){
		this._kind = kind;
	},

	_kind: null,

	getKind: function(){
		return this._kind;
	}
});

var cat = new Animal('cat');
var dog = new Animal('dog');

cat.getKind(); // -> 'cat'
```

Наследование (можно вызвать функцию оригинального класса с помощью функции `super`):
```js
var Cat = Delta.class(Animal, {
	initialize: function(name){
		// можно делать this.super('initialize', arguments);
		this.super('initialize', ['cat']);
		this._name = name;
	},

	_name: null,

	getFullName: function(){
		return this.getKind() + ' ' + this._name;
	}
});

var catwill = new Cat('Catwill');
catwill.getKind(); // -> 'cat'
catwill.getFullName(); // -> 'cat Catwill'
```

Не стоит вызывать `super` внутри таймаута.

### Delta.bounds