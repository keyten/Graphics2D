Graphics2D.Context
===================
*I am not sure in my English knowledge, so there may be some mistakes. Sorry. You can help me with your pull request.*
`Graphics2D.Context` -- the library's context, which can be got with one of these ways:
```js
var ctx = Graphics2D.id('element'); // canvas with id="element"
var ctx = Graphics2D.query('canvas', 0); // the first canvas on the page
// one can use the element's object
var ctx = Graphics2D.query( document.getElementById('foo') );
```

### Methods
All the methods returns the context (you can use jQuery-like chaining), if not otherwise required.

#### getObjectInPoint(x, y)
```js
ctx.getObjectInPoint(10, 10);
```
Returns an object in point `(x; y)`, or `null`, if there is not.  
If the third parameter is `true`, will ignore objects without mouse processing (see `mouse` func).

#### on(event, func)
```js
ctx.on('click', function(e){
    e.targetObject.fill('red');
    x = e.contextX;
    y = e.contextY;
});
```
Sets event listener to canvas. Extends event object (variable `e` in example above) with 3 properties:
- `targetObject` - object contains the current cursor point.
- `contextX`, `contextY` - mouse coordinates on canvas (the left top corner of canvas is `(0,0)`).

One can add a timer (context passes into `this`):
```js
ctx.on(1000, function(){
    // do something
});

// similarly:
window.setTimeout(function(){
    // do something
}.bind(ctx), 1000);
```

#### off(event, [func])
```js
ctx.on('click', anyfunc);
ctx.off('click', anyfunc);
ctx.off('click');
```
Removes event listener from canvas.

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
Internal method, updates the canvas. Use it only if you update internal object parameters and so on.

### Event aliases
```js
ctx.click(function(){ console.log(3); });
ctx.click(); // = fire('click');
```
`click`, `dblclick`, `mousedown`, `mouseup`, `mousemove`, `mouseover`, `mouseout`, `mousewheel`, `focus`, `blur`.

### Elements
One can create obs directly on the canvas:

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
ctx.image(x, y, [width, height, crop]);
```

Text:
```js
ctx.text(text, x, y, [font, fill, stroke]);
```

Gradient:
```js
ctx.gradient;
```

Pattern:
```js
ctx.pattern;
```
