/*  Graphics2D Core 1.9.0
 * 
 *  Author: Dmitriy Miroshnichenko aka Keyten <ikeyten@gmail.com>
 *  Last edit: 11.5.2015
 *  License: MIT / LGPL
 */

(function(window, undefined){

// The main graphics2D class
var $ = {},

// Classes
	Context,
	Shape, Rect, Circle, Curve, Path, Img, Text, TextBlock,
	Gradient, Pattern, Bounds,

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


Context = function(canvas){
	this.context   = canvas.getContext('2d'); // rename to the context2d?
	this.canvas    = canvas;
	this.elements  = [];
	this.listeners = {};
	this._cache    = {}; // for gradients
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

		element.init();
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
		var ctx = this.context;
		ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.elements.forEach(function(object){
			object.draw(ctx);
		});
		this.fire('update');
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
				coords = _.coordsOfElement(this.canvas);

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

			if(element && element.fire)
				element.fire(event, e);

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
	}

};

Shape = new Class({

	initialize : function(args, context){
		var props = this.constructor.props,
			dists = this.constructor.distances || [],
			l = props.length;
		while(l--){
			if( dists[l] && isString(args[l]) )
				this['_' + props[l]] = $.distance(args[l]);
			else
				this['_' + props[l]] = args[l];
		}

		this.listeners = {}; // object to store event listeners
		this._style = {}; // context2d properties (filLStyle, lineWidth and other)
	},

	_parseHash : function(object){
		var s = this._style;

		if( object.opacity !== undefined ){
			s.globalAlpha = object.opacity;
		}
		if( object.composite !== undefined ){
			s.globalCompositeOperation = object.composite;
		}
		if( object.visible !== undefined ){
			this._visible = object.visible;
		}
		if( object.clip !== undefined ){
			this._clip = object.clip;
		}

		this._processStyle( object.fill, object.stroke, true );
	},
	_processStyle : function(fill, stroke){
		if(arguments.length === 0){
			// called from init function
			fill = this._fill;
			stroke = this._stroke;
		}

		this._fill = null;
		this._stroke = null;

		if(fill)
			this._style.fillStyle = fill;
		if(stroke)
			extend(this._style, this._parseStroke(stroke));

		// gradients, patterns
		if(fill && typeof fill.toCanvasStyle === 'function')
			return;

		if(typeof fill === 'function')
			this._style.fillStyle = { toCanvasStyle:fill.bind(this) };

		// object with gradient { type, colors, from, to, ... }
		if(isObject(fill) && fill.colors)
			this._style.fillStyle = new Gradient(fill, null, null, null, this.context);

		// object, string or image with pattern
		if(isPatternLike(fill)){
			this._style.fillStyle = new Pattern(fill, null, this.context);
		}

		// TODO: gradient stroke
	},
	_applyStyle : function(){
		var ctx = this.context.context;
		ctx.save();
		for(var i in this._style){
			if($.has(this._style, i))
				ctx[i] = this._style[i];
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
		if(this._matrix)
			ctx.transform.apply(ctx, this._matrix);
		if(this._style.fillStyle && this._style.fillStyle.toCanvasStyle)
			ctx.fillStyle = this._style.fillStyle.toCanvasStyle(ctx, this);
		if(this._style.strokeStyle && this._style.strokeStyle.toCanvasStyle)
			ctx.strokeStyle = this._style.strokeStyle.toCanvasStyle(ctx, this);
		if(this._style._lineDash){
			if(ctx.setLineDash) // webkit
				ctx.setLineDash(this._style._lineDash);
			else // gecko
				ctx.mozDash = this._style._lineDash;
		}
	},
	_parseStroke : function(value){
		var opacity, l, val,
			style = {};

		// object with properties
		if( isObject( value ) ){
			if( value.width !== undefined )
				style.lineWidth   = value.width;
			if( value.color )
				style.strokeStyle = value.color;
			if( value.cap )
				style.lineCap     = value.cap;
			if( value.join )
				style.lineJoin    = value.join;
			if( value.dash )
				// string - 'dot', 'dash', etc
				// else - array with values
				style._lineDash   = isString(value.dash) ? $.dashes[value.dash] : value.dash;

			return style;
		}

		if( !isString( value ) )
			throw new Error('Can\'t parse stroke: ' + value);

		value = value.split(' ');
		l = value.length;
		while(l--){
			val = value[l];

			if( reFloat.test( val ) )
				opacity = parseFloat( val );

			else if( isNumberLike( val ) )
				style.lineWidth = _.distance( val );

			else if( val === 'miter' || val === 'bevel' )
				style.lineJoin = val;

			else if( val === 'butt' || val === 'square' )
				style.lineCap = val;

			else if( val === 'round' ){
				style.lineCap  = style.lineCap  || val;
				style.lineJoin = style.lineJoin || val;
			}

			else if( val[ 0 ] === '[' )
				style._lineDash = val.substr( 1, val.length - 2 ).split(',');

			else if( val in $.dashes )
				style._lineDash = $.dashes[ val ];

			else
				style.strokeStyle = val;
		}
		if( opacity ){
			value = _.color( style.strokeStyle );
			value[3] *= opacity;
			style.strokeStyle = 'rgba(' + value.join(',') + ')';
		}
		return style;
	},
	draw : function(ctx){
		if(!this._visible)
			return;
		this._applyStyle();
		this.processPath(ctx);
		if(this._style.fillStyle)
			ctx.fill();
		if(this._style.strokeStyle)
			ctx.stroke();
		ctx.restore();
	},
	update : function(){
		return this.context.update(), this;
	},

	// properties
	_property : function(name, value){
		if(value === undefined)
			return this['_' + name];
		this['_' + name] = value;
		return this.update();
	},
	_setstyle : function(name, value){
		if(value === undefined)
			return this._style[name];
		this._style[name] = value;
		return this.update();
	},
	mouse : function(state){
		return this._property('events', !!state);
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
	clip : function(clip, a, b, c){
		if(clip === undefined)
			return this._clip;
		if(clip === null)
			delete this._clip;

		if(clip.processPath)
			this._clip = clip;
		else if(c !== undefined)
			this._clip = new Rect(clip, a, b, c, null, null, this.context);
		else if(b !== undefined)
			this._clip = new Circle(clip, a, b, null, null, this.context);
		else
			this._clip = new Path(clip, null, null, this.context);
		return this.update();
	},
	clone : function(instance, events){
	// instance = don't clone the style
		var clone = new this.constructor([], this.context);
		for(var i in this){
			if($.has(this, i) && i[0] === '_'){
				if(typeof this[i] === 'object' &&
						this[i] !== null &&
						i !== '_image' && // for images
						(instance !== true || i !== '_style')){
					clone[i] = _.clone(this[i]);
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
	fill : function(fill){
		if(isObject(fill) && fill.colors){
			this._style.fillStyle = new Gradient(fill, null, null, null, this.context);
			return this.update();
		}
		else if(fill && (fill.indexOf || isObject(fill))){
			if((isObject(fill) && fill.image) ||
				(fill.indexOf('http://') === 0 || fill.indexOf('.') === 0 || fill.indexOf('data:image/') === 0)){
				this._style.fillStyle = new Pattern(fill, null, this.context);
				return this.update();
			}
		}
		return this._setstyle('fillStyle', fill);
	},
	stroke : function(stroke){
		// element.stroke() => { fill : 'black', width:2 }
		// element.stroke({ fill:'black', width:3 });
		// element.stroke('black 4pt');
		var style = this._style;
		if(stroke === undefined)
			return {
				color : style.strokeStyle, // todo: add default values?
				width : style.lineWidth,
				cap   : style.lineCap,
				join  : style.lineJoin,
				dash  : style._lineDash
			};
		if(stroke === null){
			delete style.strokeStyle;
			delete style.lineWidth;
			delete style.lineCap;
			delete style.lineJoin;
			delete style._lineDash;
		}
		extend(style, this._parseStroke(stroke));
		return this.update();
	},
	opacity : function(opacity){
		return this._setstyle('globalAlpha', opacity);
	},
	composite : function(composite){
		return this._setstyle('globalCompositeOperation', composite);
	},
	hide : function(){
		return this._property('visible', false);
	},
	show : function(){
		return this._property('visible', true);
	},
	cursor : function(value){
		if( value === undefined )
			return this._cursor;

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
	shadow : function(name, value){
		// shape.shadow({ x, y, color, blur });
		// shape.shadow('x')
		// shape.shadow('x', value)
		// shape.shadow('1px 1px red 2px')
		var style = this._style,
			shadowToStyle = {
				'x': 'shadowOffsetX',
				'y': 'shadowOffsetY',
				'color': 'shadowColor',
				'blur': 'shadowBlur'
			},
			i = 0;
		if(isString(name)){
			if( name in shadowToStyle ){
				if(value === undefined){
					return style[shadowToStyle[name]];
				}
				
				// distance ?
				if(name === 'color')
					style[shadowToStyle[name]] = value;
				else
					style[shadowToStyle[name]] = $.distance(value);
			}
			else {
				// '1px 1px 2px red'
				// can't use rgba
				// and px (!)
				name = trim(name.replace(/\d+([a-z]+)?/gi, function(dist){
					switch(i){
						case 0: style.shadowOffsetX = $.distance(dist); break;
						case 1: style.shadowOffsetY = $.distance(dist); break;
						case 2: style.shadowBlur = $.distance(dist); break;
					}
					i++;
					return '';
				}));

				if( name !== '' ){
					style.shadowColor = name;
				} else {
					style.shadowColor = 'rgba(0, 0, 0, 0.5)';
				}
			}
		}
		else {
			value = name;
			if(value.opacity){
				value.color = _.color(value.color || style.shadowColor || 'black');
				value.color[3] *= value.opacity;
				value.color = 'rgba(' + value.color.join(',') + ')';
			}
			for(name in value){
				if( $.has(value, name) ){
					style[shadowToStyle[name]] = value[name];
				}
			}
		}
		return this.update();
	},

	// events
	on : function(event, fn){
		if(isString(fn))
			fn = wrap(arguments);

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
		this.on(event, proxy = function(e){
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
		// options.transform == true / false
		// options.stroke == true / false / 'exclude';
		// options === 'points' -> return {lt, rt...}
		if(!this._bounds)
			throw new Error('Object hasn\'t _bounds() method.');

		var bounds = this._bounds(),
			m = this._matrix,
			lw = this._style.lineWidth;
		if( !options )
			return bounds;

		if( (options === 'points' || options.transform === true) && m != null ){

			var ltx = bounds.x1, lty = bounds.y1,
				rtx = bounds.x2, rty = bounds.y1,
				lbx = bounds.x1, lby = bounds.y2,
				rbx = bounds.x2, rby = bounds.y2,

				a = m[0], b = m[1],
				c = m[2], d = m[3],
				e = m[4], f = m[5];

			ltx = [ltx * a + lty * c + e, lty = ltx * b + lty * d + f][0];
			rtx = [rtx * a + rty * c + e, rty = rtx * b + rty * d + f][0];
			lbx = [lbx * a + lby * c + e, lby = lbx * b + lby * d + f][0];
			rbx = [rbx * a + rby * c + e, rby = rbx * b + rby * d + f][0];

			if( options === 'points' ){
				return { lt: [ltx, lty], rt: [rtx, rty], lb: [lbx, lby], rb: [rbx, rby] };
			}

			bounds.x1 = Math.min(ltx, rtx, lbx, rbx);
			bounds.x2 = Math.max(ltx, rtx, lbx, rbx);
			bounds.y1 = Math.min(lty, rty, lby, rby);
			bounds.y2 = Math.max(lty, rty, lby, rby);
		} else if( options === 'points' ){
			return {
				lt: [bounds.x1, bounds.y1],
				rt: [bounds.x2, bounds.y1],
				lb: [bounds.x1, bounds.y2],
				rb: [bounds.x2, bounds.y2]
			};
		}

		if( lw && (options.stroke === true || options.stroke === 'exclude') ){
			if( options.stroke === 'exclude' )
				lw = -lw;
			lw /= 2;
			bounds.x1 -= lw;
			bounds.y1 -= lw;
			bounds.x2 += lw;
			bounds.y2 += lw;
		}

		return bounds;
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

		var corner = this.corner(pivot),
			matrix = [
				a, b, c, d,
				-corner[0]*a - corner[1]*c + e+corner[0],
				-corner[0]*b - corner[1]*d + f+corner[1]
				];

		if(this._matrix)
			matrix = _.multiply(this._matrix, matrix);
		
		this._matrix = matrix;
		return this.update();
	},

	scale : function(x, y, pivot){
		if(pivot === undefined && (isString(y) || isArray(y))){
			pivot = y;
			y = x;
		}
		if( y === undefined ){
			y = x;
		}

		return this.transform( x, 0, 0, y, 0, 0, pivot);
	},

	rotate : function(angle, pivot){
		if($.angleUnit === 'grad')
			angle = angle * Math.PI / 180;

		return this.transform(Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), 0, 0, pivot);
	},

	skew : function(x, y, pivot){
		if(pivot === undefined && (isString(y) || isArray(y))){
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
	},

	translate : function(x, y){
		return this.transform(1, 0, 0, 1, x, y);
	},

	// conversions
	toPath : function(){
		return null;
	},
	toDataURL : function(type, bounds){
		if( bounds === undefined ){
			if( typeof this.bounds === 'function' )
				bounds = this.bounds();
			else
				throw new Error('Object #' + this._z + ' can\'t be rasterized: need the bounds.');
		}

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
				bounds = this.bounds();
			else
				throw new Error('Object #' + this._z + ' can\'t be rasterized: need the bounds.');
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
					fx.end = fx.start + Number( fx.end.substr(2) );
			}
		}

		fx.elem[ fx._prop ] = Math.round(fx.start + (fx.end - fx.start) * fx.pos);
	},

	float: function( fx ){
		if( fx.state === 0 ){
			fx._prop = '_' + fx.prop;
			fx.start = fx.elem[ fx._prop ];
		}

		fx.elem[ fx._prop ] = fx.start + (fx.end - fx.start) * fx.pos;
	},

	opacity: function( fx ){
		if( fx.state === 0 ){
			fx.start = fx.elem._style.globalAlpha;
			if( fx.start === undefined )
				fx.start = 1;
		}
		fx.elem._style.globalAlpha = fx.start + (fx.end - fx.start) * fx.pos;
	},

	fill: function( fx ){
		if( fx.state === 0 ){
			fx.start = _.color( fx.elem._style.fillStyle );

			if( fx.end === 'transparent' ){
				fx.end = fx.start.slice(0, 3).concat([ 0 ]);
			} else
				fx.end = _.color( fx.end );

			if( fx.elem._style.fillStyle === 'transparent' ||
				fx.elem._style.fillStyle === undefined )
				fx.start = fx.end.slice(0, 3).concat([ 0 ]);
		}
		fx.elem._style.fillStyle = 'rgba(' +
			[	Math.round(fx.start[0] + (fx.end[0] - fx.start[0]) * fx.pos),
				Math.round(fx.start[1] + (fx.end[1] - fx.start[1]) * fx.pos),
				Math.round(fx.start[2] + (fx.end[2] - fx.start[2]) * fx.pos),
				fx.start[3] + (fx.end[3] - fx.start[3]) * fx.pos ].join(',') + ')';
	},

	stroke: function( fx ){
		if( fx.state === 0 ){
			var end = Shape.prototype._parseStroke( fx.end );
			fx.color1 = _.color( fx.elem._style.strokeStyle );
			fx.width1 = fx.elem._style.lineWidth || 0;
			fx.width2 = end.lineWidth;

			if( end.strokeStyle === 'transparent' )
				fx.color2 = fx.color1.slice(0, 3).concat([ 0 ]);
			else if( end.strokeStyle )
				fx.color2 = _.color( end.strokeStyle );

			if( (fx.elem._style.strokeStyle === 'transparent' ||
				fx.elem._style.strokeStyle === undefined) && end.strokeStyle )
				fx.color1 = fx.color2.slice(0, 3).concat([ 0 ]);
		}

		if( fx.color2 ){
			fx.elem._style.strokeStyle = 'rgba(' +
				[	Math.round(fx.color1[0] + (fx.color2[0] - fx.color1[0]) * fx.pos),
					Math.round(fx.color1[1] + (fx.color2[1] - fx.color1[1]) * fx.pos),
					Math.round(fx.color1[2] + (fx.color2[2] - fx.color1[2]) * fx.pos),
					fx.color1[3] + (fx.color2[3] - fx.color1[3]) * fx.pos ].join(',') + ')';
		}

		if( fx.width2 )
			fx.elem._style.lineWidth = fx.width1 + (fx.width2 - fx.width1) * fx.pos;
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

	fx.elem._matrixCur = _.multiply( fx.elem._matrixCur, matrix );
	fx.elem._matrixCur.now = fx.now;
	fx.elem._matrix = _.multiply( fx.elem._matrixStart, fx.elem._matrixCur );
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

	init : function(){
		var props = this._x;
		if(isObject( props )){
			this._x = props.x;
			this._y = props.y;
			this._width  = props.width  || props.w || 0;
			this._height = props.height || props.h || 0;
			this._parseHash(props);
		} else {
			this._processStyle();
		}
	},

	// parameters
	x : function(x){
		return this._property('x', x);
	},
	y : function(y){
		return this._property('y', y);
	},
	width : function(w){
		return this._property('width', w);
	},
	height : function(h){
		return this._property('height', h);
	},
	x1 : function(x){
		return x === undefined ?
			this._x :
			this._property('width', this._width - x + this._x)
				._property('x', x);
	},
	y1 : function(y){
		return y === undefined ?
			this._y :
			this._property('height', this._height - y + this._y)
				._property('y', y);
	},
	x2 : function(x){
		return x === undefined ?
			this._x + this._width :
			this._property('width', x - this._x);
	},
	y2 : function(y){
		return y === undefined ?
			this._y + this._height :
			this._property('height', y - this._y);
	},

	_bounds : function(){
		return new Bounds(this._x, this._y, this._width, this._height);
	},
	processPath : function(ctx){
		ctx.beginPath();
		ctx.rect(this._x, this._y, this._width, this._height);
	}

});
Rect.props = [ 'x', 'y', 'width', 'height', 'fill', 'stroke' ];
Rect.distances = [ true, true, true, true ];

Circle = new Class(Shape, {

	init : function(){
		var props = this._cx;
		if(isObject( props )){
			this._cx = props.cx || props.x || 0;
			this._cy = props.cy || props.y || 0;
			this._radius = props.radius;
			this._parseHash(props);
		} else {
			this._processStyle();
		}
	},

	// parameters
	cx : function(cx){
		return this._property('cx', cx);
	},

	cy : function(cy){
		return this._property('cy', cy);
	},
	
	radius : function(r){
		return this._property('radius', r);
	},

	_bounds : function(){
		return new Bounds(this._cx - this._radius, this._cy - this._radius, this._radius * 2, this._radius * 2);
	},
	
	processPath : function(ctx){
		ctx.beginPath();
		// Math.abs -- fix for negative radius (for ex. - animate radius to 0 with elasticOut easing)
		ctx.arc(this._cx, this._cy, Math.abs(this._radius), 0, Math.PI*2, true);
	}

});
Circle.props = [ 'cx', 'cy', 'radius', 'fill', 'stroke' ];
Circle.distances = [true, true, true];

$.Curve = Curve = new Class({
	initialize : function( name, _arguments, path ){
		this.name = name;
		this.path = path;
		this._arguments = _arguments;

		if( name in Curve.curves ){
			extend( this, Curve.curves[ name ] );
	//		Curve.curves[ name ]( this );
		}
	},

	// todo: extendsBy to the classes
	_property : Shape.prototype._property,
	update : function(){
		this.path.update();
		return this;
	},

	arguments : function(){
		return this._property( 'arguments', arguments.length > 1 ? arguments : arguments[0] );
	},

	argument : function( index, value ){
		if( value === undefined )
			return this._arguments[ index ];
		this._arguments[ index ] = value;
		return this.update();
	},

	from : function(){ // returns the start point
		var index = this.path._curves.indexOf( this ),
			before = this.path._curves[ index - 1 ];
		if( index === 0 )
			return [0, 0];
		if( index === -1 || !before || !('endsIn' in before && 'from' in before) )
			return null;
		var from = before.from(),
			end = before.endsIn();
		if( !from || !end )
			return null;
		return [ from[0] + end[0], from[1] + end[1] ];
	},

	endsIn : function(){
		if( this._slice )
			return this._arguments.slice( this._slice[0], this._slice[1] );
		return null;
	},

	process : function( ctx ){
		ctx[ this.name ].apply( ctx, this._arguments );
		return this.endsIn();
	},

	_bounds : function(){
		return null;
	}
});

Curve.curves = {
	moveTo : {
		_slice : [ , ],
		points : function(){ return [this._arguments]; },
		x : argument( 0 ),
		y : argument( 1 )
	},
	lineTo : {
		_slice : [ , ],
		points : function(){ return [this._arguments]; },
		_bounds : function( from ){
			var end = this._arguments;
			return new Bounds( from[0], from[1], end[0] - from[0], end[1] - from[1] );
		},
		x : argument( 0 ),
		y : argument( 1 )
	},
	quadraticCurveTo : {
		_slice : [ 2 ],
		points : function(){
			return [ this._arguments.slice(2), this._arguments.slice(0, 2) ];
		},
		_bounds : function( f ){
			var a = this._arguments,
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
			return [ this._arguments.slice(4), this._arguments.slice(2, 4), this._arguments.slice(0, 2) ];
		},
		_bounds : function( f ){
			var a = this._arguments,
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
			return [ this._arguments.slice(0, 2) ];
		},
		x         : argument( 0 ),
		y         : argument( 1 ),
		radius    : argument( 2 ),
		start     : argument( 3 ),
		end       : argument( 4 ),
		clockwise : argument( 5 ),
		endsIn : function(){
			var x         = this._arguments[ 0 ],
				y         = this._arguments[ 1 ],
				radius    = this._arguments[ 2 ],
				start     = this._arguments[ 3 ],
				end       = this._arguments[ 4 ],
				clockwise = this._arguments[ 5 ],
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
			return [ this._arguments.slice(0, 2), this._arguments.slice(2) ];
		},
		x1        : argument( 0 ),
		y1        : argument( 1 ),
		x2        : argument( 2 ),
		y2        : argument( 3 ),
		radius    : argument( 4 ),
		clockwise : argument( 5 )
	}
};

Curve.byArray = function(array, path){
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

	init : function(){
		this._curves = Path.parsePath( this._curves, this );
		this._processStyle();
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

	bounds : function(){
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
			if(end = curves[i].endsIn()){
				current[0] += end[0];
				current[1] += end[1];
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
			if(curve){
				current[0] += curve[0];
				current[1] += curve[1];
			}
		}
	}

} );

Path.props = [ 'curves', 'fill', 'stroke' ];

Path.parsePath = function(path, pathObject, firstIsNotMove){
	if(!path)
		return [];

	if(path instanceof Curve) // todo: path.path = pathObject;
		return [path];

	var curves = [];
	if(isArray(path)){

		// fix for [x,y] instead of [[x,y]]
		if(isNumberLike(path[0]))
			path = [path];

		for(var i = 0, l = path.length; i < l; i++){

			// Curve
			if(path[i] instanceof Curve)
				curves.push(path[i]); // path[i].path = pathObject;

			// Array
			else {
				if(i === 0 && !firstIsNotMove){
					curves.push(new Curve('moveTo', path[i], pathObject));
					continue;
				}
				curves.push(Curve.byArray(path[i], pathObject));
			}
		}

	}

	return curves;
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
		// Note: the 5th argument is crop

		var props = this._image;
		if(isObject(props)){
			this._image = props.image;
			this._x = props.x;
			this._y = props.y;
			this._width = props.width;
			this._height = props.height;
			this._crop = props.crop;
			this._parseHash(props);
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

		// image already loaded
		if(this._image.complete){
			s = this._computeSize(this._width, this._height, this._image);
			this._width = s[0];
			this._height = s[1];
		}
		
		this._image.addEventListener('load', function(e){
			s = this._computeSize(this._width, this._height, this._image);
			this._width = s[0];
			this._height = s[1];
			this.update();

			if(blob)
				domurl.revokeObjectURL(blob);

			this.fire('load', e);
		}.bind(this));

		this._image.addEventListener('error', function(e){
			this.fire('error', e);
		}.bind(this));

		// Video tag support
	},
	
	_computeSize : function(w, h, image){
		// num, num
		if(isNumberLike(w) && isNumberLike(h))
			return [w, h];

		// 'native', 'native' or 'auto', 'auto'
		// and undefined, undefined
		if((isString(w) && isString(h)) || (w === undefined && h === undefined))
			return [image.width, image.height];

		// native
		if(w === 'native' || h === 'native')
			return [w === 'native' ? image.width : w,
					h === 'native' ? image.height : h];
	
		// auto
		if(w === 'auto' || h === 'auto')
			return [w === 'auto' ? image.width * (h / image.height) : w,
					h === 'auto' ? image.height * (w / image.width) : h];
	},

	x  : Rect.prototype.x,
	y  : Rect.prototype.y,
	x1 : Rect.prototype.x1,
	y1 : Rect.prototype.y1,
	x2 : Rect.prototype.x2,
	y2 : Rect.prototype.y2,
	width : function(w){
		if(w === undefined) return this._width;
		return this._property('width', this._computeSize(w, this._height, this._image)[0]);
	},
	height : function(h){
		if(h === undefined) return this._height;
		return this._property('height', this._computeSize(this._width, h, this._image)[1]);
	},
	_bounds : Rect.prototype._bounds,
	processPath : Rect.prototype.processPath, // for event listeners

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
		this._applyStyle();

		if(this._crop !== undefined)
			ctx.drawImage(this._image, this._crop[0], this._crop[1], this._crop[2], this._crop[3], this._x, this._y, this._width, this._height);
		else if(this._width !== undefined)
			ctx.drawImage(this._image, this._x, this._y, this._width, this._height);
		else
			ctx.drawImage(this._image, this._x, this._y);

		if(this._style.strokeStyle !== undefined)
			ctx.strokeRect(this._x, this._y, this._width, this._height);
		ctx.restore();
	}

});

Img.props = [ 'image', 'x', 'y', 'width', 'height', 'crop' ];
Img.distances = [false, true, true, true, true]; // TODO: check on errors! 'auto', 'native' values?

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

	init : function(){
		// text, [font], x, y, [fill], [stroke]
		var props = this._text;
		if(isObject( props )){
			this._text  = props.text;
			this._x     = props.x;
			this._y     = props.y;
			this._font  = this._parseFont(props.font || Text.font);
			if(props.baseline !== undefined)
				this._style.textBaseline = props.baseline;
			if(props.align !== undefined)
				this._style.textAlign = props.align;
			this._genFont();
			this._width = props.width;
			this._parseHash(props);
		}
		else {
			if( !isNumberLike(this._y) ){ // font isn't exist
				this._stroke = this._fill;
				this._fill = this._y;
				this._y = this._x;
				this._x = this._font;
				this._font = Text.font;
			}
			this._font = this._parseFont(this._font);
			this._genFont();
			this._processStyle();
		}
		this._genLines();
	},

	_breaklines: true,

	_genLines : function(){
		var text = this._text,
			lines = this._lines = [],
			size = this._lineHeight || this._font.size || 10,
			ctx = this.context.context,
			width = this._width || Infinity,
			countline = 1,
			align = this._style.textAlign,
			x = (align === 'center') ? (width/2) : ((width === 'right') ? width : 0);

		this._applyStyle();

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
		ctx.restore();
		return this;
	},

	// options
	text : function(t){
		return this._property('text', t);
	},
	x : function(x){
		return this._property('x', x);
	},
	y : function(y){
		return this._property('y', y);
	},
	breaklines : function(a){
		return this._property('breaklines', a);
	},
	font : function(font){
		if(font === true)
			return this._style.font;
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
		return this._setstyle('font', str + (font.size || 10) + 'px ' + (font.family || 'sans-serif'));
		// font.size can't be 0? unexpected behavior
	},
	_parseFont : function(font){
		if(isObject(font)){
			font.size = _.distance(font.size);
			return font;
		}

		var obj = {family:''};
		font.split(' ').forEach(function(val){
			if(val === 'bold')
				obj.bold = true;
			else if(val === 'italic')
				obj.italic = true;
			else if(/^\d+(px|pt)?/.test(val))
				obj.size = _.distance(val);
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
		return this._setFont('size', s === undefined ? undefined : _.distance(s));
	},
	bold : function(b){
		return this._setFont('bold', b === undefined ? undefined : !!b) || false;
	},
	italic : function(i){
		return this._setFont('italic', i === undefined ? undefined : !!i) || false;
	},
	align : function(a){
		return this._setstyle('textAlign', a);
	},
	baseline : function(b){
		return this._setstyle('textBaseline', b);
	},
	underline : function(val){
		if(val === undefined)
			return !!this._underline;
		return this._property('underline', !!val);
	},
	width : function(w){
		if(w === undefined){
			if(!this._width){
				var ctx = this.context.context;
				this._applyStyle();
				var max = 0;
				this._lines.forEach(function(line){
					max = Math.max( max, ctx.measureText( line.text ).width );
				});
				ctx.restore();
				return max;
			} else
				return this._width;
		}
		this._width = w;
		this._genLines();
		return this.update();
	},

	// text.font('2px')

	// text.family('Arial');
	// text.size(10);
	// text.weight(true)
	// text.baseline(0)

	isPointIn : function(x, y){
		// transforms?
		var b = this.bounds();
		return x > b.x && y > b.y && x < b.x+b.w && y < b.y+b.h;
	},
	_bounds : function(){
		var align = this._style.textAlign || 'left',
			baseline = this._style.textBaseline || 'top',
			width = this.width(),
			size = Number(this._font.size),
			x = this._x,
			y = this._y;

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
		// 0.15 -- magic number (from LibCanvas? :))
		return new Bounds(x, y, width, size * (this._limit || this._lines.length) + size * 0.15);
	},
	draw : function(ctx){
		if(!this._visible)
			return;
		this._applyStyle();

		var x = this._x,
			y = this._y,
			i = 0,
			l = this._lines.length,
			draw = emptyFunc,
			line;

		if(this._style.fillStyle){
			if(this._style.strokeStyle)
				draw = function(t, x, y){
					ctx.fillText(t, x, y);
					ctx.strokeText(t, x, y);
				};
			else
				draw = ctx.fillText;
		} else
			draw = ctx.strokeText;

		for(; i < l; i++){
			line = this._lines[i];
			draw.call(ctx, line.text, x + line.x, y + line.y);
		}

/*		// underline
		if(this._underline){
			var b = this.bounds(),
				height = Math.round(this._font.size / 5);
			ctx.beginPath();
			ctx.moveTo(b.x, b.y + b.h - height);
			ctx.lineTo(b.x + b.w, b.y + b.h - height);
			ctx.strokeStyle = this._style.strokeStyle || this._style.fillStyle;
			ctx.lineWidth   = Math.round(this._font.size / 15);
			ctx.stroke();
		} */

		ctx.restore();
	}
// TODO: mozPathText; mozTextAlongPath
// https://developer.mozilla.org/en-US/docs/Drawing_text_using_a_canvas
});

Text.props = [ 'text', 'font', 'x', 'y', 'fill', 'stroke' ];
Text.font = '10px sans-serif';
//Text.distances = [ false, false, true, true ];

$.Gradient = Gradient = new Class({

	initialize : function(type, colors, from, to, context){
		// distance in from & to
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
					c1[0] + (c2[0] - c1[0]) * t | 0,
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

	// параметры
	repeat : function(repeat){
		if(repeat === undefined)
			return from[this._repeat];
		this._repeat = (isBoolean(repeat) ? (repeat ? 'repeat' : 'no-repeat') : (isString(repeat) ? 'repeat-' + repeat : 'repeat'));
		return this.update();
	},

	// отрисовка
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
}


// Bounds class
function Bounds(x, y, w, h){
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

			return (cls.prototype.initialize || emptyFunc).apply(this,arguments);
		};


		// prototype inheriting
		var sklass = function(){};
		sklass.prototype = parent.prototype;
		cls.prototype = new sklass();
		cls.parent = parent;
		cls.prototype.constructor = cls;

	}
	if(base)
		extend(cls, base);

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


// Clear functions
_.clone = $.clone = function(object){
	var result = new object.constructor();
	for(var i in object){
		if(Object.prototype.hasOwnProperty.call(object, i)){
			if(typeof object[i] === 'object' && !(object[i] instanceof Context) && !(object[i] instanceof Image)){
				result[i] = _.clone(object[i]);
			} else {
				result[i] = object[i];
			}
		}
	}
	return result;
};


_.multiply = $.multiply = function(m1, m2){ // multiplies two 2D-transform matrices
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
_.coordsOfElement = $.coordsOfElement = function(element){ // returns coords of a DOM element

	var box = element.getBoundingClientRect(),
		style = window.getComputedStyle(element);

	return {
		x: box.left + parseInt(style.borderLeftWidth) + parseInt(style.paddingLeft),
		y: box.top  + parseInt(style.borderTopWidth)  + parseInt(style.paddingTop)
	};

};

_.color = $.color = function(value){ // parses CSS-like colors (rgba(255,0,0,0.5), green, #f00...)
	if(value === undefined) return;

	var test;
	if(value in $.colors)
		return _.color('#' + $.colors[value]);

	// rgba(255, 100, 20, 0.5)
	if(test = value.match(/^rgba?\((\d{1,3})\,\s*(\d{1,3})\,\s*(\d{1,3})(\,\s*([0-9\.]{1,4}))?\)/))
		return [parseInt(test[1]), parseInt(test[2]), parseInt(test[3]), parseFloat(test[5] || 1)];

	// rgba(100%, 0%, 50%, 1)
	if(test = value.match(/^rgba?\((\d{1,3})\%?\,\s*(\d{1,3})\%?\,\s*(\d{1,3})\%?(\,\s*([0-9\.]{1,4}))?\)/))
		return [ Math.round(parseInt(test[1]) * 2.55), Math.round(parseInt(test[2]) * 2.55), Math.round(parseInt(test[3]) * 2.55), parseFloat(test[5] || 1) ];

	// #bebebe
	if(test = value.match(/^\#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i))
		return [parseInt(test[1], 16), parseInt(test[2], 16), parseInt(test[3], 16), 1];

	// #555
	if(test = value.match(/^\#([0-9a-f])([0-9a-f])([0-9a-f])/i))
		return [parseInt(test[1] + test[1], 16), parseInt(test[2] + test[2], 16), parseInt(test[3] + test[3], 16), 1];

	if(value === 'rand')
		return [Math.round(Math.random() * 255), Math.round(Math.random() * 255), Math.round(Math.random() * 255), Number(Math.random().toFixed(2))];

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
};

_.distance = $.distance = function(value){
	if(value === undefined) return;
	if(!value) return 0;
	if( isNumber(value) ){
		if( $.unit !== 'px')
			return _.distance( value + '' + $.unit );

		return value;
	}

	value += '';
	if(value.indexOf('px') === value.length-2)
		return +value.replace(/[^\d]*/, '');

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

	var unit = value.replace(/[\d\.]+?/gi, '');
	value = value.replace(/[^\d\.]+?/gi, '');
	return Math.round($.units[unit] * value);
};

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

$.query = function(query, index, element){
	return new Context( isString(query) ? (element || window.document).querySelectorAll(query)[index || 0] : query.canvas || query );
};

$.id = function(id){
	return new Context( document.getElementById(id) );
};

$.util = $._ = _; // deprecated


if( typeof module === 'object' && typeof module.exports === 'object' ){
	module.exports = $;
} else if( typeof define === 'function' && define.amd ){
	define( [], function(){ return $; } );
} else {
	window.Graphics2D = $;
}

})( typeof window !== 'undefined' ? window : this );