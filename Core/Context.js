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
			console.time();
		this.renderer.preRedraw(ctx, this);
		this.elements.forEach(function(object){
			object.draw(ctx);
		});
		this.renderer.postDraw(ctx);
			console.timeEnd();
		this._willUpdate = false;
	},

	getObjectInPoint : function(x, y, mouse){
		var elements = this.elements,
			i = elements.length;

		while(i--){
		// mouse=true : ignore elements with interaction = false
		// todo: rename to pointerEvents
			if( elements[i].isPointIn && elements[i].isPointIn(x,y) &&
				(elements[i].attrs.interaction || !mouse) ){
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