Context = function(canvas, renderer){
	if(renderer && renderer !== '2d')
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

		if( isObject(event) ){
			for(var i in event)
				if($.has(event, i))
					this.on(i, event[i]);
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
	}

};