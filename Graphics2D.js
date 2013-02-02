/*! Graphics2D
 * 
 *  Author: Keyten aka Dmitriy Miroshnichenko
 *
 *  10.09.12 / 23:11
 */

var Graphics2D = (function(window, undefined){

	var Context,

		// shapes
		Shape, Rect, Circle, Path;


	Context = function(canvas){

		this.context   = canvas.getContext('2d');
		this.canvas    = canvas;
		this.elements  = [];
		this.listeners = {};

	}

	Context.prototype = {

		// shapes
		rect : function(x,y,w,h,fill,stroke){
			return this.push( new Rect(x,y,w,h,fill,stroke,this) );
		},

		circle : function(x,y,rx,ry,fill,stroke){
			return this.push( new Circle(x,y,rx,ry,fill,stroke,this) );
		},


		push : function(element){
			this.elements.push(element);
			this.update();
			return element;
		},


		// methods
		update : function(){

			var ctx = this.context;
			ctx.clearRect( 0, 0, this.canvas.width, this.canvas.height );
			this.elements.forEach(function(object){

				object.draw(ctx);

			});
			this.fire('update');

		},

		getObjectInPoint : function(x,y){

			var element = null;
			this.elements.forEach(function(object){

				if( object.isPointIn && object.isPointIn( distance(x), distance(y)) )
					element = object;

			});
			return element;

		},

		fire : function(){}

	};


	/* Shape
		abstract class for inheriting shapes */

	Shape = Class({

		initialize : function(){
			this._attr = extend(new Shape.attributes, this.constructor.defaults || {});
			this.data = {};
			this.listeners = {};
		},


		_set : function(name, value, obj){
			if(value == null) return obj[name];
			obj[name] = value;
			this.context.update();
			return this;
		},
		property : function(name, value){
			return this._set(name, value, this._attr)
		},
		style : function(name, value){
			return this._set(name, value, this._attr.style)
		},


		fill : function(color){
			return this.style('fillStyle', color);
		},
		opacity : function(opacity){
			return this.style('globalAlpha', opacity);
		},
		composite : function(composite){
			return this.style('globalCompositeOperation', composite);
		},

		mask : function(shape){
			return this.property('mask', shape);
		},
		hide : function(){
			return this.property('visible', false);
		},
		show : function(){
			return this.property('visible', true);
		},

		draw : function(ctx){
			var a = this._attr;

			if(!a.visible) return;
			style(ctx, a.style);
			this.processPath(ctx);
			if(a.style.fillStyle) ctx.fill();
			if(a.style.strokeStyle) ctx.stroke();
			ctx.restore();
		}

	});

	Shape.attributes = function(){
		this.matrix = [ 1,0,0,1,0,0 ];
		this.style  = {};
		this.visible = true;
	}


	/* Rect
		base rect class */
	Rect = Class(Shape, {

		initialize : function(x, y, w, h, fill, stroke, context){
			var a = this._attr;
			if( all(isNumeric, [x, y, w, h]) )
				extend(a, { x:distance(x), y:distance(y), width:distance(w), height:distance(h) });
			else
				attributes(a, x),
				a.x = distance(x.x),
				a.y = distance(x.y),
				a.width = distance(select(x.width, x.w)),
				a.height = distance(select(x.height, x.h));
			
			this.context = context;
		},

		x : function(v){
			return this.property('x', distance(v));
		},

		y : function(v){
			return this.property('y', distance(v));
		},

		width : function(v){
			return this.property('width', distance(v));
		},

		height : function(v){
			return this.property('height', distance(v));
		},

		processPath : function(ctx){
			var a = this._attr;
			ctx.beginPath();
			ctx.rect( a.x, a.y, a.width, a.height );
		}

	});


	// ctx util

	function attributes(attrs, object){ // в случае передачи хэша парсит общие аргументы
		if(object.fill)
			attrs.style.fillStyle = object.fill;
		if(object.stroke)
			extend(attrs.style, stroke( object.stroke ));
	}

	function style(ctx, style){
		ctx.save();
		[ 'fillStyle', 'strokeStyle', 'lineWidth',
		  'lineCap', 'lineJoin', 'miterLimit',
		  'font', 'textAlign', 'textBaseline',
		  'globalAlpha', 'globalCompositeOperation',
		  'shadowColor', 'shadowOffsetX', 'shadowOffsetY',
		  'shadowBlur' ]
		    .forEach(function(name){

			if(name in style)
				ctx[name] = style[name];

		});
	}

	function stroke(stroke){ // parses string like '2px blue vutt'
		stroke = stroke.split(' ');
		var obj = {}, iscap = true;
		stroke.forEach(function(value){

			if( /^\d*(px|pt|em)?$/.test(value) )
				obj.lineWidth = distance(value);

			else if( value == 'inset' || value == 'outset' || value == 'middle' )
				obj.position = value;

			else if( value == 'butt' || value == 'square' )
				obj.lineCap = value, iscap = false;

			else if( value == 'miter' || value == 'bevel' )
				obj.lineJoin = value;

			else if( value == 'round' )
				if(iscap) obj.lineCap = value;
				else obj.lineJoin = value;

			else
				obj.strokeStyle = value;

		});
		return obj;
	}

	function distance(value){ // parses CSS-like distances (1pt, 0.5cm...)
		if(isNumber(value) || /^\d*$/.test(value + '')) return value;
		var div = document.createElement('div');
		div.style.width = value;
		document.body.appendChild(div);
		var w = parseInt(getComputedStyle(div).width.split('.')[0].replace(/[^\d]/gi, ''));
		document.body.removeChild(div);
		return w;
	}

	function angle(angle){
		var num  = parseFloat( (angle += '').replace(/[^0-9\.\,]*$/, '').split(',').join('.') ),
			unit = angle.replace(/^[0-9\.\,]*/, '');
		if(unit == ''){
			return num / 180 * Math.PI;
		}
		else if(unit == 'deg') return num / 180 * Math.PI;
		else if(unit == 'rad') return num;
		else if(unit == 'turn') return (num * 360) / 180 * Math.PI;
		else if(unit == 'grad') return (num / 100 * 90) / 180 * Math.PI;
	}
	

	// utilities

	function extend(a,b){
		for(var i in b){
			if(Object.prototype.hasOwnProperty.call(b,i))
				a[i] = b[i];
		}
		return a;
	}

	function is(a, b){ // array1 == array2 ?..
		if(a.length != b.length) return false;
		for(var i = 0, l = a.length; i < l; i++){
			if(a[i] != b[i])
				return false;
		}
		return true;
	}

	function select(){
		for(var i = 0, l = arguments.length; i < l; i++){
			if(arguments[i] != null) return arguments[i];
		}
	}

	function all(func, params){ // isNumeric(a) && isNumeric(b) == all(isNumeric, [a,b]);
		for(var i = 0, l = params.length; i < l; i++){
			if(!func(params[i]))
				return false;
		}
		return true;
	}

	function isString(a){ return Object.prototype.toString.call(a) == '[object String]'; };
	function isArray(a) { return Object.prototype.toString.call(a) == '[object Array]' ; }
	function isObject(a){ return Object.prototype.toString.call(a) == '[object Object]'; }
	function isNumber(a){ return Object.prototype.toString.call(a) == '[object Number]'; }

	function isNumeric(a){ return isNumber(a) || !isNaN( parseFloat(a) ); }
	function isPoint(a){ return isNumeric(a) || typeof a == 'object'; }


	function Class(parent, properties){

		if(!properties) properties = parent, parent = null;

		var cls = function(){ return (cls.prototype.initialize || function(){}).apply(this,arguments) }
		if(parent){

			// переход в parent
			cls = function(){

				if(cls.prototype.__initialize__)
					return cls.prototype.__initialize__.apply(this,arguments);

				var parent = this.constructor.parent;
				while(parent){
					if('initialize' in parent.prototype)
						parent.prototype.initialize.apply(this, arguments);
					parent = parent.parent;
				}

				return (cls.prototype.initialize || function(){}).apply(this,arguments);
			}


			// наследование прототипа
			var sklass = function(){}
			sklass.prototype = parent.prototype;
			cls.prototype = new sklass;
			cls.parent = parent;
			cls.prototype.constructor = cls;

		}
		extend(cls.prototype, properties)

		return cls;

	}


	return {

		version:0.1,
		
		Context : Context,
		Shape : Shape,

		start: function(element){
			return new Context( isString(element) ? document.getElementById(element) : element.canvas ? element.canvas : element );
		}

	};

})(window);