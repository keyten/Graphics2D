	Context = function(canvas){
		this.context   = canvas.getContext('2d');
		this.canvas    = canvas;
		this.elements  = [];
		this.listeners = {};
	}

	Context.prototype = {

		// Classes

		rect : function(x, y, w, h, fill, stroke){
			return this.push(new Rect(x, y, w, h, fill, stroke, this));
		},
		circle : function(cx, cy, r, fill, stroke){
			return this.push(new Circle(cx, cy, r, fill, stroke, this));
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
		getObjectInPoint : function(x, y){
			var elements = this.elements,
				i = elements.length;

			while(i--){
				if( elements[i].isPointIn && elements[i].isPointIn(x,y) && elements[i]._visible )
					return elements[i];
			}
			return null;
		},


		// Events

		hoverElement : null,
		focusElement : null,
		_setListener : function(event, repeat){
			if(this.listeners[event])
				return;

			var canvas = this.canvas;
			canvas.addEventListener(event, function(e){
				var coords = _.coordsOfElement(canvas),
					object = this.getObjectInPoint(
						e.contextX = e.clientX - coords[0],
						e.contextY = e.clientY - coords[1]
					);

				if(event == 'mouseout')
					object = this.hoverElement,
					this.hoverElement = null;

				e.targetObject = object,
				object && object.fire && object.fire(event, e);
				this.fire(event, e);

			}.bind(this));

			this.listeners[event] = [];

			if(event == 'mouseover' || event == 'mouseout')
				this._setSpecialListener('mouseover', 'mouseout', 'hover', 'mousemove'),
				this._setListener(event == 'mouseover' ? 'mouseout' : 'mouseover'); // от бесконечной рекурсии спасает первое условие функции
			else if(event == 'focus' || event == 'blur')
				this._setSpecialListener('focus', 'blur', 'focus', 'mousedown');
			else if(event == 'mousewheel') // firefox
				this._setListener('DOMMouseScroll');

			return this.listeners[event];
		},
		_setSpecialListener : function(over, out, name, baseevent){ // for mouseover/mouseout and focus/blur
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
				(this.listeners[ 'DOMMouseScroll' ] || this._setListener('DOMMouseScroll')).push(fn);
			(this.listeners[ evt ] || this._setListener(evt)).push(fn);
			return this;
		},
		once : function(evt, fn){ // not works with .off
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