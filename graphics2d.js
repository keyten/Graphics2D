/*  Graphics2D Core 1.9.0
 *
 *  Author: Dmitriy Miroshnichenko aka Keyten <ikeyten@gmail.com>
 *  Last edit: 26.08.2017
 *  License: MIT / LGPL
 */

(function(window, undefined){

// The main graphics2D class
var Delta = {},

// Classes
	Context,
	Drawable,
	Animation,
	Rect, Circle, Curve, Path, Picture, Text,
	Gradient, Pattern,

// Local variables
	document = window.document,
	toString = Object.prototype.toString,
	slice = Array.prototype.slice,
	has = Function.prototype.call.bind(Object.prototype.hasOwnProperty),
	reFloat = /^\d*\.\d+$/,
	reNumberLike = /^(\d+|(\d+)?\.\d+)(em|ex|ch|rem|vw|vh|vmin|vmax|cm|mm|in|px|pt|pc)?$/,
	domurl = window.URL || window.webkitURL || window,
	extend = Object.assign ? Object.assign : function(dest, source){
		var keys = Object.keys(source),
			l = keys.length;
		while(l--){
			dest[keys[l]] = source[keys[l]];
		}
		return dest;
	}, // Object.assign is not deep as well as the polyfill

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

Delta.renderers = {};

Delta.renderers['2d'] = {

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

	// params is an array of curves
	drawPath: function(params, ctx, style, matrix, object){
		this.pre(ctx, style, matrix, object);
		if(params[1] || params[2]){
			ctx.translate(params[1] || 0, params[2] || 0);
		}
		ctx.beginPath();
		params[0].forEach(function(curve){
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

	// params = [text, x, y]
	drawText: function(params, ctx, style, matrix, object){
		this.pre(ctx, style, matrix, object);
		if(style.fillStyle && !style.strokeStyle){
			ctx.fillText(params[0], params[1], params[2], params[3]);
		} else if(style.fillStyle){
			ctx.fillText(params[0], params[1], params[2]);
			ctx.strokeText(params[0], params[1], params[2]);
		} else {
			ctx.strokeText(params[0], params[1], params[2]);
		}
		ctx.restore();
	},

	makeGradient: function(delta, type, from, to, colors){
		var hash;
		if(delta.useCache){
			hash = this.hashGradient(type, from, to, colors);
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
				hash = [from[0], from[1], to[0], to[1], colors];
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
				// there's also available ctx.lineDashOffset
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

Context = function(canvas){
	this.canvas    = canvas;
	this.elements  = [];
	this.listeners = {};
	this.renderer = Delta.renderers['2d'];
	this.renderer.init(this, canvas);

	this.updateNowBounded = this.updateNow.bind(this);
};

Context.prototype = {

	// Elements
	object: function(object){
		return this.push(extend(new Drawable(), object));
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

		// element.update = element.updateFunction; - ну или как-то так

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

	// todo: rename to objectInPoint
	getObjectInPoint : function(x, y, mouse){
		var elements = this.elements,
			i = elements.length;

		while(i--){
		// mouse=true : ignore elements with interaction = false
		// todo: rename to pointerEvents
			if( elements[i].isPointIn && (elements[i].attrs.interaction || !mouse) &&
				elements[i].isPointIn(x,y) ){
				return elements[i];
			}
		}
		return null;
	},

	each : function(func){
		if(func + '' === func){
			var args = slice.call(arguments, 1),
				funcName = func;
			func = function(elem){
				elem[funcName].apply(elem, args);
			};
		}
		// slice is neccessary when removing obs
		this.elements.slice().forEach(func, this);
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
				['touches', 'changedTouches', 'targetTouches'].forEach(function(prop){
					if(e[prop]){
						Array.prototype.forEach.call(e[prop], function(touch){
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
			Object.keys(event).forEach(function(eventName){
				this.on(eventName, event[eventName]);
			});
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
		var coords = Delta.coordsOfElement(this.canvas);
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
				pivot = Delta.corners[pivot];
				pivot = [pivot[0] * this.canvas.width, pivot[1] * this.canvas.height];
			}

			e = e - a * pivot[0] + pivot[0] - c * pivot[1];
			f = f - b * pivot[0] - d * pivot[1] + pivot[1];
		}

		this.matrix = Delta.transform(this.matrix || [1, 0, 0, 1, 0, 0], [a, b, c, d, e, f]);
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

Delta.Context = Context;

Delta.contexts = {
	'2d': Context
};

Delta.Math = {};

// todo: rename to Delta.math

var temporaryCanvas;

function getTemporaryCanvas(width, height){
	if(!temporaryCanvas){
		temporaryCanvas = document.createElement('canvas');
	}
	temporaryCanvas.width = width;
	temporaryCanvas.height = height;
	return temporaryCanvas;
}

function DrawableAttrHooks(attrs){
	extend(this, attrs); // deepExtend neccessary?
}

Drawable = new Class({

	initialize: function(args){
		this.listeners = {};
		this.styles = {};
		this.attrs = {
			interaction: true,
			visible: true
		};
	},

	update: function(){
		if(this.context){
			this.context.update();
		}
		return this;
	},

	clone : function(attrs, styles, events){
		// todo: test on every obj
		var clone = new this.constructor([], this.context);

		if(attrs === false){
			clone.attrs = this.attrs;
		} else {
			clone.attrs = extend({}, this.attrs);
		}

		if(styles === false){
			clone.styles = this.styles;
			clone.matrix = this.matrix;
		} else {
			clone.styles = extend({}, this.styles);
			// must gradients be cloned?
			if(this.matrix){
				clone.matrix = this.matrix.slice();
			}
		}

		if(events === false){
			clone.listeners = this.listeners;
		} else {
			clone.listeners = extend({}, this.listeners);
		}

		return this.context.push(clone);
	},

	remove : function(){
		// todo: stop animation
		this.context.elements.splice(this.context.elements.indexOf(this), 1);
		this.update();
		this.context = null;
		return this;
	},

	// Attributes
	attr: function(name, value){
		if(Array.isArray(name)){
			return name.map(function(name){
				return this.attr(name);
			}, this);
		} else if(name + '' !== name){
			Object.keys(name).forEach(function(key){
				this.attr(key, name[key]);
			}, this);
			return this;
		}

		if(arguments.length === 1){
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

	attrHooks: DrawableAttrHooks.prototype = {
		z: {
			get: function(){
				return this.context.elements.indexOf(this);
			},
			set: function(value){
				var elements = this.context.elements;
				if(value === 'top'){
					value = elements.length;
				}

				elements.splice(this.context.elements.indexOf(this), 1);
				elements.splice(value, 0, this);
				this.update();
			}
		},

		visible: {
			set: function(){
				this.update();
			}
		},

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
		},

		cursor: {
			set: function(value){
				// this._setCursorListener();
				// this._teardownCursorListener();
			}
		}
	},

	// todo: move to Drawable.processArgumentsObject
	processObject: function(object, arglist){
		// todo: has must be a macros
		// здесь везде вообще заменить на object.opacity !== undefined

		// нужно заменить эту функцию на прямой маппинг в attrs (в функции set)
		// а функция update должна ставиться после первого рисования
		// а по умолчанию быть пустой

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
		if(has(object, 'visible')){
			object.attrs.visible = object.visible;
		}
		if(has(object, 'interaction')){
			object.attrs.interaction = object.interaction;
		}
		// todo: add other attrs
		// и обработчики событий

		return arglist.map(function(name){
			return object[name];
		});
	},

	isPointIn : function(x, y){
		// if(this.attrs.interactionParameters.transform)
		if(this.matrix){
			var inverse = Delta.inverseTransform(this.matrix);
			return Delta.transformPoint(inverse, [x, y]);
		}
		return [x, y];
	},

	// Bounds
	bounds: function(rect, transform, around){
		// maybe add processClip?
		if((around === 'fill' || !around) && this.styles.strokeStyle){
			var weight = (this.styles.lineWidth || 1) / 2;
			if(around === 'strokeExclude'){
				weight = -weight;
			}
			rect[0] -= weight;
			rect[1] -= weight;
			rect[2] += weight * 2;
			rect[3] += weight * 2;
		}

		if(transform !== false && this.matrix){
			var tight = [
				// left top
				Delta.transformPoint(this.matrix, [rect[0], rect[1]]),
				// right top
				Delta.transformPoint(this.matrix, [rect[0] + rect[2], rect[1]]),
				// left bottom
				Delta.transformPoint(this.matrix, [rect[0], rect[1] + rect[3]]),
				// right bottom
				Delta.transformPoint(this.matrix, [rect[0] + rect[2], rect[1] + rect[3]])
			];

			if(transform === 'tight'){
				return tight;
			}

			rect[0] = Math.min(tight[0][0], tight[1][0], tight[2][0], tight[3][0]);
			rect[1] = Math.min(tight[0][1], tight[1][1], tight[2][1], tight[3][1]);
			rect[2] = Math.max(tight[0][0], tight[1][0], tight[2][0], tight[3][0]) - rect[0];
			rect[3] = Math.max(tight[0][1], tight[1][1], tight[2][1], tight[3][1]) - rect[1];
		}

		return new Bounds(rect[0], rect[1], rect[2], rect[3]);
	},

	corner : function(corner, options){
		// todo: remove
		if(Array.isArray(corner)){
			return corner;
		}

		var bounds = this.bounds(options);
		return [
			bounds.x + bounds.w * Delta.corners[corner][0],
			bounds.y + bounds.h * Delta.corners[corner][1]
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
			this.matrix = Delta.transform(this.matrix || [1, 0, 0, 1, 0, 0], [a, b, c, d, e, f]);
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
		x = x / 180 * Math.PI;
		y = y / 180 * Math.PI;
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
		} else if(type in Delta.fileTypes){
			type = Delta.fileTypes[type];
		}

		// todo: other renderers support
		// как насчёт отрицательных x, y
		var canvas = getTemporaryCanvas(bounds.width, bounds.height),
			context = canvas.getContext('2d');

		context.setTransform(1, 0, 0, 1, -bounds.x, -bounds.y);
		// там подключается renderer, что не прокатит для объектов чисто в памяти ( Graphics2D.rect(x,y,w,h) )
		this.draw(context);
		return canvas.toDataURL(type.type || type, type.quality || 1);
	},

	toBlob: function(type, quality, bounds, callback){
		;
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

Drawable.attrHooks = Drawable.prototype.attrHooks;

Drawable.processStroke = function(stroke, style){
	if(stroke + '' === stroke){
		// remove spaces between commas
		stroke = stroke.replace(/\s*\,\s*/g, ',').split(' ');

		var opacity, l = stroke.length,
			joinSet = false,
			capSet = false;

		while(l--){
			if(reFloat.test(stroke[l])){
				// how about 0?
				opacity = parseFloat(stroke[l]);
			} else if(isNumberLike(stroke[l])){
				style.lineWidth = Delta.distance(stroke[l]);
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
			} else if(stroke[l] in Delta.dashes){
				style.lineDash = Delta.dashes[stroke[l]];
			} else {
				style.strokeStyle = stroke[l];
			}
		}
		if(opacity){
			stroke = Delta.color(style.strokeStyle);
			stroke[3] = opacity;
			style.strokeStyle = 'rgba(' + stroke.join(',') + ')';
		}
	} else {
		if(stroke.color !== undefined){
			style.strokeStyle = stroke.color;
		}
		if(stroke.opacity !== undefined && style.strokeStyle){
			var parsed = Delta.color(style.strokeStyle);
			parsed[3] = stroke.opacity;
			style.strokeStyle = 'rgba(' + parsed.join(',') + ')';
		}
		if(stroke.width !== undefined){
			style.lineWidth = Delta.distance(stroke.width);
		}
		if(stroke.join !== undefined){
			style.lineJoin = stroke.join;
		}
		if(stroke.cap !== undefined){
			style.lineCap = stroke.cap;
		}
		if(stroke.dash !== undefined){
			if(stroke.dash in Delta.dashes){
				style.lineDash = Delta.dashes[stroke.dash];
			} else {
				style.lineDash = stroke.dash;
			}
		}
	}
};

Drawable.processShadow = function(shadow, style){
	if(shadow + '' === shadow){
		var shadowProps = ['shadowOffsetX', 'shadowOffsetY', 'shadowBlur'];
		// remove spaces between commas
		shadow = shadow.replace(/\s*\,\s*/g, ',').split(' ');
		for(var i = 0; i < shadow.length; i++){
			if(isNaN(+shadow[i][0])){
				style.shadowColor = shadow[i];
			} else {
				style[shadowProps.shift()] = Delta.distance(shadow[i]);
			}
		}
	} else {
		if(shadow.x !== undefined){
			style.shadowOffsetX = Delta.distance(shadow.x);
		}
		if(shadow.y !== undefined){
			style.shadowOffsetY = Delta.distance(shadow.y);
		}
		if(shadow.blur !== undefined){
			style.shadowBlur = Delta.distance(shadow.blur || 0);
		}
		if(shadow.color){
			style.shadowColor = shadow.color;
		}
	}
};

Delta.Drawable = Drawable;

// events aliases
Context.prototype.eventsInteract.forEach(function(eventName){
	Drawable.prototype[eventName] = Context.prototype[eventName] = function(callback){
		return this[
			typeof callback === 'function' || callback + '' === callback ? 'on' : 'fire'
		].apply(this, [eventName].concat(slice.call(arguments)));
	};
});
// todo:
Drawable.prototype._genMatrix = function(){
	this.transform(null);
	(this.attrs.transformOrder || 'translate rotate scale skew').split(' ').forEach(function(name){
		if(!this.attrs[name]){
			return;
		}

		if(name === 'translate'){
			this.translate(this.attrs.translate[0], this.attrs.translate[1]);
		} else if(name === 'rotate'){
			this.rotate(this.attrs.rotate, this.attrs.rotatePivot);
		} else if(name === 'scale'){
			this.scale(this.attrs.scale[0], this.attrs.scale[1], this.attrs.scalePivot);
		} else if(name === 'skew'){
			this.skew(this.attrs.skew[0], this.attrs.skew[1], this.attrs.skewPivot);
		}
	}.bind(this));
};

		// одноименные функции, если им передать bounds, добавят соответствующий translate, и всё
		// ...или же они просто меняют matrix?

Drawable.prototype.attrHooks.translate = {
	get: function(){
		return this.matrix ? this.matrix.slice(4) : [0, 0];
	},

	set: function(value){
		this.attrs.translate = value;
		this._genMatrix();
		this.update();
	}
};

Drawable.prototype.attrHooks.rotate = {
	get: function(){
		return this.attrs.rotate || 0;
	},

	set: function(value){
		this.attrs.rotate = value;
		this._genMatrix();
		this.update();
		return null;
	}
};

Drawable.prototype.attrHooks.skew = {
	get: function(){
		return this.attrs.skew || [0, 0];
	},

	set: function(value){
		this.attrs.skew = +value === value ? [value, value] : value;
		this._genMatrix();
		this.update();
	}
};

Drawable.prototype.attrHooks.scale = {
	get: function(){
		return this.attrs.scale || [1, 1];
	},

	set: function(value){
		this.attrs.scale = +value === value ? [value, value] : value;
		this._genMatrix();
		this.update();
	}
};

// var anim = Delta.animation(300, 500, options);
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

Animation.easing.default = Animation.easing.swing; // todo: move to Animation.default

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

Delta.animation = function(duration, easing, callback){
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

	attrHooks: new DrawableAttrHooks({
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

	// For history:
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

	isPointIn : function(x, y){
		var point = this.super('isPointIn', [x, y]);
		x = point[0];
		y = point[1];
		return x > this.attrs.x && y > this.attrs.y && x < this.attrs.x + this.attrs.width && y < this.attrs.y + this.attrs.height;
	},

	bounds: function(transform, around){
		return this.super('bounds', [
			[this.attrs.x, this.attrs.y, this.attrs.width, this.attrs.height],
			transform, around
		]);
	},

	draw : function(ctx){
		if(this.attrs.visible){
			this.context.renderer.drawRect(
				[this.attrs.x, this.attrs.y, this.attrs.width, this.attrs.height],
				ctx, this.styles, this.matrix, this
			);
		}
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

Delta.rect = function(){
	return new Rect(arguments);
};

Delta.Rect = Rect;

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

	attrHooks: new DrawableAttrHooks({
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

	isPointIn : function(x, y){
		var point = this.super('isPointIn', [x, y]);
		x = point[0];
		y = point[1];
		return (Math.pow(x - this.attrs.cx, 2) + Math.pow(y - this.attrs.cy, 2)) <= Math.pow(this.attrs.radius, 2);
	},

	bounds: function(transform, around){
		return this.super('bounds', [
			[this.attrs.cx - this.attrs.radius, this.attrs.cy - this.attrs.radius, this.attrs.radius * 2, this.attrs.radius * 2],
			transform, around
		]);
	},

	draw : function(ctx){
		if(this.attrs.visible){
			this.context.renderer.drawCircle(
				[this.attrs.cx, this.attrs.cy, Math.abs(this.attrs.radius)],
				ctx, this.styles, this.matrix, this
			);
		}
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

Delta.circle = function(){
	return new Circle(arguments);
};

Delta.Circle = Circle;

function CurveAttrHooks(attrs){
	extend(this, attrs); // todo: deepExtend neccessary?
}

Curve = new Class({
	initialize: function(method, funcAttrs, path){
		this.method = method;
		this.path = path;
		this.attrs = {};
		this.attrs.args = funcAttrs;
		if(Curve.canvasFunctions[method]){
			this.attrHooks = Curve.canvasFunctions[method].attrHooks;
		}
	},

	attrHooks: CurveAttrHooks.prototype = {
		args: {
			set: function(){
				this.update();
			}
		}
	},

	attr: Drawable.prototype.attr,

	bounds: function(prevEnd){
		if(!Curve.canvasFunctions[this.method].bounds){
			return null;
		}
		return Curve.canvasFunctions[this.method].bounds(prevEnd, this.attrs.args);
	},

	clone: function(){
		var clone = Delta.curve(this.method, this.attrs.args);
		extend(clone.attrs, this.attrs); // todo: deepExtend
		return clone;
	},

	startAt: function(){
		var index = this.path.attrs.d.indexOf(this);
		return index === 0 ? [0, 0] : this.path.attrs.d[index - 1].endAt();
	},

	endAt: function(){
		if(!Curve.canvasFunctions[this.method].endAt){
			return null;
		}
		return Curve.canvasFunctions[this.method].endAt(this.attrs.args);
	},

	update: function(){
		if(this.path){
			this.path.update();
		}
		return this;
	},

	process: function(ctx){
		ctx[this.method].apply(ctx, this.attrs.args);
	}
});

Curve.canvasFunctions = {
	moveTo: {
		attrHooks: makeAttrHooks(['x', 'y']),
		endAt: function(attrs){
			return attrs.slice();
		}
	},
	lineTo: {
		attrHooks: makeAttrHooks(['x', 'y']),
		bounds: function(from, attrs){
			return [from[0], from[1], attrs[0], attrs[1]];
		},
		endAt: function(attrs){
			return attrs.slice();
		}
	},
	quadraticCurveTo: {
		attrHooks: makeAttrHooks(['hx', 'hy', 'x', 'y']),
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
		attrHooks: makeAttrHooks(['h1x', 'h1y', 'h2x', 'h2y', 'x', 'y']),
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
		attrHooks: makeAttrHooks(['x', 'y', 'radius', 'start', 'end', 'clockwise']),
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
		attrHooks: makeAttrHooks(['x1', 'y1', 'x2', 'y2', 'radius', 'clockwise'])
	}
};

function makeAttrHooks(argList){
	var attrHooks = new CurveAttrHooks({});
	argList.forEach(function(arg, i){
		attrHooks[arg] = {
			get: function(){
				return this.attrs.args[i];
			},
			set: function(value){
				this.attrs.args[i] = value;
				this.update();
			}
		};
	});
	return attrHooks;
}

// todo: move to path?
Curve.fromArray = function(array, path){
	if(array === true){
		return closePath;
	}

	if(array[0] in Delta.curves){
		return Delta.curve(array[0], array.slice(1), path);
	}

	return new Curve({
		'2': 'lineTo',
		'4': 'quadraticCurveTo',
		'6': 'bezierCurveTo'
	}[array.length], array, path);
};

Delta.curves = {
	moveTo: Curve,
	lineTo: Curve,
	quadraticCurveTo: Curve,
	bezierCurveTo: Curve,
	arc: Curve,
	arcTo: Curve
};

Delta.Curve = Curve;

Delta.curve = function(method, attrs, path){
	return new Delta.curves[method](method, attrs, path);
};
Curve.epsilon = 0.0001;
Curve.detail = 10;

extend(Curve.prototype, {

	// For canvas curves
	// (should be redefined in other curves)
	pointAt: function(t, startPoint){
		var fn = Curve.canvasFunctions[this.method];

		if(fn && fn.pointAt){
			return fn.pointAt(this, t, startPoint);
		}

		throw "The method \"pointAt\" is not supported for \"" + this.method + "\" curves";
	},

	splitAt: function(t, startPoint){
		var fn = Curve.canvasFunctions[this.method];

		if(fn && fn.splitAt){
			return fn.splitAt(this, t, startPoint);
		}

		throw "The method \"splitAt\" is not supported for \"" + this.method + "\" curves";
	},

	// For any curves
	tangentAt: function(t, epsilon, startPoint){
		if(!epsilon){
			epsilon = Curve.epsilon;
		}

		var t1 = t - epsilon,
			t2 = t + epsilon;

		if(t1 < 0){
			t1 = 0;
		}
		if(t2 > 1){
			t2 = 1;
		}

		var point1 = this.pointAt(t1, startPoint),
			point2 = this.pointAt(t2, startPoint);

		return Math.atan2(point2[1] - point1[1], point2[0] - point1[0]) * 180 / Math.PI;
	},

	normalAt: function(t, epsilon, startPoint){
		return this.tangentAt(t, epsilon, startPoint) - 90;
	},

	approx: function(detail, func, value){
		// todo: cache startPoint
		var startPoint = this.startAt();
		var lastPoint = startPoint;
		for(var i = 1; i <= detail; i++){
			value = func(value, lastPoint, lastPoint = this.pointAt(i / detail, startPoint), i);
		}
		return value;
	},

	length: function(detail){
		if(!detail){
			detail = Curve.detail;
		}

		var length = 0,
			lastPoint = this.pointAt(0),
			point;
		for(var i = 1; i <= detail; i++){
			point = this.pointAt(i / detail);
			length += Math.sqrt(Math.pow(point[1] - lastPoint[1], 2) + Math.pow(point[0] - lastPoint[0], 2));
			lastPoint = point;
		}
		return length;
	},

	nearest: function(x, y, detail){
		if(!detail){
			detail = Curve.detail;
		}

		// todo: gradient descent
		var point,
			min = Infinity,
			minPoint,
			minI,
			distance;
		for(var i = 0; i <= detail; i++){
			point = this.pointAt(i / detail);
			distance = Math.sqrt(Math.pow(point[0] - x, 2) + Math.pow(point[1] - y, 2));
			if(distance < min){
				minPoint = point;
				minI = i;
				min = distance;
			}
		}

		return {
			point: minPoint,
			t: minI / detail,
			distance: min
		};
	},

	// работает весьма плохо, нужно поотлаживать
	bounds: function(startPoint, detail){
		if(!startPoint){
			startPoint = this.startAt();
		}

		if(!detail){
			detail = Curve.detail;
		}

		var minX = Infinity,
			minY = Infinity,
			maxX = -Infinity,
			maxY = -Infinity,
			point;

		for(var t = 0; t <= detail; t++){
			point = this.pointAt(t / detail, startPoint);
			minX = Math.min(minX, point[0]);
			minY = Math.min(minY, point[1]);
			maxX = Math.max(maxX, point[0]);
			maxY = Math.max(maxY, point[1]);
		}

		return [minX, minY, maxX, maxY];
	},

	intersections: function(curve){
		;
	}

});

// Lines
Curve.canvasFunctions.moveTo.pointAt = function(curve, t, startPoint){
	return curve.funcAttrs;
};

// todo: attrs instead of curve?
Curve.canvasFunctions.lineTo.pointAt = function(curve, t, startPoint){
	if(!startPoint){
		startPoint = curve.startAt();
	}
	return [
		startPoint[0] + t * (curve.funcAttrs[0] - startPoint[0]),
		startPoint[1] + t * (curve.funcAttrs[1] - startPoint[1]),
	];
};

Curve.canvasFunctions.lineTo.splitAt = function(curve, t, startPoint){
	if(!startPoint){
		startPoint = curve.startAt();
	}
	var point = Curve.canvasFunctions.lineTo.pointAt(curve, t, startPoint);
	return {
		start: [
			startPoint,
			point
		],
		end: [
			point,
			[curve.funcAttrs[0], curve.funcAttrs[1]]
		]
	};
};

var CurveCatmull = new Class(Curve, {
	initialize: function(method, attrs, path){
		this.super('initialize', arguments);
		// h1x, h1y, h2x, h2y, x, y, [detail]
	},

	attrHooks: new CurveAttrHooks({
		x: {
			set: function(value){
				this.attrs.args[4] = value;
				this.update();
			}
		},
		y: {
			set: function(value){
				this.attrs.args[5] = value;
				this.update();
			}
		},
		h1x: {
			set: function(value){
				this.attrs.args[0] = value;
				this.update();
			}
		},
		h1y: {
			set: function(value){
				this.attrs.args[1] = value;
				this.update();
			}
		},
		h2x: {
			set: function(value){
				this.attrs.args[2] = value;
				this.update();
			}
		},
		h2y: {
			set: function(value){
				this.attrs.args[3] = value;
				this.update();
			}
		}
	}),

	pointAt: function(t, start){
		if(!start){
			start = this.startAt();
		}

		// P(t) = (2t³ - 3t² + 1)p0 + (t³ - 2t² + t)m0 + ( -2t³ + 3t²)p1 + (t³ - t²)m1
		// Где p0, p1 - центральные точки сплайна, m0, m1 - крайние точки сплайна: (m0 - p0 - p1 - m1)

		var args = this.attrs.args,
			x1 = start[0],
			y1 = start[1],
			h1x = args[0],
			h1y = args[1],
			h2x = args[2],
			h2y = args[3],
			x2 = args[4],
			y2 = args[5];

		return [
			0.5 * ((-h1x + 3*x1 - 3*x2 + h2x)*t*t*t
				+ (2*h1x - 5*x1 + 4*x2 - h2x)*t*t
				+ (-x1 + x2)*t
				+ 2*x1),
			0.5 * ((-h1y + 3*y1 - 3*y2 + h2y)*t*t*t
				+ (2*h1y - 5*y1 + 4*y2 - h2y)*t*t
				+ (-y1 + y2)*t
				+ 2*y1)
		];
	},

	endAt: function(){
		return [this.attrs.args[4], this.attrs.args[5]];
	},

	tangentAt: function(t, start){
		if(!start){
			start = this.startAt();
		}

		var args = this.attrs.args,
			x1 = start[0],
			y1 = start[1],
			h1x = args[0],
			h1y = args[1],
			h2x = args[2],
			h2y = args[3],
			x2 = args[4],
			y2 = args[5];

		return Math.atan2(
			0.5 * (3*t * t * (-h1y + 3 * y1 - 3 * y2 + h2y)
				+ 2 * t * (2 * h1y - 5 * y1 + 4 * y2 - h2y)
				+ (-h1y + y2)),
			0.5 * (3 * t * t * (-h1x + 3 * x1 - 3 * x2 + h2x)
				+ 2 * t * (2 * h1x - 5 * x1 + 4 * x2 - h2x)
				+ (-h1x + x2))
		) / Math.PI * 180;
	},

	process: function(ctx){
		var start = this.startAt(),
			args = this.attrs.args,
			x1 = start[0],
			y1 = start[1],
			h1x = args[0],
			h1y = args[1],
			h2x = args[2],
			h2y = args[3],
			x2 = args[4],
			y2 = args[5];

		var bezier = catmullRomToCubicBezier(x1, y1, h1x, h1y, h2x, h2y, x2, y2);
		ctx.bezierCurveTo(bezier[0], bezier[1], bezier[2], bezier[3], bezier[4], bezier[5]);
	}
});

function catmullRomToCubicBezier(x1, y1, h1x, h1y, h2x, h2y, x2, y2){
	var tau = 1;
	var catmull = [
		h1x, h1y, // 0, 1
		x1, y1, // 2, 3
		x2, y2, // 4, 5
		h2x, h2y // 6, 7
	];

	var bezier = [
		catmull[2], catmull[3],
		catmull[2] + (catmull[4] - catmull[0]) / (6 * tau),
		catmull[3] + (catmull[5] - catmull[1]) / (6 * tau),
		catmull[4] + (catmull[6] - catmull[2]) / (6 * tau),
		catmull[5] + (catmull[7] - catmull[3]) / (6 * tau),
		catmull[4], catmull[5]
	];

	return bezier.slice(2);
}

Delta.curves['catmullTo'] = CurveCatmull;
var CurveHermite = new Class(Curve, {
	initialize: function(method, attrs, path){
		this.super('initialize', arguments);
		// h1x, h1y, h2x, h2y, x, y, [detail]
	},

	attrHooks: new CurveAttrHooks({
		h1x: {
			set: function(value){
				this.attrs.args[4] = value;
				this.update();
			}
		},
		h1y: {
			set: function(value){
				this.attrs.args[5] = value;
				this.update();
			}
		},
		h2x: {
			set: function(value){
				this.attrs.args[0] = value;
				this.update();
			}
		},
		h2y: {
			set: function(value){
				this.attrs.args[1] = value;
				this.update();
			}
		},
		h3x: {
			set: function(value){
				this.attrs.args[2] = value;
				this.update();
			}
		},
		h3y: {
			set: function(value){
				this.attrs.args[3] = value;
				this.update();
			}
		}
	}),

	pointAt: function(t, start){
		if(!start){
			start = this.startAt();
		}

		var args = this.attrs.args,
			h0x = start[0],
			h0y = start[1],
			h2x = args[0],
			h2y = args[1],
			h3x = args[2],
			h3y = args[3],
			h1x = args[4],
			h1y = args[5];

		var a = [
			2 * h0x - 2 * h1x + h2x + h3x,
			2 * h0y - 2 * h1y + h2y + h3y
		];
		var b = [
			-3 * h0x + 3 * h1x - 2 * h2x - h3x,
			-3 * h0y + 3 * h1y - 2 * h2y - h3y
		];
		var c = [h2x, h2y];
		var d = [h0x, h0y]

		return [
			t * t * t * a[0] + t * t * b[0] + t * c[0] + d[0],
			t * t * t * a[1] + t * t * b[1] + t * c[1] + d[1]
		];
	},

	endAt: function(){
		return [this.attrs.args[4], this.attrs.args[5]];
	},

	tangentAt: function(t, start){
		if(!start){
			start = this.startAt();
		}

		var args = this.attrs.args,
			x1 = start[0],
			y1 = start[1],
			h1x = args[0],
			h1y = args[1],
			h2x = args[2],
			h2y = args[3],
			x2 = args[4],
			y2 = args[5];

		return Math.atan2(
			0.5 * (3*t * t * (-h1y + 3 * y1 - 3 * y2 + h2y)
				+ 2 * t * (2 * h1y - 5 * y1 + 4 * y2 - h2y)
				+ (-h1y + y2)),
			0.5 * (3 * t * t * (-h1x + 3 * x1 - 3 * x2 + h2x)
				+ 2 * t * (2 * h1x - 5 * x1 + 4 * x2 - h2x)
				+ (-h1x + x2))
		) / Math.PI * 180;
	},

	process: function(ctx){
		this.approx(100, function(value, prev, cur, i){
			if(i === 0){
				ctx.moveTo(prev[0], prev[1]);
			}
			ctx.lineTo(cur[0], cur[1]);
		});
	}
});

Delta.curves['hermiteTo'] = CurveHermite;
/*Delta.Math.EPSILON_intersection = Number.EPSILON;

Delta.Math.Line = {
	pointAt: function(start, end, t){
		return [
			start[0] + t * (end[0] - start[0]),
			start[1] + t * (end[1] - start[1])
		];
	},

	splitAt: function(start, end, t){
		var point = Delta.Math.Line.pointAt(start, end, t);
		return {
			start: [start, point],
			end: [point, end]
		};
	},

	length: function(start, end){
		return Math.sqrt(
			Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2)
		);
	},

// why is this func?
	same: function(line1start, line1end, line2start, line2end){
		return (
			Math.abs(line1start[0] - line2start[0]) < Number.EPSILON &&
			Math.abs(line1start[1] - line2start[1]) < Number.EPSILON &&
			Math.abs(line1end[0] - line2end[0]) < Number.EPSILON &&
			Math.abs(line1end[1] - line1end[1]) < Number.EPSILON
		);
	},

	intersections: function(line1start, line1end, line2start, line2end){
		// what if line1start == line1end or line2start == line2end ?
		// P1x + (P2x - P1x)t = Q1x + (Q2x - Q1x)v
		// P1y + (P2y - P1y)t = Q1y + (Q2y - Q1y)v

		// (P2x - P1x)t + (Q1x - Q2x)v = Q1x - P1x
		// (P2y - P1y)t + (Q1y - Q2y)v = Q1y - P1y
/*
		var det = (line1end[0] - line1start[0]) * (line2start[1] - line2end[1]) - (line1end[1] - line1start[0]) * (line2start[0] - line2end[0]);
		if(Math.abs(det) < Delta.Math.EPSILON_intersection){
			return [];
			if(line1end[0] < line2start[0] || line1start[0] > line2end[0]){
				return [];
			}

			// note: lines can intersect in 2 points ([-5,-5], [5, 5] and [-4, -4], [4, 4])
			// and what if they are same?
			var points = [];
			if(line1end[0] < line2start[0]){
				points.push(line1end);
				points.push(line2start);
			}

			if(line2end[0] > line1start[0]){
				points.push(line2end);
				points.push(line1start);
			}
			return points;
		} else {
			var det1 = (line2start[0] - line1start[0]) * (line2start[1] - line2end[1]) - (line2start[1] - line1start[1]) * (line2start[0] - line2end[0]),
				t = det1 / det,
				det2 = (line1end[0] - line1start[0]) * (line2start[0] - line1start[0]) - (line1end[1] - line1start[0]) * (line2start[1] - line1start[1]),
				v = det2 / det;
			console.log(t, v);
			if(t >= 0 && t <= 1 && v >= 0 && v <= 1){
				return [Delta.Math.Line.pointAt(line1start, line1end, t)];
			} else {
				return [];
			}
		} */
		//x1 = line1start[0]
		//y1 = line1start[1]
		//x2 = line1end[0]
		//y2 = line1end[0]
		//x3 = line2start[0]
		//y3 = line2start[1]
		//x4 = line2end[0]
		//y4 = line2end[1]
/*		var nx = (line1start[0]*line1end[0]-line1start[1]*line1end[0]) * (line2start[0]-line2end[0])-(line1start[0]-line1end[0]) * (line2start[0]*line2end[1]-line2start[1]*line2end[0]),
			ny = (line1start[0]*line1end[0]-line1start[1]*line1end[0]) * (line2start[1]-line2end[1])-(line1start[1]-line1end[0]) * (line2start[0]*line2end[1]-line2start[1]*line2end[0]),
			d = (line1start[0]-line1end[0]) * (line2start[1]-line2end[1])-(line1start[1]-line1end[0]) * (line2start[0]-line2end[0]);
		if(d === 0){
			return [];
		}
		return [[nx / d | 0, ny / d | 0]];
	}
};

// Curves
Curve.canvasFunctions.moveTo.pointAt = function(curve, t, startPoint){
	return curve.funcAttrs;
};

// todo: attrs instead of curve?
Curve.canvasFunctions.lineTo.pointAt = function(curve, t, startPoint){
	if(!startPoint){
		startPoint = curve.startAt();
	}
	return [
		startPoint[0] + t * (curve.funcAttrs[0] - startPoint[0]),
		startPoint[1] + t * (curve.funcAttrs[1] - startPoint[1]),
	];
};

Curve.canvasFunctions.lineTo.splitAt = function(curve, t, startPoint){
	if(!startPoint){
		startPoint = curve.startAt();
	}
	var point = Curve.canvasFunctions.lineTo.pointAt(curve, t, startPoint);
	return {
		start: [
			startPoint,
			point
		],
		end: [
			point,
			[curve.funcAttrs[0], curve.funcAttrs[1]]
		]
	};
};
 */
Delta.Math.Quadratic = {
	pointAt: function(start, handle, end, t){
		return [
			Math.pow(1 - t, 2) * start[0] + 2 * t * (1 - t) * handle[0] + t * t * end[0],
			Math.pow(1 - t, 2) * start[1] + 2 * t * (1 - t) * handle[1] + t * t * end[1]
		];
	},

	splitAt: function(start, handle, end, t){
		var point = Delta.Math.Quadratic.pointAt(start, handle, end, t);
		return {
			start: [
				start,
				[
					t * handle[0] + (1 - t) * start[0],
					t * handle[1] + (1 - t) * start[1]
				],
				point
			],
			end: [
				point,
				[
					t * end[0] + (1 - t) * handle[0],
					t * end[1] + (1 - t) * handle[1]
				],
				end
			]
		};
	},

	length: function(start, handle, end){
		;
	},

	intersect: function(line1start, line1handle, line1end, line2start, line2handle, line2end){
		//;
	}
};

Curve.canvasFunctions.quadraticCurveTo.pointAt = function(curve, t, startPoint){
	if(!startPoint){
		startPoint = curve.startAt();
	}

	var x1 = startPoint[0],
		y1 = startPoint[1],
		p = curve.funcAttrs;

	return [
		Math.pow(1 - t, 2) * x1 + 2 * t * (1 - t) * p[0] + t * t * p[2],
		Math.pow(1 - t, 2) * y1 + 2 * t * (1 - t) * p[1] + t * t * p[3]
	];
};

Curve.canvasFunctions.quadraticCurveTo.splitAt = function(curve, t, startPoint){
	if(!startPoint){
		startPoint = curve.startAt();
	}
	var p = curve.funcAttrs;
	var point = Curve.canvasFunctions.quadraticCurveTo.pointAt(curve, t, startPoint);
	return {
		start: [
			startPoint,
			[
				t * p[0] - (t - 1) * startPoint[0],
				t * p[1] - (t - 1) * startPoint[1]
			],
			point
		],
		end: [
			point,
			[
				t * p[2] - (t - 1) * p[0],
				t * p[3] - (t - 1) * p[1]
			],
			[
				p[2],
				p[3]
			]
		]
	};
};

Delta.Math.Bezier = {
	pointAt: function(start, handle1, handle2, end, t){
		return [
			Math.pow(1 - t, 3) * start[0] + 3 * t * Math.pow(1 - t, 2) * handle1[0] + 3 * t * t * (1 - t) * handle2[0] + t * t * t * end[0],
			Math.pow(1 - t, 3) * start[1] + 3 * t * Math.pow(1 - t, 2) * handle1[1] + 3 * t * t * (1 - t) * handle2[1] + t * t * t * end[1]
		];
	},

	splitAt: function(start, handle1, handle2, end, t){
		var point = Delta.Math.Bezier.pointAt(start, handle1, handle2, end, t);
		return {
			start: [
				start,
				[
					t * handle1[0] + (1 - t) * start[0],
					t * handle2[1] + (1 - t) * start[1]
				],
				[
					t * t * handle2[0] + 2 * t * (1 - t) * handle1[0] + Math.pow(1 - t, 2) * start[0],
					t * t * handle2[1] + 2 * t * (1 - t) * handle1[1] + Math.pow(1 - t, 2) * start[1]
				],
				point
			],
			end: [
				point,
				[
					t * t * end[0] + 2 * t * (1 - t) * handle2[0] + Math.pow(1 - t, 2) * handle1[0],
					t * t * end[1] + 2 * t * (1 - t) * handle2[1] + Math.pow(1 - t, 2) * handle1[1]
				],
				[
					t * end[0] - (1 - t) * handle2[0],
					t * end[1] - (1 - t) * handle2[1]
				],
				end
			]
		};
	},

	length: function(start, handle1, handle2, end){
		;
	},

	intersect: function(
		line1start, line1handle1, line1handle2, line1end,
		line2start, line2handle1, line2handle2, line2end
		){
		//;
	}
};

Curve.canvasFunctions.bezierCurveTo.pointAt = function(curve, t, startPoint){
	if(!startPoint){
		startPoint = curve.startAt();
	}

	var x1 = startPoint[0],
		y1 = startPoint[1],
		p = curve.funcAttrs;

	return [
		Math.pow(1 - t, 3) * x1 + 3 * t * Math.pow(1 - t, 2) * p[0] + 3 * t * t * (1 - t) * p[2] + t * t * t * p[4],
		Math.pow(1 - t, 3) * y1 + 3 * t * Math.pow(1 - t, 2) * p[1] + 3 * t * t * (1 - t) * p[3] + t * t * t * p[5]
	];
};

Curve.canvasFunctions.bezierCurveTo.splitAt = function(curve, t, startPoint){
	if(!startPoint){
		startPoint = curve.startAt();
	}
	var p = curve.funcAttrs;
	var point = Curve.canvasFunctions.bezierCurveTo.pointAt(curve, t, startPoint);
	return {
		start: [
			startPoint,
			[
				t * p[0] - (t - 1) * startPoint[0],
				t * p[1] - (t - 1) * startPoint[1]
			],
			[
				t * t * p[2] - 2 * t * (t - 1) * p[0] + (t - 1) * (t - 1) * startPoint[0],
				t * t * p[3] - 2 * t * (t - 1) * p[1] + (t - 1) * (t - 1) * startPoint[1]
			],
			point
		],
		end: [
			point,
			[
				t * t * p[4] - 2 * t * (t - 1) * p[2] + (t - 1) * (t - 1) * p[0],
				t * t * p[5] - 2 * t * (t - 1) * p[3] + (t - 1) * (t - 1) * p[1]
			],
			[
				t * p[4] - (t - 1) * p[2],
				t * p[5] - (t - 1) * p[3]
			],
			[
				p[4],
				p[5]
			]
		]
	};
};


Path = new Class(Drawable, {

	initialize : function(args, context){
		this.super('initialize', arguments);

		if(isObject(args[0])){
			args = this.processObject(args[0], Path.args);
		}

		this.attrs.d = Path.parse(args[0], this);

		// parseInt is neccessary bcs isNaN('30px') -> true
		if(isNaN(parseInt(args[1]))){
			args[3] = args[1];
			args[4] = args[2];
			args[1] = args[2] = null;
		}

		if(args[1] || args[2]){
			this.attrs.x = args[1] || 0;
			this.attrs.y = args[2] || 0;
		}

		if(args[3]){
			this.styles.fillStyle = args[3];
		}
		if(args[4]){
			this.attrs.stroke = args[4];
			Drawable.processStroke(args[4], this.styles);
		}
	},

	attrHooks: new DrawableAttrHooks({
		d: {
			set: function(value){
				this.update();
				return value;
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
		}
	}),

	// Curves
	curve: function(index, value){
		if(value === undefined){
			return this.attrs.d[index];
		}

		if(!isNaN(value[0])){
			value = [value];
		}

		value = Path.parse(value, this, index !== 0);
		// todo: when removing curve unbind it from path
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
	push: function(method, attrs){
		if(attrs){
			this.attrs.d.push(Delta.curve(method, attrs, this));
		} else {
			this.attrs.d = this.attrs.d.concat(Path.parse(method, this, this.attrs.d.length !== 0));
		}
		return this.update();
	},

	each: function(){
		this.attrs.d.forEach.apply(this.attrs.d, arguments);
		return this;
	},

	map: function(){
		return this.attrs.d.map.apply(this.attrs.d, arguments);
	},

	// Curves addition
	moveTo: function(x, y){
		// todo: optimize!
		// return this.attrs.d.push(Delta.curve('moveBy', [x, y], this)); - but it is not beautiful :p
		return this.push(['moveTo', x, y]);
	},

	lineTo : function(x, y){
		return this.push(['lineTo', x, y]);
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
		return this.push(['closePath']);
	},

	isPointIn : function(x, y){
		;
	},

	bounds: function(transform, around){
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

		return this.super('bounds', [
			[minX, minY, maxX - minX, maxY - minY],
			transform, around
		]);
	},

	draw : function(ctx){
		if(this.attrs.visible){
			this.context.renderer.drawPath(
				[this.attrs.d, this.attrs.x, this.attrs.y],
				ctx, this.styles, this.matrix, this
			);
		}
	}

} );

Path.args = ['d', 'offsetX', 'offsetY', 'fill', 'stroke'];

Path.parse = function(data, path, firstIsNotMove){
	if(!data){
		return [];
	}
/*
	if(data + '' === data){
		return Path.parseSVG(data, path, firstIsNotMove);
	} */

	if(data instanceof Curve){
		data.path = path;
		return [data];
	}

	if(data[0] !== undefined && (+data[0] === data[0] || data[0] + '' === data[0])){
		data = [data];
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

/* Path.parseSVG = function(data, path, firstIsNotMove){
	return [];
}; */

Delta.path = function(){
	return new Path(arguments);
};

Delta.Path = Path;
// requires Curve.Math

// todo: transforms support
extend(Path.prototype, {

    length: function(){
        return this.attrs.d.reduce(function(sum, curve){
            return sum + curve.length();
        }, 0);
    },

    startAt: function(){
        return this.pointAt(0);
    },

    curveAt: function(t){
        if(t < 0 || t > 1){
            return null;
        }
        var curves = this.attrs.d;
        if(t === 1){
            // must return the last (geometric! not moveTo) curve
            t = 1 - Number.EPSILON;
        }
        var len = this.length();
        var currentLen = 0;
        for(var i = 0; i <= curves.length; i++){
            if(currentLen / len > t){
                return curves[i - 1];
            }
            currentLen += curves[i].length();
        }
        return null;
    },

    _pathToCurveParams: function(t){
        if(t < 0 || t > 1){
            // todo: add values < 0 and > 1 for elasticOut animation
            return null;
        }
        var curves = this.attrs.d;

        var len = this.length();
        var lenStart;
        var lenEnd = 0;
        var curve;
        for(var i = 0; i <= curves.length; i++){
            if(lenEnd / len > t){
                curve = curves[i - 1];
                break;
            }
            lenStart = lenEnd;
            lenEnd += curves[i].length();
        }

        return {
            t: (t - lenStart / len) / ((lenEnd - lenStart) / len),
            curve: curve
        };
    },

    pointAt: function(t){
        if(t === 1){
            // must return the end of the last geometric (! not moveTo!) curve
            return this.curveAt(1).endAt();
        }
        var curveParams = this._pathToCurveParams(t);
        return curveParams.curve.pointAt(curveParams.t);
    },

    tangentAt: function(t){
        if(t === 1){
            t = 1 - Number.EPSILON;
        }
        var curveParams = this._pathToCurveParams(t);
        return curveParams.curve.tangentAt(curveParams.t);
    },

    normalAt: function(t){
        if(t === 1){
            t = 1 - Number.EPSILON;
        }
        var curveParams = this._pathToCurveParams(t);
        return curveParams.curve.normalAt(curveParams.t);
    },

    nearest: function(x, y, detail){
        return this.attrs.d.reduce(function(current, curve){
            var nearest = curve.nearest(x, y, detail);
            if(nearest.distance < current.distance){
                return nearest;
            }
            return current;
        }, {
            point: null,
            t: 0,
            distance: Infinity
        });
    }

});
// CurveUtils
extend(Curve.prototype, {
	before: function(){
		if(!this.path){
			return null;
		}

		var d = this.path.attr('d');
		var index = d.indexOf(this);

		if(index < 1){
			return null;
		}
		return d[index - 1];
	}
});

// SVG Curves
Delta.curves['moveBy'] = new Class(Curve, {
	process: function(ctx){
		var lastPoint = this.before().endAt();
		ctx.moveTo(lastPoint[0] + this.funcAttrs[0], lastPoint[1] + this.funcAttrs[1]);
	},

	endAt: function(){
		var lastPoint = this.before().endAt();
		return [lastPoint[0] + this.funcAttrs[0], lastPoint[1] + this.funcAttrs[1]];
	}
});

Delta.curves['lineBy'] = new Class(Curve, {
	process: function(ctx){
		var lastPoint = this.before().endAt();
		ctx.lineTo(lastPoint[0] + this.funcAttrs[0], lastPoint[1] + this.funcAttrs[1]);
	},

	endAt: function(){
		var lastPoint = this.before().endAt();
		return [lastPoint[0] + this.funcAttrs[0], lastPoint[1] + this.funcAttrs[1]];
	}
});

Delta.curves['quadraticCurveBy'] = new Class(Curve, {
	process: function(ctx){
		var lastPoint = this.before().endAt();
		ctx.quadraticCurveTo(
			lastPoint[0] + this.funcAttrs[0],
			lastPoint[1] + this.funcAttrs[1],
			lastPoint[0] + this.funcAttrs[2],
			lastPoint[1] + this.funcAttrs[3]
		);
	},

	endAt: function(){
		var lastPoint = this.before().endAt();
		return [
			lastPoint[0] + this.funcAttrs[0],
			lastPoint[1] + this.funcAttrs[1],
			lastPoint[0] + this.funcAttrs[2],
			lastPoint[1] + this.funcAttrs[3]
		];
	}
});

extend(Path.prototype, {
	moveBy: function(x, y){
		return this.attrs.d.push(Delta.curve('moveBy', [x, y], this));
	}
})

Picture = new Class(Drawable, {

	initialize : function(args, context){
		this.super('initialize', arguments);

		if(isObject(args[0])){
			args = this.processObject(args[0], Picture.args);
		}

		this.attrs.image = Picture.parse(args[0]);
		this.attrs.x = args[1];
		this.attrs.y = args[2];
		this.attrs.width = args[3] === undefined ? 'auto' : args[3];
		this.attrs.height = args[4] === undefined ? 'auto' : args[4];
		if(args[5]){
			this.attrs.crop = args[5];
		}

		this.attrs.image.addEventListener('load', function(event){
			this.update();
			this.fire('load', event);
		}.bind(this));

		this.attrs.image.addEventListener('error', function(e){
			this.fire('error', event);
		}.bind(this));
	},

	attrHooks: new DrawableAttrHooks({
		image: {
			set: function(value){
				value = Picture.parse(value);

				if(value.complete){
					this.update();
				}

				value.addEventListener('load', function(event){
					this.update();
					this.fire('load', event);
				}.bind(this));

				return value;
			}
		},

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
		// todo:
		// what if user want to push the image again?
		// should be able to restore the link to blob
		// the blob is still saved in the image.blob, just needs to call domurl.createObjectURL again
		if(this.attrs.image.blob){
			domurl.revokeObjectURL(this.attrs.image.blob);
		}
	},

	getRealSize: function(){
		var w = this.attrs.width,
			h = this.attrs.height;

		// they both are auto by default because saving proportions is by default true
		if(w === 'auto' && h === 'auto'){
			w = h = 'native';
		}

		if(w === 'auto'){
			w = this.attrs.image.width * (h / this.attrs.image.height);
		} else if(w === 'native'){
			w = this.attrs.image.width;
		}

		if(h === 'auto'){
			h = this.attrs.image.height * (w / this.attrs.image.width);
		} else if(h === 'native'){
			h = this.attrs.image.height;
		}

		return [w, h];
	},

	bounds: function(transform, around){
		var size = this.getRealSize();
		return this.super('bounds', [
			[this.attrs.x, this.attrs.y, size[0], size[1]],
			transform, around
		]);
	},

	isPointIn : function(x, y){
		var point = this.super('isPointIn', [x, y]);
		x = point[0];
		y = point[1];

		var size = this.getRealSize();
		return x > this.attrs.x && y > this.attrs.y && x < this.attrs.x + size[0] && y < this.attrs.y + size[1];
	},

	draw : function(ctx){
		if(this.attrs.visible && this.attrs.image.complete){
			var params = [this.attrs.image, this.attrs.x, this.attrs.y];

			if(this.attrs.width || this.attrs.height){
				var size = this.getRealSize();
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

Delta.image = function(){
	return new Picture(arguments);
};

Delta.Image = Picture;

var defaultBaseline = 'top';

Text = new Class(Drawable, {

	initialize : function(args, context){
		this.super('initialize', arguments);

		if(isObject(args[0])){
			if(args[0].align){
				this.attrs.align = args[0].align;
				this.styles.textAlign = args[0].align;
			}

			if(args[0].baseline){
				this.attrs.baseline = args[0].baseline;
			} else {
				this.attrs.baseline = defaultBaseline;
			}

			if(args[0].breaklines !== undefined){
				this.attrs.breaklines = args[0].breaklines;
			} else {
				this.attrs.breaklines = true;
			}

			if(args[0].lineHeight !== undefined){
				this.attrs.lineHeight = args[0].lineHeight;
			} else {
				this.attrs.lineHeight = 'auto';
			}

			if(args[0].maxStringWidth !== undefined){
				this.attrs.maxStringWidth = args[0].maxStringWidth;
			} else {
				this.attrs.maxStringWidth = Infinity;
			}

			if(args[0].blockWidth !== undefined){
				this.attrs.blockWidth = args[0].blockWidth;
			} else {
				this.attrs.blockWidth = Infinity;
			}

			if(args[0].boundsMode){
				this.attrs.boundsMode = args[0].boundsMode;
			} else {
				this.attrs.boundsMode = 'inline';
			}

			if(args[0].text){
				args[0].string = args[0].text;
			}

			// change to: this.attrs.boundsMode = args[0].boundsMode || 'inline';
			// and so on

			args = this.processObject(args[0], Text.args);
		} else {
			this.attrs.baseline = defaultBaseline;
			this.attrs.breaklines = true;
			this.attrs.lineHeight = 'auto';
			this.attrs.maxStringWidth = Infinity; // in the draw: if this.attrs.maxStringWidth < Infinity then ...
			this.attrs.blockWidth = Infinity;
			this.attrs.boundsMode = 'inline';
		}

		this.styles.textBaseline = this.attrs.baseline;

		this.attrs.string = args[0] + '';
		this.attrs.x = args[1];
		this.attrs.y = args[2];
		this.attrs.font = Text.parseFont(args[3] || Text.font);
		this.styles.font = Text.genFont(this.attrs.font);
		if(args[4]){
			this.styles.fillStyle = args[4];
		}
		if(args[5]){
			this.styles.stroke = args[5];
			Drawable.processStroke(args[5], this.styles);
		}

	},

	attrHooks: new DrawableAttrHooks({
		string: {
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
				extend(this.attrs.font, Text.parseFont(value));
				this.styles.font = Text.genFont(this.attrs.font);
				this.update();
				return null;
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

		breaklines: {
			set: function(){
				this.update();
			}
		},

		lineHeight: {
			set: function(){
				this.lines = null;
				this.update();
			}
		},

		maxStringWidth: {
			set: function(){
				this.update();
			}
		},

		blockWidth: {
			set: function(){
				this.lines = null;
				this.update();
			}
		}
	}),

	lines: null,

	processLines: function(ctx){
		var text = this.attrs.string,
			lines = this.lines = [],

			height = this.attrs.lineHeight === 'auto' ? this.attrs.font.size : this.attrs.lineHeight,
			maxWidth = this.attrs.blockWidth,
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
				});
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

	draw : function(ctx){
		if(this.attrs.visible){
			if(!this.attrs.breaklines){
				this.context.renderer.drawText([
					this.attrs.string,
					this.attrs.x,
					this.attrs.y,
					this.attrs.maxStringWidth < Infinity ? this.attrs.maxStringWidth : undefined
				], ctx, this.styles, this.matrix, this);
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
		var point = this.super('isPointIn', [x, y]);
		x = point[0];
		y = point[1];

		var bounds = this.bounds(false);
		return x > bounds.x1 && y > bounds.y1 && x < bounds.x2 && y < bounds.y2;
	},

	measure: function(){
		var width;
		if(this.attrs.breaklines){
			if(!this.lines){
				this.processLines(this.context.context);
			}

			this.context.renderer.preMeasure(this.styles.font);
			width = this.lines.reduce(function(prev, cur){
				cur = this.context.renderer.measure(cur.text);
				if(prev < cur){
					return cur;
				}
				return prev;
			}.bind(this), 0);
			this.context.renderer.postMeasure();
		} else {
			this.context.renderer.preMeasure(this.styles.font);
			width = this.context.renderer.measure(this.attrs.string);
			this.context.renderer.postMeasure();
		}
		return width;
	},

	bounds: function(transform, around){
		var bounds,
			blockX = this.attrs.x,
			blockY = this.attrs.y,
			width,
			height = this.attrs.lineHeight === 'auto' ? this.attrs.font.size : this.attrs.lineHeight;

		// text processing
		if(this.attrs.breaklines){
			width = this.attrs.blockWidth;

			if(this.attrs.boundsMode === 'inline' || !isFinite(width)){
				width = this.measure();
			}

			if(!this.lines){
				this.processLines();
			}
			height *= this.lines.length;
		} else {
			width = this.measure();
			if(this.attrs.maxStringWidth < width){
				width = this.attrs.maxStringWidth;
			}
		}

		// modifiers
		var baseline = this.styles.textBaseline,
			align = this.styles.textAlign;

		if(baseline === 'middle'){
			blockY -= this.attrs.font.size / 2;
		} else if(baseline === 'bottom' || baseline === 'ideographic'){
			blockY -= this.attrs.font.size;
		} else if(baseline === 'alphabetic'){
			blockY -= this.attrs.font.size * 0.8;
		}

		if(align === 'center'){
			blockX -= width / 2;
		} else if(align === 'right'){
			blockX -= width;
		}

		return this.super('bounds', [
			[blockX, blockY, width, height], transform, around
		]);
	}

});

Text.font = '10px sans-serif';
Text.args = ['string', 'x', 'y', 'font', 'fill', 'stroke'];

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
				object.size = Delta.distance(part);
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

Delta.text = function(){
	return new Text(arguments);
};

Delta.Text = Text;

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
			this.attrHooks = extend(
				extend({}, this.attrHooks),
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
			return Delta.color(this.attrs.colors[t]);
		}

		var colors = this.attrs.colors,
			keys = Object.keys(colors).sort(); // is this sort sorting them right? as numbera or as strings?

		if(t < keys[0]){
			return Delta.color(colors[keys[0]]);
		} else if(t > keys[keys.length - 1]){
			return Delta.color(colors[keys[keys.length - 1]]);
		}

		for(var i = 0; i < keys.length; i++){
			if(+keys[i] > t){
				var c1 = Delta.color(colors[keys[i - 1]]),
					c2 = Delta.color(colors[keys[i]]);
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

Delta.Gradient = Gradient;

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

		// todo: error process?
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

Delta.Pattern = Pattern;

// Class
function Class(parent, properties){
	if(!properties){
		properties = parent;
		parent = null;
	}

	var init = function(){
		return this.initialize && this.initialize.apply(this, arguments);
	};

	if(parent){
		/* if(properties.liftInits){
			// go to the parent
			init = function(){
				if(init.prototype.__initialize__){
					return init.prototype.__initialize__.apply(this, arguments);
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

				if(init.prototype.initialize && properties.initialize === init.prototype.initialize){
					return init.prototype.initialize.apply(this, arguments);
				}
			};
		} */

		// prototype inheriting
		var sklass = function(){};
		sklass.prototype = parent.prototype;
		init.prototype = new sklass();
		init.prototype.superclass = parent.prototype;
		init.prototype.constructor = init;

		init.prototype.super = function(name, args){
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

	extend(init.prototype, properties);

	return init;
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
function argument(index){
	return function(value){
		return this.argument( index, value );
	};
} // не нужно

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
String: something + '' === something
Boolean: !!something === something
Array: Array.isArray(something)
Number: +something === something
Function: typeof something === 'function'
 */

function isObject(a){
	return toString.call(a) === '[object Object]';
}

function isPivot(v){
	return Array.isArray(v) || v in Delta.corners;
}

function isNumberLike(value){
	return +value === value || (value + '' === value && reNumberLike.test(value));
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

Delta.class = Class;
Delta.Bounds = Bounds;
Delta.extend = extend;
Delta.argument = argument;
Delta.wrap = wrap;
Delta.isObject = isObject;
Delta.isNumberLike = isNumberLike;
Delta.isPatternLike = isPatternLike;

// constants
Delta.dashes = {
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

Delta.fileTypes = {
	'jpeg': 'image/jpeg',
	'jpg': 'image/jpeg',
	'png': 'image/png',
	'webp': 'image/webp'
};

Delta.corners = {
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

Delta.colors = { // http://www.w3.org/TR/css3-color/#svg-color
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
Delta.coordsOfElement = function(element){ // returns coords of a DOM element
	var box = element.getBoundingClientRect(),
		style = window.getComputedStyle(element);

	return {
		x: box.left + parseInt(style.borderLeftWidth || 0) + parseInt(style.paddingLeft || 0),
		y: box.top  + parseInt(style.borderTopWidth  || 0) + parseInt(style.paddingTop  || 0)
	};
};

// Clean functions
Delta.clone = function(object){
	var result = new object.constructor();
	for(var i in object){
		if(has(object, i)){
			if(typeof object[i] === 'object' && !(object[i] instanceof Context) && !(object[i] instanceof Image)){
				result[i] = Delta.clone(object[i]);
			} else {
				result[i] = object[i];
			}
		}
	}
	return result;
};

// Matrices
// renamed from Delta.multiply
// rename to Delta.transformMatrix?
Delta.transform = function(m1, m2){ // multiplies two 2D-transform matrices
	return [
		m1[0] * m2[0] + m1[2] * m2[1],
		m1[1] * m2[0] + m1[3] * m2[1],
		m1[0] * m2[2] + m1[2] * m2[3],
		m1[1] * m2[2] + m1[3] * m2[3],
		m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
		m1[1] * m2[4] + m1[3] * m2[5] + m1[5]
	];
};

Delta.transformPoint = function(matrix, point){
	return [
		matrix[0] * point[0] + matrix[2] * point[1] + matrix[4],
		matrix[1] * point[0] + matrix[3] * point[1] + matrix[5]
	];
};

Delta.inverseTransform = function(matrix){
	var det = matrix[0] * matrix[3] - matrix[2] * matrix[1];

	if(det === 0){
		return null;
	}

	return [
		matrix[3] / det,
		-matrix[1] / det,
		-matrix[2] / det,
		matrix[0] / det,
		-(matrix[3] * matrix[4] - matrix[2] * matrix[5]) / det,
		(matrix[1] * matrix[4] - matrix[0] * matrix[5]) / det
	];
};

Delta.color = function color(value){ // parses CSS-like colors (rgba(255,0,0,0.5), green, #f00...)
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
		value = value.substring(value.indexOf('(') + 1, value.length-1).replace(/\s/g, '').split(',');
		var opacity = value[3];
		value = value.slice(0, 3).map(function(v, i){
			// rgba(100%, 0%, 50%, 1)
			if(v.indexOf('%') > 0){
				return Math.round(parseInt(v) * 2.55);
			}
			return parseInt(v);
		});

		if(opacity === undefined){
			opacity = 1;
		}
		value.push(Number(opacity));

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
	else if(value in Delta.colors){
		return Delta.color('#' + Delta.colors[value]);
	}
	// 'rand'
	else if(value === 'rand'){
		return [Math.round(Math.random() * 255), Math.round(Math.random() * 255), Math.round(Math.random() * 255), 1];
	}

	return [0, 0, 0, 0];
};

Delta.angleUnit = 'grad';
Delta.unit = 'px';

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

Delta.snapToPixels = 0;

function distance(value, dontsnap){
	if(value === undefined) return;
	if(!value) return 0;
	if(Delta.snapToPixels && !dontsnap){
		return Math.round(Delta.distance(value, true) / Delta.snapToPixels) * Delta.snapToPixels;
	}

	if(+value === value){
		if(Delta.unit !== 'px'){
			return Delta.distance( value + '' + Delta.unit );
		}

		return value;
	}

	value += '';
	if(value.indexOf('px') === value.length-2){
		return parseInt(value);
	}

	if(!Delta.units){
		if(!document){
			Delta.units = defaultUnits;
		} else {
			var div = document.createElement('div');
			document.body.appendChild(div); // FF doesn't need this :)
			Delta.units = {};
			units.forEach(function(unit){
				div.style.width = '1' + unit;
				Delta.units[unit] = parseFloat(getComputedStyle(div).width);
			});
			document.body.removeChild(div);
		}
	}

	var unit = value.replace(/[\d\.]+?/g, '');
	value = value.replace(/[^\d\.]+?/g, '');
	if(unit === ''){
		return value;
	}
	return Math.round(Delta.units[unit] * value);
}

Delta.distance = distance;
// {moduleName Animation.Along}
// {requires Math.Curve}

Drawable.prototype.attrHooks.along = {
	preAnim: function(fx, data){
		var curve = data.curve;
		if(data instanceof Curve || data instanceof Path){
			curve = data;
			data = {};
		}
		var corner = data.corner || 'center';

		corner = this.corner(corner, data.cornerOptions || {
			transform: 'ignore'
		});
		if(data.offset){
			corner[0] -= data.offset[0];
			corner[1] -= data.offset[1];
		}
		fx.initialCoords = corner;
		fx.curve = curve;
		if(!data.dynamic){
			// true if the curve is changed while animation
			// and along animation works like dynamic for some curves always
			fx.startCurvePoint = curve.startAt();
		}
		this.attr('rotatePivot', corner);
		if(+data.rotate === data.rotate){
			this.attr('rotate', data.rotate);
		} else if(data.rotate === true){
			fx.rotate = true;
		}
		fx.addRotate = data.addRotate || 0;
	},

	anim: function(fx){
		var point = fx.curve.pointAt(fx.pos, fx.startCurvePoint);
		point[0] -= fx.initialCoords[0];
		point[1] -= fx.initialCoords[1];
		this.attr('translate', point);
		if(fx.rotate === true){
			this.attr('rotate', fx.curve.tangentAt(fx.pos, null, fx.startCurvePoint) + fx.addRotate);
		}
	}
};
// {moduleName Animation.Morph}
// {requires Curve.Math, Curve.Approx}

Path.prototype.attrHooks.morph = {
	preAnim: function(fx, data){
		var curve = data.curve,
			to = data.to,

			start = curve.startAt(), // иногда кидает ошибку, если несколько анимаций морфа
			index = curve.path.attr('d').indexOf(curve);

		// заменяем кривую на её аппроксимацию
		fx.startCurve = curve;
		fx.endCurve = Path.parse(to, null, true)[0]; // todo: multiple curves & paths

		var curveApprox = new CurveApprox(curve.method, curve.attrs, curve.path, data.detail);
		fx.startPoints = curveApprox._points = curveApprox.genPoints(start);

		// получаем конечные точки аппроксимации
		fx.endPoints = new CurveApprox(fx.endCurve.method, fx.endCurve.attrs, null, data.detail).genPoints(start);
		fx.deltas = fx.endPoints.map(function(endPoint, i){
			return [
				endPoint[0] - fx.startPoints[i][0],
				endPoint[1] - fx.startPoints[i][1]
			];
		});
		// todo: вынести куда-нибудь genPoints (CurveApprox.genPoints), чтобы не создавать каждый раз новый объект
		curve.path.curve(index, curveApprox);
		fx.curve = curveApprox;
		fx.index = index;
	},

	anim: function(fx){
		// noise animation
		// maybe plugin after
		/* fx.curve._points = fx.curve._points.map(function(point, i){
			return [
				fx.startPoints[i][0],
				fx.startPoints[i][1] + Math.random() * 10
			];
		}); */

		fx.curve._points = fx.curve._points.map(function(point, i){
			return [
				fx.startPoints[i][0] + fx.deltas[i][0] * fx.pos,
				fx.startPoints[i][1] + fx.deltas[i][1] * fx.pos
			];
		});
		fx.curve.update();

		if(fx.pos === 1){
			fx.curve.path.curve(fx.index, fx.endCurve);
		}
	}
};
var CurveApprox = new Class(Curve, {
	initialize: function(method, attrs, path, detail){
		this.super('initialize', arguments);
		this.attrs.detail = detail;
	},

	genPoints: function(startPoint){
		var detail = this.attrs.detail || Curve.detail;
		var points = [startPoint || this.startAt()];
		for(var i = 1; i <= detail; i++){
			points.push(this.pointAt(i / detail, points[0]));
		}
		return points;
	},

	process: function(ctx){
		if(!this._points){
			this._points = this.genPoints();
		}

		this._points.forEach(function(point){
			ctx.lineTo(point[0], point[1]);
		});
	}
});

Delta.CurveApprox = CurveApprox;

var CurvePolyline = new Class(Curve, {
	initialize: function(method, attrs, path){
		this.super('initialize', arguments);
		this.attrs = {
			points: attrs
		};
	},

	process: function(ctx){
		if(!this._points){
			this._points = this.genPoints();
		}

		this._points.forEach(function(point){
			ctx.lineTo(point[0], point[1]);
		});
	}
});

Delta.CurvePolyline = CurvePolyline;

var GLContext;

// всё, где комментарий "// {{debug}}", нужно убрать из прода (todo: встроить {{debug}} ... {{/debug}} в grunt модуль)
/*
Основные оптимизации:
 - Рисовать объекты с одним буфером вместе.
 - Рисовать более ближние объекты первыми.
 */

GLContext = new Class(Context, {
	initialize: function(canvas){
		// WebGL
		this.gl = this._getAndPrepareGLContext(canvas);
		if(!this.gl){
			return new Delta.contexts['2d'](canvas);
		}
		this.shaders = {};
		this.buffers = {};

		// Context
		this.canvas    = canvas;
		this.elements  = [];
		this.listeners = {};
		// array for not yet drawn obs
		this._missing  = [];

		this.drawMissingBound = this.drawMissing.bind(this);
		this.updateNowBounded = this.updateNow.bind(this);
	},

	_getAndPrepareGLContext: function(canvas){
		var gl;

		if(gl = canvas.getContext('webgl'));
		else if(gl = canvas.getContext('experimental-webgl'));
		else if(gl = canvas.getContext('webkit-3d'));
		else if(gl = canvas.getContext('moz-webgl'));
		else {
			// webgl is not supported
			return null;
		}

		// проверить, нужно ли вообще эту функцию вызывать
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.clearColor(1, 0.8, 0.9, 1); // maybe 0,0,0,0?
		gl.clear(gl.COLOR_BUFFER_BIT);
		return gl;
	},

	// Methods
	push : function(element){
		element.context = this;
		this.elements.push(element);

		if(element.shadersRequired){
			element.shadersRequired.forEach(function(shaderName){
				this.initShader(shaderName);
			}.bind(this));
		}

		if(element.drawGL){
			this._missing.push(element);
			if(!this._willDrawMissing){
				requestAnimationFrame(this.drawMissingBound);
				this._willDrawMissing = true;
			}
			// надо исполнять в следующем тике, чтобы сгруппировать объекты с одним буфером вместе
			// а в этом тике надо компилировать все нужные для запушленного объекта шейдеры
			// причём там рисуем в обратном порядке => последний скомпиленный шейдер, уже подключенный в gl
			// и используется первым :P
			// element.drawGL(this.gl);
		}

		return element;
	},

	initShader: function(name){
		if(this.shaders[name]){
			return;
		}

		if(!GLContext.shadersFactory[name]){
			throw "The shader \"" + name + "\" is not exist.";
		}

		this.shaders[name] = GLContext.shadersFactory[name](this.gl, this);
	},

	drawMissing: function(){
		this._willDrawMissing = false;

		// Рисовать нужно с depth-буфером и в обратном порядке (чтобы gl-ю приходилось меньше рисовать).
		// Кроме того, подключенный последним шейдер будет заюзан в таком порядке первым.
		// Кроме того, нужно группировать объекты по шейдерам / буферам.
		// Но пока не всё понятно в случае с depthtest с blending mode
		var gl = this.gl;
		this._missing.forEach(function(element){
			element.drawGL(gl);
		});
	}

});

GLContext.shadersFactory = {
	'fragment-common': function(gl){
		return Delta.createShader(gl, gl.FRAGMENT_SHADER, [
			'#ifdef GL_ES',
				'precision highp float;',
			'#endif',

			'varying vec4 vColor;', // а этот шейдер типа не умеет в униформы?
			'void main(void){',
				'gl_FragColor = vec4(vColor[0] / 255.0, vColor[1] / 255.0, vColor[2] / 255.0, vColor[3]);',
			'}'
		].join('\n'));;
	}
};

// GL utilities
Delta.createShader = function(gl, type, source){
	var shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	// {{debug}}
	if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
		var log = gl.getShaderInfoLog(shader);
		gl.deleteShader(shader);
		throw "Shader compilation error: " + log;
	}
	// {{/debug}}
	return shader;
}

Delta.contexts['gl'] = GLContext;
GLContext.shadersFactory['vertex-rect'] = function(gl){
	return Delta.createShader(gl, gl.VERTEX_SHADER, [
		'attribute vec2 aVertexPosition;',
		'uniform vec4 rectCoords;',
		'uniform vec4 uColor;',
		'varying vec4 vColor;',
		 'float canvasWidth = ' + gl.canvas.width + '.0;',
		 'float canvasHeight = ' + gl.canvas.height + '.0;',

		'void main(void){',
			'vColor = uColor;',
			'gl_Position = vec4(',
				// тут можно поделить на canvasWidth всё сразу
				'(aVertexPosition[0] * rectCoords[2] / canvasWidth) - 1.0 + rectCoords[2] / canvasWidth + (rectCoords[0] * 2.0 / canvasWidth),',
				'(aVertexPosition[1] * rectCoords[3] / canvasHeight) + 1.0 - rectCoords[3] / canvasHeight - (rectCoords[1] * 2.0 / canvasHeight),',
				'1.0,',
				'1.0',
			');',
		'}'
	].join('\n'));
};

GLContext.shadersFactory['program-rect'] = function(gl, delta){
	var program = gl.createProgram();
	gl.attachShader(program, delta.shaders['vertex-rect']);
	gl.attachShader(program, delta.shaders['fragment-common']);
	gl.linkProgram(program);

	// {{debug}}
	if(!gl.getProgramParameter(program, gl.LINK_STATUS)){
		throw "Could not initialize shaders";
	}
	// {{/debug}}

	// if(delta._lastProgram !== delta.shaders['program-rect']) ...
	gl.useProgram(program);
	program.uColor = gl.getUniformLocation(program, 'uColor');
	program.rectCoords = gl.getUniformLocation(program, 'rectCoords');
	program.v_aVertexPosition = gl.getAttribLocation(program, 'aVertexPosition');
	gl.enableVertexAttribArray(program.v_aVertexPosition);
	return program;
}

Rect.prototype.shadersRequired = ['fragment-common', 'vertex-rect', 'program-rect'];

Rect.prototype.drawGL = function(gl){
	var delta = this.context;

	if(!delta.buffers['rect']){
		var vertexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
			-1, -1,
			1, 1,
			1, -1,

			-1, -1,
			1, 1,
			-1, 1
		]), gl.STATIC_DRAW);

		delta.buffers['rect'] = vertexBuffer;
	}

	var color = Delta.color(this.styles.fillStyle);

	gl.uniform4f(
		delta.shaders['program-rect'].uColor,
		color[0],
		color[1],
		color[2],
		color[3]
	);

	gl.uniform4f(
		delta.shaders['program-rect'].rectCoords,
		this.attrs.x,
		this.attrs.y,
		this.attrs.width,
		this.attrs.height
	);

	gl.vertexAttribPointer(delta.shaders['program-rect'].v_aVertexPosition, 2, gl.FLOAT, false, 0, 0);
	gl.drawArrays(gl.TRIANGLES, 0, 6);
};

GLContext.shadersFactory['vertex-path'] = function(gl){
	return Delta.createShader(gl, gl.VERTEX_SHADER, [
		'attribute vec2 aVertexPosition;',
		'uniform vec4 rectCoords;',
		'uniform vec4 uColor;',
		'varying vec4 vColor;',
		'float canvasWidth = ' + gl.canvas.width + '.0;',
		'float canvasHeight = ' + gl.canvas.height + '.0;',

		'void main(void){',
			'vColor = uColor;',
			'gl_Position = vec4(',
				'aVertexPosition[0],',
				'aVertexPosition[1],',
				'1.0,',
				'1.0',
			');',
		'}'
	].join('\n'));
};

GLContext.shadersFactory['program-path'] = function(gl, delta){
	var program = gl.createProgram();
	gl.attachShader(program, delta.shaders['vertex-path']);
	gl.attachShader(program, delta.shaders['fragment-common']);
	gl.linkProgram(program);

	// {{debug}}
	if(!gl.getProgramParameter(program, gl.LINK_STATUS)){
		throw "Could not initialize shaders";
	}
	// {{/debug}}

	// if(delta._lastProgram !== delta.shaders['program-rect']) ...
	gl.useProgram(program);
	program.uColor = gl.getUniformLocation(program, 'uColor');
	program.rectCoords = gl.getUniformLocation(program, 'rectCoords');
	program.v_aVertexPosition = gl.getAttribLocation(program, 'aVertexPosition');
	gl.enableVertexAttribArray(program.v_aVertexPosition);
	return program;
}

Path.prototype.shadersRequired = ['fragment-common', 'vertex-path', 'program-path'];

Path.prototype.drawGL = function(gl){
	var delta = this.context;

	if(!delta.buffers['rect']){
		var vertexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
			0.0, 0.0,
			0.5, 0.5,
			0.5, 0.0,
			0.5, -0.5,
			-1.0, 0.0
		]), gl.STATIC_DRAW);

		delta.buffers['rect'] = vertexBuffer;
	}

	var color = Delta.color(this.styles.fillStyle);
	gl.uniform4f(delta.shaders['program-rect'].uColor, color[0], color[1], color[2], color[3]);
	gl.uniform4f(
		delta.shaders['program-rect'].rectCoords,
		10,
		10,
		200,
		200
	);

	gl.vertexAttribPointer(delta.shaders['program-rect'].v_aVertexPosition, 2, gl.FLOAT, false, 0, 0);
	gl.drawArrays(gl.TRIANGLE_FAN, 0, 5);
};



/* Interface:
 - rect.editor('transform');
 - rect.editor('transform', command); // <- command = enable / disable / rotate / freeze / destroy / etc
 - rect.editor('transform', properties); // sets attrs
 */
extend(Drawable.prototype, {
	editor: function(kind, value, params){
		if(!value){
			value = 'enable';
		}

		if(!Delta.editors[kind]){
			throw 'There\'s no ' + kind + ' editor';
		}

		if(value + '' === value){
			return Delta.editors[kind][value](this, params) || this;
		}
	}
});

Delta.editors = {};

// draggable
Delta.editors.draggable = {
	defaultProps: {
		axis: 'both',
		inBounds: null,
		cursor: null,
		cursorAt: null,
		moveWith: [],
		delay: 100,
		distance: 5,
		grid: null,
		helper: null,
		helperOpacity: null,
		snap: false,
		snapMode: 'both',
		snapTolerance: 20,
		stack: [],
		stackReturnZ: false,
		zIndex: null
	},

	enable: function(object){
		var bounds;
		var coords;

		object.on('mousedown', function(e){
			bounds = this.bounds(false);
			coords = [
				e.contextX - bounds.x,
				e.contextY - bounds.y
			];
		});

		window.addEventListener('mouseup', function(){
			bounds = coords = null;
		});

		window.addEventListener('mousemove', function(e){
			if(!coords){
				return;
			}

			var contextCoords = object.context.contextCoords(e.clientX, e.clientY);
			object.attr('translate', [
				contextCoords[0] - bounds.x,
				contextCoords[1] - bounds.y
			]);
			object.fire('drag', {
				contextX: contextCoords[0],
				contextY: contextCoords[1]
			})
		});
	},

	disable: function(object){
		;
	},

	destroy: function(object){
		;
	}
};

Delta.editors.__commonControls = {
	style: {
		radius: 5,
		color: '#0af',
		opacity: 0.3
	},

	point: function(x, y){
		return ctx.circle({
			cx: x,
			cy: y,
			radius: this.style.radius,
			fill: this.style.color,
			stroke: this.style.stroke,
			opacity: this.style.opacity
		});
	},

	border: function(x, y, width, height){
		return ctx.rect({
			x: x,
			y: y,
			width: width,
			height: height,
			stroke: this.style.color,
			opacity: this.style.opacity
		});
	}
};

Delta.editors.transform = {
	enable: function(object){
		var bounds = object.bounds();
		if(!object._editorTransform){
			var controls = this.__controls;
			var lt, lb, rt, rb, border;

			object._editorTransform = {
				border: border = controls.border(bounds.x, bounds.y, bounds.width, bounds.height),
				lt: lt = controls.point(bounds.x1, bounds.y1),
				lb: lb = controls.point(bounds.x1, bounds.y2),
				rt: rt = controls.point(bounds.x2, bounds.y1),
				rb: rb = controls.point(bounds.x2, bounds.y2)
			};

			var ltDown, lbDown, rtDown, rbDown;

			window.addEventListener('mouseup', function(){
				ltDown = lbDown = rtDown = rbDown = null;
			});

			window.addEventListener('mousemove', function(e){
				var coords = object.context.contextCoords(e.clientX, e.clientY);
				if(ltDown){
					lt.attr({
						cx: coords[0],
						cy: coords[1]
					});

					lb.attr('cx', coords[0]);
					rt.attr('cy', coords[1]);

					border.attr({
						x1: coords[0],
						y1: coords[1]
					});

					object.transform(null);
					// attr scale?
					object.scale(
						border.attr('width') / ltDown.width,
						border.attr('height') / ltDown.height,
						'rb'
					);
				} else if(lbDown){
					lb.attr({
						cx: coords[0],
						cy: coords[1]
					});

					lt.attr('cx', coords[0]);
					rb.attr('cy', coords[1]);

					border.attr({
						x1: coords[0],
						y2: coords[1]
					});

					object.transform(null);
					// attr scale?
					object.scale(
						border.attr('width') / lbDown.width,
						border.attr('height') / lbDown.height,
						'rt'
					);
				} else if(rtDown){
					;
				} else if(rbDown){
					;
				}
			});

			// todo: add and use editor.draggable
			lt.on('mousedown', function(){
				ltDown = object.bounds();
			});
			lb.on('mousedown', function(){
				lbDown = object.bounds();
			});
			rt.on('mousedown', function(){
				rtDown = object.bounds();
			});
			rb.on('mousedown', function(){
				rbDown = object.bounds();
			});

		} else {
			object._editorTransform.border.attr('visible', true);
			object._editorTransform.lt.attr('visible', true);
			object._editorTransform.lb.attr('visible', true);
			object._editorTransform.rt.attr('visible', true);
			object._editorTransform.rb.attr('visible', true);
			// fix bounds
			// the object could change
		}
	},

	disable: function(object){
		;
	},

	attr: function(name, value){
		// for rect.editor('transform', properties);
	},

	__controls: Delta.editors.__commonControls
};

Context.prototype.toSVG = function(format, quickCalls){

	;

};

Rect.prototype.toSVG = function(quickCalls){
	return '';
};

Delta.drawGradientCurve = function(curve, ctx){
	var point, lastPoint;

	lastPoint = curve.curve(0);
	for(var i = 1; i < curve.detail; i++){
		point = curve.curve(i / curve.detail);
		ctx.beginPath();
		ctx.moveTo(lastPoint[0], lastPoint[1]);
		ctx.lineTo(point[0], point[1]);
		ctx.lineWidth = curve.width(i / curve.detail);
		ctx.stroke();
		lastPoint = point;
	}
};

Delta.version = "1.9.0";

Delta.query = function(query, context, index, element){
	if(query + '' === query){
		query = (element || document).querySelectorAll(query)[index || 0];
	}
	return new Delta.contexts[context || '2d'](query.canvas || query);
};

Delta.id = function(id, context){
	return new Delta.contexts[context || '2d'](document.getElementById(id));
};

if(typeof module === 'object' && typeof module.exports === 'object'){
	module.exports = Delta;
} else if(typeof define === 'function' && define.amd){
	define('Delta', [], function(){
		return Delta;
	});
} else {
	window.Delta = Delta;
}

})(typeof window !== 'undefined' ? window : this);