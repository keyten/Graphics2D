var Context;

Context = function(canvas, renderer){
	this.canvas    = canvas;
	this.elements  = [];
	this.listeners = {};
	this.matrix = [1, 0, 0, 1, 0, 0];
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
		// todo: check touch & pointer events
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
		'keypress',
		'keydown',
		'keyup'
	],

	// todo: an element must have a property _focusable
	// then it supports focus & blur
	// otherwise there are some bugs (object.blur())
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
	transform: function(a, b, c, d, e, f){
		this.matrix = $.transform(this.matrix, [a, b, c, d, e, f]);
		return this.update();
	},

	translate: function(x, y){
		return this.transform(1, 0, 0, 1, x, y);
	},

	rotate: function(angle/*, pivot*/){
		angle = angle / 180 * Math.PI;
		return this.transform(Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), 0, 0);
	},

	scale: function(x, y/*, pivot*/){
		if(y === undefined){
			y = x;
		}
		return this.transform(x, 0, 0, y, 0, 0);
	},

	skew: function(x, y/*, pivot*/){
		if(y === undefined){
			y = x;
		}
		return this.transform(1, Math.tan(y), Math.tan(x), 1, 0, 0);
	}
/*
	transform: function(a, b, c, d, e, f, pivot){
		// you can get the matrix: ctx.matrix
		// so you don't need ctx.transform() or something like this
		var matrix;

		if(pivot){
			if(isString(pivot)){
				pivot = $.corners[pivot];
			} else if(isObject(pivot)){
				;
			}
			var cx = this.canvas.width * pivot[0],
				cy = this.canvas.height * pivot[1];
			matrix = [a, b, c, d, -cx*a - cy*c + e + cx, -cx*b - cy*d + f + cy];
		}
		else {
			matrix = [a, b, c, d, e, f];
		}

		if(!this.matrix){
			this.matrix = matrix;
		} else {
			this.matrix = $.multiply(this.matrix, [a, b, c, d, e, f]);
		}
		return this.update();

		// works wrong!
	},

	translate: function(x, y){
		return this.transform(1, 0, 0, 1, x, y);
	},

	rotate: function(angle, pivot){
		if($.angleUnit === 'grad'){
			angle = angle * Math.PI / 180;
		}

		return this.transform(Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), 0, 0, pivot);
	},

	scale: function(x, y, pivot){
		if(pivot === undefined && !isNumber(y)){
			pivot = y;
			y = x;
		}

		if(y === undefined){
			y = x;
		}

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
	} */

};