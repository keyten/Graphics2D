	$.Context = Context = function(canvas){
		this.context   = canvas.getContext('2d'); // rename to the context2d?
		this.canvas    = canvas;
		this.elements  = [];
		this.listeners = {};
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

		line : function(fx, fy, tx, ty, stroke){
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
			this.elements.push(element);
			if( element.draw )
				element.draw(this.context);
			// todo: move here 1. element._z 2. element.context
			return element;
		},
		update : function(){
			if(this.__timer)
				return;
			this.__timer = requestAnimationFrame(function(){
				this.__update();
				this.__timer = false;
			}.bind(this), 1);
		},
		__update : function(){
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

			var canvas = this.canvas;
			canvas.addEventListener(event, function(e){
				var coords = _.coordsOfElement(canvas),
					element;

				e.contextX = e.clientX - coords.x;
				e.contextY = e.clientY - coords.y;
				
				element = this.getObjectInPoint(e.contextX, e.contextY, true);

				if(event == 'mouseout'){
					element = this.hoverElement;
					this.hoverElement = null;
				}

				e.targetObject = element;

				if(element && element.fire)
					element.fire(event, e);

				this.fire(event, e);
			}.bind(this));

			if(event == 'mouseover' || event == 'mouseout'){
				this.listenerSpecial('mouseover', 'mouseout', 'hover', 'mousemove');
				this.listener(event == 'mouseover' ? 'mouseout' : 'mouseover');
			}
			else if(event == 'focus' || event == 'blur')
				this.listenerSpecial('focus', 'blur', 'focus', 'mousedown');
			else if(event == 'mousewheel') // firefox
				this.listener('DOMMouseScroll');

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
					last    && last.fire    && last.fire(out, e);
					current && current.fire && current.fire(over, e);
					this[name] = current;
				}

			}.bind(this));
			return this;
		},
		on : function(evt, fn){
			if(toString.call(evt) == '[object Number]')
				return window.setTimeout(fn.bind(this), evt), this;

			if(evt == 'mousewheel') // for firefox
				(this.listeners.DOMMouseScroll || this.listener('DOMMouseScroll')).push(fn);
			(this.listeners[ evt ] || this.listener(evt)).push(fn);
			return this;
		},
		once : function(evt, fn){ // doesn't works with .off
			if(evt == 'mousewheel')
				this.once('DOMMouseScroll', fn);
			var proxy;
			this.on(evt, proxy = function(e){
				fn.call(this, e);
				this.off(evt, proxy);
			}.bind(this));
		},
		off : function(evt, fn){
			if(evt == 'mousewheel')
				this.off('DOMMouseScroll');

			if(!fn)
				this.listeners[evt] = [];

			var index = this.listeners[evt].indexOf(fn);
			this.listeners = this.listeners[evt].slice(0, index).concat( this.listeners[evt].slice(index+1) );
			return this;
		},
		fire : function(evt, data){
			var listeners = this.listeners[ evt ];
			if(!listeners) return this;

			listeners.forEach(function(func){
				func.call(this, data);
			}.bind(this));
			return this;
		}

	};