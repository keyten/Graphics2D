/*  Graphics2D Core 1.9.0
 *
 *  Author: Dmitriy Miroshnichenko aka Keyten <ikeyten@gmail.com>
 *  Last edit: 7.3.2016
 *  License: MIT / LGPL
 */

(function(window, undefined){

// The main graphics2D class
var $ = {},

// Classes
	Context,
	Shape, Rect, Circle, Curve, Path, Img, Text, TextBlock,
	Gradient, Pattern, Bounds, Style,

// Local variables
	document = window.document,
	emptyFunc = function(){},
	toString = Object.prototype.toString,
	slice = Array.prototype.slice,
	reFloat = /^\d*\.\d+$/,
	domurl = window.URL || window.webkitURL || window,

	_ = new emptyFunc,
	requestAnimationFrame = window.requestAnimationFrame		||
	                        window.webkitRequestAnimationFrame	||
	                        window.mozRequestAnimationFrame		||
	                        window.oRequestAnimationFrame		||
	                        window.msRequestAnimationFrame		||
	                        function(callback){
	                        	return window.setTimeout(callback, 1000 / 60);
	                        },

	cancelAnimationFrame = window.cancelAnimationFrame			||
	                       window.webkitCancelAnimationFrame	||
	                       window.mozCancelAnimationFrame		||
	                       window.oCancelAnimationFrame			||
	                       window.msCancelAnimationFrame		||

	                       window.cancelRequestAnimationFrame		||
	                       window.webkitCancelRequestAnimationFrame	||
	                       window.mozCancelRequestAnimationFrame	||
	                       window.oCancelRequestAnimationFrame		||
	                       window.msCancelRequestAnimationFrame		||

	                       window.clearTimeout;


var Context;

Context = function(canvas, renderer){
	if(renderer in $.renderers)
		extend(this, $.renderers[renderer]);
	else
		this.context   = canvas.getContext('2d'); // rename to the context2d?
	this.canvas    = canvas;
	this.elements  = [];
	this.listeners = {};
	this._cache    = {}; // for gradients

	if(this.init)
		this.init();
};

Context.prototype = {

	// Classes

	rect : function(){
		return this.push( new Rect(arguments, this) );
	},

	circle : function(){
		return this.push( new Circle(arguments, this) );
	},

	path : function(){
		return this.push( new Path(arguments, this) );
	},

	image : function(){
		return this.push( new Img(arguments, this) );
	},

	text : function(){
		return this.push( new Text(arguments, this) );
	},

	gradient : function(type, from, to, colors){
		return new Gradient(type, from, to, colors, this);
	},

	pattern : function(image, repeat){
		return new Pattern(image, repeat, this);
	},


	// Path slices

	line : function(fx, fy, tx, ty, stroke){
		return this.path([ [fx, fy], [tx, ty] ], null, stroke);
	},

	quadratic : function(fx, fy, tx, ty, hx, hy, stroke){
		return this.path([ [fx, fy], [tx, ty, hx, hy] ], null, stroke);
	},

	bezier : function(fx, fy, tx, ty, h1x, h1y, h2x, h2y, stroke){
		return this.path([ [fx, fy], [tx, ty, h1x, h1y, h2x, h2y] ], null, stroke);
	},

	arcTo : function(fx, fy, tx, ty, radius, clockwise, stroke){
		return this.path([ [fx, fy], ['arcTo', fx, fy, tx, ty, radius, clockwise] ], null, stroke);
	},


	// Methods

	push : function(element){
		element._z = this.elements.length;
		element.context = this;
		this.elements.push(element);

		if( element.draw )
			element.draw(this.context);

		return element;
	},

	update : function(){
		if(this._timer)
			return;

		this._timer = requestAnimationFrame(function(){
			this._update();
			this._timer = null;
		}.bind(this));
	},

	_update : function(){
		var ctx = this.context,
			matrix = this.matrix;

		ctx.save();
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

		if(matrix)
			ctx.transform.apply(ctx, matrix);

		this.elements.forEach(function(object){
			object.draw(ctx);
		});
		this.fire('update');
		ctx.restore();
	},

	getObjectInPoint : function(x, y, mouse){
		var elements = this.elements,
			i = elements.length;

		while(i--){
		// mouse=true : pass elements with _events=false
			if( elements[i].isPointIn && elements[i].isPointIn(x,y) &&
				(elements[i]._events || !mouse) )
				return elements[i];
		}
		return null;
	},


	// Events

	hoverElement : null,

	focusElement : null,

	listener : function(event){
		if(this.listeners[event])
			return this.listeners[event];

		this.listeners[event] = [];

		this.canvas.addEventListener(event, function(e){
			var element,
				propagation = true,
				coords = $.coordsOfElement(this.canvas);

			e.contextX = e.clientX - coords.x;
			e.contextY = e.clientY - coords.y;
			// use e.stop to prevent event firing on context
			e.stop = function(){
				propagation = false;
			};

			if(event === 'mouseout'){
				element = this.hoverElement;
				this.hoverElement = null;
			}
			else {
				element = this.getObjectInPoint(e.contextX, e.contextY, true);
			}

			e.targetObject = element;

			if(element && element.fire){
				if(!element.fire(event, e)){
					e.stopPropagation();
					e.preventDefault();
					return;
				}
			}

			if(propagation)
				this.fire(event, e);
		}.bind(this));

		switch(event){
			case 'mouseover':
				this.listenerSpecial('mouseover', 'mouseout', 'hover', 'mousemove');
				this.listener('mouseout');
				break;
			case 'mouseout':
				this.listenerSpecial('mouseover', 'mouseout', 'hover', 'mousemove');
				this.listener('mouseover');
				break;
			case 'focus':
				this.listenerSpecial('focus', 'blur', 'focus', 'mousedown');
				break;
		}

		return this.listeners[event];
	},

	listenerSpecial : function(over, out, name, baseevent){ // for mouseover/mouseout and focus/blur
		// mouseover, mouseout, hover, mousemove
		// focus, blur, focus, mousedown
		name += 'Element';
		this.on(baseevent, function(e){
			var current = e.targetObject,
				last = this[name];

			if(last != current){
				if(last && last.fire)
					last.fire(out, e);
				if(current && current.fire)
					current.fire(over, e);
				this[name] = current;
			}

		}.bind(this));
		return this;
	},

	on : function(event, fn){
		if( isNumber(event) )
			return window.setTimeout(fn.bind(this), event), this;

		if( isObject(event) ){
			for(var key in event) if($.has(event, key))
				this.on(key, event[key]);
			return this;
		}

		(this.listeners[event] || this.listener(event)).push(fn);
		return this;
	},

	once : function(event, fn){ // doesn't works with .off
		var proxy;
		this.on(event, proxy = function(e){
			fn.call(this, e);
			this.off(event, proxy);
		}.bind(this));
	},

	off : function(event, fn){
		if(!fn)
			this.listeners[event] = [];

		var index = this.listeners[event].indexOf(fn);
		this.listeners = this.listeners[event].slice(0, index).concat( this.listeners[event].slice(index+1) );
		return this;
	},

	fire : function(event, data){
		var listeners = this.listeners[ event ];
		if(!listeners) return this;

		listeners.forEach(function(func){
			func.call(this, data);
		}.bind(this));
		return this;
	},

	// Transforms

	transform: function(a, b, c, d, e, f, pivot){
		// you can get the matrix: ctx.matrix
		// so you don't need ctx.transform() or something like this
		var matrix;

		if(pivot){
			if(isString(pivot))
				pivot = $.corners[pivot];
			else if(isObject(pivot)){
				;
			}
			var cx = this.canvas.width * pivot[0],
				cy = this.canvas.height * pivot[1];
			matrix = [a, b, c, d, -cx*a - cy*c + e + cx, -cx*b - cy*d + f + cy];
		}
		else {
			matrix = [a, b, c, d, e, f];
		}

		if(!this.matrix)
			this.matrix = matrix;
		else
			this.matrix = $.multiply(this.matrix, [a, b, c, d, e, f]);
		return this.update();

		// works wrong!
	},

	translate: function(x, y){
		return this.transform(1, 0, 0, 1, x, y);
	},

	rotate: function(angle, pivot){
		if($.angleUnit === 'grad')
			angle = angle * Math.PI / 180;

		return this.transform(Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), 0, 0, pivot);
	},

	scale: function(x, y, pivot){
		if(pivot === undefined && !isNumber(y)){
			pivot = y;
			y = x;
		}

		if(y === undefined)
			y = x;

		return this.transform(x, 0, 0, y, 0, 0, pivot);
	},

	skew : function(x, y, pivot){
		if(pivot === undefined && !isNumber(y)){
			pivot = y;
			y = x;
		}
		if( y === undefined ){
			y = x;
		}

		if($.angleUnit === 'grad'){
			x = x * Math.PI / 180;
			y = y * Math.PI / 180;
		}

		return this.transform( 1, Math.tan(y), Math.tan(x), 1, 0, 0, pivot);
	}

};

var shadowProps = {
	x: 'shadowOffsetX',
	y: 'shadowOffsetY',
	color: 'shadowColor',
	blur: 'shadowBlur'
};

// is using in fill and stroke
function normalizeFill(value, object){
	// object with gradient { type, colors, from, to, ... }
	if(isObject(value) && value.colors && !(value instanceof Gradient)){
		value = new Gradient(value, null, null, null, object.context);
	}
	// object, string or image with pattern
	else if(isPatternLike(value)){
		value = new Pattern(value, null, object.context);
	}
	// function
	else if(value instanceof Function){
		value = { toCanvasStyle: value.bind(object) };
	}
	return value;
}

// for objects with style
Style = { prototype: {

	parseFromObject: function(object){
		if($.has(object, 'opacity'))
			this.opacity(object.opacity);
		if($.has(object, 'composite'))
			this.composite(object.composite);
		if($.has(object, 'fill'))
			this.fill(object.fill);
		if($.has(object, 'stroke'))
			this.stroke(object.stroke);
		if($.has(object, 'visible'))
			this._visible = object.visible;
		if($.has(object, 'clip'))
			this.clip(object.clip);
	},

	style: function(name, value){
		if(value === undefined)
			return this.styles[name];
		if(value === null)
			delete this.styles[name];
		else
			this.styles[name] = value;
		return this.update();
	},

	fill: function(value){
		return this.style('fillStyle', normalizeFill(value, this));
	},

	// stroke() -- returns an object
	// stroke(null) -- clears the stroke
	// stroke(key) -- returns value
	// stroke(key, value) -- sets value
	// stroke(string)
	stroke: function(name, value){
		var styles = this.styles;
		switch(name){
			// return as object
			case undefined: {
				return {
					color: styles.strokeStyle,
					width: styles.lineWidth,
					cap: styles.lineCap,
					join: styles.lineJoin,
					dash: this._lineDash
				};
			} break;

			// delete all values
			case null: {
				delete styles.strokeStyle;
				delete styles.lineWidth;
				delete styles.lineCap;
				delete styles.lineJoin;
				delete this._lineDash;
			} break;

			case 'width': {
				if(value !== undefined)
					value = $.distance(value);
				return this.style('lineWidth', value);
			} break;
			case 'color': {
				return this.style('strokeStyle', normalizeFill(value, this));
			} break;
			case 'cap':   { return this.style('lineCap', value); } break;
			case 'join':  { return this.style('lineJoin', value); } break;
			case 'dash':  {
				if(value === undefined)
					return this._lineDash;
				if(value === null)
					delete this._lineDash;
				else {
					if(isString(value))
						this._lineDash = $.dashes[value];
					else
						this._lineDash = value;
				}
				return this.update();
			} break;
			case 'opacity': { // gradients / patterns support?
				var color = $.color(styles.strokeStyle);
				if(value === undefined)
					return color[3];
				color[3] = value;
				return this.style('strokeStyle', 'rgba(' + color.join(',') + ')');
			} break;

			default: {
				value = name;

				if(isObject(value)){
					for(var k in value){
						if($.has(value, k)){
							this.stroke(k, value[k]);
						}
					}
					return this;
				}

				if(!isString(value))
					throw ('Can\'t parse stroke ' + value);

				// remove spaces from colors & dashes
				value = value.replace(/\,\s/g, ',');
				value = value.split(' ');

				var l = value.length,
					opacity;
				while(l--){
					// opacity
					if(reFloat.test(value[l]))
						opacity = parseFloat(value[l]);

					// width
					else if(isNumberLike(value[l]))
						styles.lineWidth = $.distance(value[l]);

					// join & cap
					else if(value[l] === 'round'){ // wrong
						styles.lineJoin = styles.lineJoin || 'round';
						styles.lineCap = styles.lineCap || 'round';
					}

					// join
					else if(value[l] === 'miter' || value[l] === 'bevel')
						styles.lineJoin = value[l];

					// cap
					else if(value[l] === 'butt' || value[l] === 'square')
						styles.lineCap = value[l];

					// dash (array)
					else if(value[l][0] === '[')
						this._lineDash = value[l].substr(1, value[l].length-2).split(',');

					// dash (name)
					else if(value[l] in $.dashes)
						this._lineDash = $.dashes[value[l]];

					// color
					else
						styles.strokeStyle = value[l];
				}

				if(opacity){
					value = $.color(styles.strokeStyle);
					value[3] = opacity;
					styles.strokeStyle = 'rgba(' + value.join(',') + ')';
				}
			} break;
		}
		return this.update();
	},

	opacity: function(value){
		return this.style('globalAlpha', value);
	},

	composite: function(value){
		return this.style('globalCompositeOperation', value);
	},

	shadow: function(name, value){
		var styles = this.styles;
		if(isString(name)){
			// prop, val
			if(name in shadowProps){
				if(value === undefined)
					return styles[shadowProps[name]];

				if(name === 'color')
					styles[shadowProps[name]] = value;
				else
					styles[shadowProps[name]] = $.distance(value);
			}
			// css-like
			else {
				value = name;

				// remove spaces from color
				value = value.replace(/\s*\,\s+/g, ',');
				value = value.split(' ');

				var props = ['shadowOffsetX', 'shadowOffsetY', 'shadowBlur'];

				for(var i = 0; i < value.length; i++){
					if(isNumberLike(value[i]))
						styles[props[i]] = $.distance(value[i]);
					else
						styles.shadowColor = value[i];
				}
			}
		}
		else if(name === null){
			delete styles.shadowOffsetX;
			delete styles.shadowOffsetY;
			delete styles.shadowBlur;
			delete styles.shadowColor;
		}
		else if(name === undefined){
			return {
				x: styles.shadowOffsetX,
				y: styles.shadowOffsetY,
				blur: styles.shadowBlur,
				color: styles.shadowColor
			};
		}
		return this.update();
	},

	clip : function(clip, a, b, c){
		if(clip === undefined)
			return this._clip;
		if(clip === null)
			delete this._clip;

		if(clip.processPath)
			this._clip = clip;
		else if(c !== undefined)
			this._clip = new Rect([clip, a, b, c, null, null]);
		else if(b !== undefined)
			this._clip = new Circle([clip, a, b, null, null]);
		else
			this._clip = new Path([clip, null, null]);
		// problems with path

		this._clip.context = this.context;
//		this._clip.init(); // maybe need only if clip.context == undefined (before the last operation)
		return this.update();
	},

	hide : function(){
		this._visible = false;
		return this.update();
	},

	show : function(){
		this._visible = true;
		return this.update();
	},

	styleToContext: function(ctx){
		extend(ctx, this.styles);

		if(this.styles.fillStyle && this.styles.fillStyle.toCanvasStyle){
			ctx.fillStyle = this.styles.fillStyle.toCanvasStyle(ctx, this);
		}
		if(this.styles.strokeStyle && this.styles.strokeStyle.toCanvasStyle){
			ctx.strokeStyle = this.styles.strokeStyle.toCanvasStyle(ctx, this);
		}

		if(this._lineDash){
			if(ctx.setLineDash) // webkit
				ctx.setLineDash(this._lineDash);
			else
				ctx.mozDash = this._lineDash;
		}

		if(this._clip){
			if(this._clip._matrix){
				ctx.save();
				ctx.transform.apply(ctx, this._clip._matrix);
				this._clip.processPath(ctx);
				ctx.restore();
			}
			else
				this._clip.processPath(ctx);
			ctx.clip();
		}
	}

}};

$.Style = Style;

Shape = new Class(Style, {

	initialize : function(args){
		this.listeners = {}; // object to store event listeners
		this.styles = {};

		var props = this.constructor.props,
			handlers = this.constructor.propHandlers || {},
			l;

		if(isObject(args[0]) && this.constructor.firstObject){
			this.object = args[0];
			if(this.constructor.processStyle)
				this.parseFromObject(args[0]);
		}
		else if(props){
			l = Math.min(props.length, args.length);
			if(this.constructor.processStyle){
				if(args.length - props.length > 1)
					this.stroke(args[l + 1]);

				if(args.length - props.length > 0)
					this.fill(args[l]);
			}
			while(l--){
				if(handlers[l])
					this['_' + props[l]] = handlers[l](args[l]);
				else
					this['_' + props[l]] = args[l];
			}
		}
	},

	draw : function(ctx){
		if(!this._visible)
			return;
		ctx.save();
		this.styleToContext(ctx);
		if(this._matrix){
			ctx.transform.apply(ctx, this._matrix);
		}
		this.processPath(ctx);
		if(this.styles.fillStyle)
			ctx.fill();
		if(this.styles.strokeStyle)
			ctx.stroke();
		ctx.restore();
	},

	update : function(){
		if(!this.context) return this;
		return this.context.update(), this;
	},

	// properties
	prop : function(name, value){
		if(value === undefined)
			return this['_' + name];
		this['_' + name] = value;
		return this.update();
	},

	mouse : function(state){
		return this.prop('events', !!state);
	},

	z : function(z){
		if(z === undefined)
			return this._z;
		if(z === 'top')
			z = this.context.elements.length; // -1?
		this.context.elements.splice(this._z, 1);
		this.context.elements.splice(z, 0, this);
		this._z = z;
		return this.update();
	},

	clone : function(instance, events){
	// instance = don't clone the style
		var clone = new this.constructor([], this.context);
		for(var i in this){
			if($.has(this, i) && i[0] === '_'){
				if(typeof this[i] === 'object' &&
						this[i] !== null &&
						// todo: !(i instanceof Image)
						i !== '_image' && // for images
						(instance !== true || i !== '_style')){
					// and what about listeners here? (see after)
					clone[i] = $.clone(this[i]);
				}
				else
					clone[i] = this[i];
			}
		}

		if(events === true)
			clone.listeners = this.listeners;

		return this.context.push( clone );
	},

	remove : function(){
		this.context.elements.splice(this._z, 1);
		return this.update();
	},

	cursor : function(value){
		if( value === undefined )
			return this._cursor;

		if( value === null )
			;

		this._cursor = value;

		if( value === null )
			return this.off('mouseover', this._cursorListenerOn).off('mouseout', this._cursorListenerOff);

		if( !this._cursorListenerOn ){
			this._cursorListenerOn = function(){
				var canvas = this.context.canvas;
				this._oldCursor = canvas.style.cursor;
				canvas.style.cursor = this._cursor;
			};
			this._cursorListenerOff = function(){
				var canvas = this.context.canvas;
				if(canvas.style.cursor === this._cursor)
					canvas.style.cursor = this._oldCursor;
			};
			this.mouseover(this._cursorListenerOn).mouseout(this._cursorListenerOff);
		}

		return this;
	},

	// events
	on : function(event, fn){
		if(isString(fn))
			fn = wrap(arguments);

		if( isObject(event) ){
			for(var i in event){
				if($.has(event, i)){
					if(isArray(event[i]))
						this.on.apply(this, [i].concat(event[i]));
					else
						this.on(i, event[i]);
				}
			}
			return this;
		}

		if( isNumber(event) )
			return window.setTimeout(fn.bind(this), event), this;

		this.context.listener(event);
		(this.listeners[ event ] || (this.listeners[ event ] = [])).push(fn);
		return this;
	},

	once : function(event, fn){
		if(isString(fn))
			fn = wrap(arguments, this);
		var proxy;
		this.on(event, fn);
		this.on(event, proxy = function(){
			this.off(event, fn);
		});
		proxy.proxy = fn;
		return this;
	},

	off : function(event, fn){
		if(!event)
			return this.listeners = {}, this;
		if(!fn)
			return this.listeners[event] = [], this;

		event = this.listeners[event];

		var index = event.indexOf(fn);
		if( event[index+1].proxy === fn )
			event.splice(index, 2);
		else
			event.splice(index, 1);

		return this;
	},

	fire : function(event, data){
		event = this.listeners[event];
		if( !event )
			return this;
		for(var i = 0, l = event.length; i < l; i++){
			if( event.length < l ){ // for .off in the listener
				i -= (l - event.length);
				l = event.length;
			}

			event[i].call(this, data);
		}
		return this;
	},

	isPointIn : function(x, y){
		if(!this.processPath)
			return false;
		var ctx = this.context.context,
			is;
		ctx.save();
		if(this._matrix)
			ctx.transform.apply(ctx, this._matrix);
		this.processPath(ctx);
		is = ctx.isPointInPath(x, y);
		ctx.restore();
		return is;
	},

	corner : function(corner, options){
		if(isArray(corner))
			return corner;

		if(isObject(corner)){
			if($.has(corner, 'from')){
				var from = this.corner(corner.from);
				return [from[0] + corner.x, from[1] + corner.y];
			}
			else
				return [corner.x, corner.y];
		}
		if(!corner)
			corner = 'center';

		var bounds = this.bounds(options);
		return [
			bounds.x + bounds.w * $.corners[corner][0],
			bounds.y + bounds.h * $.corners[corner][1]
		];
	},

	bounds : function(options){
		if(!this.nativeBounds)
			throw ('Object #' + this._z + 'hasn\'t nativeBounds() method.');

		var nb = this.nativeBounds(),
			mt = this._matrix,
			lw = this.styles.lineWidth / 2,

			ltx = nb.x1, lty = nb.y1,
			rtx = nb.x2, rty = nb.y1,
			lbx = nb.x1, lby = nb.y2,
			rbx = nb.x2, rby = nb.y2;

		if( options ){
			if( options.stroke === 'exclude' ){
				options.stroke = true; // don't modify argument obs!
				lw *= -1;
			}

			if( options.stroke === true ){
				ltx -= lw;
				lty -= lw;
				rtx += lw;
				rty -= lw;
				lbx -= lw;
				lby += lw;
				rbx += lw;
				rby += lw;
			}

			if( options.transform === true && mt ){
				var a = mt[0], b = mt[1],
					c = mt[2], d = mt[3],
					e = mt[4], f = mt[5];

				ltx = [ltx * a + lty * c + e,  lty = ltx * b + lty * d + f][0]; // todo: beautify
				rtx = [rtx * a + rty * c + e,  rty = rtx * b + rty * d + f][0];
				lbx = [lbx * a + lby * c + e,  lby = lbx * b + lby * d + f][0];
				rbx = [rbx * a + rby * c + e,  rby = rbx * b + rby * d + f][0];
				if( options.points !== true ){
					var x1 = Math.min(ltx, rtx, lbx, rbx),
						x2 = Math.max(ltx, rtx, lbx, rbx),
						y1 = Math.min(lty, rty, lby, rby),
						y2 = Math.max(lty, rty, lby, rby);
					return new Bounds(x1, y1, x2 - x1, y2 - y1);
				}
			}

			if( options.points === true ){
				return {
					lt: [ltx, lty],
					rt: [rtx, rty],
					lb: [lbx, lby],
					rb: [rbx, rby]
				};
			}
		}

		return new Bounds(ltx, lty, rbx - ltx, rby - lty);
	},

	// transformations
	transform : function(a, b, c, d, e, f, pivot){
		/* px, py = pivot
			[1,0,px]   [a,c,e]   [1,0,-px]   [a, c, -px*a - py*c + e+px]
			[0,1,py] * [b,d,f] * [0,1,-py] = [b, d, -px*b - py*d + f+py]
			[0,0,1]    [0,0,1]   [0,0,1]     [0, 0, 1]
		*/
		if(a === undefined){
			return this._matrix;
		}
		if(a === null){
			this._matrix = null;
			return this.update();
		}

		pivot = this.corner(pivot)
		var matrix = [
				a, b, c, d,
				-pivot[0]*a - pivot[1]*c + e+pivot[0],
				-pivot[0]*b - pivot[1]*d + f+pivot[1]
				];

		if(this._matrix)
			matrix = $.multiply(this._matrix, matrix);

		this._matrix = matrix;
		return this.update();
	},

	scale : Context.prototype.scale,

	rotate : Context.prototype.rotate,

	skew : Context.prototype.skew,

	translate : Context.prototype.translate,

	// conversions
	toPath : function(){
		return null;
	},

	toDataURL : function(type, bounds){
		if( bounds === undefined ){
			if( typeof this.bounds === 'function' )
				bounds = this.bounds({ transform: true, stroke: true });
			else
				throw ('Object #' + this._z + ' can\'t be rasterized: need the bounds.');
		}

		// todo: use a new canvas
		var image,
			ctx = this.context.context,
			cnv = this.context.canvas,
			current = ctx.getImageData( 0, 0, cnv.width, cnv.height ),
			w = cnv.width,
			h = cnv.height;

		cnv.width  = bounds.width;
		cnv.height = bounds.height;

		ctx.translate( -bounds.x, -bounds.y );
		this.draw( ctx );
		ctx.translate( bounds.x, bounds.y );

		image = cnv.toDataURL( type );
		cnv.width  = w;
		cnv.height = h;
		ctx.putImageData( current, 0, 0 );

		return image;
	},

	rasterize : function(type, bounds){
		if( bounds === undefined ){
			if( typeof this.bounds === 'function' )
				bounds = this.bounds({ transform: true, stroke: true });
			else
				throw ('Object #' + this._z + ' can\'t be rasterized: need the bounds.');
		}
		return this.context.image( this.toDataURL(type, bounds), bounds.x, bounds.y );
	},

	// animation
	animate : function( prop, value, options ){
		//	animate(property, value, duration, easing, after);
		//	animate(properties, duration, easing, after);
		//	animate(property, value, options);
		//	animate(properties, options);

		if( isObject( prop ) ){
			if( isObject( value ) )
				value.queue = false;
			else
				value = { duration: value, easing: options, callback: arguments[4], queue: false };

			value = $.extend({}, value);
			var c = value.callback,
				keys = Object.keys( prop ),
				i = 0;
			value.callback = null;

			for(; i < keys.length; i++){
				if( i === keys.length-1 )
					value.callback = c;
				this.animate( keys[i], prop[keys[i]], value );
			}
			return this;
		}

		if( !isObject( options ) ){
			options = { duration: options, easing: arguments[3], callback: arguments[4] };
		}

		var now = Date.now(),
			object = {
			// element
			elem: this,
			// time
			startTime: now,
			endTime: now + (options.duration || 500),
			duration: options.duration || 500,
			// property
			prop: prop,
			end: value,
			// animation process
			state: 0,
			easing: $.easing[options.easing] || options.easing || $.easing.linear,
			callback: options.callback
		};

		if( options.queue === false ){
			$._queue.push( object );
			$._checkAnimation();
		} else {
			if( this._queue && this._queue.length > 0 )
				this._queue.push( object );
			else {
				this._queue = [ object ];
				$._queue.push( object );
				$._checkAnimation();
			}
		}
		return this;
	},

	// defaults
	_visible : true,
	_events : true,
	_origin : 'center' // for transform animations
});

$._queue = [];
var enabledAnimation = false;
function doAnimation(){
	var current, t,
		i = 0,
		l = $._queue.length,
		now = Date.now();
	for( ; i < l; i++ ){
		current = $._queue[i];
		t = (now - current.startTime) / current.duration;

		if( t < 0 )
			continue;

		if( t > 1 )
			t = 1;

		current.now = now;
		current.pos = current.easing(t);
		$.fx.step[current.prop](current);

		if( current.state === 0 )
			current.state = 1;

		if( t === 1 ){
			if( current.callback )
				current.callback.call( current.elem, current );
			if( current.elem._queue ){
				current.elem._queue.shift();
				if( current.elem._queue.length > 0 ){
					$._queue[i] = current = current.elem._queue[0];
					current.startTime = Date.now();
					current.endTime = current.startTime + current.duration;
				} else {
					current.elem._queue = null;
					$._queue.splice(i, 1);
					i--; l--;
				}
			} else {
				current.elem._queue = null;
				$._queue.splice(i, 1);
				i--; l--;
			}
		}
	}
	current.elem.update();
	if(l > 0)
		requestAnimationFrame(doAnimation);
	else
		enabledAnimation = false;
}
$._checkAnimation = function(){
	if( !enabledAnimation ){
		requestAnimationFrame(doAnimation);
		enabledAnimation = true;
	}
};
$.fx = {};
$.fx.step = {
	int: function( fx ){
		if( fx.state === 0 ){
			fx._prop = '_' + fx.prop;
			fx.start = fx.elem[ fx._prop ];
			if( isString(fx.end) ){
				if( fx.end.indexOf('+=') === 0 )
					fx.end = fx.start + Number( fx.end.substr(2) );
				else if( fx.end.indexOf('-=') === 0 )
					fx.end = fx.start - Number( fx.end.substr(2) );
			}
		}

		fx.elem[ fx._prop ] = Math.round(fx.start + (fx.end - fx.start) * fx.pos);
	},

	float: function( fx ){
		if( fx.state === 0 ){
			fx._prop = '_' + fx.prop;
			fx.start = fx.elem[ fx._prop ];
			if( isString(fx.end) ){
				if( fx.end.indexOf('+=') === 0 )
					fx.end = fx.start + Number( fx.end.substr(2) );
				else if( fx.end.indexOf('-=') === 0 )
					fx.end = fx.start - Number( fx.end.substr(2) );
			}
		}

		fx.elem[ fx._prop ] = fx.start + (fx.end - fx.start) * fx.pos;
	},

	opacity: function( fx ){
		if( fx.state === 0 ){
			fx.start = fx.elem.styles.globalAlpha;
			if( fx.start === undefined )
				fx.start = 1;
		}
		fx.elem.styles.globalAlpha = fx.start + (fx.end - fx.start) * fx.pos;
	},

	fill: function( fx ){
		if( fx.state === 0 ){
			fx.start = $.color( fx.elem.styles.fillStyle );

			if( fx.end === 'transparent' ){
				fx.end = fx.start.slice(0, 3).concat([ 0 ]);
			} else
				fx.end = $.color( fx.end );

			if( fx.elem.styles.fillStyle === 'transparent' ||
				fx.elem.styles.fillStyle === undefined )
				fx.start = fx.end.slice(0, 3).concat([ 0 ]);
		}
		fx.elem.styles.fillStyle = 'rgba(' +
			[	Math.round(fx.start[0] + (fx.end[0] - fx.start[0]) * fx.pos),
				Math.round(fx.start[1] + (fx.end[1] - fx.start[1]) * fx.pos),
				Math.round(fx.start[2] + (fx.end[2] - fx.start[2]) * fx.pos),
				fx.start[3] + (fx.end[3] - fx.start[3]) * fx.pos ].join(',') + ')';
	},

	stroke: function( fx ){
		// width, color, dash
		if( fx.state === 0 ){
	//		var end = Shape.prototype._parseStroke( fx.end );
			fx.color1 = $.color( fx.elem.styles.strokeStyle );
			fx.width1 = fx.elem.styles.lineWidth || 0;
			fx.width2 = end.lineWidth;

			if( end.strokeStyle === 'transparent' )
				fx.color2 = fx.color1.slice(0, 3).concat([ 0 ]);
			else if( end.strokeStyle )
				fx.color2 = $.color( end.strokeStyle );

			if( (fx.elem.styles.strokeStyle === 'transparent' ||
				fx.elem.styles.strokeStyle === undefined) && end.strokeStyle )
				fx.color1 = fx.color2.slice(0, 3).concat([ 0 ]);
		}

		if( fx.color2 ){
			fx.elem.styles.strokeStyle = 'rgba(' +
				[	Math.round(fx.color1[0] + (fx.color2[0] - fx.color1[0]) * fx.pos),
					Math.round(fx.color1[1] + (fx.color2[1] - fx.color1[1]) * fx.pos),
					Math.round(fx.color1[2] + (fx.color2[2] - fx.color1[2]) * fx.pos),
					fx.color1[3] + (fx.color2[3] - fx.color1[3]) * fx.pos ].join(',') + ')';
		}

		if( fx.width2 )
			fx.elem.styles.lineWidth = fx.width1 + (fx.width2 - fx.width1) * fx.pos;
	},

	translate: function( fx ){
		transformAnimation( fx, function(){
			return [ 1, 0, 0, 1, fx.end[0] * fx.pos, fx.end[1] * fx.pos ];
		} );
	},
	rotate: function( fx ){
		if( fx.state === 0 && $.angleUnit === 'grad' )
			fx.end = fx.end * Math.PI / 180;

		transformAnimation( fx, function(){
			var cur = fx.end * fx.pos,
				cos = Math.cos( cur ),
				sin = Math.sin( cur );
			return [ cos, sin, -sin, cos, 0, 0 ];
		} );
	},
	skew: function( fx ){
		if( fx.state === 0 ){
			if( fx.end.length === undefined )
				fx.end = [ fx.end, fx.end ];

			if( $.angleUnit === 'grad'){
				fx.end[0] = fx.end[0] * Math.PI / 180;
				fx.end[1] = fx.end[1] * Math.PI / 180;
			}
		}

		transformAnimation( fx, function(){
			return [ 1, Math.tan( fx.end[1] * fx.pos ), Math.tan( fx.end[0] * fx.pos ), 1, 0, 0 ];
		} );
	},
	scale: function( fx ){
		if( fx.state === 0 && fx.end.length === undefined )
			fx.end = [ fx.end, fx.end ];

		transformAnimation( fx, function(){
			return [ 1 + (fx.end[0] - 1) * fx.pos, 0, 0, 1 + (fx.end[1] - 1) * fx.pos, 0, 0 ];
		} );
	},
	origin: function( fx ){
		if( fx.state === 0 )
			fx.elem._origin = fx.elem.corner( fx.end );
	}
};

function transformAnimation( fx, fn ){
	if( fx.state === 0 ){
		fx.elem._matrixStart = fx.elem._matrix || [ 1, 0, 0, 1, 0, 0 ];
		fx.elem._matrixCur = [];
		if( fx.elem.corner )
			fx.corner = fx.elem.corner( fx.elem._origin || 'center' );
		else
			fx.corner = [ 0, 0 ];
	}
	if( fx.elem._matrixCur.now !== fx.now )
		fx.elem._matrixCur = [ 1, 0, 0, 1, 0, 0 ];

	var matrix = fn( fx );
	matrix[4] += fx.corner[0] - fx.corner[0]*matrix[0] - fx.corner[1]*matrix[2];
	matrix[5] += fx.corner[1] - fx.corner[0]*matrix[1] - fx.corner[1]*matrix[3];

	fx.elem._matrixCur = $.multiply( fx.elem._matrixCur, matrix );
	fx.elem._matrixCur.now = fx.now;
	fx.elem._matrix = $.multiply( fx.elem._matrixStart, fx.elem._matrixCur );
}

// events slices
['click', 'dblclick', 'mousedown', 'mousewheel',
	'mouseup', 'mousemove', 'mouseover',
	'mouseout', 'focus', 'blur',
	'touchstart', 'touchmove', 'touchend',
	'keypress', 'keydown', 'keyup'].forEach(function(event){
		Shape.prototype[event] = Context.prototype[event] = function(fn){
			if(typeof fn === 'function' || isString(fn))
				return this.on.apply(this, [event].concat(slice.call(arguments)));
			else
				return this.fire.apply(this, arguments);
		};
	});

// animation slices
['x', 'y', 'width', 'height', 'cx', 'cy', 'radius'].forEach(function( param ){
	$.fx.step[ param ] = $.fx.step.int;
});

$.fn = Shape.prototype;

Rect = new Class(Shape, {

	initialize : function(){
		if(this.object){
			var object = this.object;
			this._x = object.x;
			this._y = object.y;
			this._width = object.width;
			this._height = object.height;
			delete this.object;
		}
	},

	// Parameters

	x : function(x){
		return this.prop('x', x);
	},
	y : function(y){
		return this.prop('y', y);
	},
	width : function(w){
		return this.prop('width', w);
	},
	height : function(h){
		return this.prop('height', h);
	},
	x1 : function(x){
		return x === undefined ?
			this._x :
			this.prop('width', this._width - x + this._x)
				.prop('x', x);
	},
	y1 : function(y){
		return y === undefined ?
			this._y :
			this.prop('height', this._height - y + this._y)
				.prop('y', y);
	},
	x2 : function(x){
		return x === undefined ?
			this._x + this._width :
			this.prop('width', x - this._x);
	},
	y2 : function(y){
		return y === undefined ?
			this._y + this._height :
			this.prop('height', y - this._y);
	},

	nativeBounds : function(){
		return new Bounds(this._x, this._y, this._width, this._height);
	},

	processPath : function(ctx){
		ctx.beginPath();
		ctx.rect(this._x, this._y, this._width, this._height);
	}

});

Rect.props = [ 'x', 'y', 'width', 'height' ];
Rect.processStyle = true;
Rect.firstObject = true; // parse the first argument if it is object
Rect.propHandlers = [distance, distance, distance, distance];

$.rect = function(){
	return new Rect(arguments);
};

// todo: x1, y1, x2, y2 animation

Circle = new Class(Shape, {

	initialize : function(){
		if(this.object){
			var object = this.object;
			this._cx = object.cx;
			this._cy = object.cy;
			this._radius = object.radius;
			delete this.object;
		}
	},

	// Parameters

	cx : function(cx){
		return this.prop('cx', cx);
	},

	cy : function(cy){
		return this.prop('cy', cy);
	},

	radius : function(r){
		return this.prop('radius', r);
	},

	bounds : function(){
		return new Bounds(this._cx - this._radius, this._cy - this._radius, this._radius * 2, this._radius * 2);
	},

	processPath : function(ctx){
		ctx.beginPath();
		// Math.abs -- fix for negative radius (for ex. - animate radius to 0 with elasticOut easing)
		ctx.arc(this._cx, this._cy, Math.abs(this._radius), 0, Math.PI*2, true);
	}

});

Circle.props = [ 'cx', 'cy', 'radius' ];
Circle.processStyle = true;
Circle.firstObject = true;
Circle.propHandlers = [distance, distance, distance];


$.circle = function(){
	return new Circle(arguments);
};

Curve = new Class({

	initialize : function( name, args, path ){
		this.name = name;
		this.path = path;
		this.args = args;

		if( name in Curve.curves ){
			extend( this, Curve.curves[ name ] );
		}
	},

	// Parameters

	prop : Shape.prototype.prop,
	update : function(){
		this.path.update();
		return this;
	},

	arguments : function(){
		return this.prop( 'args', arguments.length > 1 ? arguments : arguments[0] );
	},

	from : function(){ // returns the start point
		if(!this.path)
			throw 'Error: the curve hasn\'t path.';

		var index = this.path._curves.indexOf( this ),
			before = this.path._curves[ index - 1 ];

		if( index === 0 )
			return [0, 0];
		if( index === -1 || !before || !('endsIn' in before) )
			return null; // todo: throw new error

		var end = before.endsIn();
		if( !end )
			return null; // todo: throw
		return end;
	},

	endsIn : function(){
		if( this._slice )
			return this.args.slice( this._slice[0], this._slice[1] );
		return null;
	},

	process : function( ctx ){
		ctx[ this.name ].apply( ctx, this.args );
		return this.endsIn();
	},

	_bounds : function(){
		return null;
	}
});

Curve.curves = {
	moveTo : {
		_slice : [ , ],
		points : function(){ return [this.args]; },
		x : argument( 0 ),
		y : argument( 1 )
	},
	lineTo : {
		_slice : [ , ],
		points : function(){ return [this.args]; },
		_bounds : function( from ){
			var end = this.args;
			return new Bounds( from[0], from[1], end[0] - from[0], end[1] - from[1] );
		},
		x : argument( 0 ),
		y : argument( 1 )
	},
	quadraticCurveTo : {
		_slice : [ 2 ],
		points : function(){
			return [ this.args.slice(2), this.args.slice(0, 2) ];
		},
		_bounds : function( f ){
			var a = this.args,
				x1 = Math.min( a[0], a[2], f[0] ),
				y1 = Math.min( a[1], a[3], f[1] ),
				x2 = Math.max( a[0], a[2], f[0] ),
				y2 = Math.max( a[1], a[3], f[1] );
			return new Bounds( x1, y1, x2 - x1, y2 - y1 );
		},
		hx : argument( 0 ),
		hy : argument( 1 ),
		x  : argument( 2 ),
		y  : argument( 3 )
	},
	bezierCurveTo : {
		_slice : [ 4 ],
		points : function(){
			return [ this.args.slice(4), this.args.slice(2, 4), this.args.slice(0, 2) ];
		},
		_bounds : function( f ){
			var a = this.args,
				x1 = Math.min( a[0], a[2], a[4], f[0] ),
				y1 = Math.min( a[1], a[3], a[5], f[1] ),
				x2 = Math.max( a[0], a[2], a[4], f[0] ),
				y2 = Math.max( a[1], a[3], a[5], f[1] );
			return new Bounds( x1, y1, x2 - x1, y2 - y1 );
		},
		h1x : argument( 0 ),
		h1y : argument( 1 ),
		h2x : argument( 2 ),
		h2y : argument( 3 ),
		x   : argument( 4 ),
		y   : argument( 5 )
	},
	arc : {
		points : function(){
			return [ this.args.slice(0, 2) ];
		},
		x         : argument( 0 ),
		y         : argument( 1 ),
		radius    : argument( 2 ),
		start     : argument( 3 ),
		end       : argument( 4 ),
		clockwise : argument( 5 ),
		endsIn : function(){
			var x         = this.args[ 0 ],
				y         = this.args[ 1 ],
				radius    = this.args[ 2 ],
				start     = this.args[ 3 ],
				end       = this.args[ 4 ],
				clockwise = this.args[ 5 ],
				delta     = end - start;

			if( clockwise )
				delta = -delta;

			return [
				x + Math.cos( delta ) * radius,
				y + Math.sin( delta ) * radius
			];
		}
	},
	arcTo : {
		_slice : [ 2, 4 ],
		points : function(){
			return [ this.args.slice(0, 2), this.args.slice(2) ];
		},
		x1        : argument( 0 ),
		y1        : argument( 1 ),
		x2        : argument( 2 ),
		y2        : argument( 3 ),
		radius    : argument( 4 ),
		clockwise : argument( 5 )
	}
};

Curve.fromArray = function(array, path){
	if(array === true)
		return closePath;

	if(array[0] in Curve.curves)
		return new Curve(array[0], array.slice(1), path);

	switch(array.length){
		case 2: return new Curve('lineTo', array, path);
		case 4: return new Curve('quadraticCurveTo', array, path);
		case 6: return new Curve('bezierCurveTo', array, path);
	}
};

$.curves = Curve.curves;

var closePath = new Curve('closePath', []);

Path = new Class( Shape, {

	initialize : function(){
		if(this.object){
			this._curves = this.object._curves;
			delete this.object;
		}
		this._curves = Path.parsePath( this._curves, this );
	},

	// curves
	curve : function(index, value){
		if(value === undefined)
			return this._curves[index];

		value = Path.parsePath(value, this, index === 0 ? false : true);
		this._curves.splice.apply(this._curves, [index, 1].concat(value));
		return this.update();
	},

	before : function(index, value, turnToLine){
		// if index = 0 & turnToLine then the first moveTo will be turned to lineTo
		// turnToLine = true by default
		if(turnToLine !== false && index === 0){
			this._curves[0].name = 'lineTo';
		}

		value = Path.parsePath(value, this, index === 0 ? false : true);
		this._curves.splice.apply(this._curves, [index, 0].concat(value));
		return this.update();
	},

	after : function(index, value){
		return this.before(index+1, value);
	},

	remove : function(index){
		if(index === undefined)
			return Shape.prototype.remove.call(this);
		this._curves.splice(index, 1);
		return this.update();
	},

	curves : function(value){
		if(value === undefined)
			return this._curves;

		if(isNumberLike(value[0]))
			this._curves = Path.parsePath(slice.call(arguments), this);
		else
			this._curves = Path.parsePath(value, this);
		return this.update();
	},

	// adding
	push : function(curve){
		this._curves.push(curve);
		return this.update();
	},

	add : function(name, arg){
		return this.push(new Curve(name, arg, this));
	},

	moveTo : function(x, y){
		return this.add('moveTo', [x, y]);
	},

	lineTo : function(x, y){
		return this.add('lineTo', [x, y]);
	},

	quadraticCurveTo : function(hx, hy, x, y){
		return this.add('quadraticCurveTo', [hx, hy, x, y]);
	},

	bezierCurveTo : function(h1x, h1y, h2x, h2y, x, y){
		return this.add('bezierCurveTo', [h1x, h1y, h2x, h2y, x, y]);
	},

	arcTo : function(x1, y1, x2, y2, radius, clockwise){
		return this.add('arcTo', [x1, y1, x2, y2, radius, !!clockwise]);
	},

	arc : function(x, y, radius, start, end, clockwise){
		return this.add('arc', [x, y, radius, start, end, !!clockwise]);
	},

	closePath : function(){
		return this.push( closePath );
	},

	// processing
	merge : function(path){
		this._curves = this._curves.concat(path._curves);
		return this.update();
	},

	nativeBounds : function(){
		var curve, end,
			curves = this._curves,
			current = [0, 0],
			i = 0,
			l = curves.length,
			minx =  Infinity,
			miny =  Infinity,
			maxx = -Infinity,
			maxy = -Infinity;

		for(; i < l; i++){
			curve = curves[i];

			if(curve._bounds && (curve = curve._bounds(current))){
				minx = Math.min(minx, curve.x1, curve.x2);
				miny = Math.min(miny, curve.y1, curve.y2);
				maxx = Math.max(maxx, curve.x1, curve.x2);
				maxy = Math.max(maxy, curve.y1, curve.y2);
			}
			if( (end = curves[i].endsIn()) ){
				current = end;
			}
		}

		return new Bounds(minx, miny, maxx - minx, maxy - miny);
	},

	processPath : function(ctx){
		var curve,
			current = [0, 0],
			curves = this._curves,
			i = 0,
			l = curves.length;

		ctx.beginPath();
		for(; i < l; i++){
			curve = curves[i].process(ctx, current);

			if(curve)
				current = curve;
		}
	}

} );

Path.props = [ 'curves' ];
Path.processStyle = true;
Path.firstObject = true;

Path.parsePath = function(path, pathObject, firstIsNotMove){
	if(!path)
		return [];

	if(path instanceof Curve){
		path.path = pathObject;
		return [path];
	}

	var curves = [];
	if(isArray(path)){

		// fix for [x,y] instead of [[x,y]]
		if(isNumberLike(path[0]))
			path = [path];

		for(var i = 0, l = path.length; i < l; i++){

			// Curve
			if(path[i] instanceof Curve){
				curves.push(path[i]);
				path[i].path = pathObject;
			}

			// Array
			else {
				if(i === 0 && !firstIsNotMove){
					curves.push(new Curve('moveTo', path[i], pathObject));
					continue;
				}
				curves.push(Curve.fromArray(path[i], pathObject));
			}
		}

	}

	return curves;
};

$.path = function(){
	var path = new Path(arguments);
	path.init();
	return path;
};

var smoothWithPrefix;
function smoothPrefix(ctx){
	if(smoothWithPrefix) return smoothWithPrefix;
	['mozImageSmoothingEnabled', 'webkitImageSmoothingEnabled', 'msImageSmoothingEnabled', 'imageSmoothingEnabled'].forEach(function(name){
		if(name in ctx)
			smoothWithPrefix = name;
	});
	return smoothWithPrefix;
}

Img = new Class(Shape, {

	init : function(){
		if(this.object){
			var object = this.object;
			this._image = object.image;
			this._x = $.distance(object.x); // distance
			this._y = $.distance(object.y);
			this._width = $.distance(object.width);
			this._height = $.distance(object.height);
			this._crop = object.crop;
		}

		var blob, s;

		if(isString(this._image)){
			if(this._image[0] === '#')
				this._image = document.getElementById( this._image.substr(1) );

			// https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Drawing_DOM_objects_into_a_canvas
			else if(this._image.indexOf('<svg') === 0){
				blob = new Blob([this._image], {type: 'image/svg+xml;charset=utf-8'});
				this._image = new Image();
				this._image.src = domurl.createObjectURL(blob);
			}
			else {
				s = new Image();
				s.src = this._image;
				this._image = s;
			}
		}


		this._image.addEventListener('load', function(e){
			this.update();

			if(blob)
				domurl.revokeObjectURL(blob);

			this.fire('load', e);
		}.bind(this));

		this._image.addEventListener('error', function(e){
			this.fire('error', e);
		}.bind(this));

		// Video tag support?
	},

	x  : Rect.prototype.x,
	y  : Rect.prototype.y,
	x1 : Rect.prototype.x1,
	y1 : Rect.prototype.y1,
	x2 : Rect.prototype.x2, // wrong!!! with 'auto', 'native'
	y2 : Rect.prototype.y2,
	width : function(w){
		if(w === undefined){
			if(this._width === 'auto')
				return this._image.width * (this._height / this._image.height);
			else if(this._width === 'native' || this._width == null)
				return this._image.width;
			return this._width;
		}

		if(!this._image.complete)
			return this.once('load', 'width', w); // todo: once?

		if(isNumberLike(w))
			w = $.distance(w);

		return this.prop('width', w);
	},
	height : function(h){
		if(h === undefined){
			if(this._height === 'auto')
				return this._image.height * (this._width / this._image.width);
			else if(this._height === 'native' || this._height == null)
				return this._image.height;
			return this._height;
		}

		if(!this._image.complete)
			return this.once('load', 'height', h);

		if(isNumberLike(h))
			h = $.distance(h);

		return this.prop('height', h);
	},
	_bounds : Rect.prototype._bounds,

	processPath : function(ctx){ // for event listeners
		ctx.beginPath();
		ctx.rect(this._x, this._y, this.width(), this.height());
	},

	load : function(fn){
		if(typeof fn === 'function' || isString(fn))
			return this.on.apply(this, ['load'].concat(slice.call(arguments)));
		else
			return this.fire.apply(this, arguments);
	},

	crop : function(arr){
		if(arguments.length === 0)
			return this._crop;
		if(arguments.length > 1)
			this._crop = Array.prototype.slice.call(arguments, 0);
		else if(arr === null)
			delete this._crop;
		else this._crop = arr;
		return this.update();
	},

	smooth : function(value){
		var style = this._style,
			prefix = smoothPrefix(this.context.context);
		if(value === undefined)
			return style[prefix] === undefined ? this.context.context[prefix] : style[prefix];
		style[prefix] = !!value;
		return this.update();
	},

	_smooth : true,

	draw : function(ctx){
		if(!this._visible)
			return;
		ctx.save();
		this.style.toContext(ctx);
		var image = this._image,
			w = this._width,
			h = this._height;

		if(w === 'auto')
			w = image.width * (h / image.height);
		else if(w === 'native' || w == null)
			w = image.width;

		if(h === 'auto')
			h = image.height * (w / image.width);
		else if(h === 'native' || h == null)
			h = image.height;

		if(this._crop !== undefined)
			ctx.drawImage(image, this._crop[0], this._crop[1], this._crop[2], this._crop[3], this._x, this._y, w, h);
		else if(w != null || h != null)
			ctx.drawImage(image, this._x, this._y, w, h);

		if(this.style.props.strokeStyle !== undefined)
			ctx.strokeRect(this._x, this._y, this._width, this._height);
		ctx.restore();
	}

});

Img.props = [ 'image', 'x', 'y', 'width', 'height', 'crop' ];
Img.processStyle = true;
Img.firstObject = true; // parse the first argument if it is object
Img.propHandlers = [null, distance, distance, distance, distance]; // TODO: check on errors! 'auto', 'native' values?

$.image = function(){
	var image = new Img(arguments);
	image.init();
	return image;
};

$.fx.step.crop = function( fx ){
	if( fx.state === 0 ){
		fx.start = fx.elem._crop;
		if( !fx.start ){
			fx.start = [ 0, 0, fx.elem._image.width, fx.elem._image.height ];
		}
	}

	fx.elem._crop = [
		Math.round(fx.start[0] + (fx.end[0] - fx.start[0]) * fx.pos),
		Math.round(fx.start[1] + (fx.end[1] - fx.start[1]) * fx.pos),
		Math.round(fx.start[2] + (fx.end[2] - fx.start[2]) * fx.pos),
		Math.round(fx.start[3] + (fx.end[3] - fx.start[3]) * fx.pos)
		];
};

Text = new Class(Shape, {

	initialize : function(args){
		// text, [font], x, y, [fill], [stroke]
		if(this.object){
			var object = this.object;
			this._text = object.text + '';
			this._x = object.x;
			this._y = object.y;
			this._font = this._parseFont(object.font || Text.font);
			if(object.baseline !== undefined)
				this.styles.textBaseline = object.baseline;
			if(object.align !== undefined)
				this.styles.textAlign = object.align;
			if(object.underline !== undefined)
				this.underline(object.underline);
			this._width = object.width;
			if(object.type === 'block'){
				this._type = object.type;
			}
			delete this.object;
		}
		else {
			// text, font, x, y, fill, stroke
			this._text = args[0] + '';
			var i = 1;
			if( !isNumberLike(args[3]) ){
				this._font = this._parseFont(Text.font);
			}
			else {
				this._font = this._parseFont(args[i++]);
			}
			this._x = args[i++];
			this._y = args[i++];

			if(args[i++])
				this.fill(args[i-1]);

			if(args[i])
				this.stroke(args[i]);
		}
		this._genFont();
	},

	_type: 'label', // label or block
	_changedText: true,
	_lineSpace: 0,

	_genLines : function(){
		if(this._type === 'label')
			return this;

		var text = this._text,
			lines = this._lines = [],
			size = this._lineHeight || this._font.size || 10,
			ctx = this.context.context,
			width = this._width || Infinity,
			countline = 1,
			align = this.styles.textAlign,
			x = (align === 'center') ? (width/2) : ((align === 'right') ? width : 0);

		ctx.save();
		this.styleToContext(ctx);

		text.split('\n').forEach(function(line){
			// Do we need split line to lines?
			if(ctx.measureText(line).width > width){
				var words = line.split(' '),
					useline = '',
					testline, i, len;

				for(i = 0, len = words.length; i < len; i++){
					testline = useline + words[i] + ' ';

					if(ctx.measureText(testline).width > width){
						lines.push({ text:useline, x:x, y:size * countline, count:countline++ });
						useline = words[i] + ' ';
					}
					else {
						useline = testline;
					}
				}
				lines.push({ text:useline, x:x, y:size * countline, count:countline++ });
			}
			else
				lines.push({ text:line, x:x, y:size * countline, count:countline++ });

		});
		this._changedText = false;
		ctx.restore();
		return this;
	},

	// options
	text : function(t){
		return this.prop('text', t);
	},
	type : function(t){
		return this.prop('type', t);
	},
	x : function(x){
		return this.prop('x', x);
	},
	y : function(y){
		return this.prop('y', y);
	},
	lineSpace : function(s){
		return this.prop('lineSpace', s);
	},
	font : function(font){
		if(font === true)
			return this.styles.font;
		if(font === undefined)
			return this._font;
		extend(this._font, this._parseFont(font));
		return this._genFont();
	},
	_setFont : function(name, value){
		if(value === undefined)
			return this._font[name];
		this._font[name] = value;
		return this._genFont();
	},
	_genFont : function(){
		var str = '',
			font = this._font;
		if(font.italic)
			str += 'italic ';
		if(font.bold)
			str += 'bold ';
		return this.style('font', str + (font.size || 10) + 'px ' + (font.family || 'sans-serif'));
		// font.size can't be 0? unexpected behavior
	},
	_parseFont : function(font){
		if(isObject(font)){
			font.size = $.distance(font.size);
			return font;
		}

		var obj = {family:''};
		font.split(' ').forEach(function(val){
			if(val === 'bold')
				obj.bold = true;
			else if(val === 'italic')
				obj.italic = true;
			else if(/^\d+(px|pt)?/.test(val))
				obj.size = $.distance(val);
			else
				obj.family += ' ' + val;
		});
		if( (obj.family = obj.family.replace(/^\s*/, '').replace(/\s*$/, '')) === '' )
			delete obj.family;
		return obj;
	},
	family : function(f){
		return this._setFont('family', f);
	},
	size : function(s){
		return this._setFont('size', s === undefined ? undefined : $.distance(s));
	},
	bold : function(b){
		return this._setFont('bold', b === undefined ? undefined : !!b) || false;
	},
	italic : function(i){
		return this._setFont('italic', i === undefined ? undefined : !!i) || false;
	},
	align : function(a){
		return this.style('textAlign', a);
	},
	baseline : function(b){
		return this.style('textBaseline', b);
	},
	underline : function(val){
		switch(val){
			case undefined:
				return this._underline;

			case true: {
				this._underline = {
					color: 'auto',
					height: 'auto',
					visible: true
				};
			} break;

			case false: {
				if(this._underline)
					this._underline.visible = false;
			} break;

			default: {
				this._underline = val;
			} break;
		}
		return this.update();
	},
	width : function(w){
		if(w === undefined){
			if(this._type === 'label'){
				var ctx = this.context.context;
				ctx.save();
				this.styleToContext(ctx);
				w = ctx.measureText( this._text ).width;
				ctx.restore();
				return Math.min(w, this._width || Infinity);
			}
			else {
				if(this._width)
					return this._width;
				ctx.save();
				this.styleToContext(ctx);
				if(this._changedText)
					this._genLines();
				var max = 0;
				this._lines.forEach(function(line){
					max = Math.max( max, ctx.measureText( line.text ).width );
				});
				ctx.restore();
				return max;
			}
		}
		this._width = w;
		return this.update();
	},

	isPointIn : function(x, y){
		// transforms?
		var b = this.bounds();
		return x > b.x && y > b.y && x < b.x+b.w && y < b.y+b.h;
	},
	nativeBounds : function(){
		var align = this.styles.textAlign || 'left',
			baseline = this.styles.textBaseline || 'top',
			width = this.width(),
			size = Number(this._font.size),
			x = this._x,
			y = this._y;

		if(this._type === 'label'){
			if(align === 'center')
				x -= width/2;
			else if(align === 'right')
				x -= width;

			if(baseline === 'middle')
				y -= size/2;
			else if(baseline === 'bottom' || baseline === 'ideographic')
				y -= size;
			else if(baseline === 'alphabetic')
				y -= size * 0.8;
			return new Bounds(x, y, width, size * 1.15);
		}
		else {
			return new Bounds(x, y, width, (size + this._lineSpace) * this._lines.length);
		}
	},
	draw : function(ctx){
		if(!this._visible)
			return;
		ctx.save();
		this.styleToContext(ctx);

		if(this._type === 'label'){
		//	if(!this.styles.textBaseline)
		//		ctx.textBaseline = 'top';
			if(this._width)
				ctx.fillText(this._text, this._x, this._y, this._width);
			else
				ctx.fillText(this._text, this._x, this._y);

			if(this._underline && this._underline.visible){
				if(this._underline.color === 'auto'){
					ctx.strokeStyle = this.styles.strokeStyle || this.styles.fillStyle;
				}
				else
					ctx.strokeStyle = this._underline.color;

				drawTextLine(ctx, this._text, this._x, this._y, this._underline.height === 'auto' ? undefined : this._underline.height, this._font.size, ctx.textBaseline, 'under');
			}
		}
		else {
			if(this._changedText)
				this._genLines();

			if( this.styles.fillStyle ){
				if( this.styles.strokeStyle ){
					function drawLine(text, x, y){
						ctx.fillText(text, x, y);
						ctx.strokeText(text, x, y);
					}
				}
				else {
					function drawLine(text, x, y){
						ctx.fillText(text, x, y);
					}
				}
			}
			else if( this.style.strokeStyle ){
				function drawLine(text, x, y){
					ctx.strokeText(text, x, y);
				}
			}

			var i = 0,
				lines = this._lines,
				line,
				x = this._x,
				y = this._y;

			for(; i < lines.length; i++){
				line = lines[i];
				drawLine( line.text, x + line.x, y + line.y + this._lineSpace * i );
			}
		}
		ctx.restore();
	}
// TODO: mozPathText; mozTextAlongPath
// https://developer.mozilla.org/en-US/docs/Drawing_text_using_a_canvas
});

Text.font = '10px sans-serif';
Text.processStyle = true;
Text.firstObject = true; // parse the first argument if it is object

$.text = function(){
	return new Text(arguments);
};

$.fx.step.lineSpace = $.fx.step.float;

var params = {
	top: [0.1, 0.7, 1.05],
	hanging: [0, 0.5, 0.85],
	middle: [-0.5, 0, 0.5],
	alphabetic: [-0.8, -0.3, 0.2],
	ideographic: [-1, -0.5, -0.1],
	bottom: [-1, -0.5, -0.1]
};

function drawTextLine(ctx, text, x, y, lw, fontSize, baseline, type){
	var lw = lw || Math.round(fontSize / 15),
		height = Math.round(fontSize * params[baseline][type === 'over' ? 0 : type === 'through' ? 1 : 2]);

	ctx.lineWidth = lw;
	ctx.beginPath();
	ctx.moveTo(x, y + height);
	ctx.lineTo(x + ctx.measureText(text).width, y + height);
	ctx.stroke();
}

$.Gradient = Gradient = new Class({

	initialize : function(type, colors, from, to, context){
		// distance in from & to
		// todo: { from: 'top', relative: false }
		this.context = context;
		if(isObject(type)){
			this._type = type.type || 'linear';
			this._from = type.from;
			this._to = type.to;
			if( type.cache !== undefined )
				this._cache = type.cache;
			colors = type.colors;
		}
		else {
			if( from === undefined || (to === undefined && ( isArray(type) || isObject(type) )) ){ // (type & to undefined) or (type or to undefined)
				if(type === 'radial'){
					this._from = 'center';
					this._to = 'center';
				} else {
					to = from;
					from = colors;
					colors = type;
					type = 'linear';
				}
			}
			this._type = type;
			this._from = from;
			this._to = to;
		}
		this._colors = isArray(colors) ? this._parseColors(colors) : colors;
		// todo: move _parseColors to Gradient.parseColors.

		if(Gradient.gradients[ this._type ]){
			var grad = Gradient.gradients[ this._type ];
			extend(this, grad);
			if( grad.init )
				grad.init.call(this, type);
		}
	},

	_parseColors : function(colors){
		var stops = {},
			step = 1 / (colors.length - 1);
		colors.forEach(function(color, i){
			stops[ step * i ] = color;
		});
		return stops;
	},

	colorMix : function(t){
		var last,
			stops = this._colors,
			keys  = Object.keys( stops ).sort();

		for(var i = 0, l = keys.length; i < l; i++){
			if(keys[i] == t)
				return _.color(stops[keys[i]]);
			else if(parseFloat(last) < t && parseFloat(keys[i]) > t){
				var c1 = _.color(stops[last]),
					c2 = _.color(stops[keys[i]]);
				t = (t - parseFloat(last)) / (parseFloat(keys[i]) - parseFloat(last));
				return [
					c1[0] + (c2[0] - c1[0]) * t | 0, // todo: Math.round
					c1[1] + (c2[1] - c1[1]) * t | 0,
					c1[2] + (c2[2] - c1[2]) * t | 0,
					c1[3] + (c2[3] - c1[3]) * t
				];
			}
			last = keys[i];
		}

	},
	color : function(i, color){
		if(color === undefined)
			return this._colors[i];
		if(color === null)
			;
		this._colors[i] = color;
		return this.update();
	},

	colors : function(colors){
		if(colors === undefined)
			return this._colors;
		this._colors = colors;
		return this.update();
	},

	reverse : function(){
		var colors = this._colors,
			new_colors = {},
			i;
		for(i in colors){
			if($.has(colors, i))
				new_colors[1-i] = colors[i];
		}
		this._colors = new_colors;
		return this.update();
	},

	// general
	from : function(x,y,r){
		if(arguments.length === 0)
			;
		if(isString(x) && x in $.corners){
			this._from = x;
			return this.update();
		}
		if(isArray(x)){
			r = x[2];
			y = x[1];
			x = x[0];
		}

		if(!isArray(this._from))
			this._from = [];

		if(x !== undefined) this._from[0] = x; // TODO: distance ?
		if(y !== undefined) this._from[1] = y;
		if(r !== undefined) this._from[2] = r;
		return this.update();
	},

	to : function(x,y,r){
		if(arguments.length === 0)
			;
		if(isString(x) && x in $.corners){
			this._to = x;
			return this.update();
		}
		if(isArray(x)){
			r = x[2];
			y = x[1];
			x = x[0];
		}

		if(!isArray(this._to))
			this._to = [];

		if(x !== undefined) this._to[0] = x;
		if(y !== undefined) this._to[1] = y;
		if(r !== undefined) this._to[2] = r;
		return this.update();
	},

	clone : function(){
		return $.clone(this);
	},

	// drawing and _set
	update : function(){
		this.context.update();
		return this;
	},

	_cache : true,

	toCanvasStyle : function(ctx, element){
		var grad,
			from = this._from,
			to = this._to;

		// for corners like 'top left'
		if(!isArray(from)){
			if(isString(from) && /^\d+(px|pt)?/.test(from))
				this._from = from = _.distance(from);
			else
				from = element.corner(from);
		}
		if(!isArray(to)){
			if(isString(from) && /^\d+(px|pt)?/.test(to))
				this._to = to = _.distance(to);
			else
				to = element.corner(to);
		}

		// Cache
		var key = this.key(from, to);
		if(this._cache && this.context._cache[key])
			return this.context._cache[key];

		if(this._type === 'linear')
			grad = ctx.createLinearGradient(from[0], from[1], to[0], to[1]);

		else
			grad = ctx.createRadialGradient(from[0], from[1], from[2] || 0, to[0], to[1], to[2] || element.bounds().height);

		for(var offset in this._colors){
			if(Object.prototype.hasOwnProperty.call(this._colors, offset))
				grad.addColorStop( offset, this._colors[offset] );
		}

		this.context._cache[key] = grad;
		return grad;
	},

	key : function(from, to){
		return [this._type, from, to, JSON.stringify(this._colors)].join(',');
	},

	toString: function(){
		return '{ Gradient(' + this._type + ')[' + this._from + ',' + this._to + ']: ' + JSON.stringify(this._colors) + ' }';
	}

});

Gradient.gradients = {
	linear: {
		init: function(){
			var from = this._from;
			switch(from){
				case 'vertical':
					this._from = 'top';
					this._to = 'bottom';
					break;
				case 'horizontal':
					this._from = 'left';
					this._to = 'right';
					break;
				case 'diag1':
					this._from = 'top left';
					this._to = 'bottom right';
					break;
				case 'diag2':
					this._from = 'top right';
					this._to = 'bottom left';
					break;
				default: break;
			}
		}
	},
	radial: {
		init: function(options){
			if( !isObject(options) )
				return;

			if( !this._to ) this._to = [0,0];
			if( !this._from ) this._from = [0,0];

			// to: center & ( radius | dest )
			// from: startRadius & hilite
			if( options.center ){
				// 'center' or other corner?
				this._to = slice.call(options.center, 0, 2);
			}
			if( options.hilite ){
				this._from = [
					this._to[0] + options.hilite[0],
					this._to[1] + options.hilite[1],
					this._from[2]
				];
			} else if( !options.from ){
				this._from = slice.call(this._to);
			}
			if( options.radius ){
				if(isNumberLike( options.radius ))
					this._to[2] = options.radius;
				else
					this._to[2] = Math.round(Math.sqrt( Math.pow(this._to[0] - options.radius[0], 2) + Math.pow(this._to[1] - options.radius[1], 2) ));
			}
			if( options.startRadius ){
				if(isNumberLike( options.startRadius ))
					this._from[2] = options.startRadius;
				else
					this._from[2] = Math.round(Math.sqrt( Math.pow(this._to[0] - options.startRadius[0], 2) + Math.pow(this._to[1] - options.startRadius[1], 2) ));
			}
		},

		radius : function(radius, y){
			if(radius === undefined)
				return this._to[2];

			if(y !== undefined)
				radius = [radius, y];

			if(!isNumberLike(radius)){
				var vx = this._to[0] - radius[0];
				var vy = this._to[1] - radius[1];

				this._to[2] = Math.round(Math.sqrt( vx*vx + vy*vy ));
			}
			else {
				this._to[2] = _.distance(radius);
			}
			return this.update();
		},

		startRadius : function(radius, y){
			if(radius === undefined)
				return this._from[2];

			if(y !== undefined)
				radius = [radius, y];

			if(!isNumberLike(radius)){
				var vx = this._to[0] - radius[0];
				var vy = this._to[1] - radius[1];

				this._from[2] = Math.round(Math.sqrt( vx*vx + vy*vy ));
			}
			else {
				this._from[2] = _.distance(radius);
			}
			return this.update();
		},

		center : function(x, y){
			if(x === undefined)
				return this._to.slice(0, 2);
			if(y === undefined){
				y = x[1];
				x = x[0];
			}
			this._to[0] = x;
			this._to[1] = y;
			return this.update();
		},

		hilite : function(x, y){
			if(x === undefined)
				return [this._from[0] - this._to[0], this._from[1] - this._to[1]];
			if(y === undefined){
				y = x[1];
				x = x[0];
			}
			this._from[0] = this._to[0] + x;
			this._from[1] = this._to[1] + y;
			return this.update();
		}
	}
};

var from = {
	'repeat' : true,
	'no-repeat' : false,
	'repeat-x' : 'x',
	'repeat-y' : 'y'
};
$.Pattern = Pattern = new Class({

	initialize : function(image, repeat, context){
		var blob;
		this._repeat = (isBoolean(repeat) ? (repeat ? 'repeat' : 'no-repeat') : (isString(repeat) ? 'repeat-' + repeat : 'repeat'));

		if(image instanceof Image)
			this._image = image;

		else if(isString(image)){
			if(image[0] === '#')
				this._image = document.getElementById(image.substr(1));
			else if(image.indexOf('<svg') === 0){
				blob = new Blob([image], {type: 'image/svg+xml;charset=utf-8'});
				this._image = new Image();
				this._image.src = domurl.createObjectURL(blob);
			}
			else {
				this._image = new Image();
				this._image.src = image;
			}
		}
		this._image.addEventListener('load', function(){
			this.update();

			if( blob )
				domurl.revokeObjectURL( blob );
		}.bind(this));

		this.context = context;
	},

	// parameters
	repeat : function(repeat){
		if(repeat === undefined)
			return from[this._repeat];
		this._repeat = (isBoolean(repeat) ? (repeat ? 'repeat' : 'no-repeat') : (isString(repeat) ? 'repeat-' + repeat : 'repeat'));
		return this.update();
	},

	// drawing
	update : Gradient.prototype.update,
	toCanvasStyle : function(context){
		if( !this._image.complete )
			return 'transparent';

		return context.createPattern(this._image, this._repeat);
	}


});


// Easing functions
// Mootools :) partially
$.easing = {
	linear : function(x){
		return x;
	},
	root : function(x){
		return Math.sqrt(x);
	},
	pow : function(t, v){
		return Math.pow(t, v || 6);
	},
	expo : function(t, v){
		return Math.pow( v || 2, 8 * (t-1) );
	},
	circ : function(t){
		return 1 - Math.sin( Math.acos(t) );
	},
	sine : function(t){
		return 1 - Math.cos(t * Math.PI / 2);
	},
	back : function(t, v){
		return Math.pow(t, 2) * ( (v || 1.618) * (t - 1) + t);
	},
	bounce : function(t){
		for(var a = 0, b = 1; 1; a += b, b /= 2){
			if(t >= (7 - 4 * a) / 11){
				return b * b - Math.pow((11 - 6 * a - 11 * t) / 4, 2);
			}
		}
	},
	elastic : function(t, v){
		return Math.pow(2, 10 * --t) * Math.cos(20 * t * Math.PI * (v || 1) / 3);
	}
};
['quad', 'cubic', 'quart', 'quint'].forEach(function(name, i){
	$.easing[name] = function(t){ return Math.pow(t, i+2); };
});

function processEasing(func){
	$.easing[i + 'In'] = func;
	$.easing[i + 'Out'] = function(t, v){
		return 1 - func(1 - t, v);
	};
	$.easing[i + 'InOut'] = function(t, v){
		return t <= 0.5 ? func(2 * t, v) / 2 : (2 - func(2 * (1 - t), v)) / 2;
	};
}

for(var i in $.easing){
	// don't make functions within a loop -- jshint
	if(Object.prototype.hasOwnProperty.call($.easing, i))
		processEasing($.easing[i]);
	// todo: make this code better :P
}


// Bounds class
function Bounds(x, y, w, h){
	if(w < 0){
		w = -w;
		x -= w;
	}
	if(h < 0){
		h = -h;
		y -= h;
	}
	this.x = this.x1 = x;
	this.y = this.y1 = y;
	this.w = this.width  = w;
	this.h = this.height = h;
	this.x2 = x + w;
	this.y2 = y + h;
	this.cx = x + w / 2;
	this.cy = y + h / 2;
}

// Class
function Class(parent, properties, base){

	if(!properties) properties = parent, parent = null;

	var cls = function(){ return (cls.prototype.initialize || emptyFunc).apply(this,arguments); };
	if(parent){

		// go to the parent
		cls = function(){

			if(cls.prototype.__initialize__)
				return cls.prototype.__initialize__.apply(this,arguments);

			var inits = [],
				parent = this.constructor.parent;
			while(parent){
				inits.push(parent.prototype.initialize);
				parent = parent.parent;
			}
			for(var i = inits.length; i--;){
				if(inits[i])
					inits[i].apply(this, arguments);
			}

			if(cls.prototype.initialize && properties.initialize === cls.prototype.initialize)
				return cls.prototype.initialize.apply(this,arguments);
		};


		// prototype inheriting
		var sklass = function(){};
		sklass.prototype = parent.prototype;
		cls.prototype = new sklass();
		cls.parent = parent;
		cls.prototype.constructor = cls;

	}

	// why?
	if(base)
		extend(cls, base);
	if(properties.mixins){
		mixins.forEach(function(mixin){
			extend(cls.prototype, mixin);
		});
	}

	extend(cls.prototype, properties);

	return cls;

}

// utils
function extend(a,b){
	for(var i in b){
		if(Object.prototype.hasOwnProperty.call(b,i))
			a[i] = b[i];
	}
	return a;
}

function argument( index ){
	return function( value ){
		return this.argument( index, value );
	};
}

// wrapper for quick calls
function wrap(args){
	var fn = args[1];
	args = slice.call(args, 2);
	return function(){
		this[fn].apply(this, args);
	};
}

function trim(str){
	return str.replace(/^\s+/, '').replace(/\s+$/, '');
}

// typeofs
function isString(a){
	return toString.call(a) === '[object String]';
}
function isBoolean(a){
	return toString.call(a) === '[object Boolean]';
}
function isArray(a) {
	return toString.call(a) === '[object Array]';
}
function isObject(a){
	return toString.call(a) === '[object Object]';
}
function isNumber(a){
	return toString.call(a) === '[object Number]';
}
function isNumberLike(value){
	if( isNumber(value) )
		return true;
	if( isString(value) && /^(\d+|(\d+)?\.\d+)(em|ex|ch|rem|vw|vh|vmin|vmax|cm|mm|in|px|pt|pc)?$/.test(value) )
		return true;
	return false;
}
// todo: Pattern.isPatternLike();
function isPatternLike(value){
	return value instanceof Image ||
			(isObject(value) && $.has(value, 'image')) ||
			(isString(value) && !(
				value.indexOf('http://') &&
				value.indexOf('https://') &&
				value.indexOf('./') &&
				value.indexOf('../') &&
				value.indexOf('data:image/') &&
				value.indexOf('<svg')
			) );
}

$.has = Function.prototype.call.bind(Object.prototype.hasOwnProperty);
$.Class = Class;
$.Bounds = Bounds;
$.extend = extend;
$.argument = argument;
$.wrap = wrap;
$.trim = trim;
$.isString = isString;
$.isBoolean = isBoolean;
$.isArray = isArray;
$.isObject = isObject;
$.isNumberLike = isNumberLike;
$.isNumber = isNumber;
$.isPatternLike = isPatternLike;


// constants
$.dashes = {
	shortdash:			[4, 1],
	shortdot:			[1, 1],
	shortdashdot:		[4, 1, 1, 1],
	shortdashdotdot:	[4, 1, 1, 1, 1, 1],
	dot:				[1, 3],
	dash:				[4, 3],
	longdash:			[8, 3],
	dashdot:			[4, 3, 1, 3],
	longdashdot:		[8, 3, 1, 3],
	longdashdotdot:		[8, 3, 1, 3, 1, 3]
};

$.corners = {
	'left'  : [0, 0.5],
	'right' : [1, 0.5],
	'top'   : [0.5, 0],
	'bottom': [0.5, 1],
	'center': [0.5, 0.5],
	'left top'    : [0, 0],
	'top left'    : [0, 0],
	'left bottom' : [0, 1],
	'bottom left' : [0, 1],
	'right top'   : [1, 0],
	'top right'   : [1, 0],
	'right bottom': [1, 1],
	'bottom right': [1, 1],

	'lt'	: [0, 0],
	'tl'	: [0, 0],
	'lb'	: [0, 1],
	'bl'	: [0, 1],
	'rt'	: [1, 0],
	'tr'	: [1, 0],
	'rb'	: [1, 1],
	'br'	: [1, 1]
};

$.colors = { // http://www.w3.org/TR/css3-color/#svg-color
	'aliceblue': 'f0f8ff',
	'antiquewhite': 'faebd7',
	'aqua': '0ff',
	'aquamarine': '7fffd4',
	'azure': 'f0ffff',
	'beige': 'f5f5dc',
	'bisque': 'ffe4c4',
	'black': '000',
	'blanchedalmond': 'ffebcd',
	'blue': '00f',
	'blueviolet': '8a2be2',
	'brown': 'a52a2a',
	'burlywood': 'deb887',
	'burntsienna': 'ea7e5d',
	'cadetblue': '5f9ea0',
	'chartreuse': '7fff00',
	'chocolate': 'd2691e',
	'chucknorris': 'c00000',
	'coral': 'ff7f50',
	'cornflowerblue': '6495ed',
	'cornsilk': 'fff8dc',
	'crimson': 'dc143c',
	'cyan': '0ff',
	'darkblue': '00008b',
	'darkcyan': '008b8b',
	'darkgoldenrod': 'b8860b',
	'darkgray': 'a9a9a9',
	'darkgreen': '006400',
	'darkgrey': 'a9a9a9',
	'darkkhaki': 'bdb76b',
	'darkmagenta': '8b008b',
	'darkolivegreen': '556b2f',
	'darkorange': 'ff8c00',
	'darkorchid': '9932cc',
	'darkred': '8b0000',
	'darksalmon': 'e9967a',
	'darkseagreen': '8fbc8f',
	'darkslateblue': '483d8b',
	'darkslategray': '2f4f4f',
	'darkslategrey': '2f4f4f',
	'darkturquoise': '00ced1',
	'darkviolet': '9400d3',
	'deeppink': 'ff1493',
	'deepskyblue': '00bfff',
	'dimgray': '696969',
	'dimgrey': '696969',
	'dodgerblue': '1e90ff',
	'firebrick': 'b22222',
	'floralwhite': 'fffaf0',
	'forestgreen': '228b22',
	'fuchsia': 'f0f',
	'gainsboro': 'dcdcdc',
	'ghostwhite': 'f8f8ff',
	'gold': 'ffd700',
	'goldenrod': 'daa520',
	'gray': '808080',
	'green': '008000',
	'greenyellow': 'adff2f',
	'grey': '808080',
	'honeydew': 'f0fff0',
	'hotpink': 'ff69b4',
	'indianred': 'cd5c5c',
	'indigo': '4b0082',
	'ivory': 'fffff0',
	'khaki': 'f0e68c',
	'lavender': 'e6e6fa',
	'lavenderblush': 'fff0f5',
	'lawngreen': '7cfc00',
	'lemonchiffon': 'fffacd',
	'lightblue': 'add8e6',
	'lightcoral': 'f08080',
	'lightcyan': 'e0ffff',
	'lightgoldenrodyellow': 'fafad2',
	'lightgray': 'd3d3d3',
	'lightgreen': '90ee90',
	'lightgrey': 'd3d3d3',
	'lightpink': 'ffb6c1',
	'lightsalmon': 'ffa07a',
	'lightseagreen': '20b2aa',
	'lightskyblue': '87cefa',
	'lightslategray': '789',
	'lightslategrey': '789',
	'lightsteelblue': 'b0c4de',
	'lightyellow': 'ffffe0',
	'lime': '0f0',
	'limegreen': '32cd32',
	'linen': 'faf0e6',
	'magenta': 'f0f',
	'maroon': '800000',
	'mediumaquamarine': '66cdaa',
	'mediumblue': '0000cd',
	'mediumorchid': 'ba55d3',
	'mediumpurple': '9370db',
	'mediumseagreen': '3cb371',
	'mediumslateblue': '7b68ee',
	'mediumspringgreen': '00fa9a',
	'mediumturquoise': '48d1cc',
	'mediumvioletred': 'c71585',
	'midnightblue': '191970',
	'mintcream': 'f5fffa',
	'mistyrose': 'ffe4e1',
	'moccasin': 'ffe4b5',
	'navajowhite': 'ffdead',
	'navy': '000080',
	'oldlace': 'fdf5e6',
	'olive': '808000',
	'olivedrab': '6b8e23',
	'orange': 'ffa500',
	'orangered': 'ff4500',
	'orchid': 'da70d6',
	'palegoldenrod': 'eee8aa',
	'palegreen': '98fb98',
	'paleturquoise': 'afeeee',
	'palevioletred': 'db7093',
	'papayawhip': 'ffefd5',
	'peachpuff': 'ffdab9',
	'peru': 'cd853f',
	'pink': 'ffc0cb',
	'plum': 'dda0dd',
	'powderblue': 'b0e0e6',
	'purple': '800080',
	'red': 'f00',
	'rosybrown': 'bc8f8f',
	'royalblue': '4169e1',
	'saddlebrown': '8b4513',
	'salmon': 'fa8072',
	'sandybrown': 'f4a460',
	'seagreen': '2e8b57',
	'seashell': 'fff5ee',
	'sienna': 'a0522d',
	'silver': 'c0c0c0',
	'skyblue': '87ceeb',
	'slateblue': '6a5acd',
	'slategray': '708090',
	'slategrey': '708090',
	'snow': 'fffafa',
	'springgreen': '00ff7f',
	'steelblue': '4682b4',
	'tan': 'd2b48c',
	'teal': '008080',
	'thistle': 'd8bfd8',
	'tomato': 'ff6347',
	'turquoise': '40e0d0',
	'violet': 'ee82ee',
	'wheat': 'f5deb3',
	'white': 'fff',
	'whitesmoke': 'f5f5f5',
	'yellow': 'ff0',
	'yellowgreen': '9acd32'
};


// Clean functions
$.clone = function(object){
	var result = new object.constructor();
	for(var i in object){
		if($.has(object, i)){
			if(typeof object[i] === 'object' && !(object[i] instanceof Context) && !(object[i] instanceof Image)){
				result[i] = _.clone(object[i]);
			} else {
				result[i] = object[i];
			}
		}
	}
	return result;
};


$.multiply = function(m1, m2){ // multiplies two 2D-transform matrices
	return [
		m1[0] * m2[0] + m1[2] * m2[1],
		m1[1] * m2[0] + m1[3] * m2[1],
		m1[0] * m2[2] + m1[2] * m2[3],
		m1[1] * m2[2] + m1[3] * m2[3],
		m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
		m1[1] * m2[4] + m1[3] * m2[5] + m1[5]
	];
};

// DOM
$.coordsOfElement = function(element){ // returns coords of a DOM element

	var box = element.getBoundingClientRect(),
		style = window.getComputedStyle(element);

	return {
		x: box.left + parseInt(style.borderLeftWidth) + parseInt(style.paddingLeft),
		y: box.top  + parseInt(style.borderTopWidth)  + parseInt(style.paddingTop)
	};

};

$.color = function(value){ // parses CSS-like colors (rgba(255,0,0,0.5), green, #f00...)
	if(value === undefined) return;
	if(!isString(value))
		throw 'Not a color: ' + value.toString();

	// rgba(255, 100, 20, 0.5)
	if(value.indexOf('rgb') === 0){
		value = value.substring(value.indexOf('(') + 1, value.length-1).replace(/\s/g, '').split(',').map(function(v){
			// rgba(100%, 0%, 50%, 1)
			if(v.indexOf('%') > 0)
				return Math.round(parseInt(v) * 2.55);
			return parseInt(v);
		});

		if(value.length === 3)
			value.push(1);

		return value;
	}
	// #bebebe
	else if(value.indexOf('#') === 0){
		// remove the # and turn into array
		value = value.substring(1);

		// #555
		if(value.length === 3)
			// todo: make this code faster & better
			value = value.split('').map(function(v){
				// 'f0a' -> 'ff00aa'
				return v + v;
			}).join('');
			// value = value[0] + value[0] + value[1] + value[1] + value[2] + value[2];

		return [parseInt(value.substring(0, 2), 16), parseInt(value.substring(2, 4), 16), parseInt(value.substring(4, 6), 16), 1];
	}
	// 'red'
	else if(value in $.colors)
		return $.color('#' + $.colors[value]);

	else if(value === 'rand')
		return [Math.round(Math.random() * 255), Math.round(Math.random() * 255), Math.round(Math.random() * 255), 1];

	return [0, 0, 0, 0];
};

$.angleUnit = 'grad';
$.unit = 'px';

var units = 'pt em in cm mm pc ex ch rem v wvh vmin vmax'.split(' ');
var defaultUnits = {
	// my values; may be different on different screens / browsers / devices / etc
	px: 1, ch: 8, cm: 37.78125, em: 16,
	ex: 7.15625, 'in': 96, mm: 3.765625,
	pc: 16, pt: 1.328125, rem: 16, v: 16,
	vmax: 13.65625, vmin: 4.78125, wvh: 16
	// values from p5.js:
	// pt: 1.25
	// pc: 15
	// mm: 3.543307
	// cm: 35.43307
	// in: 90
};

$.snapToPixels = 0;

function distance(value, dontsnap){
	if(value === undefined) return;
	if(!value) return 0;
	if($.snapToPixels && !dontsnap)
		return Math.round($.distance(value, true) / $.snapToPixels) * $.snapToPixels;

	if( isNumber(value) ){
		if( $.unit !== 'px')
			return $.distance( value + '' + $.unit );

		return value;
	}

	value += '';
	if(value.indexOf('px') === value.length-2)
		return parseInt(value);

	if(!$.units){

		if( !document )
			$.units = defaultUnits;

		else {
			var div = document.createElement('div');
			document.body.appendChild(div); // FF don't need this :)
			$.units = {};
			units.forEach(function(unit){
				div.style.width = '1' + unit;
				$.units[unit] = parseFloat(getComputedStyle(div).width);
			});
			document.body.removeChild(div);
		}
	}

	var unit = value.replace(/[\d\.]+?/g, ''); // why gi? maybe just g?
	value = value.replace(/[^\d\.]+?/g, '');
	if(unit === '')
		return value;
	return Math.round($.units[unit] * value);
}

$.distance = distance;

$.Context = Context;
$.Shape = Shape;
$.Rect = Rect;
$.Circle = Circle;
$.Curve = Curve;
$.Path = Path;
$.Image = Img;
$.Text = Text;
$.TextBlock = TextBlock;
$.Gradient = Gradient;
$.Pattern = Pattern;

$.version = Math.PI / 3.490658503988659;

$.query = function(query, index, element, renderer){
	return new Context( isString(query) ? (element || window.document).querySelectorAll(query)[index || 0] : query.canvas || query, renderer );
};

$.id = function(id, renderer){
	return new Context( document.getElementById(id), renderer );
};

$.renderers = {};

if( typeof module === 'object' && typeof module.exports === 'object' ){
	module.exports = $;
} else if( typeof define === 'function' && define.amd ){
	define( [], function(){ return $; } );
} else {
	window.Graphics2D = $;
}

})( typeof window !== 'undefined' ? window : this );