/*! Graphics2D Layers 1.0
 *  Author: Keyten aka Dmitriy Miroshnichenko
 *  License: MIT / LGPL
 */
(function(window, $, undefined){

	$.app = function(query, width, height){
		return new App( document.querySelector(query), width, height );
	}

	function App(container, width, height){
		this.layers = [];
		this.container = container;
		this._width  = width;
		this._height = height;
		this.listeners = {};
	}
	App.prototype = {
		layer : function(index){
			if(index === undefined)
				index = this.layers.length;
			if(!this.layers[index]){ // create a layer
				var canvas = document.createElement('canvas');
				canvas.width  = this._width;
				canvas.height = this._height;

				canvas.style.position = 'absolute';

				canvas.style.zIndex = index; // i hope, it's a number
				this.container.appendChild(canvas);
				return this.layers[index] = new Layer(canvas, this);
			}
			else { // return
				return this.layers[index];
			}
		},

		on : $.Context.prototype.on,

		listener : function(event){
			if(this.listeners[event])
				return;

			this.listeners[event] = [];

			var container = this.container;
			container.addEventListener(event, function(e){
				var coords = $.util.coordsOfElement(this.layers[0].canvas),
					element;

				e.contextX = e.clientX - coords.x;
				e.contextY = e.clientY - coords.y;

				for(var l = this.layers.length-1; l+1; l--){
					if(element = this.layers[l].getObjectInPoint(e.contextX, e.contextY))
						break;
				}

				e.targetObject = element;

				if(element && element.fire)
					element.fire(event, e);

				this.fire(event, e);
			}.bind(this));

			if(event == 'mouseover' || event == 'mouseout')
				this.listenerSpecial('mouseover', 'mouseout', 'hover', 'mousemove'),
				this.listener(event == 'mouseover' ? 'mouseout' : 'mouseover');
			else if(event == 'focus' || event == 'blur')
				this.listenerSpecial('focus', 'blur', 'focus', 'mousedown');

			return this.listeners[event];
		},
		listenerSpecial : $.Context.prototype.listenerSpecial,

		fire : $.Context.prototype.fire,

		width : function(value){
			if(value === undefined)
				return this.layers[0].canvas.width;
			this.layers.forEach(function(layer){
				layer.canvas.width = value;
				layer.update();
			});
			return this;
		},

		height : function(value){
			if(value === undefined)
				return this.layers[0].canvas.height;
			this.layers.forEach(function(layer){
				layer.canvas.height = value;
				layer.update();
			});
			return this;
		},
	};

	var Layer = new $.Class($.Context, {
		initialize : function(canvas, app){
			$.Context.apply(this, arguments);
			this.container = app.container;
			this.app = app;
		},

		listener : function(event){
			return this.app.listener(event);
		},

		listenerSpecial : function(over, out, name, baseevent){
			return this.app.listenerSpecial(over, out, name, baseevent);
		},

		z : function(){
			return Number(this.canvas.style.zIndex);
		},

		isVisible : function(){
			return this.canvas.style.visibility != 'hidden';
		},

		hide : function(){
			this.canvas.style.visibility = 'hidden';
			return this;
		},

		show : function(){
			this.canvas.style.visibility = 'visible';
			return this;
		},

		opacity : function(value){
			if(value === undefined)
				return this.canvas.style.opacity || 1;
			this.canvas.style.opacity = value;
			return this;
		},

		toDataURL : function(type){
			return this.canvas.toDataURL(type);
		}
	});

})(window, Graphics2D);