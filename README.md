## Graphics2D JavaScript Library
*Note: Graphics2D 2.0 will be renamed to DeltaJS.*

**Graphics2D** is a javascript library available under the [MIT](http://opensource.org/licenses/mit-license.php) License.

### Install with bower
```js
bower install graphics2d
```

### Or use as a script
Just download [graphics2d.min.js](https://raw.githubusercontent.com/keyten/Graphics2D/Delta/graphics2d.min.js), put into your project folder and attach to your page:
```html
<script src="./js/graphics2d.min.js"></script>
```

### Then use
```html
<canvas id="cnv" width="600" height="400"></canvas>
```
```js
var ctx = Delta.query('#cnv');

// draw a red rect
ctx.rect({
    x: 100,
    y: 100,
    width: 50,
    height: 50,
    fill: 'red'
});
```

### Documentation
[Russian](http://github.com/keyten/Graphics2D/tree/master/Docs/Ru)

[English](http://graphics2d.js.org/docs/)

[Examples](http://graphics2d.js.org/examples/)

[Sandbox](http://graphics2d.js.org/sandbox/)
