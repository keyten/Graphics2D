Graphics2D.Context
===================
*I am not sure in my English knowledge, so there may be some mistakes. Sorry. You can help me with your pull request.*

`Graphics2D.Context` — the library's context, which can be got one of these ways:
```js
var ctx = Graphics2D.id('element'); // canvas with id="element"
var ctx = Graphics2D.query('canvas', 0); // the first canvas on the page
// query also receives the dom element
var ctx = Graphics2D.query( document.getElementById('foo') );
```

### Methods
All the methods return the context (you can use jQuery-like chaining), if not otherwise required.

#### getObjectInPoint(x, y)
```js
ctx.getObjectInPoint(10, 10);
```
Returns an object in point `(x; y)`, or `null`, if there is not.  
If the third argument is `true`, will ignore objects with mouse processing switched off (`interaction` attr).

#### on(event, func)
```js
ctx.on('click', function(e){
    if(e.targetObject){
        e.targetObject.attr('fill', 'red');
    }
    x = e.contextX;
    y = e.contextY;
});
```
Adds event listener to canvas. Extends event object (variable `e` in the example above) by 3 properties:
- `targetObject` — the object contains the current cursor point (or `null`).
- `contextX`, `contextY` — mouse coordinates on the canvas (the left top corner of canvas is `(0,0)`).

#### off(event, [func])
```js
ctx.on('click', anyfunc);
ctx.off('click', anyfunc);
ctx.off('click'); // removes all the click listeners
```
Removes event listener(s) from canvas.

Note: `ctx.off('click')` will only remove context listeners (set with ctx.on), but not the elements'.

#### fire(event, [data])
```js
ctx.on('click', function(data){ console.log(data.text); });
ctx.fire('click', {text:'anytext'});
```
Fires all event listeners.

#### update
```js
ctx.update();
```
Internal method, updates the canvas. Use it only if you update internal object parameters or something like.

### Event aliases
```js
ctx.click(function(){ console.log(3); }); // = on('click', function(){ console.log(3); });
ctx.click(); // = fire('click');
```
`click`, `dblclick`, `mousedown`, `mouseup`, `mousemove`, `mouseover`, `mouseout`, `mousewheel`, `focus`, `blur`.

### Elements
You can create obs directly on the canvas:

Rectangle:
```js
ctx.rect(x, y, width, height, [fill, stroke]);
```

Circle:
```js
ctx.circle(centerX, centerY, radius, [fill, stroke]);
```

Path:
```js
ctx.path(data, [fill, stroke]);
```

Image:
```js
ctx.image(image, x, y, [width, height, crop]);
```

Text:
```js
ctx.text(text, font, x, y, [fill, stroke]);
```

Gradient:
```js
ctx.gradient([type], colors, [from, to]);
```

Pattern:
```js
ctx.pattern(image, [repeat]);
```
