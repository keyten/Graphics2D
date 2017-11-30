var Context;

Context = function(canvas){
	this.canvas    = canvas;
	this.context   = canvas.getContext('2d');
	this.elements  = [];
	this.listeners = {};
	this.attrs = {
		transform: 'attributes'
	};
	this.cache = {};

// rudiment
	this.renderer = Delta.renderers['2d'];

	// why not updateNow = ...?
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
			var ctx = this.context;
			ctx.save();
			if(this.matrix){
				ctx.setTransform(
					this.matrix[0],
					this.matrix[1],
					this.matrix[2],
					this.matrix[3],
					this.matrix[4],
					this.matrix[5]
				);
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
		if(this._willUpdate){
			return;
		}

		this._willUpdate = true;
		requestAnimationFrame(this.updateNowBounded);
	},

	updateNow : function(){
		var ctx = this.context;
		ctx.save();
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
		var transform = this.getTransform();
		if(!Delta.isIdentityTransform(transform)){
			ctx.setTransform(transform[0], transform[1], transform[2], transform[3], transform[4], transform[5]);
		}

		this.elements.forEach(function(element){
			element.draw(ctx);
		});

		ctx.restore();
		this._willUpdate = false;
	},

	getObjectInPoint : function(x, y, mouse){
		var elements = this.elements,
			i = elements.length;

		while(i--){
		// mouse=true : ignore elements with interaction = false
		// todo: rename to pointerEvents?
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

		if(this.eventsHooks[event]){
			(this.eventsHooks[event].setup || this.eventsHooks[event]).call(this, event);
		}

		return this.listeners[event];
	},

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
	},

	// translates screen coords to context coords
	contextCoords: function(x, y){
		var coords = Delta.coordsOfElement(this.canvas);
		return [x - coords.x, y - coords.y];
	},

	// Attrs
	attr: Class.attr,
	attrHooks: {
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
			set: function(value){
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
	},

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

eventsToInteract.forEach(function(eventName){
	if(!Context.prototype.eventsHooks[eventName]){
		Context.prototype.eventsHooks[eventName] = function(){
			this.listenerCanvas(eventName);
		};
	}

	Context.prototype[eventName] = function(callback){
		return this[
			typeof callback === 'function' || callback + '' === callback ? 'on' : 'fire'
		].apply(this, [eventName].concat(slice.call(arguments)));
	};
});

Delta.Context = Context;