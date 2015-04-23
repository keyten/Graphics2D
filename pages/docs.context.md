Context
===================
Basic Graphics2D context. You can use on of this functions:
	var ctx = Graphics2D.id('mycanvas');
	var ctx = Graphics2D.query('canvas'); // the first canvas
	var ctx = Graphics2D.query('canvas', 1); // the second canvas
	var ctx = Graphics2D.query( document.getElementById('mycanvas') );

Or
	var cnv = document.createElement('canvas');
	var ctx = new Graphics2D.Context(cnv);

## Methods
All methods returns their context instead of undefined.

### getObjectInPoint( x, y, [mouse] )
Returns an object in **(x, y)** or null. Mouse - pass hidden (using `hide` method) objects.
	var first = ctx.rect(0, 0, 10, 10, 'red'),
		second = ctx.rect(5, 5, 10, 10, 'blue');
	second.mouse(false);
	ctx.getObjectInPoint(7, 7); // == second
	ctx.getObjectInPoint(7, 7, true); // == first

### push( object )
Adds *object* to redraw and event processing. More is (/tutorials/native/)[here].
	ctx.push({
		draw : function(ctx){
			ctx.fillRect(0, 0, 1, 1);
		}
	});

### update
Redraws canvas in 1 ms (without repeating):
	ctx.update();
	ctx.update();
	ctx.update(); // 3 calls, 1 update
*Note: use ctx.__update() for instant update.*
*Note2: you don't need this function, all objects update canvas themselves.*

### on( event, function )
Adds listener to canvas. Event object have 3 special properties.
	ctx.on('click', function(e){
		// this == ctx
		e.targetObject; // object or null
		e.contextX; // coordinates of mouse on context
		e.contextY;
	});

*Note: you can use timers:*
	ctx.on(1000, function(e){
		// this is still == ctx
	});

### once( event, function )
Listener, that will be removed after first call.

### off( [event, [function]] )
Removes: 1. One listener. 2. All listeners on one event. 3. All listeners.
	ctx.off('click', callback);
	ctx.off('click');
	ctx.off();

### fire( event, [data] )
Calls all the listeners of event.
	ctx.on('click', function(data){
		console.log(data.text);
	});
	ctx.fire('click', { text:'anytext' });
	// -> 'anytext' to console

### Aliases
With argument = `on`, without = `fire`.
	ctx.click(function(e){
		console.log(3);
	});
	ctx.click(); // = fire('click');
`click`, `dblclick`, `mousedown`, `mouseup`, `mousemove`, `mouseover`, `mouseout`, `mousewheel`, `focus`, `blur`.
*TODO: fix (add the passed aliases)*

### Elements
See other objects.
	ctx.rect(10, 10, 200, 200, 'black');