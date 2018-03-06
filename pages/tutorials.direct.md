Direct canvas drawing

```js

var ctx = canvas.getContext('2d');
var rect = Delta.rect(10, 10, 200, 200, 'red');

ctx.draw(rect);

```

Mouse events processing

```js
canvas.addEventListener('click', function(event){
	var coords = Delta.contextCoords(canvas, event.contextX, event.contextY);
	if(rect.isPointIn(coords[0], coords[1])){
		// the click is on the rect
	}
});
```