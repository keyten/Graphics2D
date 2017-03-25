/*  Graphics2D Core 1.9.0
 *
 *  Author: Dmitriy Miroshnichenko aka Keyten <ikeyten@gmail.com>
 *  Last edit: 25.03.2017
 *  License: MIT / LGPL
 */

(function(window, undefined){

// The main graphics2D class
var $ = {},

// Classes
	Context,
	Drawable,
	Animation,
	Rect, Circle, Curve, Path, Picture, Raster, Text,
	Gradient, Pattern,

// Local variables
	document = window.document,
	emptyFunc = function(){},
	toString = Object.prototype.toString,
	slice = Array.prototype.slice,
	has = Function.prototype.call.bind(Object.prototype.hasOwnProperty),
	reFloat = /^\d*\.\d+$/,
	reNumberLike = /^(\d+|(\d+)?\.\d+)(em|ex|ch|rem|vw|vh|vmin|vmax|cm|mm|in|px|pt|pc)?$/,
	domurl = window.URL || window.webkitURL || window,

	_ = {},
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

$.renderers = {};

$.renderers['2d'] = {

	// renderer.init(g2dcontext, canvas);
	init: function(delta, canvas){
		delta.context = canvas.getContext('2d');
		delta._cache = {}; // for gradients
	},

	preRedraw: function(ctx, delta){
		ctx.save();
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
		if(delta.matrix){
			ctx.setTransform.apply(ctx, delta.matrix);
		}
	},

	preDraw: function(ctx, delta){
		ctx.save();
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		if(delta.matrix){
			ctx.setTransform.apply(ctx, delta.matrix);
		}
	},

	postDraw: function(ctx){
		ctx.restore();
	},

	// params = [cx, cy, radius]
	drawCircle: function(params, ctx, style, matrix, object){
		this.pre(ctx, style, matrix, object);
		ctx.beginPath();
		ctx.arc(params[0], params[1], Math.abs(params[2]), 0, Math.PI * 2, true);
		this.post(ctx, style);
	},

	// params = [x, y, width, height]
	drawRect: function(params, ctx, style, matrix, object){
		this.pre(ctx, style, matrix, object);
		if(style.fillStyle){
			ctx.fillRect(params[0], params[1], params[2], params[3]);
		}
		if(style.strokeStyle){
			ctx.strokeRect(params[0], params[1], params[2], params[3]);
		}
		ctx.restore();
	},

	drawCircle: function(params, ctx, style, matrix, object){
		this.pre(ctx, style, matrix, object);
		ctx.beginPath();
		ctx.arc(params[0], params[1], params[2], 0, Math.PI * 2, true);
		if(style.fillStyle){
			ctx.fill();
		}
		if(style.strokeStyle){
			ctx.stroke();
		}
		ctx.restore();
	},

	// params is an array of curves
	drawPath: function(params, ctx, style, matrix, object){
		this.pre(ctx, style, matrix, object);
		ctx.beginPath();
		params.forEach(function(curve){
			curve.process(ctx);
		});
		this.post(ctx, style);
	},

	// params = [image, x, y]
	// params = [image, x, y, w, h]
	// params = [image, x, y, w, h, cx, cy, cw, ch]
	drawImage: function(params, ctx, style, matrix, object){
		this.pre(ctx, style, matrix, object);
		switch(params.length){
			// with size
			case 5: {
				ctx.drawImage(params[0], params[1], params[2], params[3], params[4]);
			} break;

			// with size & crop
			case 9: {
				ctx.drawImage(
					params[0],
					params[5], params[6],
					params[7], params[8],

					params[1], params[2],
					params[3], params[4]
				);
			} break;

			// without size
			default: {
				ctx.drawImage(params[0], params[1], params[2]);
			} break;
		}
		ctx.restore();
	},

	drawData: function(params, ctx, style, matrix, object){
		ctx.putImageData(params[0], params[1], params[2]);
	},

	// params = [text, x, y]
	drawTextLines: function(params, ctx, style, matrix, object){
		this.pre(ctx, style, matrix, object);
		var func;
		if(style.fillStyle && !style.strokeStyle){
			func = function(line){
				ctx.fillText(line.text, params[1], params[2] + line.y);
			};
		} else if(style.fillStyle){
			func = function(line){
				ctx.fillText(line.text, params[1], params[2] + line.y);
				ctx.strokeText(line.text, params[1], params[2] + line.y);
			};
		} else {
			func = function(line){
				ctx.strokeText(line.text, params[1], params[2] + line.y);
			};
		}
		params[0].forEach(func);
		ctx.restore();
	},

	makeGradient: function(delta, type, from, to, colors){
		if(delta.useCache){
			var hash = this.hashGradient(type, from, to, colors);
			if(delta._cache[hash]){
				return delta._cache[hash];
			}
		}

		var grad;
		if(type === 'linear'){
			grad = delta.context.createLinearGradient(from[0], from[1], to[0], to[1]);
		} else {
			grad = delta.context.createRadialGradient(from[0], from[1], from[2], to[0], to[1], to[2]);
		}

		Object.keys(colors).forEach(function(offset){
			grad.addColorStop(offset, colors[offset]);
		});

		if(delta.useCache){
			delta._cache[hash] = grad;
		}

		return grad;
	},

	// with caching works in chromes worser
	hashGradient: function(type, from, to, colors){
		var hash;
		colors = JSON.stringify(colors);

		if(type === 'linear'){
			if(from[0] === to[0]){
				hash = ['ver', from[1], to[1], colors];
			} else if(from[1] === to[1]){
				hash = ['hor', from[0], to[0], colors];
			} else {
				hash = [from[0], from[1], to[0], to[1], colors]
			}
		} else {
			hash = [
				from[0], from[1], from[2],
				to[0], to[1], to[2],
				colors
			];
		}

		return hash.join(';');
	},

	pre: function(ctx, style, matrix, object){
		ctx.save();

		// styles
		Object.keys(style).forEach(function(key){
			ctx[key] = style[key];
		});

		if(style.fillStyle && style.fillStyle.toCanvasStyle){
			ctx.fillStyle = style.fillStyle.toCanvasStyle(ctx, object)
		}
		if(style.strokeStyle && style.strokeStyle.toCanvasStyle){
			ctx.strokeStyle = style.strokeStyle.toCanvasStyle(ctx, object);
		}

		if(style.lineDash){
			if(ctx.setLineDash){ // webkit
				ctx.setLineDash(style.lineDash);
			} else {
				ctx.mozDash = style.lineDash;
			}
		}

		// clip
		if(object.attrs.clip){
			if(object.attrs.clip.matrix){
				ctx.save();
				ctx.transform.apply(ctx, object.attrs.clip.matrix);
				object.attrs.clip.processPath(ctx);
				ctx.restore();
			} else {
				object.attrs.clip.processPath(ctx);
			}
			ctx.clip();
		}

		if(matrix){
			ctx.transform(
				matrix[0], matrix[1], matrix[2],
				matrix[3], matrix[4], matrix[5]
			);
		}
	},

	post: function(ctx, style){
		if(style.fillStyle){
			ctx.fill();
		}
		if(style.strokeStyle){
			ctx.stroke();
		}
		ctx.restore();
	},

	// text
	_currentMeasureContext: null,
	preMeasure: function(font){
		this._currentMeasureContext = getTemporaryCanvas(1, 1).getContext('2d');
		this._currentMeasureContext.save();
		this._currentMeasureContext.font = font;
	},
	measure: function(text){
		return this._currentMeasureContext.measureText(text).width;
	},
	postMeasure: function(){
		this._currentMeasureContext.restore();
		this._currentMeasureContext = null;
	}
};

var Context;

Context = function(canvas, renderer){
	this.canvas    = canvas;
	this.elements  = [];
	this.listeners = {};
	this.renderer = $.renderers[renderer || '2d'];
	this.renderer.init(this, canvas);

	this.updateNowBounded = this.updateNow.bind(this);
};

Context.prototype = {

	// Elements
	object: function(object){
		return this.push(Object.assign(new Drawable(), object));
	},

	rect: function(){
		return this.push(new Rect(arguments, this));
	},

	circle: function(){
		return this.push(new Circle(arguments, this));
	},

	path: function(){
		return this.push(new Path(arguments, this));
	},

	image: function(){
		return this.push(new Picture(arguments, this));
	},

	raster: function(){
		return this.push(new Raster(arguments, this));
	},

	text: function(){
		return this.push(new Text(arguments, this));
	},

	// Path slices
	line: function(fx, fy, tx, ty, stroke){
		return this.path([[fx, fy], [tx, ty]], null, stroke);
	},

	quadratic : function(fx, fy, tx, ty, hx, hy, stroke){
		return this.path([[fx, fy], [tx, ty, hx, hy]], null, stroke);
	},

	bezier : function(fx, fy, tx, ty, h1x, h1y, h2x, h2y, stroke){
		return this.path([[fx, fy], [tx, ty, h1x, h1y, h2x, h2y]], null, stroke);
	},

	arcTo : function(fx, fy, tx, ty, radius, clockwise, stroke){
		return this.path([[fx, fy], ['arcTo', fx, fy, tx, ty, radius, clockwise]], null, stroke);
	},

	// Fills
	useCache: false,
	gradient : function(type, colors, from, to){
		return new Gradient(type, colors, from, to, this);
	},

	pattern : function(image, repeat){
		return new Pattern(image, repeat, this);
	},

	// Methods
	push : function(element){
		element.context = this;
		this.elements.push(element);

		if(element.draw){
			this.renderer.preDraw(this.context, this);
			element.draw(this.context);
			this.renderer.postDraw(this.context);
		}

		return element;
	},

	update : function(){
		if(this._willUpdate){
			return;
		}

		this._willUpdate = true;
		requestAnimationFrame(this.updateNowBounded);
	},

	updateNow : function(){
		var ctx = this.context;
		this.renderer.preRedraw(ctx, this);
		this.elements.forEach(function(object){
			object.draw(ctx);
		});
		this.renderer.postDraw(ctx);
		this._willUpdate = false;
	},

	getObjectInPoint : function(x, y, mouse){
		var elements = this.elements,
			i = elements.length;

		while(i--){
		// mouse=true : ignore elements with interaction = false
			if( elements[i].isPointIn && elements[i].isPointIn(x,y) &&
				(elements[i].attrs.interaction || !mouse) ){
				return elements[i];
			}
		}
		return null;
	},

	each : function(func){
		// todo: wrap
		this.elements.forEach(func, this);
		return this;
	},

	// Events
	hoverElement : null,
	focusElement : null,

	listener : function(event){
		if(this.listeners[event]){
			return this.listeners[event];
		}

		this.listeners[event] = [];

		if(this.eventsHooks.hasOwnProperty(event)){
			this.eventsHooks[event].call(this, event);
		}

		if(this.eventsInteract.indexOf(event) === -1){
			return this.listeners[event];
		}

		this.canvas.addEventListener(event, function(e){
			var propagation = true;

			e.cancelContextPropagation = function(){
				propagation = false;
			};

			if(event === 'mouseout'){
				e.targetObject = this.hoverElement;
				this.hoverElement = null;

				var coords = this.contextCoords(e.clientX, e.clientY);
				e.contextX = coords[0];
				e.contextY = coords[1];

				if(e.targetObject && e.targetObject.fire){
					if(!e.targetObject.fire('mouseout', e)){
						e.stopPropagation();
						e.preventDefault();
					}
				}
			} else {
				// negative contextX / contextY when canvas has a border
				// not a bug, it's a feature :)
				if(+e.clientX === e.clientX){
					this._processPointParams(e, event, e);
				}
				['touch', 'changedTouches', 'targetTouches'].forEach(function(prop){
					if(e[prop]){
						Array.prototype.forEach.call(e.touches, function(touch){
							this._processPointParams(touch, event, e);
						}, this);
					}
				}, this);
			}

			if(propagation){
				this.fire(event, e);
			}
		}.bind(this));

		return this.listeners[event];
	},

	_processPointParams: function(point, name, event){
		var coords = this.contextCoords(point.clientX, point.clientY);
		point.contextX = coords[0];
		point.contextY = coords[1];

		point.targetObject = this.getObjectInPoint(point.contextX, point.contextY, true);
		if(point.targetObject && point.targetObject.fire){
			if(!point.targetObject.fire(name, event)){
				event.stopPropagation();
				event.preventDefault();
			}
		}
	},

	eventsInteract: [
		// mouse
		'click',
		'dblclick',
		'mousedown',
		'mouseup',
		'mousemove',
		'mouseover',
		'mouseout',
		'mouseenter',
		'mouseleave',
		'mousewheel',
		'blur',
		'focus',
		// keyboard
		'keypress',
		'keydown',
		'keyup',
		// touch
		'touchstart',
		'touchmove',
		'touchend',
		'touchcancel',
		// pointer
		'pointerover',
		'pointerenter',
		'pointerdown',
		'pointermove',
		'pointerup',
		'pointercancel',
		'pointerout',
		'pointerleave',
		// check:
		'gotpointercapture',
		'lostpointercapture'
	],

	eventsHooks : {
		mouseover : function(){
			if(!this.listeners['mouseout']){
				this.listenerSpecial('mouseover', 'mouseout', 'hover', 'mousemove');
				this.listener('mouseout');
			}
		},
		mouseout: function(){
			if(!this.listeners['mouseover']){
				this.listenerSpecial('mouseover', 'mouseout', 'hover', 'mousemove');
				this.listener('mouseover');
			}
		},
		focus : function(){
			if(!this.listeners['blur']){
				this.listenerSpecial('focus', 'blur', 'focus', 'mousedown');
				this.listener('blur');
			}
		},
		blur: function(){
			if(!this.listeners['focus']){
				this.listenerSpecial('focus', 'blur', 'focus', 'mousedown');
				this.listener('focus');
			}
		}
	},

	// for mouseover/mouseout and focus/blur
	listenerSpecial : function(over, out, name, baseevent){
		// mouseover, mouseout, hover, mousemove
		// focus, blur, focus, mousedown
		name += 'Element';
		this.on(baseevent, function(e){
			var current = e.targetObject,
				last = this[name];

			if(last != current){
				if(last && last.fire){
					e.targetObject = last;
					last.fire(out, e);
				}
				if(current && current.fire){
					// it is not good to change event object
					// make special class for event obs?
					// e.originalEvent and etc
					e.targetObject = current;
					current.fire(over, e);
				}
				this[name] = current;
			}
		});
		return this;
	},

	on : function(event, callback){
		if(event + '' !== event){
			for(var key in event) if(has(event, key)){
				this.on(key, event[key]);
			}
			return this;
		}

		(this.listeners[event] || this.listener(event)).push(callback);
		return this;
	},

	off : function(event, callback){
		if(!callback){
			this.listeners[event] = [];
		}

		this.listeners[event].splice(this.listeners[event].indexOf(callback), 1);
		return this;
	},

	fire : function(event, data){
		if(!this.listeners[event]){
			return this;
		}

		this.listeners[event].forEach(function(callback){
			callback.call(this, data);
		}, this);
		return this;
	},

	// translates screen coords to context coords
	contextCoords: function(x, y){
		var coords = $.coordsOfElement(this.canvas);
		return [x - coords.x, y - coords.y];
	},

	// Transforms
	matrix: null,
	transform: function(a, b, c, d, e, f, pivot){
		if(a === null){
			this.matrix = null;
			return this.update();
		}

		if(pivot){
			if(pivot + '' === pivot){
				pivot = $.corners[pivot];
				pivot = [pivot[0] * this.canvas.width, pivot[1] * this.canvas.height];
			}

			e = e - a * pivot[0] + pivot[0] - c * pivot[1];
			f = f - b * pivot[0] - d * pivot[1] + pivot[1];
		}

		this.matrix = $.transform(this.matrix || [1, 0, 0, 1, 0, 0], [a, b, c, d, e, f]);
		return this.update();
	},

	translate: function(x, y){
		return this.transform(
			1, 0,
			0, 1,
			x, y
		);
	},

	rotate: function(angle, pivot){
		angle = angle / 180 * Math.PI;
		return this.transform(
			Math.cos(angle), Math.sin(angle),
			-Math.sin(angle), Math.cos(angle),
			0, 0,

			pivot
		);
	},

	scale: function(x, y, pivot){
		if(y === undefined || isPivot(y)){
			pivot = y;
			y = x;
		}
		return this.transform(
			x, 0,
			0, y,
			0, 0,

			pivot
		);
	},

	skew: function(x, y, pivot){
		if(y === undefined || isPivot(y)){
			pivot = y;
			y = x;
		}
		return this.transform(
			1, Math.tan(y * Math.PI / 180),
			Math.tan(x * Math.PI / 180), 1,
			0, 0,

			pivot
		);
	}
};

$.Context = Context;

var temporaryCanvas;

function getTemporaryCanvas(width, height){
	if(!temporaryCanvas){
		temporaryCanvas = document.createElement('canvas');
	}
	temporaryCanvas.width = width;
	temporaryCanvas.height = height;
	return temporaryCanvas;
}

Drawable = new Class({

	initialize: function(args){
		this.listeners = {};
		this.styles = {};
		this.attrs = {
			interaction: true
		};
	},

	_visible: true,

	update: function(){
		if(this.context){
			this.context.update();
		}
		return this;
	},

	z : function(z){
		if(z === undefined){
			return this.context.elements.indexOf(this);
		}
		if(z === 'top'){
			z = this.context.elements.length;
		}
		this.context.elements.splice(this.context.elements.indexOf(this), 1);
		this.context.elements.splice(z, 0, this);
		return this.update();
	},

	clone : function(attrs, styles, events){
		// todo: test on every obj
		var clone = new this.constructor([], this.context);

		if(attrs === false){
			clone.attrs = this.attrs;
		} else {
			clone.attrs = Object.assign({}, this.attrs);
		}

		if(styles === false){
			clone.styles = this.styles;
			clone.matrix = this.matrix;
		} else {
			clone.styles = Object.assign({}, this.styles); // how about deep extend? check
			// must gradients be cloned?
			if(this.matrix){
				clone.matrix = this.matrix.slice();
			}
		}

		if(events === false){
			clone.listeners = this.listeners;
		} else {
			clone.listeners = Object.assign({}, this.listeners);
		}

		return this.context.push(clone);
	},

	remove : function(){
		this.context.elements.splice(this.context.elements.indexOf(this), 1);
		this.update();
		this.context = null;
		return this;
	},

	hide: function(){
		this._visible = false;
		return this.update();
	},

	show: function(){
		this._visible = true;
		return this.update();
	},

	// Attributes
	attr: function(name, value){
		if(name + '' !== name){
			Object.keys(name).forEach(function(key){
				this.attr(key, name[key]);
			}, this);
			return this;
		}

		if(value === undefined){
			// todo: check the fastest check of property
			// ...[name] or name in or hasOwnProperty
			if(this.attrHooks[name] && this.attrHooks[name].get){
				return this.attrHooks[name].get.call(this);
			}
			return this.attrs[name];
		}

		if(this.attrHooks[name] && this.attrHooks[name].set){
			var result = this.attrHooks[name].set.call(this, value);
			if(result !== null){
				this.attrs[name] = result === undefined ? value : result;
			}
		} else {
			this.attrs[name] = value;
		}

		return this;
	},

	attrHooks: {
		fill: {
			get: function(){
				return this.styles.fillStyle;
			},
			set: function(value){
				// if(oldValue is gradient) oldValue.unbind(this);
				this.styles.fillStyle = value;
				this.update();
			}
		},

		stroke: {
			set: function(value){
				Drawable.processStroke(value, this.styles);
				this.update();
			}
		},

		shadow: {
			set: function(value){
				Drawable.processShadow(value, this.styles);
				this.update();
			}
		},

		opacity: {
			get: function(){
				return this.styles.globalAlpha !== undefined ? this.styles.globalAlpha : 1;
			},
			set: function(value){
				this.styles.globalAlpha = +value;
				this.update();
			}
		},

		composite: {
			get: function(){
				return this.styles.globalCompositeOperation;
			},
			set: function(value){
				this.styles.globalCompositeOperation = value;
				this.update();
			}
		},

		clip: {
			set: function(value){
				value.context = this.context;
				this.attrs.clip = value;
				this.update();
			}
		}
	},

	processObject: function(object, arglist){
		if(has(object, 'opacity')){
			this.styles.globalAlpha = object.opacity;
		}
		if(has(object, 'composite')){
			this.styles.globalCompositeOperation = object.composite;
		}
		if(has(object, 'clip')){
			object.clip.context = this.context;
			this.attrs.clip = object.clip;
		}

		return arglist.map(function(name){
			return object[name];
		});
	},

	// Bounds
	bounds : function(options){
		if(!this.shapeBounds){
			throw ('The object doesn\'t have shapeBounds method.');
		}

		options = Object.assign({
			transform: 'normalized',
			around: 'fill'
		}, options);

		var b = Array.isArray(this.shapeBounds) ? this.shapeBounds : this.shapeBounds();

		// around
		if(options.around !== 'fill' && this.styles.strokeStyle){
			var weight = (this.styles.lineWidth || 1) / 2;
			if(options.around === 'exclude'){
				weight = -weight;
			}
			b[0] -= weight;
			b[1] -= weight;
			b[2] += weight * 2;
			b[3] += weight * 2;
		}

		var lt = [b[0], b[1]],
			rt = [b[0] + b[2], b[1]],
			lb = [b[0], b[1] + b[3]],
			rb = [rt[0], lb[1]];

		// transform
		if(options.transform !== 'ignore'){
			var matrix = this.matrix;

			if(matrix){
				lt[0] = [
					lt[0] * matrix[0] + lt[1] * matrix[2] + matrix[4],
					lt[1] =
						lt[0] * matrix[1] + lt[1] * matrix[3] + matrix[5]
				][0];

				rt[0] = [
					rt[0] * matrix[0] + rt[1] * matrix[2] + matrix[4],
					rt[1] =
						rt[0] * matrix[1] + rt[1] * matrix[3] + matrix[5]
				][0];

				lb[0] = [
					lb[0] * matrix[0] + lb[1] * matrix[2] + matrix[4],
					lb[1] =
						lb[0] * matrix[1] + lb[1] * matrix[3] + matrix[5]
				][0];

				rb[0] = [
					rb[0] * matrix[0] + rb[1] * matrix[2] + matrix[4],
					rb[1] =
						rb[0] * matrix[1] + rb[1] * matrix[3] + matrix[5]
				][0];
			}

			if(options.transform === 'transformed'){
				return {
					lt: lt,
					rt: rt,
					lb: lb,
					rb: rb
				};
			}

			var minX = Math.min(lt[0], lb[0], rt[0], rb[0]),
				minY = Math.min(lt[1], lb[1], rt[1], rb[1]);

			return new Bounds(
				minX,
				minY,
				Math.max(lt[0], lb[0], rt[0], rb[0]) - minX,
				Math.max(lt[1], lb[1], rt[1], rb[1]) - minY
			);
		}

		// options.transform - 3 possible values (transformed boundbox, normalized boundbox (maximize transformed vertices), ignore transforms)
		// options.around = 'fill' or 'stroke' or 'exclude' (stroke)
		// maybe, options.processClip = true or false
		return new Bounds(b[0], b[1], b[2], b[3]);
	},

	corner : function(corner, options){
		if(Array.isArray(corner)){
			return corner;
		}

		var bounds = this.bounds(options);
		return [
			bounds.x + bounds.w * $.corners[corner][0],
			bounds.y + bounds.h * $.corners[corner][1]
		];
	},

	// Events
	on : function(event, callback){
		if(event + '' !== event){
			for(var key in event) if(has(event, key)){
				this.on(key, event[key]);
			}
		}

		if(callback + '' === callback){
			// todo: slice.call(arguments, 1)
			callback = wrap(arguments);
		}

		this.context.listener(event);
		(this.listeners[event] || (this.listeners[event] = [])).push(callback);
		return this;
	},

	off : function(event, callback){
		if(!event){
			this.listeners = {};
			return this;
		}
		if(!callback){
			this.listeners[event] = null;
			return this;
		}

		this.listeners[event].splice(this.listeners[event].indexOf(callback), 1);

		return this;
	},

	fire : function(event, data){
		(this.listeners[event] || []).forEach(function(callback){
			callback.call(this, data);
		}, this);
		return this;
	},

	// Transforms
	transform: function(a, b, c, d, e, f, pivot){
		if(a === null){
			this.matrix = null;
		} else {
			if(pivot){
				pivot = this.corner(pivot, {transform: 'ignore'});
				e = pivot[0] + e - a * pivot[0] - c * pivot[1];
				f = pivot[1] + f - b * pivot[0] - d * pivot[1];
			}
			this.matrix = $.transform(this.matrix || [1, 0, 0, 1, 0, 0], [a, b, c, d, e, f]);
		}
		return this.update();
	},

	translate: function(x, y){
		return this.transform(
			1, 0,
			0, 1,
			x, y
		);
	},

	rotate: function(angle, pivot){
		angle = angle / 180 * Math.PI;
		return this.transform(
			Math.cos(angle), Math.sin(angle),
			-Math.sin(angle), Math.cos(angle),
			0, 0,

			pivot || 'center'
		);
	},

	scale: function(x, y, pivot){
		if(y === undefined){
			y = x;
		}
		return this.transform(
			x, 0,
			0, y,
			0, 0,

			pivot || 'center'
		);
	},

	skew: function(x, y, pivot){
		if(y === undefined){
			y = x;
		}
		return this.transform(
			1, Math.tan(y),
			Math.tan(x), 1,
			0, 0,

			pivot || 'center'
		);
	},

	// Rasterization
	toDataURL: function(type, bounds){
		if(bounds === undefined){
			if(typeof this.bounds === 'function'){
				bounds = this.bounds();
			} else {
				throw 'Object #' + this.z() + ' can\'t be rasterized: need the bounds.';
			}
		}

		if(type === undefined){
			type = 'image/png';
		} else if(type in $.fileTypes){
			type = $.fileTypes[type];
		}

		// todo: other renderers support
		var canvas = getTemporaryCanvas(bounds.width, bounds.height),
			context = canvas.getContext('2d');

		context.setTransform(1, 0, 0, 1, -bounds.x, -bounds.y);
		this.draw(context);
		return canvas.toDataURL(type.type || type, type.quality || 1);
	},

	toImageData: function(bounds){
		if(bounds === undefined){
			if(typeof this.bounds === 'function'){
				bounds = this.bounds();
			} else {
				throw 'Object #' + this.z() + ' can\'t be rasterized: need the bounds.';
			}
		}

		var canvas = getTemporaryCanvas(bounds.width, bounds.height),
			context = canvas.getContext('2d');

		context.setTransform(1, 0, 0, 1, -bounds.x, -bounds.y);
		this.draw(context);
		return context.getImageData(0, 0, bounds.width, bounds.height);
	},

	// Animation
	animate: function(attr, value, options){
		// attr, value, duration, easing, callback
		// attrs, duration, easing, callback
		// attr, value, options
		// attrs, options
		if(attr + '' !== attr){
			// todo:
			// the fx ob wiil not represent others
			// object.fx.stop() will stop only one anim
			if(+value === value || !value){
				options = {duration: value, easing: options, callback: arguments[3]};
			} else if(typeof value === 'function'){
				options = {callback: value};
			} else {
				options = value;
			}

			Object.keys(attr).forEach(function(key, i){
				this.animate(key, attr[key], options);
				if(i === 0){
					options.queue = false;
					options.callback = null;
				}
			}, this);
			return this;
		}

		if(!this.attrHooks[attr] || !this.attrHooks[attr].anim){
			throw 'Animation for "' + attr + '" is not supported';
		}

		if(+options === options || !options){
			options = {duration: options, callback: arguments[4], easing: arguments[3]};
		} else if(typeof options === 'function'){
			options = {callback: options};
		}

		var fx = new Animation(
			options.duration,
			options.easing,
			options.callback
		);

		fx.prop = attr;
		fx.tick = this.attrHooks[attr].anim;
		fx.tickContext = this;
		fx.prePlay = function(){
			this.fx = fx;
			this.attrHooks[attr].preAnim.call(this, fx, value);
		}.bind(this);

		// is used to pause / cancel anims
		fx.elem = this;
		if(options.name){
			fx.name = options.name;
		}

		var queue = options.queue;
		if(queue !== false){
			if(queue === true || queue === undefined){
				if(!this._queue){
					this._queue = [];
				}
				queue = this._queue;
			} else if(queue instanceof Drawable){
				queue = queue._queue;
			}
			fx.queue = queue;
			queue.push(fx);
			if(queue.length > 1){
				return this;
			}
		}

		fx.play();

		return this;
	},

	pause: function(name){
		if(!this._paused){
			this._paused = [];
		}

		// pause changes the original array
		// so we need slice
		Animation.queue.slice().forEach(function(anim){
			if(anim.elem === this && (!name || anim.name === name)){
				anim.pause();
				this._paused.push(anim);
			}
		}, this);
		return this;
	},

	continue: function(name){
		if(!this._paused){
			return;
		}

		this._paused.slice().forEach(function(anim, index){
			if(!name || anim.name === name){
				anim.continue();
				this._paused.splice(index, 1);
			}
		}, this);

		return this;
	}

});

Drawable.processStroke = function(stroke, style){
	if(stroke + '' === stroke){
		stroke = stroke.replace(/\s*\,\s*/g, ',').split(' ');

		var opacity, l = stroke.length,
			joinSet = false,
			capSet = false;

		while(l--){
			if(reFloat.test(stroke[l])){
				opacity = parseFloat(stroke[l]);
			} else if(isNumberLike(stroke[l])){
				style.lineWidth = $.distance(stroke[l]);
			} else if(stroke[l] === 'round'){
				if(!joinSet){
					style.lineJoin = 'round';
				}
				if(!capSet){
					style.lineCap = style.lineCap || 'round';
				}
			} else if(stroke[l] === 'miter' || stroke[l] === 'bevel'){
				joinSet = true;
				style.lineJoin = stroke[l];
			} else if(stroke[l] === 'butt' || stroke[l] === 'square'){
				capSet = true;
				style.lineCap = stroke[l];
			} else if(stroke[l][0] === '['){
				style.lineDash = stroke[l].substr(1, stroke[l].length - 2).split(',');
			} else if(stroke[l] in $.dashes){
				style.lineDash = $.dashes[stroke[l]];
			} else {
				style.strokeStyle = stroke[l];
			}
		}
		if(opacity){
			stroke = $.color(style.strokeStyle);
			stroke[3] = opacity;
			style.strokeStyle = 'rgba(' + stroke.join(',') + ')';
		}
	} else {
		if(stroke.color !== undefined){
			style.strokeStyle = stroke.color;
		}
		if(stroke.opacity !== undefined && style.strokeStyle){
			var parsed = $.color(style.strokeStyle);
			parsed[3] = stroke.opacity;
			style.strokeStyle = 'rgba(' + parsed.join(',') + ')';
		}
		if(stroke.width !== undefined){
			style.lineWidth = $.distance(stroke.width);
		}
		if(stroke.join !== undefined){
			style.lineJoin = stroke.join;
		}
		if(stroke.cap !== undefined){
			style.lineCap = stroke.cap;
		}
		if(stroke.dash !== undefined){
			if(stroke.dash in $.dashes){
				style.lineDash = $.dashes[stroke.dash];
			} else {
				style.lineDash = stroke.dash;
			}
		}
	}
};

Drawable.processShadow = function(shadow, style){
	if(shadow + '' === shadow){
		var shadowProps = ['shadowOffsetX', 'shadowOffsetY', 'shadowBlur'];
		shadow = shadow.replace(/\s*\,\s*/g, ',').split(' ');
		for(var i = 0; i < shadow.length; i++){
			if(isNaN(+shadow[i][0])){
				style.shadowColor = shadow[i];
			} else {
				style[shadowProps.shift()] = $.distance(shadow[i]);
			}
		}
	} else {
		if(shadow.x !== undefined){
			style.shadowOffsetX = $.distance(shadow.x);
		}
		if(shadow.y !== undefined){
			style.shadowOffsetY = $.distance(shadow.y);
		}
		if(shadow.blur !== undefined){
			style.shadowBlur = $.distance(shadow.blur || 0);
		}
		if(shadow.color){
			style.shadowColor = shadow.color;
		}
	}
}

$.Drawable = Drawable;

// events aliases
Context.prototype.eventsInteract.forEach(function(eventName){
	Drawable.prototype[eventName] = Context.prototype[eventName] = function(callback){
		return this[
			typeof callback === 'function' || callback + '' === callback ? 'on' : 'fire'
		].apply(this, [eventName].concat(slice.call(arguments)));
	};
});

// var anim = $.animation(300, 500, options);
// anim.start(value => dosmth(value));

Animation = new Class({

	initialize: function(duration, easing, callback){
		this.duration = duration || Animation.default.duration;
		if(easing + '' === easing){
			if(easing.indexOf('(') > -1){
				this.easingParam = +easing.split('(')[1].split(')')[0];
			}
			this.easing = Animation.easing[easing.split('(')[0]];
		} else {
			this.easing = easing || Animation.easing.default;
		}
		this.callback = callback;
	},

	play: function(tick, context){
		if(this.prePlay){
			this.prePlay();
		}
		if(tick){
			this.tick = tick;
		}
		if(context){
			this.tickContext = context;
		}

		this.startTime = Date.now();
		this.endTime = this.startTime + this.duration;
		if(!Animation.queue.length){
			requestAnimationFrame(Animation.do);
		}
		Animation.queue.push(this);
	},

	pause: function(){
		this.pauseTime = Date.now();
		Animation.queue.splice(Animation.queue.indexOf(this), 1);
	},

	continue: function(){
		var delta = this.pauseTime - this.startTime;
		this.startTime = Date.now() - delta;
		this.endTime = this.startTime + this.duration;

		if(!Animation.queue.length){
			requestAnimationFrame(Animation.do);
		}
		Animation.queue.push(this);
	}

});

Animation.queue = [];

Animation.do = function(){
	var fx, t,
		i = 0
		now = Date.now();

	for(var i = 0; i < Animation.queue.length; i++){
		fx = Animation.queue[i];
		t = (now - fx.startTime) / fx.duration;

		if(t < 0){
			continue;
		}

		if(t > 1){
			t = 1;
		}

		fx.now = now;
		fx.pos = fx.easing(t, fx.easingParam);
		fx.tick.call(fx.tickContext, fx);

		if(t === 1){
			if(fx.callback){
				// call him in requestAnimFrame?
				// it must be called after the last update, i think
				fx.callback.call(fx.tickContext, fx);
			}

			if(fx.queue){
				fx.queue.shift();
				if(fx.queue.length){
					// init the next anim in the que
					fx.queue[0].play();
				}
			}
			Animation.queue.splice(Animation.queue.indexOf(fx), 1);
		}
	}

	if(Animation.queue.length){
		requestAnimationFrame(Animation.do);
	}
};

// Some tick functions
Drawable.prototype.attrHooks._num = {
	preAnim: function(fx, endValue){
		fx.startValue = this.attr(fx.prop);
		fx.delta = endValue - fx.startValue;

		if(endValue + '' === endValue){
			if(endValue.indexOf('+=') === 0){
				fx.delta = +endValue.substr(2);
			} else if(endValue.indexOf('-=') === 0){
				fx.delta = -endValue.substr(2);
			}
		}
	},

	anim: function(fx){
		this.attrs[fx.prop] = fx.startValue + fx.delta * fx.pos;
		this.update();
	}
};

Drawable.prototype.attrHooks._numAttr = {
	preAnim: Drawable.prototype.attrHooks._num.preAnim,

	anim: function(fx){
		this.attr(fx.prop, fx.startValue + fx.delta * fx.pos);
	}
};

// Easing functions
Animation.easing = {

	linear: function(x){
		return x;
	},

	// jquery :P
	swing: function(x){
		return 0.5 - Math.cos(x * Math.PI) / 2;
	},

	sqrt: function(x){
		return Math.sqrt(x);
	},

	pow: function(t, v){
		return Math.pow(t, v || 6);
	},

	expo: function(t, v){
		return Math.pow(v || 2, 8 * t - 8);
	},

	circ: function(t){
		return 1 - Math.sin(Math.acos(t));
	},

	sine: function(t){
		return 1 - Math.cos(t * Math.PI / 2);
	},

	back: function(t, v){
		return Math.pow(t, 2) * ((v || 1.618) * (t - 1) + t);
	},

	bounce: function(t){
		for(var a = 0, b = 1; 1; a += b, b /= 2){
			if(t >= (7 - 4 * a) / 11){
				return b * b - Math.pow((11 - 6 * a - 11 * t) / 4, 2);
			}
		}
	},

	elastic: function(t, v){
		return Math.pow(2, 10 * --t) * Math.cos(20 * t * Math.PI * (v || 1) / 3);
	}

};

Animation.easing.default = Animation.easing.swing;

['quad', 'cubic', 'quart', 'quint'].forEach(function(name, i){
	Animation.easing[name] = function(t){
		return Math.pow(t, i + 2);
	};
});

Object.keys(Animation.easing).forEach(function(ease){
	Animation.easing[ease + 'In'] = Animation.easing[ease];
	Animation.easing[ease + 'Out'] = function(t, v){
		return 1 - Animation.easing[ease](1 - t, v);
	};
	Animation.easing[ease + 'InOut'] = function(t, v){
		if(t >= 0.5){
			return Animation.easing[ease](2 * t, v) / 2;
		} else {
			return (2 - Animation.easing[ease](2 * (1 - t), v)) / 2;
		}
	};
});

Animation.default = {
	duration: 500
};

$.animation = function(duration, easing, callback){
	return new Animation(duration, easing, callback);
};

Rect = new Class(Drawable, {

	initialize : function(args, context){
		this.super('initialize', arguments);

		if(isObject(args[0])){
			args = this.processObject(args[0], Rect.args);
		}

		this.attrs.x = args[0];
		this.attrs.y = args[1];
		this.attrs.width = args[2];
		this.attrs.height = args[3];
		if(args[4]){
			this.styles.fillStyle = args[4];
		}
		if(args[5]){
			this.attrs.stroke = args[5];
			Drawable.processStroke(args[5], this.styles);
		}
	},

	attrHooks: extend(Object.assign({}, Drawable.prototype.attrHooks), {
		x: {
			set: function(value){
				this.update();
			}
		},
		y: {
			set: function(value){
				this.update();
			}
		},
		width: {
			set: function(value){
				this.update();
			}
		},
		height: {
			set: function(value){
				this.update();
			}
		},

		x1: {
			get: function(){
				return this.attrs.x;
			},
			set: function(value){
				this.attrs.width += (this.attrs.x - value);
				this.attrs.x = value;
				this.update();
				return null;
			}
		},
		y1: {
			get: function(){
				return this.attrs.y;
			},
			set: function(value){
				this.attrs.height += (this.attrs.y - value);
				this.attrs.y = value;
				this.update();
				return null;
			}
		},
		x2: {
			get: function(){
				return this.attrs.x + this.attrs.width;
			},
			set: function(value){
				this.attrs.width = value - this.attrs.x;
				this.update();
				return null;
			}
		},
		y2: {
			get: function(){
				return this.attrs.y + this.attrs.height;
			},
			set: function(value){
				this.attrs.height = value - this.attrs.y;
				this.update();
				return null;
			}
		}
	}),

	// this variation is faster
	// very very faster!
	// if you change an attrs of 100 000 elements
	// then all x-ses will work in ~ 7 ms
	// all attr-s — in ~ 100 ms
	/* x: function(val){
		if(val === undefined){
			return this.attrs.x;
		}
		this.attrs.x = val;
		return this.update();
	}, */

	shapeBounds : function(){
		return [this.attrs.x, this.attrs.y, this.attrs.width, this.attrs.height];
	},

	draw : function(ctx){
		if(this._visible){
			this.context.renderer.drawRect(
				[this.attrs.x, this.attrs.y, this.attrs.width, this.attrs.height],
				ctx, this.styles, this.matrix, this
			);
		}
	},

	// should apply the inverse of this.matrix to the point (x, y)
	isPointIn : function(x, y){
		return x > this.attrs.x && y > this.attrs.y && x < this.attrs.x + this.attrs.width && y < this.attrs.y + this.attrs.height;
	},

	processPath : function(ctx){
		ctx.beginPath();
		ctx.rect(this.attrs.x, this.attrs.y, this.attrs.width, this.attrs.height);
	}

});

Rect.args = ['x', 'y', 'width', 'height', 'fill', 'stroke'];

['x', 'y', 'width', 'height', 'x1', 'x2', 'y1', 'y2'].forEach(function(propName, i){
	var attr = Drawable.prototype.attrHooks[i > 3 ? '_numAttr' : '_num'];
	Rect.prototype.attrHooks[propName].preAnim = attr.preAnim;
	Rect.prototype.attrHooks[propName].anim = attr.anim;
});

$.rect = function(){
	return new Rect(arguments);
};

$.Rect = Rect;

Circle = new Class(Drawable, {

	initialize : function(args, context){
		this.super('initialize', arguments);

		if(isObject(args[0])){
			args = this.processObject(args[0], Circle.args);
		}

		this.attrs.cx = args[0];
		this.attrs.cy = args[1];
		this.attrs.radius = args[2];
		if(args[3]){
			this.styles.fillStyle = args[3];
		}
		if(args[4]){
			this.attrs.stroke = args[4];
			Drawable.processStroke(args[4], this.styles);
		}
	},

	attrHooks: extend(Object.assign({}, Drawable.prototype.attrHooks), {
		cx: {
			set: function(value){
				this.update();
			}
		},
		cy: {
			set: function(value){
				this.update();
			}
		},
		radius: {
			set: function(value){
				this.update();
			}
		}
	}),

	shapeBounds : function(){
		return [this.attrs.cx - this.attrs.radius, this.attrs.cy - this.attrs.radius, this.attrs.radius * 2, this.attrs.radius * 2];
	},

	draw : function(ctx){
		if(this._visible){
			this.context.renderer.drawCircle(
				[this.attrs.cx, this.attrs.cy, Math.abs(this.attrs.radius)],
				ctx, this.styles, this.matrix, this
			);
		}
	},

	isPointIn : function(x, y){
		return (Math.pow(x - this.attrs.cx, 2) + Math.pow(y - this.attrs.cy, 2)) <= Math.pow(this.attrs.radius, 2);
	},

	processPath: function(ctx){
		ctx.beginPath();
		ctx.arc(this.attrs.cx, this.attrs.cy, Math.abs(this.attrs.radius), 0, Math.PI * 2, true);
	}

});

Circle.args = ['cx', 'cy', 'radius', 'fill', 'stroke'];

['cx', 'cy', 'radius'].forEach(function(propName){
	Circle.prototype.attrHooks[propName].preAnim = Drawable.prototype.attrHooks._num.preAnim;
	Circle.prototype.attrHooks[propName].anim = Drawable.prototype.attrHooks._num.anim;
});

$.circle = function(){
	return new Circle(arguments);
};

$.Circle = Circle;

// todo: rename to PathPart
Curve = new Class({
	initialize: function(method, attrs, path){
		this.method = method;
		this.path = path;
		this.attrs = attrs;
	},

	update: function(){
		this.path.update();
		return this;
	},

	process: function(ctx){
		ctx[this.method].apply(ctx, this.attrs);
	},

	// Parameters
	attr: function(name, value){
		if(name + '' !== name){
			Object.keys(name).forEach(function(key){
				this.attr(key, name[key]);
			}, this);
			return this;
		}

		name = Curve.types[this.method].attrs.indexOf(name);
		if(value === undefined){
			return this.attrs[name];
		}
		this.attrs[name] = value;
		return this.update();
	},

	bounds: function(prevEnd){
		if(!Curve.types[this.method].bounds){
			return null;
		}
		return Curve.types[this.method].bounds(prevEnd, this.attrs);
	},

	endAt: function(){
		if(!Curve.types[this.method].endAt){
			return null;
		}
		return Curve.types[this.method].endAt(this.attrs);
	}
});

Curve.types = {
	moveTo: {
		attrs: ['x', 'y'],
		endAt: function(attrs){
			return attrs;
		}
	},
	lineTo: {
		attrs: ['x', 'y'],
		bounds: function(from, attrs){
			return [from[0], from[1], attrs[0], attrs[1]];
		},
		endAt: function(attrs){
			return attrs;
		}
	},
	quadraticCurveTo: {
		attrs: ['hx', 'hy', 'x', 'y'],
		bounds: function(from, attrs){
			var minX = Math.min(from[0], attrs[0], attrs[2]);
			var minY = Math.min(from[1], attrs[1], attrs[3]);
			var maxX = Math.max(from[0], attrs[0], attrs[2]);
			var maxY = Math.max(from[1], attrs[1], attrs[3]);
			return [minX, minY, maxX, maxY];
		},
		endAt: function(attrs){
			return attrs.slice(2);
		}
	},
	bezierCurveTo: {
		attrs: ['h1x', 'h1y', 'h2x', 'h2y', 'x', 'y'],
		bounds: function(from, attrs){
			var minX = Math.min(from[0], attrs[0], attrs[2], attrs[4]);
			var minY = Math.min(from[1], attrs[1], attrs[3], attrs[5]);
			var maxX = Math.max(from[0], attrs[0], attrs[2], attrs[4]);
			var maxY = Math.max(from[1], attrs[1], attrs[3], attrs[5]);
			return [minX, minY, maxX, maxY];
		},
		endAt: function(attrs){
			return attrs.slice(4);
		}
	},
	arc: {
		attrs: ['x', 'y', 'radius', 'start', 'end', 'clockwise'],
		bounds: function(from, attrs){
			var x = attrs[0],
				y = attrs[1],
				radius = attrs[2],
				start = attrs[3],
				end = attrs[4],
				clockwise = attrs[5];
				// todo: support 'from'
			return [x - radius, y - radius, x + radius, y + radius];
		},
		endAt: function(attrs){
			var x = attrs[0],
				y = attrs[1],
				radius = attrs[2],
				delta = attrs[4] - attrs[3];

			if(attrs[5]){
				delta = -delta;
			}
			return [
				x + Math.cos(delta) * radius,
				y + Math.sin(delta) * radius
			];
		}
	},
	arcTo: {
		attrs: ['x1', 'y1', 'x2', 'y2', 'radius', 'clockwise']
	}
};

Curve.fromArray = function(array, path){
	if(array === true){
		return closePath;
	}

	if(array[0] in Curve.types){
		return new Curve(array[0], array.slice(1), path);
	}

	return new Curve({
		'2': 'lineTo',
		'4': 'quadraticCurveTo',
		'6': 'bezierCurveTo'
	}[array.length], array, path);
};

$.curves = Curve.types;

$.Curve = Curve;

var closePath = new Curve('closePath', []);

Path = new Class(Drawable, {

	initialize : function(args, context){
		this.super('initialize', arguments);

		if(isObject(args[0])){
			args = this.processObject(args[0], Path.args);
		}

		this.attrs.d = Path.parse(args[0], this);
		if(args[1]){
			this.styles.fillStyle = args[1];
		}
		if(args[2]){
			this.attrs.stroke = args[2];
			Drawable.processStroke(args[2], this.styles);
		}
	},

	attrHooks: extend(Object.assign({}, Drawable.prototype.attrHooks), {
		d: {
			set: function(value){
				this.update();
				return value;
			}
		}
	}),

	// Parts
	part: function(index, value){
		if(value === undefined){
			return this.attrs.d[index];
		}

		if(!isNaN(value[0])){
			value = [value];
		}

		value = Path.parse(value, this, index !== 0);
		this.attrs.d.splice.apply(this.attrs.d, [index, 1].concat(value));
		return this.update();
	},

	before: function(index, value, turnMoveToLine){
		// if index == 0 && turnMoveToLine, then the current first moveTo will be turned to lineTo
		if(index === 0 && turnToLine !== false){
			this.attrs.d[0].method = 'lineTo';
		}

		if(!isNaN(value[0])){
			value = [value];
		}

		value = Path.parse(value, this, index !== 0);
		this.attrs.d.splice.apply(this.attrs.d, [index, 0].concat(value));
		return this.update();
	},

	after: function(index, value){
		return this.before(index + 1, value);
	},

	remove: function(index){
		if(index === undefined){
			return this.super('remove');
		}
		this.attrs.d[index].path = null;
		this.attrs.d.splice(index, 1);
		return this.update();
	},

	// Array species
	push: function(curve){
		this.attrs.d = this.attrs.d.concat(Path.parse(curve, this, this.attrs.d.length !== 0));
		return this.update();
	},

	forEach: function(){
		this.attrs.d.forEach.apply(this.attrs.d, arguments);
		return this;
	},

	map: function(){
		return this.attrs.d.map.apply(this.attrs.d, arguments);
	},

	reduce: function(){
		return this.attrs.d.reduce.apply(this.attrs.d, arguments);
	},

	// Parts addition
	moveTo: function(x, y){
		return this.push(['moveTo', x, y])
	},

	lineTo : function(x, y){
		return this.push(['lineTo', x, y])
	},

	quadraticCurveTo : function(hx, hy, x, y){
		return this.push(['quadraticCurveTo', hx, hy, x, y]);
	},

	bezierCurveTo : function(h1x, h1y, h2x, h2y, x, y){
		return this.push(['bezierCurveTo', h1x, h1y, h2x, h2y, x, y]);
	},

	arcTo : function(x1, y1, x2, y2, radius, clockwise){
		return this.push(['arcTo', x1, y1, x2, y2, radius, !!clockwise]);
	},

	arc : function(x, y, radius, start, end, clockwise){
		return this.push(['arc', x, y, radius, start, end, !!clockwise]);
	},

	closePath : function(){
		return this.push(closePath);
	},


	shapeBounds: function(){
		var minX =  Infinity,
			minY =  Infinity,
			maxX = -Infinity,
			maxY = -Infinity,

			currentBounds,
			currentPoint = [0, 0];
		for(var i = 0; i < this.attrs.d.length; i++){
			currentBounds = this.attrs.d[i].bounds(currentPoint);
			currentPoint = this.attrs.d[i].endAt() || currentPoint;
			if(!currentBounds){
				continue;
			}
			minX = Math.min(minX, currentBounds[0], currentBounds[2]);
			maxX = Math.max(maxX, currentBounds[0], currentBounds[2]);
			minY = Math.min(minY, currentBounds[1], currentBounds[3]);
			maxY = Math.max(maxY, currentBounds[1], currentBounds[3]);
		}
		return [minX, minY, maxX - minX, maxY - minY];
	},

	draw : function(ctx){
		if(this._visible){
			this.context.renderer.drawPath(
				this.attrs.d,
				ctx, this.styles, this.matrix, this
			);
		}
	}

} );

Path.args = ['d', 'fill', 'stroke'];

Path.parse = function(data, path, firstIsNotMove){
	if(!data){
		return [];
	}

	if(data + '' === data){
		return Path.parseSVG(data, path, firstIsNotMove);
	}

	var curves = [];
	if(Array.isArray(data)){
		for(var i = 0; i < data.length; i++){

			if(data[i] instanceof Curve){
				curves.push(data[i]);
				data[i].path = path;
			} else {
				if(i === 0 && !firstIsNotMove){
					curves.push(new Curve(
						'moveTo',
						isNaN(data[i][0]) ? data[i].slice(1) : data[i],
						path
					));
				} else {
					curves.push(Curve.fromArray(data[i], path));
				}
			}
		}
	}
	return curves;
};

Path.parseSVG = function(data, path, firstIsNotMove){
	return [];
};

$.path = function(){
	var path = new Path(arguments);
	path.init();
	return path;
};

$.Path = Path;

Picture = new Class(Drawable, {

	initialize : function(args, context){
		this.super('initialize', arguments);

		if(isObject(args[0])){
			args = this.processObject(args[0], Picture.args);
		}

		this.attrs.image = Picture.parse(args[0]);
		this.attrs.x = args[1];
		this.attrs.y = args[2];
		if(args[3]){
			this.attrs.width = args[3];
		}
		if(args[4]){
			this.attrs.height = args[4];
		}
		if(args[5]){
			this.attrs.crop = args[5];
		}

		this.attrs.image.addEventListener('load', function(event){
			this.update();
			this.fire('load', event);
		}.bind(this));

		this.attrs.image.addEventListener('error', function(e){
			this.fire('error', event);
		});
	},

	attrHooks: extend(Object.assign({}, Drawable.prototype.attrHooks), {
		x: {
			set: function(value){
				this.attrs.x = value;
				this.update();
			}
		},
		y: {
			set: function(value){
				this.attrs.y = value;
				this.update();
			}
		},
		width: {
			set: function(value){
				this.attrs.width = value;
				this.update();
			}
		},
		height: {
			set: function(value){
				this.attrs.height = value;
				this.update();
			}
		},
		crop: {
			set: function(value){
				this.attrs.crop = value;
				this.update();
			}
		},
		smooth: {
			get: function(){
				return this.styles[smoothPrefix(this.context.context)] || this.context.context[smoothPrefix(this.context.context)];
			},
			set: function(value){
				this.styles[smoothPrefix(this.context.context)] = !!value;
				this.update();
			}
		}
	}),

	remove: function(){
		this.super('remove');
		if(this.attrs.image.blob){
			domurl.revokeObjectURL(this.attrs.image.blob);
		}
	},

	_realSize: function(){
		var w = this.attrs.width,
			h = this.attrs.height;

		if(w === 'auto'){
			w = this.attrs.image.width * (h / this.attrs.image.height);
		} else if(w === 'native' || w == null){
			w = this.attrs.image.width;
		}

		if(h === 'auto'){
			h = this.attrs.image.height * (w / this.attrs.image.width);
		} else if(h === 'native' || h == null){
			h = this.attrs.image.height;
		}

		return [w, h];
	},

	shapeBounds : function(){
		var size = this._realSize();
		return [this.attrs.x, this.attrs.y, size[0], size[1]];
	},

	isPointIn : function(x, y){
		var size = this._realSize();
		return x > this.attrs.x && y > this.attrs.y && x < this.attrs.x + size[0] && y < this.attrs.y + size[1];
	},

	draw : function(ctx){
		if(this._visible && this.attrs.image.complete){
			var params = [this.attrs.image, this.attrs.x, this.attrs.y];

			if(this.attrs.width || this.attrs.height){
				var size = this._realSize();
				params.push(size[0]);
				params.push(size[1]);

				if(this.attrs.crop){
					params = params.concat(this.attrs.crop);
				}
			} else if(this.attrs.crop){
				params = params.concat([
					this.attrs.image.width,
					this.attrs.image.height
				]).concat(this.attrs.crop);
			}

			this.context.renderer.drawImage(params, ctx, this.styles, this.matrix, this);
		}
	}

});

var smoothWithPrefix;
function smoothPrefix(ctx){
	if(smoothWithPrefix){
		return smoothWithPrefix;
	}
	['mozImageSmoothingEnabled', 'webkitImageSmoothingEnabled', 'msImageSmoothingEnabled', 'imageSmoothingEnabled'].forEach(function(name){
		if(name in ctx){
			smoothWithPrefix = name;
		}
	});
	return smoothWithPrefix;
}

Picture.args = ['image', 'x', 'y', 'width', 'height', 'crop'];

Picture.parse = function(image){
	if(image + '' === image){
		if(image[0] === '#'){
			return document.getElementById(image.substr(1));
		} else if(image[0] === '<svg'){
			var blob = new Blob([image], {type: 'image/svg+xml;charset=utf-8'});
			image = new Image();
			image.src = domurl.createObjectURL(blob);
			image.blob = blob;
		} else {
			var imageObject = new Image();
			imageObject.src = image;
			return imageObject;
		}
	}
	return image;
};

$.image = function(){
	var image = new Picture(arguments);
	return image;
};

$.Image = Picture;

Raster = new Class(Drawable, {

	initialize : function(args, context){
		this.super('initialize', arguments);

		if(isObject(args[0])){
			args = this.processObject(args[0], Raster.args);
		}

		this.attrs.data = args[0];
		this.attrs.x = args[1];
		this.attrs.y = args[2];
	},

	draw : function(ctx){
		if(this._visible){
			var params = [this.attrs.data, this.attrs.x, this.attrs.y];
			this.context.renderer.drawData(params, ctx, this.styles, this.matrix, this);
		}
	}

});

Raster.args = ['data', 'x', 'y'];

$.raster = function(){
	var raster = new Raster(arguments);
	return raster;
};

Text = new Class(Drawable, {

	initialize : function(args, context){
		this.super('initialize', arguments);

		if(isObject(args[0])){
			args = this.processObject(args[0], Text.args);
		}

		this.attrs.text = args[0] + '';
		this.attrs.font = Text.parseFont(args[1] || Text.font);
		this.styles.font = Text.genFont(this.attrs.font);
		this.attrs.x = args[2];
		this.attrs.y = args[3];
		if(args[4]){
			this.styles.fillStyle = args[4];
		}
		if(args[5]){
			this.attrs.stroke = args[5];
			Drawable.processStroke(args[5], this.styles);
		}

		this.attrs.breakLines = true;
		this.styles.textBaseline = 'top';
	},

	attrHooks: extend(Object.assign({}, Drawable.prototype.attrHooks), {
		text: {
			set: function(value){
				this.lines = null;
				this.update();
				return value + '';
			}
		},
		x: {
			set: function(value){
				this.update();
			}
		},
		y: {
			set: function(value){
				this.update();
			}
		},
		font: {
			set: function(value){
				Object.assign(this.attrs.font, Text.parseFont(value));
				this.styles.font = Text.genFont(this.attrs.font);
				this.update();
				return this.attrs.font;
			}
		},
		align: {
			get: function(){
				return this.styles.textAlign || 'left';
			},
			set: function(value){
				this.styles.textAlign = value;
				this.update();
				return null;
			}
		},
		baseline: {
			get: function(){
				return this.styles.textBaseline;
			},
			set: function(value){
				this.styles.textBaseline = value;
				this.update();
				return null;
			}
		},
		breakLines: {
			set: function(){
				this.update();
			}
		},
		width: {
			set: function(){
				this.lines = null;
				this.update();
			}
		},
		lineHeight: {
			set: function(){
				this.lines = null;
				this.update();
			}
		}
	}),

	lines: null,

	processLines: function(ctx){
		var text = this.attrs.text,
			lines = this.lines = [],

			height = this.attrs.lineHeight || this.attrs.font.size,
			maxWidth = this.attrs.width || Infinity,
			x = maxWidth * (this.styles.textAlign === 'center' ? 1/2 : this.styles.textAlign === 'right' ? 1 : 0),

			rend = this.context.renderer;

		rend.preMeasure(this.styles.font);
		text.split('\n').forEach(function(line){
			if(rend.measure(line) > maxWidth){
				var words = line.split(' '),
					curline = '',
					testline;

				for(var i = 0; i < words.length; i++){
					testline = curline + words[i] + ' ';

					if(rend.measure(testline) > maxWidth){
						lines.push({
							text: curline,
							y: height * lines.length
						});
						curline = words[i] + ' ';
					} else {
						curline = testline;
					}
				}
				lines.push({
					text: curline,
					y: height * lines.length
				})
			} else {
				lines.push({
					text: line,
					y: height * lines.length
				});
			}
		}, this);
		rend.postMeasure();
		return this;
	},

	shapeBounds : function(){
		var align = this.styles.textAlign || 'left',
			baseline = this.styles.textBaseline,

			width = this.attrs.width,
			height = this.attrs.lineHeight || this.attrs.font.size,

			x = this.attrs.x,
			y = this.attrs.y;

		if(baseline === 'middle'){
			y -= this.attrs.font.size / 2;
		} else if(baseline === 'bottom' || baseline === 'ideographic'){
			y -= this.attrs.font.size;
		} else if(baseline === 'alphabetic'){
			y -= this.attrs.font.size * 0.8;
		}

		if(!this.attrs.breakLines){
			this.context.renderer.preMeasure(this.styles.font);
			width = this.context.renderer.measure(this.attrs.text);
			this.context.renderer.postMeasure();

			x -= width * ({
				left: 0,
				right: 1,
				center: 0.5
			})[align || 'left'];

			return [x, y, width, this.attrs.font.size * 1.15];
		} else {
			if(!this.lines){
				this.processLines();
			}

			if(!width){
				width = 0;
				this.context.renderer.preMeasure(this.styles.font);
				this.lines.forEach(function(line){
					width = Math.max(width, this.context.renderer.measure(line.text));
				}, this);
				this.context.renderer.postMeasure();
			}

			return [x, y, width, height * this.lines.length];
		}
	},

	draw : function(ctx){
		if(this._visible){
			if(!this.attrs.breakLines){
				this.context.renderer.drawTextLines(
					[[{
						text: this.attrs.text,
						y: 0
					}], this.attrs.x, this.attrs.y],
					ctx, this.styles, this.matrix, this
				);
			} else {
				if(!this.lines){
					this.processLines(ctx);
				}

				var x = this.attrs.x;
				if(this.attrs.width){
					x += this.attrs.width * ({
						left: 0,
						center: 0.5,
						right: 1
					})[this.styles.textAlign || 'left'];
				}

				this.context.renderer.drawTextLines(
					[this.lines, x, this.attrs.y],
					ctx, this.styles, this.matrix, this
				);
			}
		}
	},

	isPointIn : function(x, y){
		var bounds = this.shapeBounds();
		return x > bounds[0] && y > bounds[1] && x < bounds[0] + bounds[2] && y < bounds[1] + bounds[3];
	}

});

Text.font = '10px sans-serif';
Text.args = ['text', 'font', 'x', 'y', 'fill', 'stroke'];

// 'Arial bold 10px' -> {family: 'Arial', size: 10, bold: true}
Text.parseFont = function(font){
	if(font + '' === font){
		var object = {
			family: ''
		};
		font.split(' ').forEach(function(part){
			if(part === 'bold'){
				object.bold = true;
			} else if(part === 'italic'){
				object.italic = true;
			} else if(reNumberLike.test(part)){
				object.size = $.distance(part);
			} else {
				object.family += ' ' + part;
			}
		});

		object.family = object.family.trim();
		return object;
	}
	return font;
};

// {family: 'Arial', size: 10, bold: true} -> 'bold 10px Arial'
Text.genFont = function(font){
	var string = '';
	if(font.italic){
		string += 'italic ';
	}
	if(font.bold){
		string += 'bold ';
	}
	return string + (font.size || 10) + 'px ' + (font.family || 'sans-serif');
};

$.text = function(){
	return new Text(arguments);
};

$.Text = Text;

Gradient = new Class({
	initialize: function(type, colors, from, to, context){
		this.context = context;

		if(type + '' !== type){
			to = from;
			from = colors;
			colors = type;
			type = 'linear';
		}

		this.type = type || 'linear';
		this.attrs = {
			from: from,
			to: to,
			colors: Gradient.parseColors(colors)
		};

		if(Gradient.types[this.type]){
			this.attrHooks = Object.assign(
				Object.assign({}, this.attrHooks),
				Gradient.types[this.type].attrHooks
			);

			if(Gradient.types[this.type].initialize){
				Gradient.types[this.type].initialize.call(this);
			}
		}
	},

	attr: Drawable.prototype.attr,

	attrHooks: {
		colors: {
			set: function(value){
				this.update();
				return Gradient.parseColors(value);
			}
		}
	},

	color: function(t, value){
		if(value !== undefined){
			this.attrs.colors[t] = value;
			return this.update();
		}
		if(this.attrs.colors[t]){
			return $.color(this.attrs.colors[t]);
		}

		var colors = this.attrs.colors,
			keys = Object.keys(colors).sort(); // is this sort sorting them right? as numbera or as strings?

		if(t < keys[0]){
			return $.color(colors[keys[0]]);
		} else if(t > keys[keys.length - 1]){
			return $.color(colors[keys[keys.length - 1]]);
		}

		for(var i = 0; i < keys.length; i++){
			if(+keys[i] > t){
				var c1 = $.color(colors[keys[i - 1]]),
					c2 = $.color(colors[keys[i]]);
				t = (t - +keys[i - 1]) / (+keys[i] - +keys[i - 1]);
				return [
					c1[0] + (c2[0] - c1[0]) * t + 0.5 | 0,
					c1[1] + (c2[1] - c1[1]) * t + 0.5 | 0,
					c1[2] + (c2[2] - c1[2]) * t + 0.5 | 0,
					+(c1[3] + (c2[3] - c1[3]) * t).toFixed(2)
				];
			}
		}
	},

	update: function(){
		this.context.update();
		return this;
	},

	toCanvasStyle: function(ctx, element){
		return Gradient.types[this.type].toCanvasStyle.call(this, ctx, element);
	}
});

Gradient.parseColors = function(colors){
	if(!Array.isArray(colors)){
		return colors;
	}

	var stops = {},
		step = 1 / (colors.length - 1);
	colors.forEach(function(color, i){
		stops[step * i] = color;
	});
	return stops;
};

// Linear and radial gradient species
Gradient.types = {
	linear: {
		attrHooks: {
			from: {
				set: function(value){
					this.update();
					return value;
				}
			},
			to: {
				set: function(value){
					this.update();
					return value;
				}
			}
		},

		toCanvasStyle: function(ctx, element){
			return this.context.renderer.makeGradient(
				this.context,
				'linear',
				element.corner(this.attrs.from),
				element.corner(this.attrs.to),
				this.attrs.colors
			);
		}
	},

	radial: {
		initialize: function(){
			// from-to -> radius, center, etc
			if(this.attrs.from && Array.isArray(this.attrs.from)){
				this.attrs.startRadius = this.attrs.from[2] || 0;
				this.attrs.from = this.attrs.from.slice(0, 2);
			} else {
				if(!this.attrs.from){
					this.attrs.from = 'center';
				}
				this.attrs.startRadius = 0;
			}

			if(this.attrs.to && Array.isArray(this.attrs.to)){
				this.attrs.radius = this.attrs.to[2] || 'auto';
				this.attrs.to = this.attrs.to.slice(0, 2);
			} else {
				if(!this.attrs.to){
					this.attrs.to = this.attrs.from;
				}
				this.attrs.radius = 'auto';
			}
		},

		attrHooks: {
			from: {
				set: function(value){
					if(Array.isArray(value) && value.length > 2){
						this.attrs.startRadius = value[2];
						value = value.slice(0, 2);
					}
					this.update();
					return value;
				}
			},

			to: {
				set: function(value){
					if(Array.isArray(value) && value.length > 2){
						this.attrs.radius = value[2];
						value = value.slice(0, 2);
					}
					this.update();
					return value;
					// returns do not work!
				}
			},

			radius: {
				set: function(value){
					this.update();
					return value;
				}
			},

			startRadius: {
				set: function(value){
					this.update();
					return value;
				}
			}
		},

		toCanvasStyle: function(ctx, element){
			var from = element.corner(this.attrs.from),
				to = element.corner(this.attrs.to);

			return this.context.renderer.makeGradient(
				this.context,
				'radial',
				[from[0], from[1], this.attrs.startRadius],
				[to[0], to[1], this.attrs.radius === 'auto' ? element.bounds().height : this.attrs.radius],
				this.attrs.colors
			);
		}
	}
};

$.Gradient = Gradient;

Pattern = new Class({
	initialize: function(image, repeat, context){
		this.image = Picture.parse(image);
		this.repeat = repeat;
		this.context = context;

		this.image.addEventListener('load', function(e){
			this.update();

			if(this.image.blob){
				domurl.revokeObjectURL(blob);
			}
		}.bind(this));
	},

	update: function(){
		this.context.update();
		return this;
	},

	toCanvasStyle: function(ctx){
		if(!this.image.complete){
			return 'transparent';
		}

		return ctx.createPattern(this.image, this.repeat || 'repeat');
	}
});

$.Pattern = Pattern;

// Class
function Class(parent, properties){
	if(!properties){
		properties = parent;
		parent = null;
	}

	var cls = function(){
		return (this.initialize || emptyFunc).apply(this, arguments);
	};

	if(parent){

		if(properties.liftInits){
			// go to the parent
			cls = function(){
				if(cls.prototype.__initialize__){
					return cls.prototype.__initialize__.apply(this,arguments);
				}

				var inits = [],
					parent = this.constructor.parent;

				while(parent){
					inits.push(parent.prototype.initialize);
					parent = parent.parent;
				}

				for(var i = inits.length; i--;){
					if(inits[i]){
						inits[i].apply(this, arguments);
					}
				}

				if(cls.prototype.initialize && properties.initialize === cls.prototype.initialize){
					return cls.prototype.initialize.apply(this,arguments);
				}
			};
		}

		// prototype inheriting
		var sklass = function(){};
		sklass.prototype = parent.prototype;
		cls.prototype = new sklass();
		cls.prototype.superclass = parent.prototype;
		cls.prototype.constructor = cls;

		cls.prototype.super = function(name, args){
			// при вызове super внутри таймаута получим бесконечный цикл
			// по-хорошему, проверять бы arguments.callee.caller === arguments.callee
			// по-плохому, не стоит: это вроде как плохо, и вообще use strict
			if(!this.superclass.superclass || !this.superclass.superclass[name]){
				return this.superclass[name].apply(this, args);
			}

			var superclass = this.superclass;
			this.superclass = this.superclass.superclass;
			var result = superclass[name].apply(this, args);
			this.superclass = parent.prototype;
			return result;
		};
	}

	extend(cls.prototype, properties);

	return cls;
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

// utils
// replace to Object.assign?
// it doesn't work in ie :c
function extend(a, b){
	// странно, что в хроме разницы в производительности - вообще никакой
	return Object.assign(a, b);
	/* for(var i in b){
		if(Object.prototype.hasOwnProperty.call(b,i)){
			a[i] = b[i];
		}
	}
	return a; */
}

function argument(index){
	return function(value){
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

// typeofs
/*
use common typeofs
String: a + '' === a
Boolean: !!a === a
Array: Array.isArray
Number: +a === a
 */

function isObject(a){
	return toString.call(a) === '[object Object]';
}

function isPivot(v){
	return Array.isArray(v) || v in $.corners;
}

$.reNumberLike = /^(\d+|(\d+)?\.\d+)(em|ex|ch|rem|vw|vh|vmin|vmax|cm|mm|in|px|pt|pc)?$/;

function isNumberLike(value){
	return +value === value || (value + '' === value && $.reNumberLike.test(value));
}

// todo: Pattern.isPatternLike();
function isPatternLike(value){
	return value instanceof Image ||
			(isObject(value) && has(value, 'image')) ||
			(value + '' === value && !(
				value.indexOf('http://') &&
				value.indexOf('https://') &&
				value.indexOf('./') &&
				value.indexOf('../') &&
				value.indexOf('data:image/') &&
				value.indexOf('<svg')
			) );
}

$.Class = Class;
$.Bounds = Bounds;
$.extend = extend;
$.argument = argument;
$.wrap = wrap;
$.isObject = isObject;
$.isNumberLike = isNumberLike;
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

$.fileTypes = {
	'jpeg': 'image/jpeg',
	'jpg': 'image/jpeg',
	'png': 'image/png',
	'webp': 'image/webp'
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
	'aliceblue':				'f0f8ff',
	'antiquewhite':				'faebd7',
	'aqua':						'0ff',
	'aquamarine':				'7fffd4',
	'azure':					'f0ffff',
	'beige':					'f5f5dc',
	'bisque':					'ffe4c4',
	'black':					'000',
	'blanchedalmond':			'ffebcd',
	'blue':						'00f',
	'blueviolet':				'8a2be2',
	'brown':					'a52a2a',
	'burlywood':				'deb887',
	'burntsienna':				'ea7e5d',
	'cadetblue':				'5f9ea0',
	'chartreuse':				'7fff00',
	'chocolate':				'd2691e',
	'chucknorris':				'c00000',
	'coral':					'ff7f50',
	'cornflowerblue':			'6495ed',
	'cornsilk':					'fff8dc',
	'crimson':					'dc143c',
	'cyan':						'0ff',
	'darkblue':					'00008b',
	'darkcyan':					'008b8b',
	'darkgoldenrod':			'b8860b',
	'darkgray':					'a9a9a9',
	'darkgreen':				'006400',
	'darkgrey':					'a9a9a9',
	'darkkhaki':				'bdb76b',
	'darkmagenta':				'8b008b',
	'darkolivegreen':			'556b2f',
	'darkorange':				'ff8c00',
	'darkorchid':				'9932cc',
	'darkred':					'8b0000',
	'darksalmon':				'e9967a',
	'darkseagreen':				'8fbc8f',
	'darkslateblue':			'483d8b',
	'darkslategray':			'2f4f4f',
	'darkslategrey':			'2f4f4f',
	'darkturquoise':			'00ced1',
	'darkviolet':				'9400d3',
	'deeppink':					'ff1493',
	'deepskyblue':				'00bfff',
	'dimgray':					'696969',
	'dimgrey':					'696969',
	'dodgerblue':				'1e90ff',
	'firebrick':				'b22222',
	'floralwhite':				'fffaf0',
	'forestgreen':				'228b22',
	'fuchsia':					'f0f',
	'gainsboro':				'dcdcdc',
	'ghostwhite':				'f8f8ff',
	'gold':						'ffd700',
	'goldenrod':				'daa520',
	'gray':						'808080',
	'green':					'008000',
	'greenyellow':				'adff2f',
	'grey':						'808080',
	'honeydew':					'f0fff0',
	'hotpink':					'ff69b4',
	'indianred':				'cd5c5c',
	'indigo':					'4b0082',
	'ivory':					'fffff0',
	'khaki':					'f0e68c',
	'lavender':					'e6e6fa',
	'lavenderblush':			'fff0f5',
	'lawngreen':				'7cfc00',
	'lemonchiffon':				'fffacd',
	'lightblue':				'add8e6',
	'lightcoral':				'f08080',
	'lightcyan':				'e0ffff',
	'lightgoldenrodyellow':		'fafad2',
	'lightgray':				'd3d3d3',
	'lightgreen':				'90ee90',
	'lightgrey':				'd3d3d3',
	'lightpink':				'ffb6c1',
	'lightsalmon':				'ffa07a',
	'lightseagreen':			'20b2aa',
	'lightskyblue':				'87cefa',
	'lightslategray':			'789',
	'lightslategrey':			'789',
	'lightsteelblue':			'b0c4de',
	'lightyellow':				'ffffe0',
	'lime':						'0f0',
	'limegreen':				'32cd32',
	'linen':					'faf0e6',
	'magenta':					'f0f',
	'maroon':					'800000',
	'mediumaquamarine':			'66cdaa',
	'mediumblue':				'0000cd',
	'mediumorchid':				'ba55d3',
	'mediumpurple':				'9370db',
	'mediumseagreen':			'3cb371',
	'mediumslateblue':			'7b68ee',
	'mediumspringgreen':		'00fa9a',
	'mediumturquoise':			'48d1cc',
	'mediumvioletred':			'c71585',
	'midnightblue':				'191970',
	'mintcream':				'f5fffa',
	'mistyrose':				'ffe4e1',
	'moccasin':					'ffe4b5',
	'navajowhite':				'ffdead', // FF is not dead
	'navy':						'000080',
	'oldlace':					'fdf5e6',
	'olive':					'808000',
	'olivedrab':				'6b8e23',
	'orange':					'ffa500',
	'orangered':				'ff4500',
	'orchid':					'da70d6',
	'palegoldenrod':			'eee8aa',
	'palegreen':				'98fb98',
	'paleturquoise':			'afeeee',
	'palevioletred':			'db7093',
	'papayawhip':				'ffefd5',
	'peachpuff':				'ffdab9',
	'peru':						'cd853f',
	'pink':						'ffc0cb',
	'plum':						'dda0dd',
	'powderblue':				'b0e0e6',
	'purple':					'800080',
	'red':						'f00',
	'rosybrown':				'bc8f8f',
	'royalblue':				'4169e1',
	'saddlebrown':				'8b4513',
	'salmon':					'fa8072',
	'sandybrown':				'f4a460',
	'seagreen':					'2e8b57',
	'seashell':					'fff5ee',
	'sienna':					'a0522d',
	'silver':					'c0c0c0',
	'skyblue':					'87ceeb',
	'slateblue':				'6a5acd',
	'slategray':				'708090',
	'slategrey':				'708090',
	'snow':						'fffafa',
	'springgreen':				'00ff7f',
	'steelblue':				'4682b4',
	'tan':						'd2b48c',
	'teal':						'008080',
	'thistle':					'd8bfd8',
	'tomato':					'ff6347',
	'turquoise':				'40e0d0',
	'violet':					'ee82ee',
	'wheat':					'f5deb3',
	'white':					'fff',
	'whitesmoke':				'f5f5f5',
	'yellow':					'ff0',
	'yellowgreen':				'9acd32'
};

// DOM
$.coordsOfElement = function(element){ // returns coords of a DOM element
	var box = element.getBoundingClientRect(),
		style = window.getComputedStyle(element);

	return {
		x: box.left + parseInt(style.borderLeftWidth || 0) + parseInt(style.paddingLeft || 0),
		y: box.top  + parseInt(style.borderTopWidth  || 0) + parseInt(style.paddingTop  || 0)
	};
};

// Clean functions
$.clone = function(object){
	var result = new object.constructor();
	for(var i in object){
		if(has(object, i)){
			if(typeof object[i] === 'object' && !(object[i] instanceof Context) && !(object[i] instanceof Image)){
				result[i] = $.clone(object[i]);
			} else {
				result[i] = object[i];
			}
		}
	}
	return result;
};


// renamed from $.multiply
$.transform = function(m1, m2){ // multiplies two 2D-transform matrices
	return [
		m1[0] * m2[0] + m1[2] * m2[1],
		m1[1] * m2[0] + m1[3] * m2[1],
		m1[0] * m2[2] + m1[2] * m2[3],
		m1[1] * m2[2] + m1[3] * m2[3],
		m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
		m1[1] * m2[4] + m1[3] * m2[5] + m1[5]
	];
};

$.color = function color(value){ // parses CSS-like colors (rgba(255,0,0,0.5), green, #f00...)
	if(value === undefined){
		return;
	}
	if(Array.isArray(value)){
		return value.slice(0, 4);
	}
	if(value + '' !== value){
		throw 'Not a color: ' + value.toString();
	}

	// rgba(255, 100, 20, 0.5)
	if(value.indexOf('rgb') === 0){
		value = value.substring(value.indexOf('(') + 1, value.length-1).replace(/\s/g, '').split(',').map(function(v){
			// rgba(100%, 0%, 50%, 1)
			if(v.indexOf('%') > 0){
				return Math.round(parseInt(v) * 2.55);
			}
			return parseInt(v);
		});

		if(value.length === 3){
			value.push(1);
		}

		return value;
	}
	// #bebebe
	else if(value[0] === '#'){
		// remove the # and turn into array
		value = value.substring(1);

		// #555
		if(value.length === 3){
			// 'f0a' -> 'ff00aa'
			value = value[0] + value[0] + value[1] + value[1] + value[2] + value[2];
		}

		return [parseInt(value.substring(0, 2), 16), parseInt(value.substring(2, 4), 16), parseInt(value.substring(4, 6), 16), 1];
	}
	// 'red'
	else if(value in $.colors){
		return $.color('#' + $.colors[value]);
	}
	// 'rand'
	else if(value === 'rand'){
		return [Math.round(Math.random() * 255), Math.round(Math.random() * 255), Math.round(Math.random() * 255), 1];
	}

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
	if($.snapToPixels && !dontsnap){
		return Math.round($.distance(value, true) / $.snapToPixels) * $.snapToPixels;
	}

	if(+value === value){
		if( $.unit !== 'px'){
			return $.distance( value + '' + $.unit );
		}

		return value;
	}

	value += '';
	if(value.indexOf('px') === value.length-2){
		return parseInt(value);
	}

	if(!$.units){
		if(!document){
			$.units = defaultUnits;
		} else {
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

	var unit = value.replace(/[\d\.]+?/g, '');
	value = value.replace(/[^\d\.]+?/g, '');
	if(unit === ''){
		return value;
	}
	return Math.round($.units[unit] * value);
}

$.distance = distance;

$.version = Math.PI / 3.490658503988659;

$.query = function(query, index, element, renderer){
	return new Context( (query + '' === query) ? (element || window.document).querySelectorAll(query)[index || 0] : query.canvas || query, renderer );
};

$.id = function(id, renderer){
	return new Context( document.getElementById(id), renderer );
};

if(typeof module === 'object' && typeof module.exports === 'object'){
	module.exports = $;
} else if(typeof define === 'function' && define.amd){
	// todo: define with a name?
	define([], function(){
		return $;
	});
} else {
	window.Graphics2D = $;
}

})(typeof window !== 'undefined' ? window : this);