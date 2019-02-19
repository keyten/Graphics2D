var Context;

Context = function(canvas){
	this.canvas    = canvas;
	this.context   = canvas.getContext('2d');
	this.elements  = [];
	this.listeners = {};
	this.attrs     = {
		transform: 'attributes',
		pivot: 'center'
	};
	this.cache     = {};

	this.updateNow = this.updateNow.bind(this);
};

Context.prototype = {
	// Elements
	object : function(object){
		if(object.constructor === Function){
			object = {draw: object};
		}
		return this.push(extend(new Drawable(), object));
	},

	rect : function(){
		return this.push(new Rect(arguments));
	},

	circle : function(){
		return this.push(new Circle(arguments));
	},

	path : function(){
		return this.push(new Path(arguments));
	},

	image : function(){
		return this.push(new Picture(arguments));
	},

	text : function(){
		return this.push(new Text(arguments));
	},

	// Path slices
	line : function(fx, fy, tx, ty, stroke){
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
			var ctx = this.context;
			ctx.save();
			// todo: dpi
			if(this.attrs.matrix){
				var matrix = this.attrs.matrix !== 'dirty' ? this.attrs.matrix : this.calcMatrix();
				ctx.setTransform(matrix[0], matrix[1], matrix[2],
					matrix[3], matrix[4], matrix[5]);
			} else {
				ctx.setTransform(1, 0, 0, 1, 0, 0);
			}
			element.draw(ctx);
			ctx.restore();
		}

		element.update = element.updateFunction;

		return element;
	},

	update : function(){
		if(this._willUpdate || this.elements.length === 0){
			return;
		}

		this._willUpdate = true;
		requestAnimationFrame(this.updateNow);
	},

	updateNow : function(){
		console.time('drawing');
		var ctx = this.context;
		ctx.save();
		// todo: check out what way to clear canvas is faster
		// maybe just this.canvas.width = this.canvas.width;
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

		// todo: dpi
		if(this.attrs.matrix){
			// if transform then m11 /= dpi, m22 /= dpi
			// if not then setTransform(1 / dpi, 0, 0, 1 / dpi, 0, 0)
			var matrix = this.attrs.matrix !== 'dirty' ? this.attrs.matrix : this.calcMatrix();
			ctx.setTransform(matrix[0], matrix[1], matrix[2],
				matrix[3], matrix[4], matrix[5]);
		}

		this.elements.forEach(function(element){
			element.draw(ctx);
		});

		ctx.restore();
		this._willUpdate = false;
		console.timeEnd('drawing');
	},

	getObjectInPoint : function(x, y, mouse){
		var elements = this.elements,
			i = elements.length;

		while(i--){
		// mouse=true : ignore elements with interaction = false
		// todo: rename to pointerEvents?
			if( elements[i].isPointIn && (elements[i].attrs.interaction || !mouse) &&
				elements[i].isPointIn(x, y, 'mouse') ){
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
/*	hoverElement : null,
	focusElement : null,

	listener : function(event){
		if(this.listeners[event]){
			return this.listeners[event];
		}

		this.listeners[event] = [];

		if(this.eventsHooks[event]){
			(this.eventsHooks[event].setup || this.eventsHooks[event]).call(this, event);
		}

		return this.listeners[event];
	},

	// todo: писать eventHooks: extend({ mouseover, mouseout, etc }, (function(){ return all other mouse evts })())?
	// вроде менее очевидно даже
	eventsHooks : {
		mouseover : function(){
			if(!this.listeners['mouseout']){
				this.listenerCanvas('mouseout');
				this.listenerSpecial('mouseover', 'mouseout', 'hover', 'mousemove');
				this.listener('mouseout');
			}
		},
		mouseout: function(){
			if(!this.listeners['mouseover']){
				this.listenerCanvas('mouseover');
				this.listenerSpecial('mouseover', 'mouseout', 'hover', 'mousemove');
				this.listener('mouseover');
			}
		},
		focus : function(){
			if(!this.listeners['blur']){
				this.listenerCanvas('blur');
				this.listenerSpecial('focus', 'blur', 'focus', 'mousedown');
				this.listener('blur');
			}
		},
		blur: function(){
			if(!this.listeners['focus']){
				this.listenerCanvas('focus');
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
					e.targetObject = current;
					current.fire(over, e);
				}
				this[name] = current;
			}
		});
		return this;
	},

	listenerCanvas : function(event){
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

			if(propagation && !this.fire(event, e)){
				e.stopPropagation();
				e.preventDefault();
			}
		}.bind(this));
	},

	// todo: make up a more good name (contains 'Event')
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

	on : function(event, options, callback){
		if(event + '' !== event){
			Object.keys(event).forEach(function(eventName){
				this.on(eventName, event[eventName]);
			});
			return this;
		}

		if(!callback){
			callback = options;
			options = null;
		}

		callback.options = options;

		// Quick calls are not supported!

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

	fire : function(event, data, checker){
		if(!this.listeners[event]){
			return this;
		}

		var listeners = this.listeners[event];
		if(checker){
			listeners = listeners.filter(checker, this);
		}

		listeners.forEach(function(callback){
			callback.call(this, data);
		}, this);
		return this;
	}, */

	// translates screen coords to context coords
	contextCoords: function(x, y){
		var coords = Delta.coordsOfElement(this.canvas);
		return [x - coords.x, y - coords.y];
	},

	// Attrs
/*	attr: Class.attr,
	attrHooks: {
		width: {
			get: function(){
				return this.canvas.width;
			},
			set: function(value){
				this.canvas.width = value;
				// if dpi != 1 && !canvas.style.width
				// or simpler: if this.attrs.dpi !== undefined
				this.canvas.style.width = this.canvas.width / (this.attrs.dpi || 1) + 'px';
				// if (newWidth > width):
				this.update();
			}
		},

		height: {
			get: function(){
				return this.canvas.height;
			},
			set: function(value){
				this.canvas.height = value;
				this.canvas.style.height = this.canvas.height / (this.attrs.dpi || 1) + 'px';
				// if (newHeight > height):
				this.update();
			}
		},

		// https://www.html5rocks.com/en/tutorials/canvas/hidpi/
		// https://stackoverflow.com/questions/19142993/how-draw-in-high-resolution-to-canvas-on-chrome-and-why-if-devicepixelratio
		// http://www.html5gamedevs.com/topic/732-retina-support/
		dpi: {
			get: function(){
				return this.attrs.dpi || 1;
			},
			set: function(value){
				this.canvas.style.width = this.canvas.width / value + 'px';
				this.canvas.style.height = this.canvas.height / value + 'px';
				this.update();
			}
		},

		smooth: {
			get: function(value){
				var ir = this.canvas.style.imageRendering;
				return ir !== 'pixelated' && ir !== 'crisp-edges';
			},
			set: function(value){
				this.canvas.style.imageRendering = value ? 'initial' : 'pixelated';
			}
		},

		transform: {
			set: function(value){
				this.cache.transform = null;
				this.update();
			}
		},

		translate: {
			get: function(){
				return this.attrs.translate || [0, 0];
			},
			set: function(value){ // todo: not duplicate at all attrs
				if(this.attrs.transform === 'attributes'){
					this.cache.transform = null;
					this.update();
				}
			}
		},

		rotate: {
			get: function(){
				return this.attrs.rotate || 0;
			},
			set: function(){
				if(this.attrs.transform === 'attributes'){
					this.cache.transform = null;
					this.update();
				}
			}
		},

		scale: {
			get: function(){
				return this.attrs.scale || [1, 1];
			},
			set: function(){
				if(this.attrs.transform === 'attributes'){
					this.cache.transform = null;
					this.update();
				}
			}
		},

		skew: {
			get: function(){
				return this.attrs.skew || [0, 0];
			},
			set: function(){
				if(this.attrs.transform === 'attributes'){
					this.cache.transform = null;
					this.update();
				}
			}
		}
	}, */

	// Transforms
	getTransform: function(){
		if(this.cache.transform){
			return this.cache.transform;
		}

		var matrix = Delta.parseTransform(this.attrs, this);
		this.cache.transform = matrix;
		return matrix;
	},

	corner: function(corner){
		return [
			this.canvas.width * Delta.corners[corner][0],
			this.canvas.height * Delta.corners[corner][1]
		];
	}
};

// Events
Object.assign(Context.prototype, Class.mixins['EventMixin'], {
	hoverElement : null,
	eventHooks: {}
});

Delta.browserCommonEvent = {
	init : function(event){
		if(this.eventHooks[event].canvas){
			this.canvas.addEventListener(event,
				this.listeners['_canvasListener_' + event] = this.eventHooks[event].canvas.bind(this));
		}
	},

	teardown : function(event){
		requestAnimationFrame(function(){
			if(!this.listeners[event]){
				this.canvas.removeEventListener(event, this.listeners['_canvasListener_' + event]);
			}
		}.bind(this));
	},

	canvas : function(e){
		e.cancelContextPropagation = function(){};
		this.fire(e.type, e);
	}
};

// todo: check if there's event.touches at phones in mouse events (click and etc)
Delta.browserMouseEvent = Object.assign({}, Delta.browserCommonEvent, {
	canvas : function(e){
		var propagation = true;

		e.cancelContextPropagation = function(){
			propagation = false;
		};

		// negative contextX / contextY possible when canvas has a border
		// not a bug, it's a feature :)
		var coords = this.contextCoords(e.clientX, e.clientY);
		e.contextX = coords[0];
		e.contextY = coords[1];
		// bug:
		// if e.type === 'mouseout' => targetObject is current hoverElement
		e.targetObject = this.getObjectInPoint(e.contextX, e.contextY, true);

		if(e.targetObject && e.targetObject.fire){
			e.targetObject.fire(e.type, e);
		}

		if(propagation){
			this.fire(e.type, e);
		}
	}
});

Delta.browserTouchEvent = Object.assign({}, Delta.browserCommonEvent, {
	canvas : function(e){
		var propagation = true;

		e.cancelContextPropagation = function(){
			propagation = false;
		};

		['touches', 'changedTouches', 'targetTouches'].forEach(function(prop){
			if(e[prop]){
				Array.prototype.forEach.call(e[prop], function(touch){
					var coords = this.contextCoords(touch.clientX, touch.clientY);
					touch.contextX = coords[0];
					touch.contextY = coords[1];

					// todo: make it as getter? it may cost a lot
					touch.targetObject = this.getObjectInPoint(touch.contextX, touch.contextY, true);
				}, this);
			}
		}, this);

		// fixme: not sure if that is a right way to call them
		Array.prototype.forEach.call(e.touches, function(touch){
			if(touch.targetObject && touch.targetObject.fire){
				e.targetObject.fire(e.type, e);
			}
		}, this);

		if(propagation){
			this.fire(e.type, e);
		}
	}
});

var eventKindsListeners = window.document ? {
	mouse : Delta.browserMouseEvent,
	touch : Delta.browserTouchEvent,
	pointer : Delta.browserCommonEvent,
	keyboard : Delta.browserCommonEvent
} : {};

Object.keys(browserEvents).forEach(function(eventsKind){
	browserEvents[eventsKind].forEach(function(event){
		Context.prototype.eventHooks[event] = eventKindsListeners[eventsKind];

		Context.prototype[event] = function(callback){
			return (
				callback.constructor === Function
			) ? this.on(event, callback) : (
				callback.constructor === String
			) ? this.on.apply(this, [event].concat(slice.call(arguments))) : this.fire(callback);
		};
	});
});

// Attrs
Object.assign(Context.prototype, Class.mixins['AttrMixin'], Class.mixins['TransformableMixin'], {
	attrHooks : Object.assign({}, Class.mixins['TransformableMixin'].attrHooks, {
		width : {
			get : function(){
				return this.canvas.width;
			},
			set : function(value){
				this.canvas.width = value;
				// if dpi != 1 && !canvas.style.width
				// or simpler: if this.attrs.dpi !== undefined
				this.canvas.style.width = this.canvas.width / (this.attrs.dpi || 1) + 'px';
				// if (newWidth > width):
				this.update();
			}
		},

		height : {
			get : function(){
				return this.canvas.height;
			},
			set : function(value){
				this.canvas.height = value;
				this.canvas.style.height = this.canvas.height / (this.attrs.dpi || 1) + 'px';
				// if (newHeight > height):
				this.update();
			}
		},

		// https://www.html5rocks.com/en/tutorials/canvas/hidpi/
		// https://stackoverflow.com/questions/19142993/how-draw-in-high-resolution-to-canvas-on-chrome-and-why-if-devicepixelratio
		// http://www.html5gamedevs.com/topic/732-retina-support/
		dpi : {
			get : function(){
				return this.attrs.dpi || 1;
			},
			set : function(value){
				this.canvas.style.width = this.canvas.width / value + 'px';
				this.canvas.style.height = this.canvas.height / value + 'px';
				this.update();
			}
		},

		smooth : {
			get : function(value){
				var ir = this.canvas.style.imageRendering;
				return ir !== 'pixelated' && ir !== 'crisp-edges';
			},
			set : function(value){
				this.canvas.style.imageRendering = value ? 'initial' : 'pixelated';
			}
		}
	})
});

Delta.Context = Context;