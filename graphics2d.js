/*  Graphics2D Core 1.9.0
 *
 *  Author: Dmitriy Miroshnichenko aka Keyten <ikeyten@gmail.com>
 *  Last edit: 28.1.2017
 *  License: MIT / LGPL
 */

(function(window, undefined){

// The main graphics2D class
var $ = {},

// Classes
	Context,
	Drawable,
	Shape, Rect, Circle, Curve, Path, Img, Raster, Text,
	Gradient, Pattern, Bounds, Style,

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

// {{don't include WebGL.js}}

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

	postRedraw: function(ctx){
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

	drawImage: function(params, ctx, style, matrix, object){
		this.pre(ctx, style, matrix, object);
		switch(params.length){
			case 5: {
				ctx.drawImage(params[0], params[1], params[2], params[3], params[4]);
			} break;

			case 9: {
				ctx.drawImage(
					params[0],
					params[1], params[2],
					params[3], params[4],
					params[5], params[6],
					params[7], params[8]
				);
			} break;

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
	drawText: function(params, ctx, style, matrix, object){
		this.pre(ctx, style, matrix, object);
		if(style.fillStyle){
			ctx.fillText(params[0], params[1], params[2]);
		}
		if(style.strokeStyle){
			ctx.strokeText(params[0], params[1], params[2]);
		}
		ctx.restore();
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
		// ...

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

	// gradients, patterns

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
		return this.push(new Img(arguments, this));
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
			element.draw(this.context);
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
		this.renderer.postRedraw(ctx);
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
			var element,
				propagation = true,
				coords = $.coordsOfElement(this.canvas);

			// negative contextX / contextY when canvas has a border
			e.contextX = e.clientX - coords.x;
			e.contextY = e.clientY - coords.y;

			e.cancelContextPropagation = function(){
				propagation = false;
			};

			if(event === 'mouseout'){
				element = this.hoverElement;
				this.hoverElement = null;
			} else {
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

			if(propagation){
				this.fire(event, e);
			}
		}.bind(this));

		return this.listeners[event];
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
					last.fire(out, e);
				}
				if(current && current.fire){
					current.fire(over, e);
				}
				this[name] = current;
			}

		}.bind(this));
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

		var index = this.listeners[event].indexOf(callback);
		this.listeners = this.listeners[event]
								.slice(0, index)
								.concat( this.listeners[event].slice(index+1) );
		return this;
	},

	fire : function(event, data){
		if(!this.listeners[event]){
			return this;
		}

		this.listeners[event].forEach(function(callback){
			callback.call(this, data);
		}.bind(this));
		return this;
	},

	// Transforms
	matrix: null,
	transform: function(a, b, c, d, e, f, pivot){
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
		return this.transform(1, 0, 0, 1, x, y);
	},

	rotate: function(angle, pivot){
		angle = angle / 180 * Math.PI;
		return this.transform(Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), 0, 0, pivot);
	},

	scale: function(x, y, pivot){
		if(y === undefined || isPivot(y)){
			pivot = y;
			y = x;
		}
		return this.transform(x, 0, 0, y, 0, 0, pivot);
	},

	skew: function(x, y, pivot){
		if(y === undefined || isPivot(y)){
			pivot = y;
			y = x;
		}
		return this.transform(1, Math.tan(y * Math.PI / 180), Math.tan(x * Math.PI / 180), 1, 0, 0, pivot);
	}

};

// {{don't include style.js}}

var shapeDraw; // function Shape::draw with processPath

function doRectsIntersect(r1, r2){
	return !(r1.x1 > r2.x2 || r1.x2 < r2.x1 || r1.y1 < r2.y2 || r1.y2 > r2.y1);
}

function getIntersection(main, elements){
	var list = [main],
		maxBound = main.bounds(),
		bound;

	elements.forEach(function(element){
		bound = element.bounds();
		if(doRectsIntersect(maxBound, bound)){
			list.push(element);
			// merge bounds
		}
	});

	return [list, maxBound];
}

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

	remove : function(){
		this.context.elements.splice(this.context.elements.indexOf(this), 1);
		// this.context = null;
		return this.update();
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
			}.bind(this));
			return this;
		}

		if(value === undefined){
			if(this.attrHooks[name] && this.attrHooks[name].get){
				return this.attrHooks[name].get.call(this);
			}
			return this.attrs[name];
		}

		if(this.attrHooks[name] && this.attrHooks[name].set){
			var result = this.attrHooks[name].set.call(this, value);
			if(result !== undefined || this.attrs[name] !== undefined){
				// why is the 2nd condition?
				this.attrs[name] = result;
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
				this.styles.fillStyle = value;
				return this.update();
			}
		},

		stroke: {
			set: function(value){
				Drawable.processStroke(value, this.styles);
				return this.update();
			}
		},

		opacity: {
			get: function(){
				return this.styles.globalAlpha !== undefined ? this.styles.globalAlpha : 1;
			},
			set: function(value){
				this.styles.globalAlpha = +value;
				return this.update();
			}
		},

		composite: {
			get: function(){
				return this.styles.globalCompositeOperation;
			},
			set: function(value){
				this.styles.globalCompositeOperation = value;
				return this.update();
			}
		}
	},

	// Styles
	// why? is it used anywhere?
	style: function(name, value){
		if(value === undefined){
			return this.styles[name];
		}
		this.styles[name] = value;
		return this.update();
	},

	processObject: function(object, arglist){
		if(has(object, 'opacity')){
			this.styles.globalAlpha = object.opacity;
		}
		if(has(object, 'composite')){
			this.styles.globalCompositeOperation = object.composite;
		}

		return arglist.map(function(name){
			return object[name];
		});
	},

	// Bounds
	bounds : function(options){
		if(!this.shapeBounds){
			throw ('Object #' + this.z() + ' doesn\'t have shapeBounds method.');
		}

		var bounds = this.shapeBounds();
		return new Bounds(bounds[0], bounds[1], bounds[2], bounds[3]);
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
		}.bind(this));
		return this;
	},

	// Transforms
	transform: function(a, b, c, d, e, f, pivot){
		if(a === null){
			this.matrix = null;
		} else {
			var matrix = [a, b, c, d, e, f];
			if(pivot){
				pivot = this.corner(pivot);
				matrix[4] = pivot[0] + e - a * pivot[0] - c * pivot[1];
				matrix[5] = pivot[1] + f - b * pivot[0] - d * pivot[1];
			}
			this.matrix = $.transform(this.matrix || [1, 0, 0, 1, 0, 0], matrix);
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
	}

});

Drawable.processStroke = function(stroke, style){
	if(stroke + '' === stroke){
		// remove spaces from colors & dashes
		// todo: \s*\,\s* ?
		stroke = stroke.replace(/\,\s/g, ',').split(' ');

		var opacity, l = stroke.length;
		while(l--){
			if(reFloat.test(stroke[l])){
				opacity = parseFloat(stroke[l]);
			} else if(isNumberLike(stroke[l])){
				style.lineWidth = $.distance(stroke[l]);
			} else if(stroke[l] === 'round'){
				// wrong!
				style.lineJoin = style.lineJoin || 'round';
				style.lineCap = style.lineCap || 'round';
			} else if(stroke[l] === 'miter' || stroke[l] === 'bevel'){
				style.lineJoin = stroke[l];
			} else if(stroke[l] === 'butt' || stroke[l] === 'square'){
				style.lineCap = stroke[l];
			} else if(stroke[l][0] === '['){
				// stroke[l].substr(1, stroke[l].length - 2).split(',')
			} else if(stroke[l] in $.dashes){
				// $.dashes[stroke[l]]
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
		;
	}
};


Shape = new Class(Style, {

	liftInits: true,

	initialize : function(args){
		this.listeners = {}; // an object to store event listeners
		this.styles = {};

		var props = this.constructor.props,
			handlers = this.constructor.propHandlers || {},
			l;

		if(isObject(args[0]) && this.constructor.firstObject){
			this.object = args[0];
			if(this.constructor.processStyle){
				this.parseFromObject(args[0]);
			}
		}
		else if(props){
			l = Math.min(props.length, args.length);
			if(this.constructor.processStyle){
				if(args.length - props.length > 1){
					this.stroke(args[l + 1]);
				}

				if(args.length - props.length > 0){
					this.fill(args[l]);
				}
			}
			while(l--){
				if(handlers[l]){
					this['_' + props[l]] = handlers[l](args[l]);
				} else {
					this['_' + props[l]] = args[l];
				}
			}
		}
	},

	draw : function(ctx){
		if(!this._visible){
			return;
		}
		ctx.save();
		this.styleToContext(ctx);
		if(this._matrix){
			ctx.transform.apply(ctx, this._matrix);
		}
		this.processPath(ctx);
		if(this.styles.fillStyle){
			ctx.fill();
		}
		if(this.styles.strokeStyle){
			ctx.stroke();
		}
		ctx.restore();
	},

	update : function(){
		if(!this.context){
			return this;
		}
		this.context.update();
		return this;
	},

	// properties
	prop : function(name, value){
		if(value === undefined){
			return this['_' + name];
		}
		this['_' + name] = value;
		return this.update();
	},

	mouse : function(state){
		return this.prop('interaction', !!state);
	},

	z : function(z){
		var index = this.context.elements.indexOf(this);
		if(z === undefined){
			return index;
		}
		if(z === 'top'){
			z = this.context.elements.length; // -1?
		}
		this.context.elements.splice(index, 1);
		this.context.elements.splice(z, 0, this);
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
				} else {
					clone[i] = this[i];
				}
			}
		}

		if(events === true){
			clone.listeners = this.listeners;
		}

		return this.context.push( clone );
	},

	remove : function(){
		this.context.elements.splice(this.context.elements.indexOf(this), 1);
		return this.update();
	},

	cursor : function(value){
		if( value === undefined ){
			return this._cursor;
		}

		if( value === null ){
			;
		}

		this._cursor = value;

		if( value === null ){
			return this.off('mouseover', this._cursorListenerOn).off('mouseout', this._cursorListenerOff);
		}

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
		if(isString(fn)){
			fn = wrap(arguments);
		}

		if( isObject(event) ){
			for(var i in event){
				if($.has(event, i)){
					if(Array.isArray(event[i])){
						this.on.apply(this, [i].concat(event[i]));
					} else {
						this.on(i, event[i]);
					}
				}
			}
			return this;
		}

		if( isNumber(event) ){
			return window.setTimeout(fn.bind(this), event), this;
		}

		this.context.listener(event);
		(this.listeners[ event ] || (this.listeners[ event ] = [])).push(fn);
		return this;
	},

	once : function(event, fn){
		if(isString(fn)){
			fn = wrap(arguments, this);
		}
		var proxy;
		this.on(event, fn);
		this.on(event, proxy = function(){
			this.off(event, fn);
		});
		proxy.proxy = fn;
		return this;
	},

	off : function(event, fn){
		if(!event){
			return this.listeners = {}, this;
		}
		if(!fn){
			return this.listeners[event] = [], this;
		}

		event = this.listeners[event];

		var index = event.indexOf(fn);
		if( event[index+1].proxy === fn ){
			event.splice(index, 2);
		} else {
			event.splice(index, 1);
		}

		return this;
	},

	fire : function(event, data){
		event = this.listeners[event];
		if( !event ){
			return this;
		}
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
		if(!this.processPath){
			return false;
		}
		var ctx = this.context.context,
			is;
		ctx.save();
		if(this._matrix){
			ctx.transform.apply(ctx, this._matrix);
		}
		this.processPath(ctx);
		is = ctx.isPointInPath(x, y);
		ctx.restore();
		return is;
	},

	corner : function(corner, options){
		if(Array.isArray(corner)){
			return corner;
		}

		if(isObject(corner)){
			if($.has(corner, 'from')){
				var from = this.corner(corner.from);
				return [from[0] + corner.x, from[1] + corner.y];
			}
			else {
				return [corner.x, corner.y];
			}
		}
		if(!corner){
			corner = 'center';
		}

		var bounds = this.bounds(options);
		return [
			bounds.x + bounds.w * $.corners[corner][0],
			bounds.y + bounds.h * $.corners[corner][1]
		];
	},

	bounds : function(options){
		if(!this.nativeBounds){
			throw ('Object #' + this._z + 'hasn\'t nativeBounds() method.');
		}

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

		if(this._matrix){
			matrix = $.multiply(this._matrix, matrix);
		}

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
			if( typeof this.bounds === 'function' ){
				bounds = this.bounds({ transform: true, stroke: true });
			} else {
				throw ('Object #' + this._z + ' can\'t be rasterized: need the bounds.');
			}
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
			if( typeof this.bounds === 'function' ){
				bounds = this.bounds({ transform: true, stroke: true });
			} else {
				throw ('Object #' + this._z + ' can\'t be rasterized: need the bounds.');
			}
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
			if( isObject( value ) ){
				value.queue = false;
			} else {
				value = { duration: value, easing: options, callback: arguments[4], queue: false };
			}

			value = $.extend({}, value);
			var c = value.callback,
				keys = Object.keys( prop ),
				i = 0;
			value.callback = null;

			for(; i < keys.length; i++){
				if( i === keys.length-1 ){
					value.callback = c;
				}
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
			if( this._queue && this._queue.length > 0 ){
				this._queue.push( object );
			} else {
				this._queue = [ object ];
				$._queue.push( object );
				$._checkAnimation();
			}
		}
		return this;
	},

	// defaults
	_visible : true,
	_interaction : true,
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

		if( t < 0 ){
			continue;
		}

		if( t > 1 ){
			t = 1;
		}

		current.now = now;
		current.pos = current.easing(t);
		$.fx.step[current.prop](current);

		if( current.state === 0 ){
			current.state = 1;
		}

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
	if(l > 0){
		requestAnimationFrame(doAnimation);
	} else {
		enabledAnimation = false;
	}
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
				if( fx.end.indexOf('+=') === 0 ){
					fx.end = fx.start + Number( fx.end.substr(2) );
				} else if( fx.end.indexOf('-=') === 0 ){
					fx.end = fx.start - Number( fx.end.substr(2) );
				}
			}
		}

		fx.elem[ fx._prop ] = Math.round(fx.start + (fx.end - fx.start) * fx.pos);
	},

	float: function( fx ){
		if( fx.state === 0 ){
			fx._prop = '_' + fx.prop;
			fx.start = fx.elem[ fx._prop ];
			if( isString(fx.end) ){
				if( fx.end.indexOf('+=') === 0 ){
					fx.end = fx.start + Number( fx.end.substr(2) );
				} else if( fx.end.indexOf('-=') === 0 ){
					fx.end = fx.start - Number( fx.end.substr(2) );
				}
			}
		}

		fx.elem[ fx._prop ] = fx.start + (fx.end - fx.start) * fx.pos;
	},

	opacity: function( fx ){
		if( fx.state === 0 ){
			fx.start = fx.elem.styles.globalAlpha;
			if( fx.start === undefined ){
				fx.start = 1;
			}
		}
		fx.elem.styles.globalAlpha = fx.start + (fx.end - fx.start) * fx.pos;
	},

	fill: function( fx ){
		if( fx.state === 0 ){
			fx.start = $.color( fx.elem.styles.fillStyle );

			if( fx.end === 'transparent' ){
				fx.end = fx.start.slice(0, 3).concat([ 0 ]);
			} else {
				fx.end = $.color( fx.end );
			}

			if( fx.elem.styles.fillStyle === 'transparent' ||
				fx.elem.styles.fillStyle === undefined ){
				fx.start = fx.end.slice(0, 3).concat([ 0 ]);
			}
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

			if( end.strokeStyle === 'transparent' ){
				fx.color2 = fx.color1.slice(0, 3).concat([ 0 ]);
			} else if( end.strokeStyle ){
				fx.color2 = $.color( end.strokeStyle );
			}

			if( (fx.elem.styles.strokeStyle === 'transparent' ||
				fx.elem.styles.strokeStyle === undefined) && end.strokeStyle ){
				fx.color1 = fx.color2.slice(0, 3).concat([ 0 ]);
			}
		}

		if( fx.color2 ){
			fx.elem.styles.strokeStyle = 'rgba(' +
				[	Math.round(fx.color1[0] + (fx.color2[0] - fx.color1[0]) * fx.pos),
					Math.round(fx.color1[1] + (fx.color2[1] - fx.color1[1]) * fx.pos),
					Math.round(fx.color1[2] + (fx.color2[2] - fx.color1[2]) * fx.pos),
					fx.color1[3] + (fx.color2[3] - fx.color1[3]) * fx.pos ].join(',') + ')';
		}

		if( fx.width2 ){
			fx.elem.styles.lineWidth = fx.width1 + (fx.width2 - fx.width1) * fx.pos;
		}
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
			if( fx.end.length === undefined ){
				fx.end = [ fx.end, fx.end ];
			}

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
		if( fx.state === 0 ){
			fx.elem._origin = fx.elem.corner( fx.end );
		}
	}
};

function transformAnimation( fx, fn ){
	if( fx.state === 0 ){
		fx.elem._matrixStart = fx.elem._matrix || [ 1, 0, 0, 1, 0, 0 ];
		fx.elem._matrixCur = [];
		if( fx.elem.corner ){
			fx.corner = fx.elem.corner( fx.elem._origin || 'center' );
		} else {
			fx.corner = [ 0, 0 ];
		}
	}
	if( fx.elem._matrixCur.now !== fx.now ){
		fx.elem._matrixCur = [ 1, 0, 0, 1, 0, 0 ];
	}

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
			if(typeof fn === 'function' || fn + '' === fn){
				return this.on.apply(this, [event].concat(slice.call(arguments)));
			} else {
				return this.fire.apply(this, arguments);
			}
		};
	});

// animation slices
['x', 'y', 'width', 'height', 'cx', 'cy', 'radius'].forEach(function( param ){
	$.fx.step[ param ] = $.fx.step.int;
});

$.fn = Shape.prototype;

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
			Drawable.processStroke(args[5], this.styles);
		}
	},

	attrHooks: extend(Object.assign({}, Drawable.prototype.attrHooks), {
		x: {
			set: function(value){
				this.update();
				return value;
			}
		},
		y: {
			set: function(value){
				this.update();
				return value;
			}
		},
		width: {
			set: function(value){
				this.update();
				return value;
			}
		},
		height: {
			set: function(value){
				this.update();
				return value;
			}
		},

		x1: {
			get: function(){
				return this.attrs.x;
			},
			set: function(value){
				this.attrs.x = value;
				this.update();
			}
		},
		y1: {
			get: function(){
				return this.attrs.y;
			},
			set: function(value){
				this.attrs.y = value;
				this.update();
			}
		},
		x2: {
			get: function(){
				return this.attrs.x + this.attrs.width;
			},
			set: function(value){
				this.attrs.width = value - this.attrs.x;
				this.update();
			}
		},
		y2: {
			get: function(){
				return this.attrs.y + this.attrs.height;
			},
			set: function(value){
				this.attrs.height = value - this.attrs.y;
				this.update();
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

	isPointIn : function(x, y){
		return x > this.attrs.x && y > this.attrs.y && x < this.attrs.x + this.attrs.width && y < this.attrs.y + this.attrs.height;
	}

});

Rect.args = ['x', 'y', 'width', 'height', 'fill', 'stroke'];

$.rect = function(){
	return new Rect(arguments);
};

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
			Drawable.processStroke(args[4], this.styles);
		}
	},

	attrHooks: extend(Object.assign({}, Drawable.prototype.attrHooks), {
		cx: {
			set: function(value){
				this.update();
				return value;
			}
		},
		cy: {
			set: function(value){
				this.update();
				return value;
			}
		},
		radius: {
			set: function(value){
				this.update();
				return Math.abs(value);
			}
		}
	}),

	shapeBounds : function(){
		return [this.attrs.cx - this.attrs.radius, this.attrs.cy - this.attrs.radius, this.attrs.radius * 2, this.attrs.radius * 2];
	},

	draw : function(ctx){
		if(this._visible){
			this.context.renderer.drawCircle(
				[this.attrs.cx, this.attrs.cy, this.attrs.radius],
				ctx, this.styles, this.matrix, this
			);
		}
	},

	isPointIn : function(x, y){
		return (Math.pow(x - this.attrs.cx, 2) + Math.pow(y - this.attrs.cy, 2)) <= Math.pow(this.attrs.radius, 2);
	}

});

Circle.args = ['cx', 'cy', 'radius', 'fill', 'stroke'];

$.circle = function(){
	return new Circle(arguments);
};

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
		if(isObject(name)){
			Object.keys(name).forEach(function(key){
				this.attr(key, name[key]);
			}.bind(this));
			return this;
		}

		name = Curve.types[this.name].attrs.indexOf(name);
		if(value === undefined){
			return this.attrs[name];
		}
		this.attrs[name] = value;
		return this.update();
	},

	bounds: function(){
		return Curve.types[this.method].bounds(this.attrs);
	}
});

Curve.types = {
	moveTo: {
		attrs: ['x', 'y'],
		bounds: function(attrs){
			;
		}
	},
	lineTo: {
		attrs: ['x', 'y']
	}
};

/*
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

			if( clockwise ){
				delta = -delta;
			}

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
 */
Curve.fromArray = function(array, path){
	if(array === true){
		return closePath;
	}

	if(array[0] in Curve.types){
		return new Curve(array[0], array.slice(1), path);
	}

	switch(array.length){
		case 2: return new Curve('lineTo', array, path);
		case 4: return new Curve('quadraticCurveTo', array, path);
		case 6: return new Curve('bezierCurveTo', array, path);
	}
};

$.curves = Curve.types;

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

		value = Path.parse(value, this, index !== 0);
		this.attrs.d.splice.apply(this.attrs.d, [index, 1].concat(value));
		return this.update();
	},

	before: function(index, value, turnMoveToLine){
		// if index == 0 && turnMoveToLine, then the current first moveTo will be turned to lineTo
		if(index === 0 && turnToLine !== false){
			this.attrs.d[0].name = 'lineTo';
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

			currentBounds;
		for(var i = 0; i < this.attrs.d.length; i++){
			currentBounds = this.attrs.d[i].bounds();
			minX = Math.min(minX, currentBounds.x1, currentBounds.x2);
			maxX = Math.max(maxX, currentBounds.x1, currentBounds.x2);
			minY = Math.min(minY, currentBounds.y1, currentBounds.y2);
			maxY = Math.max(maxY, currentBounds.y1, currentBounds.y2);
		}
		return new Bounds(minX, minY, maxX - minX, maxY - minY);
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

// some parts are commented here because I want to make Curve internal class
Path.parse = function(data, path, firstIsNotMove){
	if(!data){
		return [];
	}

	if(data + '' === data){
		return Path.parseSVG(data, path, firstIsNotMove);
	}

	/* if(data instanceof Curve){
		data.path = path;
		return [data];
	} */

	var curves = [];
	if(Array.isArray(data)){
		for(var i = 0; i < data.length; i++){

			// fix for [x,y] instead of [[x,y]]
			// necessary for path.curve(index, [0, 0])
			if(+data[1] === data[1]){
				data = [data];
			}

			// Curve
			/* if(data[i] instanceof Curve){
				curves[i].push(data[i]);
				curves[i].path = path;
			}

			// Array
			else { */
				if(i === 0 && !firstIsNotMove){
					curves.push(new Curve('moveTo', isNaN(data[i][0]) ? data[i].slice(1) : data[i], path));
					continue;
				}
				curves.push(Curve.fromArray(data[i], path));
			/* } */

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

// todo: rename to Picture
Img = new Class(Drawable, {

	initialize : function(args, context){
		this.super('initialize', arguments);

		if(isObject(args[0])){
			args = this.processObject(args[0], Img.args);
		}

		this.attrs.image = Img.parse(args[0]);
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

		this.attrs.image.addEventListener('load', function(e){
			this.update();

			if(this.attrs.image.blob){
				domurl.revokeObjectURL(blob);
			}

			this.fire('load', e);
		}.bind(this));

		this.attrs.image.addEventListener('error', function(e){
			this.fire('error', e);
		});
	},

	draw : function(ctx){
		if(this._visible){
			var params = [this.attrs.image, this.attrs.x, this.attrs.y];
			this.context.renderer.drawImage(params, ctx, this.styles, this.matrix, this);
		}
	}

});

Img.args = ['image', 'x', 'y', 'width', 'height', 'crop'];

Img.parse = function(image){
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
	var image = new Img(arguments);
	return image;
};

Raster = new Class(Drawable, {

	initialize : function(args, context){
		this.super('initialize', arguments);

		if(isObject(args[0])){
			args = this.processObject(args[0], Raster.args);
		}

		this.attrs.data = args[0]; // Raster.parseRaster(args[0]);
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

// {{don't include text.js}}

// cache api

// /cache api
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
/*
<<<<<<< Updated upstream
		if(Gradient.types[this.type]){
			Object.assign(this.attrHooks, Gradient.types[this.type].attrHooks);
			if(Gradient.types[this.type].initialize){
				Gradient.types[this.type].initialize.call(this);
=======
<<<<<<< Updated upstream
		for(var i = 0, l = keys.length; i < l; i++){
			if(keys[i] == t){
				return _.color(stops[keys[i]]);
			}
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
=======
		if(Gradient.types[this.type]){
			// мы расширяем общий! attrHooks!
			// Object.assign(this.attrHooks, Gradient.types[this.type].attrHooks);
			if(Gradient.types[this.type].initialize){
				Gradient.types[this.type].initialize.call(this);
>>>>>>> Stashed changes
>>>>>>> Stashed changes
			}
		} */
	},

	useCache: true,

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
			keys = Object.keys(colors).sort();

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

	/* key : function(from, to){
		return [this._type, from, to, JSON.stringify(this._colors)].join(',');
	}, */

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
			var from = element.corner(this.attrs.from),
				to = element.corner(this.attrs.to),
				colors = this.attrs.colors;

			/* var key = this.key(from, to);
			if(this.useCache && this.context.fillCache[key]){
				return this.context.fillCache[key];
			} */

			var grad = ctx.createLinearGradient(from[0], from[1], to[0], to[1]);
			Object.keys(colors).forEach(function(offset){
				grad.addColorStop(offset, colors[offset]);
			});
			return grad;
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
				to = element.corner(this.attrs.to),
				radius = this.attrs.radius === 'auto' ? element.bounds().height : this.attrs.radius,
				colors = this.attrs.colors;

			var grad = ctx.createRadialGradient(
				from[0],
				from[1],
				this.attrs.startRadius,
				to[0],
				to[1],
				radius
			);

			Object.keys(colors).forEach(function(offset){
				grad.addColorStop(offset, colors[offset]);
			});
			return grad;
		}
	}
};

Pattern = new Class({
	initialize: function(image, repeat, context){
		this.image = Img.parse(image);
		this.context = context;

		this.image.addEventListener('load', function(e){
			this.update();
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

		return ctx.createPattern(this.image, 'repeat');
	}
});

Pattern.parseRepeat = function(value){
	if(value === !!value){
		return value ? 'repeat' : 'no-repeat';
	}
	if(value === value + ''){
		return 'repeat-' + value;
	}
	return 'repeat';
};

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
		return Math.pow(v || 2, 8 * t - 8);
	},
	circ : function(t){
		return 1 - Math.sin(Math.acos(t));
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
	$.easing[name] = function(t){
		return Math.pow(t, i+2);
	};
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
	// TODO: replace to left, right, top, etc
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
		x: box.left + parseInt(style.borderLeftWidth) + parseInt(style.paddingLeft),
		y: box.top  + parseInt(style.borderTopWidth)  + parseInt(style.paddingTop)
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

// More part
// {don't {include Controls.js}}

$.Context = Context;
$.Drawable = Drawable;
$.Shape = Shape;
$.Rect = Rect;
$.Circle = Circle;
$.Curve = Curve;
$.Path = Path;
$.Image = Img;
$.Text = Text;
$.Gradient = Gradient;
$.Pattern = Pattern;

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