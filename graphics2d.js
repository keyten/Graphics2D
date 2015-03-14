/*  Graphics2D 0.9.1
 * 
 *  Author: Dmitriy Miroshnichenko aka Keyten <ikeyten@gmail.com>
 *  Last edit: 14.3.2015
 *  License: MIT / LGPL
 */

(function(window, undefined){

	// The main graphics2D class
	var $ = {};

	// Classes
	var Context,

		Shape, Rect, Circle, Curve, Path, Img, Text, TextBlock,

		Gradient, Pattern, Anim, Bounds;

	// Local variables
	var emptyFunc = function(){},
		_ = {},
		toString = Object.prototype.toString,
		requestAnimationFrame =
				window.requestAnimationFrame		||
				window.webkitRequestAnimationFrame	||
				window.mozRequestAnimationFrame		||
				window.oRequestAnimationFrame		||
				window.msRequestAnimationFrame		||
				window.setTimeout,
		cancelAnimationFrame =
				window.cancelAnimationFrame			||
				window.webkitCancelAnimationFrame	||
				window.mozCancelAnimationFrame		||
				window.oCancelAnimationFrame		||
				window.msCancelAnimationFrame		||

				window.cancelRequestAnimationFrame			||
				window.webkitCancelRequestAnimationFrame	||
				window.mozCancelRequestAnimationFrame		||
				window.oCancelRequestAnimationFrame			||
				window.msCancelRequestAnimationFrame		||

				window.clearTimeout;


	$.Context = Context = function(canvas){
		this.context   = canvas.getContext('2d'); // rename to the context2d?
		this.canvas    = canvas;
		this.elements  = [];
		this.listeners = {};
		this._cache    = {}; // for gradients
	};

	Context.prototype = {

		// Classes

		rect : function(x, y, w, h, fill, stroke){
			return this.push(new Rect(x, y, w, h, fill, stroke, this));
		},
		circle : function(cx, cy, r, fill, stroke){
			return this.push(new Circle(cx, cy, r, fill, stroke, this));
		},
		curve : function(name, from, to, fill, stroke){
			return this.push(new Curve(name, to, from, fill, stroke, this));
		},
		path : function(points, fill, stroke){
			return this.push(new Path(points, fill, stroke, this));
		},
		image : function(img, x, y, w, h){
			return this.push(new Img(img, x, y, w, h, this));
		},
		text : function(text, font, x, y, fill, stroke){
			return this.push(new Text(text, font, x, y, fill, stroke, this));
		},
		textblock : function(text, font, x, y, w, fill, stroke){
			return this.push(new TextBlock(text, font, x, y, w, fill, stroke, this));
		},
		gradient : function(type, from, to, colors){
			return new Gradient(type, from, to, colors, this);
		},
		pattern : function(image, repeat){
			return new Pattern(image, repeat, this);
		},


		// Path slices

		line : function(fx, fy, tx, ty, stroke){ // todo: curves instead of paths
			return this.push(new Path([[fx, fy], [tx, ty]], null, stroke, this));
		},
		quadratic : function(fx, fy, tx, ty, hx, hy, stroke){
			return this.push(new Path([[fx, fy], [tx, ty, hx, hy]], null, stroke, this));
		},
		bezier : function(fx, fy, tx, ty, h1x, h1y, h2x, h2y, stroke){
			return this.push(new Path([[fx, fy], [tx, ty, h1x, h1y, h2x, h2y]], null, stroke, this));
		},
		arcTo : function(fx, fy, tx, ty, radius, clockwise, stroke){
			return this.push(new Path([{ f:'moveTo', arg:[fx, fy] }, { f:'arcTo', arg:[fx, fy, tx, ty, radius, clockwise] }], null, stroke, this));
		},


		// Methods

		push : function(element){
			element.z = this.elements.length;
			element.context = this;

			this.elements.push(element);
			if( element.draw )
				element.draw(this.context);
			// todo: move here 1. element._z 2. element.context
			return element;
		},
		update : function(){
			if(this._timer)
				return;

			this._timer = requestAnimationFrame(function(){
				this._update();
				this._timer = null;
			}.bind(this), 1);
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
			// mouse=true : don't return element with _events=false
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
				return;

			this.listeners[event] = [];

			this.canvas.addEventListener(event, function(e){
				var element,
					coords = _.coordsOfElement(this.canvas);

				e.contextX = e.clientX - coords.x;
				e.contextY = e.clientY - coords.y;

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
			if(toString.call(event) === '[object Number]')
				return window.setTimeout(fn.bind(this), event), this;

			(this.listeners[ event ] || this.listener(event)).push(fn);
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

	$.Shape = Shape = new Class({

		initialize : function(){
			this.listeners = {};
			this._style = {};
		},

		_parseHash : function(object){
			var s = this._style;
			if(object.opacity !== undefined)
				s.globalAlpha = object.opacity;
			if(object.composite !== undefined)
				s.globalCompositeOperation = object.composite;
			if(object.visible !== undefined)
				this._visible = object.visible;
			if(object.clip !== undefined)
				this._clip = object.clip;

			this._processStyle(object.fill, object.stroke, this.context.context);
		},
		_processStyle : function(fill, stroke){
			if(fill)
				this._style.fillStyle = fill;
			if(stroke)
				extend(this._style, this._parseStroke(stroke));

			if(fill instanceof Gradient || fill instanceof Pattern)
				return;

			if(isHash(fill) && fill.colors)
				this._style.fillStyle = new Gradient(fill, null, null, null, this.context);

			if(fill && (isString(fill) || isHash(fill))){
				if((isHash(fill) && fill.image) || fill.indexOf
					&& (fill.indexOf('http://') === 0 || fill.indexOf('.') === 0 || fill.indexOf('data:image/') === 0))
					this._style.fillStyle = new Pattern(fill, null, this.context);
			}
			if(fill instanceof Image){
				this._style.fillStyle = new Pattern(fill, null, this.context);
			}

			// TODO: gradient stroke
		},
		_applyStyle : function(){
			var ctx = this.context.context;
			ctx.save();
			for(var i in this._style){
				if(_.has(this._style, i))
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
			else if(typeof this._style.fillStyle === 'function')
				ctx.fillStyle = this._style.fillStyle.call(this, ctx);
			if(this._style.strokeStyle && this._style.strokeStyle.toCanvasStyle)
				ctx.strokeStyle = this._style.strokeStyle.toCanvasStyle(ctx, this);
			if(this._style._lineDash){
				if(ctx.setLineDash) // webkit
					ctx.setLineDash(this._style._lineDash);
				else // gecko
					ctx.mozDash = this._style._lineDash;
			}
		},
		_parseStroke : function(stroke){
			var obj = {}, opacity;
			if(isHash(stroke)){
				stroke.width !== undefined
					&& (obj.lineWidth   = stroke.width);
				stroke.color
					&& (obj.strokeStyle = stroke.color);
				stroke.cap
					&& (obj.lineCap     = stroke.cap  );
				stroke.join
					&& (obj.lineJoin    = stroke.join );
				stroke.dash
					&& (obj._lineDash   = isString(stroke.dash)
						&& _.dashes[stroke.dash]
						|| stroke.dash);
				return obj;
			}

			stroke.split(' ').forEach(function(val){
				if(/^\d*\.\d+$/.test(val))
					opacity = parseFloat(val);
				else if(val[0] === '[')
					obj._lineDash = val.substring(1, val.length-1).split(',');
				else if(isNumber(val))
					obj.lineWidth = _.distance(val);
				else if(val === 'miter' || val === 'bevel')
					obj.lineJoin = val;
				else if(val === 'butt' || val === 'square')
					obj.lineCap = val;
				else if(val === 'round'){
					obj.lineJoin = obj.lineJoin || val;
					obj.lineCap  = obj.lineCap  || val;
				}
				else if(val in _.dashes)
					obj._lineDash = _.dashes[val];
				else
					obj.strokeStyle = val;
			});
			if(opacity){
				var cl = _.color(obj.strokeStyle);
				cl[3] *= opacity;
				obj.strokeStyle = 'rgba(' + cl.join(',') + ')';
			}
			return obj;
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
				z = this.context.elements.length;
			this.context.elements = _.move.call(this.context.elements, this._z, z);
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
		remove : function(){
			this.context.elements.splice(this._z, 1);
			return this.update();
		},
		fill : function(fill){
			if(isHash(fill) && fill.colors){
				this._style.fillStyle = new Gradient(fill, null, null, null, this.context);
				return this.update();
			}
			else if(fill && (fill.indexOf || isHash(fill))){
				if((isHash(fill) && fill.image) || (fill.indexOf('http://') === 0 || fill.indexOf('.') === 0)){
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
		cursor : function(cur){
			var cnv = this.context.canvas,
				old = cnv.style.cursor;
			return this.on('mouseover', function(){
				cnv.style.cursor = cur;
			}).on('mouseout', function(){
				cnv.style.cursor = old;
			});
		},
		shadow : function(name, value){
			// shape.shadow({ x, y, color, blur });
			// shape.shadow('x')
			// shape.shadow('x', value)
			// shape.shadow('1px 1px red 2px')
			var style = this._style;
			var shadowToStyle = {
				'x': 'shadowOffsetX',
				'y': 'shadowOffsetY',
				'color': 'shadowColor',
				'blur': 'shadowBlur'
			};
			if(isString(name)){
				if(value === undefined){
					return style[shadowToStyle[name]];
				}
				else if(name.indexOf(' ') === -1){
					// distance ?
					style[shadowToStyle[name]] = value;
				}
				else {
					// '1px 1px 2px red'
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
					if(_.has(value, name)){
						style[shadowToStyle[name]] = value[name];
					}
				}
			}
			return this.update();
		},

		// events
		on : function(event, fn){
			if(isString(fn)){
				var method = fn,
					args = Array.prototype.slice.call(arguments, 2);
				fn = function(){
					this[method].apply(this, args);
				};
				// [fn, proxy] = [proxy, fn];
			}
			if(toString.call(event) === '[object Number]')
				return window.setTimeout(fn.bind(this), event), this;

			this.context.listener(event);
			(this.listeners[ event ] || (this.listeners[ event ] = [])).push(fn);
			return this;

		},
		once : function(event, fn){
			var proxy;
			this.on(event, proxy = function(e){
				fn.call(this, e);
				this.off(event, proxy);
			}.bind(this));

			fn.proxy = proxy; // for .off
			// BAD, BAD, BAD!

			// func.proxy = true;
			// shape.once(func);
			// func.proxy -- ?
		},
		off : function(event, fn){
			if(!fn)
				this.listeners[event] = [];

			this.listeners[event][this.listeners[event].indexOf(fn.proxy || fn)] = emptyFunc;
			return this;
		},
		fire : function(evt, data){
			(this.listeners[ evt ] || []).forEach(function(func){
				func.call(this, data);
			}.bind(this));
			return this;
		},
		isPointIn : function(x, y){
			if(!this.processPath)
				return false;
			var ctx = this.context.context;
			ctx.save();
			if(this._matrix)
				ctx.transform.apply(ctx, this._matrix);
			this.processPath(ctx);
			x = ctx.isPointInPath(x, y);
			ctx.restore();
			return x;
		},
		corner : function(corner){
			if(isArray(corner))
				return corner;
			if(isHash(corner)){
				if(_.has(corner, 'from')){
					var from = this.corner(corner.from);
					return [from[0] + corner.x, from[1] + corner.y];
				}
				else
					return [corner.x, corner.y];
			}
			if(!this.bounds)
				throw new Error('Object hasn\'t bounds() method.');
			if(!corner)
				corner = 'center';
			var bounds = this.bounds();
			return [
				bounds.x + bounds.w * _.corners[corner][0],
				bounds.y + bounds.h * _.corners[corner][1]
			];
		},

		// transformations
		transform : function(a, b, c, d, e, f, pivot){
			/* px, py = pivot
				[1,0,px]   [a,c,e]   [1,0,-px]   [a,c,e+px]   [1,0,-px]   [a,c,-px*a - py*c + e+px]
				[0,1,py] * [b,d,f] * [0,1,-py] = [b,d,f+py] * [0,1,-py] = [b,d,-px*b - py*d + f+py]
				[0,0,1]    [0,0,1]   [0,0,1]     [0,0,1]      [0,0,1]     [0,0,1]
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
			// pivot dont work
			if(y === undefined){
				if(isNumber(x))
					y = x;
				else
					y = x[1] !== undefined? x[1]
						: x.y !== undefined? x.y
						: 1;
			}
			if(!isNumber(x)){
				x = x[0] !== undefined? x[0]
						: x.x !== undefined? x.x
						: 1;
			}
			return this.transform( x, 0, 0, y, 0, 0, pivot);
		},

		rotate : function(angle, pivot){
			angle = angle * Math.PI / 180;
			return this.transform(Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), 0, 0, pivot);
		},

		skew : function(x, y, pivot){
			// todo: shape.skew(size, pivot)
			if(y === undefined){
				if(isNumber(x))
					y = x;
				else
					y = x[1] || x.y || 0;
			}
			if(!isNumber(x)){
				x = x[0] || x.x || 0;
			}
			return this.transform( 1, Math.tan(y * Math.PI / 180), Math.tan(x * Math.PI / 180), 1, 0, 0, pivot);
		},

		translate : function(x, y){
			return this.transform(1, 0, 0, 1, x, y);
		},

		// conversions
		toPath : function(){},
		toImage : function(){},

		// animation
		animate : function( prop, value, options ){
			//	animate(property, value, duration, easing, after);
			//	animate(properties, duration, easing, after);
			//	animate(property, value, options);
			//	animate(properties, options);

			if( isHash( prop ) ){
				if( isHash( value ) )
					value.queue = false;
				else
					value = { duration: value, easing: options, callback: arguments[4], queue: false };

				for( var i in prop ){
					if( _.has( prop, i ) )
						this.animate( i, prop[i], value, options, arguments[4] );
				}
				return this;
			}

			if( !isHash( options ) ){
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

				if( fx.elem._style.fillStyle === 'transparent'
					|| fx.elem._style.fillStyle === undefined )
					fx.start = fx.end.slice(0, 3).concat([ 0 ]);
			}
			fx.elem._style.fillStyle = 'rgba(' +
				[ Math.round(fx.start[0] + (fx.end[0] - fx.start[0]) * fx.pos),
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

				if( (fx.elem._style.strokeStyle === 'transparent'
					|| fx.elem._style.strokeStyle === undefined)&& end.strokeStyle )
					fx.color1 = fx.color2.slice(0, 3).concat([ 0 ]);
			}

			if( fx.color2 ){
				fx.elem._style.strokeStyle = 'rgba(' +
					[ Math.round(fx.color1[0] + (fx.color2[0] - fx.color1[0]) * fx.pos),
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
			if( fx.state === 0 )
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

				fx.end[0] = fx.end[0] * Math.PI / 180;
				fx.end[1] = fx.end[1] * Math.PI / 180;
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
		'touchstart', 'touchmove', 'touchend'].forEach(function(event){
			Shape.prototype[event] = Context.prototype[event] = function(fn){
				if(typeof fn === 'function' || isString(fn))
					return this.on.apply(this, [event].concat(Array.prototype.slice.call(arguments)));
				else
					return this.fire.apply(this, arguments);
			};
		});

	// animation slices
	['x', 'y', 'width', 'height', 'cx', 'cy', 'radius'].forEach(function( param ){
		$.fx.step[ param ] = $.fx.step.int;
	});

	$.Rect = Rect = new Class(Shape, {

		initialize : function(x, y, w, h, fill, stroke, context){
			this.context = context;
			if(isHash(x)){
				this._x = x.x;
				this._y = x.y;
				this._width = x.width;
				this._height = x.height;
				this._parseHash(x);
			}
			else {
				this._x = x;
				this._y = y;
				this._width = w;
				this._height = h;
				this._processStyle(fill, stroke, context.context);
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

		bounds : function(){
			return new Bounds(this._x, this._y, this._width, this._height);
		},
		processPath : function(ctx){
			ctx.beginPath();
			ctx.rect(this._x, this._y, this._width, this._height);
		}

	});


	$.Circle = Circle = new Class(Shape, {

		initialize : function(cx, cy, radius, fill, stroke, context){
			this.context = context;
			if(isHash(cx)){
				this._cx = cx.cx || cx.x || 0;
				this._cy = cx.cy || cx.y || 0;
				this._radius = cx.radius;
				this._parseHash(cx);
			}
			else {
				this._cx = cx;
				this._cy = cy;
				this._radius = radius;
				this._processStyle(fill, stroke, context.context);
			}
		},

		// параметры
		cx : function(cx){
			return this._property('cx', cx);
		},
		cy : function(cy){
			return this._property('cy', cy);
		},
		radius : function(r){
			return this._property('radius', r);
		},

		bounds : function(){
			return new Bounds(this._cx - this._radius, this._cy - this._radius, this._radius * 2, this._radius * 2);
		},
		processPath : function(ctx){
			ctx.beginPath();
			ctx.arc(this._cx, this._cy, this._radius, 0, Math.PI*2, true);
		}

	});


	$.Curve = Curve = new Class(Shape, {
		initialize : function(name, args, from, fill, stroke, context){
			this._name = name;
			this._arguments = args; // todo: parsing args {x: 10, y:10}
			this.context = context;

			if(context instanceof Context){
				// independent curve
				this._from = from;
				this._processStyle(fill, stroke, context.context);
			}
			else if(from) {
				// from - path
				this.update = from.update.bind(from);
			}

			if(name in Path.curves)
				extend(this, Path.curves[name].prototype);
		},

		arguments : function(){
			return this._property('arguments', arguments.length > 1 ? arguments : arguments[0]);
		},

		argument : function(index, value){
			if(value === undefined)
				return this._arguments[index];
			this._arguments[index] = value;
			this.update();
			return this;
		},

		from : function(x, y){
			if(y !== undefined)
				return this._property('from', [x, y]);
			return this._property('from', x);
		},

		process : function(ctx){
			ctx[this._name].apply(ctx, this._arguments);
			return [0,0];
		},

		processPath : function(ctx){
			ctx.beginPath();
			ctx.moveTo(this._from[0], this._from[1]);
			this.process(ctx, this._from);
		},

		toPath : function(){
			// this.context.push?
			var path = new Path(this);
			path._style = this._style;
			return path;
		},

		bounds : function(){
			return null;
		}

		// pointAt: function(){},
		// tangentAt: function(){},
		// normalAt = auto
		// intersections: function(){},
		// toBezier: function(){},
		// approximate: function(){}, // by lines
		// bounds: function(){},
		// length: function(){},
		// divide: function(){},
		// nearest: function(){}, // nearest point
		// allPoints
	});

	$.Path = Path = new Class(Shape, {

		initialize : function(points, fill, stroke, context){
			this._curves = Path.parsePath(points, this);
			this._processStyle(fill, stroke, context.context);
			this.context = context;
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
				this._curves[0]._name = 'lineTo';
			}

			value = Path.parsePath(value, this, index === 0 ? false : true);
			this._curves.splice.apply(this._curves, [index, 0].concat(value));
			return this.update();
		},
		after : function(index, value){
			return this.before(index+1, value);
//			value = Path.parsePath(value, this, index === 0 ? false : true);
//			this._curves.splice.apply(this._curves, [index+1, 0].concat(value));
//			return this.update();
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

			if(isNumber(value[0]))
				this._curves = Path.parsePath(Array.prototype.slice.call(arguments), this);
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
			return this.push(new Path.curves[name](name, arg, this));
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
			// todo: using the closePath var
			return this.add('closePath', []);
		},

		// processing
		allPoints : function(callback){},
		transformPath : function(a, b, c, d, e, f, pivot){},
		processPath : function(ctx){
			var current = [0, 0];

			ctx.beginPath();
			this._curves.forEach(function(curve){
				curve = curve.process(ctx, current);
				current[0] += curve[0];
				current[1] += curve[1];
			});
		},
		merge : function(path){
			this._curves = this._curves.concat(path._curves);
			return this.update();
		},

		bounds : function(){}
	});

	function argument(n){
		return function(value){
			return this.argument(n, value);
		}
	}

	var basicLine, quadratic, bezier, arc, arcTo;

	Path.curves = {
		moveTo : basicLine = new Class(Curve, {
			process : function(ctx, point){
				ctx[this._name].apply(ctx, this._arguments);
				return this._arguments;
			},
			x : argument(0),
			y : argument(1),
			bounds : function(from){
				if(this._name === 'moveTo')
					return null;

				if(this._from)
					from = this._from;
				return new Bounds(from[0], from[1], this._arguments[0] - from[0], this._arguments[1] - from[1]);
			}
		}),
		lineTo : basicLine,
		quadraticCurveTo : quadratic = new Class(Curve, {
			process : function(ctx, point){
				ctx[this._name].apply(ctx, this._arguments);
				return this._arguments.slice(2);
			},
			x  : argument(2),
			y  : argument(3),
			hx : argument(0),
			hy : argument(1),
			bounds : function(from){
				if(this._from)
					from = this._from;
				var minx = Math.min(this._arguments[0], this._arguments[2], from[0]),
					miny = Math.min(this._arguments[1], this._arguments[3], from[1]),
					maxx = Math.max(this._arguments[0], this._arguments[2], from[0]),
					maxy = Math.max(this._arguments[1], this._arguments[3], from[1]);
				return new Bounds(minx, miny, maxx-minx, maxy-miny);
			}
		}),
		bezierCurveTo : bezier = new Class(Curve, {
			process : function(ctx, point){
				ctx[this._name].apply(ctx, this._arguments);
				return this._arguments.slice(4);
			},
			x   : argument(4),
			y   : argument(5),
			h1x : argument(0),
			h1y : argument(1),
			h2x : argument(2),
			h2y : argument(3),
			bounds : function(from){
				if(this._from)
					from = this._from;
				var minx = Math.min(this._arguments[0], this._arguments[2], this._arguments[4], from[0]),
					miny = Math.min(this._arguments[1], this._arguments[3], this._arguments[5], from[1]),
					maxx = Math.max(this._arguments[0], this._arguments[2], this._arguments[4], from[0]),
					maxy = Math.max(this._arguments[1], this._arguments[3], this._arguments[5], from[1]);
				return new Bounds(minx, miny, maxx-minx, maxy-miny);
			}
		}),
		arc : arc = new Class(Curve, {
			process : function(ctx, point){
				ctx[this._name].apply(ctx, this._arguments);

				var x = this._arguments[0],
					y = this._arguments[1],
					radius = this._arguments[2],
					start  = this._arguments[3],
					end    = this._arguments[4],
					clockwise = this._arguments[5],

					delta = end - start;

				if(clockwise)
					delta = -delta;

				return [
					x + Math.cos(delta) * radius,
					y + Math.sin(delta) * radius
				];
			},
			x : argument(0),
			y : argument(1),
			radius : argument(2),
			start : argument(3),
			end : argument(4),
			clockwise : argument(5)
		}),
		arcTo : arcTo = new Class(Curve, {
			process : function(ctx, point){
				ctx[this._name].apply(ctx, this._arguments);
				return this._arguments.slice(2,4);
			},
			x1 : argument(0),
			y1 : argument(1),
			x2 : argument(2),
			y2 : argument(3),
			radius : argument(4),
			clockwise : argument(5)
		})
	};

	var closePath = new Curve('closePath', []);

	function curveByArray(array, path){
		if(array === true)
			return closePath;

		switch(array.length){
			case 2:
				return new basicLine('lineTo', array, path);
			case 4:
				return new quadratic('quadraticCurveTo', array, path);
			case 6:
				return new bezier('bezierCurveTo', array, path);
		}
	}

	Path.parsePath = function(path, pathObject, firstIsNotMove){
		if(!path)
			return [];

		if(path instanceof Curve)
			return [path];

		var curves = [];
		if(isArray(path)){

			// fix for [x,y] instead of [[x,y]]
			if(isNumber(path[0]))
				path = [path];

			for(var i = 0, l = path.length; i < l; i++){

				// Curve
				if(path[i] instanceof Curve)
					curves.push(path[i]);

				// Array
				else {
					if(i === 0 && !firstIsNotMove){
						curves.push(new basicLine('moveTo', path[i], pathObject));
						continue;
					}
					curves.push(curveByArray(path[i], pathObject))
				}
			}

		}

		return curves;
	};

	var smoothWithPrefix;
	function smoothPrefix(ctx){
		if(smoothWithPrefix) return smoothWithPrefix;
		['imageSmoothingEnabled', 'mozImageSmoothingEnabled', 'webkitImageSmoothingEnabled', 'msImageSmoothingEnabled'].forEach(function(name){
			if(name in ctx)
				smoothWithPrefix = name;
		});
		return smoothWithPrefix;
	}

	$.Image = Img = new Class(Shape, {

		initialize : function(image, x, y, width, height, context){
			this.context = context;
			if(x === undefined){
				this._image = image.image;
				this._x = image.x;
				this._y = image.y;
				this._width = image.width;
				this._height = image.height;
				this._crop = image.crop;
				this._parseHash(image);
			}
			else {
				this._image = image;
				this._x = x;
				this._y = y;
				this._width = width;
				this._height = height;
			}

			if(isString(this._image)){
				if(this._image[0] === '#')
					this._image = document.getElementById( this._image.substr(1) );
				else {
					x = new Image();
					x.src = this._image;
					this._image = x;
				}
			}

			var s;

			// image already loaded
			if(this._image.complete){
				s = this._computeSize(this._width, this._height, this._image);
				this._width = s[0];
				this._height = s[1];
			}
			
			this._image.addEventListener('load', function(){
				this.fire('load');
				s = this._computeSize(this._width, this._height, this._image);
				this._width = s[0];
				this._height = s[1];
				this.update();
			}.bind(this));
			// Video tag support
		},
		
		_computeSize : function(w, h, image){
			// num, num
			if(isNumber(w) && isNumber(h))
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
		bounds : Rect.prototype.bounds,
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

/*	Img.prototype._anim.crop = {
		// extends the Shape::_anim
		start : function(end){
			this._animData.cropStart = this._crop || [0, 0, this._width, this._height];
		},
		process :function(end, t, property){
			var start = this._animData.cropStart,
				i = 1 - t;
			this._crop = [
				start[0] * i + end[0] * t,
				start[1] * i + end[1] * t,
				start[2] * i + end[2] * t,
				start[3] * i + end[3] * t
			];
		}
	},
 */

	$.Text = Text = new Class(Shape, {

		initialize : function(text, font, x, y, fill, stroke, context){
			// text, [font], x, y, [fill], [stroke]
			this._style.textBaseline = 'top';
			this.context = context;

			if(isHash(text)){
				this._text  = text.text;
				this._x     = text.x;
				this._y     = text.y;
				this._font  = this._parseFont(text.font || '10px sans-serif');
				text.baseline !== undefined
					&& (this._style.textBaseline = text.baseline);
				text.align !== undefined
					&& (this._style.textAlign = text.align);
				this._genFont();
				this._width = text.width;
				this._parseHash(text);
			}
			else {
			// "ABC", "10px", "20pt", "20pt", "black"
				this._text = text;
				if(!isNumber(y)){
					stroke = fill;
					fill = y;
					y = x;
					x = font;
					font = '10px sans-serif';
				}
				this._font = this._parseFont(font);
				this._genFont();
				this._x = x;
				this._y = y;
				this._processStyle(fill, stroke, context.context);
			}
		},

		// параметры
		text : function(t){
			return this._property('text', t);
		},
		x : function(x){
			return this._property('x', x);
		},
		y : function(y){
			return this._property('y', y);
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
			font.italic && (str += 'italic ');
			font.bold && (str += 'bold ');
			return this._setstyle('font', str + (font.size || 10) + 'px ' + (font.family || 'sans-serif'));
			// font.size can't be 0? unexpected behavior
		},
		_parseFont : function(font){
			if(isHash(font)){
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
			if(w === undefined && this._width === undefined){
				var ctx = this.context.context;
				this._applyStyle();
				var m = ctx.measureText( this._text ).width;
				ctx.restore();
				return m;
			}
			return this._property('width', w);
		},

		// text.font('2px')

		// text.family('Arial');
		// text.size(10);
		// text.weight(true)
		// text.baseline(0)

		isPointIn : function(x, y){
			var b = this.bounds();
			return x > b.x && y > b.y && x < b.x+b.w && y < b.y+b.h;
		},
		bounds : function(){
			var align = this._style.textAlign || 'left',
				baseline = this._style.textBaseline || 'top',
				width = this.width(),
				size = parseInt(this._font.size) * 1.15, //magic number (from LibCanvas? :))
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
			return new Bounds(x, y, width, size);
		},
		draw : function(ctx){
			if(!this._visible)
				return;
			this._applyStyle();
			var params = [this._text, this._x, this._y];
			if(this._width)
				params.push(this.width());
			if(this._style.fillStyle)
				ctx.fillText.apply(ctx, params);
			if(this._style.strokeStyle)
				ctx.strokeText.apply(ctx, params);

			// underline
			if(this._underline){
				var b = this.bounds(),
					height = Math.round(this._font.size / 5);
				ctx.beginPath();
				ctx.moveTo(b.x, b.y + b.h - height);
				ctx.lineTo(b.x + b.w, b.y + b.h - height);
				ctx.strokeStyle = this._style.strokeStyle || this._style.fillStyle;
				ctx.lineWidth   = Math.round(this._font.size / 15);
				ctx.stroke();
			}
			ctx.restore();
		}
	// TODO: mozPathText; mozTextAlongPath
	// https://developer.mozilla.org/en-US/docs/Drawing_text_using_a_canvas
	});


	$.TextBlock = TextBlock = new Class(Shape, {

		initialize : function(text, font, x, y, width, fill, stroke, context){
			// text, [font], x, y, [width], [fill], [stroke]
			this.context = context;

			if(isHash(text)){
				this._text  = text.text;
				this._x     = text.x;
				this._y     = text.y;
				this._font  = this._parseFont(text.font);
				text.align
					&& (this._style.textAlign = text.align);
				this._genFont();
				this._width = text.width === undefined ? 'auto' : text.width;
				text.limit !== undefined
					&& (this._limit = text.limit);
				this._parseHash(text);
			}
			else {
			// "ABC", "10px", "20pt", "20pt", "black"

			// text, font, x, y, width
			// text, font, x, y
			// text, x, y, width
			// text, x, y
				this._text = text;
				if(!isNumber(width)){
					if(isNumber(font)){ // но ведь там может быть и просто-размер
						stroke = fill;
						fill = width;
						width = y;
						y = x;
						x = font;
						font = '10px sans-serif';
					}
					if(!isNumber(width)){
						stroke = fill;
						fill = width;
						width = 'auto';
					}
				}
				this._font = this._parseFont(font);
				this._genFont();
				this._x = x;
				this._y = y;
				this._width = width;
				this._processStyle(fill, stroke, context.context);
			}
			this._genLines();
		},

		// параметры
		text : function(v){
			if(v === undefined) return this._text;
			this._text = v;
			this._genLines();
			return this.update();
		},
		x : Text.prototype.x,
		y : Text.prototype.y,
		font : Text.prototype.font,
		_setFont : Text.prototype._setFont,
		_genFont : function(){
			var str = '',
				font = this._font;
			font.italic
				&& (str += 'italic ');
			font.bold
				&& (str += 'bold ');
			this._style.font = str + (font.size || 10) + 'px ' + (font.family || 'sans-serif');
			return this._genLines().update();
		},
		_parseFont : Text.prototype._parseFont,
		family : Text.prototype.family,
		size : Text.prototype.size,
		bold : Text.prototype.bold,
		italic : Text.prototype.italic,
		align : function(align){
			if(align === undefined)
				return this._style.textAlign;
			this._style.textAlign = align;
			var w = this.width();
			this._lines.forEach({
				'left' : function(line){ line.x = 0; },
				'center' : function(line){ line.x = w / 2; },
				'right' : function(line){ line.x = w; }
			}[align]);
			return this.update();
		},

		// block parameters
		width : function(v){
			v = this._property('width', v);
			if(v === 'auto'){ // fixme
				v = 0;
				var ctx = this.context.context;
				this._applyStyle();
				this._lines.forEach(function(line){
					v = Math.max(ctx.measureText(line.text).width, v);
				});
				ctx.restore();
				return v;
			}
			if(v === this) this._genLines().update();
			return v;
		},
		height : function(){
			return (this._lineHeight || this._font.size) * this._lines.length;
		},
		_genLines : function(){
			var text = this._text,
				lines = this._lines = [],
				size = this._lineHeight || this._font.size || 10,
				ctx = this.context.context,
				width = this._width === 'auto' ? Infinity : this._width,
				countline = 1,
				align = this._style.textAlign,
				x = (align === 'center') ? (width/2) : ((width === 'right') ? width : 0);

			this._applyStyle();

			text.split('\n').forEach(function(line){
				if(ctx.measureText(line).width > width){ // нужно ли разбивать строку на строки
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
		lineHeight : function(height){
			if(height === undefined)
				return this._lineHeight === undefined ? this._font.size : this._lineHeight;
			if(height === false)
				height = this._font.size;
			this._lineHeight = height;
			this._lines.forEach(function(line){
				line.y = height * line.count;
			});
			return this.update();
		},
		limit : function(v){
			return this._property('value', v);
		},


		isPointIn : Text.prototype.isPointIn,
		bounds : function(){
			return new Bounds( this._x, this._y, this.width(), this.height() );
		},
		draw : function(ctx){
			var fill = this._style.fillStyle ? ctx.fillText.bind(ctx) : emptyFunc,
				stroke = this._style.strokeStyle ? ctx.strokeText.bind(ctx) : emptyFunc,
				x = this._x,
				y = this._y,
				i, l, line;

			if(!this._visible)
				return;
			this._applyStyle();

			for(i = 0, l = Math.min(this._lines.length, this._limit); i < l; i++){
				line = this._lines[i];
				fill(line.text, x + line.x, y + line.y);
				stroke(line.text, x + line.x, y + line.y);
			}

			ctx.restore();

		},

		_limit : Infinity,
		_lineHeight : null
	});


	$.Gradient = Gradient = new Class({

		initialize : function(type, colors, from, to, context){
			if(isHash(type)){
				this._type = type.type || 'linear';
				this._colors = isArray(type.colors) ? this._parseColors(type.colors) : type.colors;

				this._from = type.from || [];
				this._to = type.to || [];

				// radial
				if(type.center){
					this._to[0] = type.center[0]; // TODO: distance
					this._to[1] = type.center[1];
				}

				if(type.hilite){
					this._from[0] = this._to[0] + type.hilite[0];
					this._from[1] = this._to[1] + type.hilite[1];
				}
				else if(!type.from){
					this._from[0] = this._to[0];
					this._from[1] = this._to[1];
				}

				if(isNumber(type.radius))
					this._to[2] = _.distance(type.radius);
				else if(isArray(type.radius))
					this._to[2] = Math.round(Math.sqrt( Math.pow(this._to[0] - type.radius[0], 2) + Math.pow(this._to[1] - type.radius[1], 2) ));
				
				if(isNumber(type.startRadius))
					this._from[2] = _.distance(type.startRadius);
				else if(isArray(type.startRadius))
					this._from[2] = Math.round(Math.sqrt( Math.pow(this._to[0] - type.startRadius[0], 2) + Math.pow(this._to[1] - type.startRadius[1], 2) ));
			}
			else {
				if(to === undefined){
					to = from;
					from = colors;
					colors = type;
					type = 'linear';
				}
				this._type = type || 'linear';
				this._colors = isArray(colors) ? this._parseColors(colors) : colors;
				this._from = from;
				this._to = to;
			}
			this.context = context;
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
					return _.interpolate( _.color(stops[last]), _.color(stops[keys[i]]), (t - parseFloat(last)) / (parseFloat(keys[i]) - parseFloat(last)) );
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

		// general
		from : function(x,y,r){
			if(isString(x) && x in _.corners){
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
			if(isString(x) && x in _.corners){
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

		// radial
		radius : function(radius, y){
			if(radius === undefined)
				return this._to[2];

			if(y !== undefined)
				radius = [radius, y];

			if(!isNumber(radius)){
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

			if(!isNumber(radius)){
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
			if(isString(from)){
				if(/^\d+(px|pt)?/.test(from))
					this._from = from = _.distance(from);
				else
					from = element.corner(from);
			}
			if(isString(to)){
				if(/^\d+(px|pt)?/.test(to))
					this._to = to = _.distance(to);
				else
					to = element.corner(to);
			}

			// TODO: add {x:10, y:10, from:'left'}
			// it's not a string :)

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


	$.Pattern = Pattern = new Class({

		initialize : function(image, repeat, context){
			this._repeat = (!!repeat === repeat ? (repeat ? 'repeat' : 'no-repeat') : (isString(repeat) ? 'repeat-' + repeat : 'repeat'));

			if(image instanceof Image)
				this._image = image;

			else if(isString(image)){
				if(image[0] === '#')
					this._image = document.getElementById(image.substr(1));
				else
					this._image = new Image(),
					this._image.src = image;
			}
			this._image.onload = this.update.bind(this);

			this.context = context;
		},

		// параметры
		repeat : function(repeat){
			if(repeat === undefined)
				return {
					'repeat' : true,
					'no-repeat' : false,
					'repeat-x' : 'x',
					'repeat-y' : 'y'
				}[this._repeat];
			this._repeat = (!!repeat === repeat ? (repeat ? 'repeat' : 'no-repeat') : (isString(repeat) ? 'repeat-' + repeat : 'repeat'));
			return this.update();
		},

		// отрисовка
		update : Gradient.prototype.update,
		toCanvasStyle : function(context){
			return context.createPattern(this._image, this._repeat);
		}


	});


	// Mootools :) partially
	$.easing = {
		linear : function(x){ return x; },
		half : function(x){ return Math.sqrt(x); },
		pow : function(t, v){
			return Math.pow(t, v || 6);
		},
		expo : function(t, v){
			return Math.pow(v || 2, 8 * (t-1));
		},
		circ : function(t){
			return 1 - Math.sin(Math.acos(t));
		},
		sine : function(t){
			return 1 - Math.cos(t * Math.PI / 2);
		},
		back : function(t, v){
			v = v || 1.618;
			return Math.pow(t, 2) * ((v + 1) * t - v);
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
		$.easing[i + 'Out'] = function(t){
			return 1 - func(1 - t);
		};
		$.easing[i + 'InOut'] = function(t){
			return t <= 0.5 ? func(2 * t) / 2 : (2 - func(2 * (1 - t))) / 2;
		};
	}

	for(var i in $.easing){
		// don't make functions within a loop
		if(Object.prototype.hasOwnProperty.call($.easing, i))
			processEasing($.easing[i]);
	}



	function Bounds(x,y,w,h){
		this.x = this.x1 = x;
		this.y = this.y1 = y;
		this.w = this.width  = w;
		this.h = this.height = h;
		this.x2 = x + w;
		this.y2 = y + h;
		this.cx = x + w / 2;
		this.cy = y + h / 2;
	}



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

	$.Class = Class;


	function extend(a,b){
		for(var i in b){
			if(Object.prototype.hasOwnProperty.call(b,i))
				a[i] = b[i];
		}
		return a;
	}

	// typeofs
	function isString(a){
		return toString.call(a) == '[object String]';
	}
	function isArray(a) {
		return toString.call(a) == '[object Array]';
	}
	function isHash(a){
//		try {
//			JSON.stringify(a); // only hashes
			return toString.call(a) == '[object Object]';
//		}
//		catch(e){
//			return false;
//		}
	}
	function isNumber(value){
		if(toString.call(value) == '[object Number]')
			return true;
		if( isString(value) && /^(\d+|(\d+)?\.\d+)(em|ex|ch|rem|vw|vh|vmin|vmax|cm|mm|in|px|pt|pc)?$/.test(value) )
			return true;
		return false;
	}
//	function isPoint(a){
//		return isNumber(a) || typeof a == 'object';
//	}

	_.has = Function.prototype.call.bind(Object.prototype.hasOwnProperty);
	_.Bounds = Bounds;
	_.extend = extend;
	_.isString = isString;
	_.isArray = isArray;
	_.isHash = isHash;
	_.isNumber = isNumber;

	// constants

	_.dashes = {
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

	_.reg = {
//		decimal : /^\d*\.\d+$/,
//		distance : /^\d*(\.\d*)?(em|ex|ch|rem|vw|vh|vmin|vmax|cm|mm|in|px|pt|pc)?$/,
//		number : /^\d*$/,
//		distanceValue : /[^\d]*/
	};

	_.corners = {
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

	_.pathStrFunctions = {
		'M' : 'moveTo',
		'L' : 'lineTo',
		'B' : 'bezierCurveTo',
		'Q' : 'quadraticCurveTo',
		'R' : 'rect',
		'A' : 'arc'
	};

	_.colors = { // http://www.w3.org/TR/css3-color/#svg-color
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
	_.move = function(from, to){ // moves an element of array
		// TODO: use splice?
		if(from < to) to++;
		var first = this.slice(0,to),
			last  = this.slice(to),
			res = first.concat([this[from]]).concat(last);
		if(from > to) from++;
		first = res.slice(0,from);
		last  = res.slice(from+1);
		return first.concat(last);
	};

	_.multiply = function(m1, m2){ // multiplies two matrices
		return [
			m1[0] * m2[0] + m1[2] * m2[1],
			m1[1] * m2[0] + m1[3] * m2[1],
			m1[0] * m2[2] + m1[2] * m2[3],
			m1[1] * m2[2] + m1[3] * m2[3],
			m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
			m1[1] * m2[4] + m1[3] * m2[5] + m1[5]
		];
	};

	_.interpolate = function(from, to, t){ // for example: interpolate(0, 5, 0.5) => 2.5
		return from + (to - from) * t;
	};

	_.transformPoint = function(x,y, m){
		return [x * m[0] + y * m[2] + m[4], x * m[1] + y * m[3] + m[5]];
	};

	// DOM
	_.coordsOfElement = function(element){ // returns coords of a DOM element

		var box = element.getBoundingClientRect(),
			style = window.getComputedStyle(element);

		return {
			x: box.left + parseInt(style.borderLeftWidth) + parseInt(style.paddingLeft),
			y: box.top  + parseInt(style.borderTopWidth)  + parseInt(style.paddingTop)
		};

	};

	_.color = function(value){ // parses CSS-like colors (rgba(255,0,0,0.5), green, #f00...)
		if(value === undefined) return;

		var test;
		if(value in _.colors)
			return _.color('#' + _.colors[value]);

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

	_.distanceUnits = 'pt em in cm mm pc ex ch rem v wvh vmin vmax'.split(' ');

	_.distance = function(value){
		if(value === undefined) return;
		if(!value) return 0;
		if(toString.call(value) == '[object Number]') // not isNumber :(
			return value;

		if((value + '').indexOf('px') == (value + '').length-2)
			return parseInt((value + '').replace(/[^\d]*/, ''));

		if(!_.units){
			var div = document.createElement('div');
			document.body.appendChild(div); // FF don't need this :)
			_.units = {};
			_.distanceUnits.forEach(function(unit){
				div.style.width = '1' + unit;
				_.units[unit] = parseFloat(getComputedStyle(div).width);
			});
			document.body.removeChild(div);
		}

		var unit = value.replace(/[\d\.]+?/gi, '');
		value = value.replace(/[^\d\.]+?/gi, '');
		return (_.units[unit] * value)|0;
	};

	// Animation
	_.animTransformConstants = {
		rotate : 0,
		scale : 1,
		scaleX : 1,
		scaleY : 1,
		skew : 0,
		skewX : 0,
		skewY : 0,
		translate : 0,
		translateX : 0,
		translateY : 0
	};

	// TODO: move animation to a new file;
	// TODO: move the path utils to the path file

	// Path
	_.pathFunctions = {
		moveTo: { name:'moveTo', params:['x','y'] },
		lineTo: { name:'lineTo', params:['x','y'] },
		quadraticCurveTo: { name:'quadraticCurveTo', params:['hx','hy', 'x','y'] },
		bezierCurveTo: { name:'bezierCurveTo', params:['h1x','h1y', 'h2x','h2y', 'x','y'] },
		closePath: { name:'closePath', params:[] }
	};
	var proto = {
		arguments : function(value){
			if(value === undefined)
				return this._arguments;
			if(arguments.length > 1)
				value = Array.prototype.slice.call(arguments);

			this._arguments = value;
			for(var i = 0; i < this.base.params.length;i++)
				this[this.base.params[i]] = value[i];
			this.update();
			return this;
		},
		set : function(name, value){
			var index = this.base.params.indexOf(name);
			this._arguments[index] = value;
			this[name] = value;
			this.update();
			return this;
		},
		process : function(ctx){
			ctx[this.name].apply(ctx, this._arguments);
		}
	};

	for(var cm in _.pathFunctions){
		if(Object.prototype.hasOwnProperty.call(_.pathFunctions, cm)){
			var cur = _.pathFunctions[cm];
			_.pathFunctions[cm] = function(numbers, curves, path){
				this.name = this.base.name;
				this._arguments = numbers;
				this.update = path.update.bind(path);
				for(var i = 0; i < this.base.params.length;i++)
					this[this.base.params[i]] = numbers[i];
			};
			_.pathFunctions[cm].prototype = extend({
				base: cur
			}, proto);
		}
	}
	// It's not real SVG!
	_.svgFunctions = { M:'moveTo', L:'lineTo', C:'bezierCurveTo', Q:'quadraticCurveTo', Z:'closePath',
		m:'moveTo', l:'lineTo', c:'bezierCurveTo', q:'quadraticCurveTo', z:'closePath' };
	_.svgPathLengths = { M:2, L:2, C:6, Q:4, Z:0, m:2, l:2, c:6, q:4, z:0 };

	_.transformFunctions = {
		scale : function(x, y){
			if(isArray(x)){
				y = x[1];
				x = x[0];
			}
			if(y === undefined)
				y = x;
			return [x, 0, 0, y, 0, 0];
		},
		rotate : function(angle, unit){
			if(unit !== 'rad')
				angle = angle * Math.PI / 180;
			return [Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), 0, 0];
		},
		skew : function(x, y){
			if(isArray(x)){
				y = x[1];
				x = x[0];
			}
			if(y === undefined)
				y = x;
			return [1, Math.tan(y * Math.PI / 180), Math.tan(x * Math.PI / 180), 1, 0, 0];
		},
		translate : function(x, y){
			if(isArray(x)){
				y = x[1];
				x = x[0];
			}
			if(y === undefined)
				y = x;
			return [1, 0, 0, 1, x, y];
		}
	};


	$.version = Math.PI / 3.490658503988659;

	$.query = function(query, index, element){
		// TODO: test
		return new Context( isString(query) ? (element || document).querySelectorAll(query)[index || 0] : query.canvas || query );
	};

	$.id = function(id){
		return new Context( document.getElementById(id) );
	};

	$.util = _;

	window.Graphics2D = $;

})(this);