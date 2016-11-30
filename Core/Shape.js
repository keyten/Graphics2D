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
		this.attrs = {};
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

	attrHooks: {},

	// Styles
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
	interaction: function(state){
		return this.attr('interaction', state);
	},

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
		return this.transform(1, 0, 0, 1, x, y);
	},

	rotate: function(angle, pivot){
		angle = angle / 180 * Math.PI;
		return this.transform(Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), 0, 0, pivot || 'center');
	},

	scale: function(x, y, pivot){
		if(y === undefined){
			y = x;
		}
		return this.transform(x, 0, 0, y, 0, 0, pivot || 'center');
	},

	skew: function(x, y, pivot){
		if(y === undefined){
			y = x;
		}
		return this.transform(1, Math.tan(y), Math.tan(x), 1, 0, 0, pivot || 'center');
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