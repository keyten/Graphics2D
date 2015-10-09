Shape = new Class(Style, {

	initialize : function(args){
		var props = this.constructor.props,
			dists = this.constructor.distances || [],
			l = props.length;
		while(l--){
			if( dists[l] && isString(args[l]) )
				this['_' + props[l]] = $.distance(args[l]);
			else
				this['_' + props[l]] = args[l];
		}

		this.listeners = {}; // object to store event listeners
		this.style = new Style;
	},

/*	_parseHash : function(object){
		var s = this._style;

		if( object.opacity !== undefined ){
			s.globalAlpha = object.opacity;
		}
		if( object.composite !== undefined ){
			s.globalCompositeOperation = object.composite;
		}
		if( object.visible !== undefined ){
			this._visible = object.visible;
		}
		if( object.clip !== undefined ){
			this._clip = object.clip;
		}

		this._processStyle( object.fill, object.stroke, true );
	},

	_processStyle : function(fill, stroke){
		if(arguments.length === 0){
			// called from init function
			fill = this._fill;
			stroke = this._stroke;
		}

		this._fill = null;
		this._stroke = null;

		if(fill)
			this._style.fillStyle = fill;
		if(stroke)
			extend(this._style, this._parseStroke(stroke));

		// gradients, patterns
		if(fill && typeof fill.toCanvasStyle === 'function')
			return;

		if(typeof fill === 'function')
			this._style.fillStyle = { toCanvasStyle:fill.bind(this) };

		// object with gradient { type, colors, from, to, ... }
		if(isObject(fill) && fill.colors)
			this._style.fillStyle = new Gradient(fill, null, null, null, this.context);

		// object, string or image with pattern
		if(isPatternLike(fill)){
			this._style.fillStyle = new Pattern(fill, null, this.context);
		}

		// TODO: gradient stroke
	},

	_applyStyle : function(){
		var ctx = this.context.context;
		ctx.save();
		for(var i in this._style){
			if($.has(this._style, i))
				ctx[i] = this._style[i];
		}

		if(this._clip){
			var clip = this._clip;
			if(clip._matrix){
				ctx.save();
				ctx.transform.apply(ctx, clip._matrix);
				clip.processPath(ctx);
				ctx.restore();
			}
			else
				clip.processPath(ctx);
			ctx.clip();
		}

		if(this._matrix){
			ctx.transform.apply(ctx, this._matrix);
		}

		if(this._style.fillStyle && this._style.fillStyle.toCanvasStyle){
			ctx.fillStyle = this._style.fillStyle.toCanvasStyle(ctx, this);
		}

		if(this._style.strokeStyle && this._style.strokeStyle.toCanvasStyle){
			ctx.strokeStyle = this._style.strokeStyle.toCanvasStyle(ctx, this);
		}

		if(this._style._lineDash){
			if(ctx.setLineDash) // webkit
				ctx.setLineDash(this._style._lineDash);
			else // gecko
				ctx.mozDash = this._style._lineDash;
		}
	},

	_parseStroke : function(value){
		var opacity, l, val,
			style = {};

		// object with properties
		if( isObject( value ) ){
			if( value.width !== undefined )
				style.lineWidth   = value.width;
			if( value.color )
				style.strokeStyle = value.color;
			if( value.cap )
				style.lineCap     = value.cap;
			if( value.join )
				style.lineJoin    = value.join;
			if( value.dash )
				// string - 'dot', 'dash', etc
				// else - array with values
				style._lineDash   = isString(value.dash) ? $.dashes[value.dash] : value.dash;

			return style;
		}

		if( !isString( value ) )
			throw new Error('Can\'t parse stroke: ' + value);

		value = value.split(' ');
		l = value.length;
		while(l--){
			val = value[l];

			if( reFloat.test( val ) )
				opacity = parseFloat( val );

			else if( isNumberLike( val ) )
				style.lineWidth = $.distance( val );

			else if( val === 'miter' || val === 'bevel' )
				style.lineJoin = val;

			else if( val === 'butt' || val === 'square' )
				style.lineCap = val;

			else if( val === 'round' ){
				style.lineCap  = style.lineCap  || val;
				style.lineJoin = style.lineJoin || val;
			}

			else if( val[ 0 ] === '[' )
				style._lineDash = val.substr( 1, val.length - 2 ).split(',');

			else if( val in $.dashes )
				style._lineDash = $.dashes[ val ];

			else
				style.strokeStyle = val;
		}
		if( opacity ){
			value = $.color( style.strokeStyle );
			value[3] *= opacity;
			style.strokeStyle = 'rgba(' + value.join(',') + ')';
		}
		return style;
	}, */

	draw : function(ctx){
		if(!this._visible)
			return;
		ctx.save();
//		this.style.toContext(ctx);
		this.processPath(ctx);
		if(this.styles.fillStyle)
			ctx.fill();
		if(this.styles.strokeStyle)
			ctx.stroke();
		ctx.restore();
	},

	update : function(){
		if(!this.context) return this;
		return this.context.update(), this;
	},

	// properties
	prop : function(name, value){
		if(value === undefined)
			return this['_' + name];
		this['_' + name] = value;
		return this.update();
	},

	mouse : function(state){
		return this.prop('events', !!state);
	},

	z : function(z){
		if(z === undefined)
			return this._z;
		if(z === 'top')
			z = this.context.elements.length; // -1?
		this.context.elements.splice(this._z, 1);
		this.context.elements.splice(z, 0, this);
		this._z = z;
		return this.update();
	},

	clip : function(clip, a, b, c){
		if(clip === undefined)
			return this._clip;
		if(clip === null)
			delete this._clip;

		if(clip.processPath)
			this._clip = clip;
		else {
			if(c !== undefined)
				this._clip = new Rect([clip, a, b, c, null, null]);
			else if(b !== undefined)
				this._clip = new Circle([clip, a, b, null, null]);
			else
				this._clip = new Path([clip, null, null]);
			this._clip.context = this.context;
			this._clip.init();
		}
		return this.update();
	},

	clone : function(instance, events){
	// instance = don't clone the style
		var clone = new this.constructor([], this.context);
		for(var i in this){
			if($.has(this, i) && i[0] === '_'){
				if(typeof this[i] === 'object' &&
						this[i] !== null &&
						i !== '_image' && // for images
						(instance !== true || i !== '_style')){
					clone[i] = $.clone(this[i]);
				}
				else
					clone[i] = this[i];
			}
		}
		
		if(events === true)
			clone.listeners = this.listeners;

		return this.context.push( clone );
	},

	remove : function(){
		this.context.elements.splice(this._z, 1);
		return this.update();
	},
/*
	fill : function(fill){
		if(isObject(fill) && fill.colors){
			this._style.fillStyle = new Gradient(fill, null, null, null, this.context);
			return this.update();
		}
		else if(isPatternLike(fill)){
			this._style.fillStyle = new Pattern(fill, null, this.context);
			return this.update();
		}
		return this.style('fillStyle', fill);
	},

	stroke : function(stroke, value){
		// element.stroke() => { fill : 'black', width:2 }
		// element.stroke({ fill:'black', width:3 });
		// element.stroke('black 4pt');
		var style = this._style;
		switch(stroke){
			// return as object
			case undefined: {
				return {
					color: style.strokeStyle,
					width: style.lineWidth,
					cap:   style.lineCap,
					join:  style.lineJoin,
					dash:  style._lineDash
				};
			}

			// return as a string
			case true: {
				return [style.strokeStyle, style.lineWidth, style.lineCap, style.lineJoin, style._lineDash]
							.filter(function(n){ return n != null; })
							.join(' ');
			}

			// remove all the properties
			case null: {
				delete style.strokeStyle;
				delete style.lineWidth;
				delete style.lineCap;
				delete style.lineJoin;
				delete style._lineDash;
				return this;
			}

			// todo: { property: name }
			//       { property: null }
			//       'prop', val
			//       'prop', null
			//       'string'
			default: {
				extend(style, this._parseStroke(stroke));
				return this.update();
			}
		}
	},

	opacity : function(opacity){
		return this.style('globalAlpha', opacity);
	},

	composite : function(composite){
		return this.style('globalCompositeOperation', composite);
	}, */

	hide : function(){
		return this.prop('visible', false);
	},

	show : function(){
		return this.prop('visible', true);
	},

	cursor : function(value){
		if( value === undefined )
			return this._cursor;

		this._cursor = value;

		if( value === null )
			return this.off('mouseover', this._cursorListenerOn).off('mouseout', this._cursorListenerOff);

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
/*
	shadow : function(name, value){
		// shape.shadow({ x, y, color, blur });
		// shape.shadow('x')
		// shape.shadow('x', value)
		// shape.shadow('1px 1px red 2px')
		var style = this._style,
			shadowToStyle = {
				'x': 'shadowOffsetX',
				'y': 'shadowOffsetY',
				'color': 'shadowColor',
				'blur': 'shadowBlur'
			},
			i = 0,
			color;
		if(isString(name)){
			if( name in shadowToStyle ){
				if(value === undefined){
					return style[shadowToStyle[name]];
				}
				
				// distance ?
				if(name === 'color')
					style[shadowToStyle[name]] = value;
				else
					style[shadowToStyle[name]] = $.distance(value);
			}
			else {
				// '1px 1px 2px red'
				// can't use rgba
				// and px (!)
				name = trim(name.replace(/\d+([a-z]+)?/gi, function(dist){
					switch(i){
						case 0: style.shadowOffsetX = $.distance(dist); break;
						case 1: style.shadowOffsetY = $.distance(dist); break;
						case 2: style.shadowBlur = $.distance(dist); break;
					}
					i++;
					return '';
				}));

				if( name !== '' ){
					style.shadowColor = name;
				} else {
					style.shadowColor = 'rgba(0, 0, 0, 0.5)';
				}
			}
		}
		else {
			value = name;
			for(name in value){
				if( $.has(value, name) && name in shadowToStyle ){
					style[shadowToStyle[name]] = value[name];
				}
			}
			if(value.opacity){
				color = $.color(value.color || style.shadowColor || 'black');
				color[3] *= value.opacity;
				this._style.shadowColor = 'rgba(' + color.join(',') + ')';
			}
		}
		return this.update();
	}, */

	// events
	on : function(event, fn){
		if(isString(fn))
			fn = wrap(arguments);

		if( isObject(event) ){
			for(var i in event){
				if($.has(event, i)){
					if(isArray(event[i]))
						this.on.apply(this, [i].concat(event[i]));
					else
						this.on(i, event[i]);
				}
			}
			return this;
		}

		if( isNumber(event) )
			return window.setTimeout(fn.bind(this), event), this;

		this.context.listener(event);
		(this.listeners[ event ] || (this.listeners[ event ] = [])).push(fn);
		return this;
	},
	
	once : function(event, fn){
		if(isString(fn))
			fn = wrap(arguments, this);
		var proxy;
		this.on(event, fn);
		this.on(event, proxy = function(){
			this.off(event, fn);
		});
		proxy.proxy = fn;
		return this;
	},

	off : function(event, fn){
		if(!event)
			return this.listeners = {}, this;
		if(!fn)
			return this.listeners[event] = [], this;

		event = this.listeners[event];

		var index = event.indexOf(fn);
		if( event[index+1].proxy === fn )
			event.splice(index, 2);
		else
			event.splice(index, 1);

		return this;
	},

	fire : function(event, data){
		event = this.listeners[event];
		if( !event )
			return this;
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
		if(!this.processPath)
			return false;
		var ctx = this.context.context,
			is;
		ctx.save();
		if(this._matrix)
			ctx.transform.apply(ctx, this._matrix);
		this.processPath(ctx);
		is = ctx.isPointInPath(x, y);
		ctx.restore();
		return is;
	},

	corner : function(corner, options){
		if(isArray(corner))
			return corner;

		if(isObject(corner)){
			if($.has(corner, 'from')){
				var from = this.corner(corner.from);
				return [from[0] + corner.x, from[1] + corner.y];
			}
			else
				return [corner.x, corner.y];
		}
		if(!corner)
			corner = 'center';

		var bounds = this.bounds(options);
		return [
			bounds.x + bounds.w * $.corners[corner][0],
			bounds.y + bounds.h * $.corners[corner][1]
		];
	},

	bounds : function(options){
		// options.transform == true / false
		// options.stroke == true / false / 'exclude';
		// options === 'points' -> return {lt, rt...}
		if(!this._bounds)
			throw new Error('Object hasn\'t _bounds() method.');

		var bounds = this._bounds(),
			m = this._matrix,
			lw = this._style.lineWidth;
		if( !options )
			return bounds;

		if( (options === 'points' || options.transform === true) && m != null ){

			var ltx = bounds.x1, lty = bounds.y1,
				rtx = bounds.x2, rty = bounds.y1,
				lbx = bounds.x1, lby = bounds.y2,
				rbx = bounds.x2, rby = bounds.y2,

				a = m[0], b = m[1],
				c = m[2], d = m[3],
				e = m[4], f = m[5];
			ltx = [ltx * a + lty * c + e, lty = ltx * b + lty * d + f][0];
			rtx = [rtx * a + rty * c + e, rty = rtx * b + rty * d + f][0];
			lbx = [lbx * a + lby * c + e, lby = lbx * b + lby * d + f][0];
			rbx = [rbx * a + rby * c + e, rby = rbx * b + rby * d + f][0];

			if( options === 'points' ){
				return { lt: [ltx, lty], rt: [rtx, rty], lb: [lbx, lby], rb: [rbx, rby] };
			}

			bounds.x1 = Math.min(ltx, rtx, lbx, rbx);
			bounds.x2 = Math.max(ltx, rtx, lbx, rbx);
			bounds.y1 = Math.min(lty, rty, lby, rby);
			bounds.y2 = Math.max(lty, rty, lby, rby);
			bounds.width = bounds.x2 - bounds.x1;
			bounds.height = bounds.y2 - bounds.y1;
			bounds.w = bounds.width;
			bounds.h = bounds.height;
			bounds.x = bounds.x1;
			bounds.y = bounds.y1;
		} else if( options === 'points' ){
			return {
				lt: [bounds.x1, bounds.y1],
				rt: [bounds.x2, bounds.y1],
				lb: [bounds.x1, bounds.y2],
				rb: [bounds.x2, bounds.y2]
			};
		}


		if( lw && (options.stroke === true || options.stroke === 'exclude') ){
			if( options.stroke === 'exclude' )
				lw = -lw;
			lw /= 2;
			bounds.x1 -= lw;
			bounds.y1 -= lw;
			bounds.x2 += lw;
			bounds.y2 += lw;
			bounds.width += 2 * lw;
			bounds.height += 2 * lw;
			bounds.w += 2 * lw;
			bounds.h += 2 * lw;
			bounds.x -= lw;
			bounds.y -= lw;
		}

		return bounds;
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

		var corner = this.corner(pivot),
			matrix = [
				a, b, c, d,
				-corner[0]*a - corner[1]*c + e+corner[0],
				-corner[0]*b - corner[1]*d + f+corner[1]
				];

		if(this._matrix)
			matrix = $.multiply(this._matrix, matrix);
		
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
			if( typeof this.bounds === 'function' )
				bounds = this.bounds({ transform: true, stroke: true });
			else
				throw new Error('Object #' + this._z + ' can\'t be rasterized: need the bounds.');
		}

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
			if( typeof this.bounds === 'function' )
				bounds = this.bounds({ transform: true, stroke: true });
			else
				throw new Error('Object #' + this._z + ' can\'t be rasterized: need the bounds.');
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
			if( isObject( value ) )
				value.queue = false;
			else
				value = { duration: value, easing: options, callback: arguments[4], queue: false };

			value = $.extend({}, value);
			var c = value.callback,
				keys = Object.keys( prop ),
				i = 0;
			value.callback = null;
			
			for(; i < keys.length; i++){
				if( i === keys.length-1 )
					value.callback = c;
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
			if( this._queue && this._queue.length > 0 )
				this._queue.push( object );
			else {
				this._queue = [ object ];
				$._queue.push( object );
				$._checkAnimation();
			}
		}
		return this;
	},

	// defaults
	_visible : true,
	_events : true,
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

		if( t < 0 )
			continue;

		if( t > 1 )
			t = 1;

		current.now = now;
		current.pos = current.easing(t);
		$.fx.step[current.prop](current);

		if( current.state === 0 )
			current.state = 1;

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
	if(l > 0)
		requestAnimationFrame(doAnimation);
	else
		enabledAnimation = false;
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
				if( fx.end.indexOf('+=') === 0 )
					fx.end = fx.start + Number( fx.end.substr(2) );
				else if( fx.end.indexOf('-=') === 0 )
					fx.end = fx.start + Number( fx.end.substr(2) );
			}
		}

		fx.elem[ fx._prop ] = Math.round(fx.start + (fx.end - fx.start) * fx.pos);
	},

	float: function( fx ){
		if( fx.state === 0 ){
			fx._prop = '_' + fx.prop;
			fx.start = fx.elem[ fx._prop ];
		}

		fx.elem[ fx._prop ] = fx.start + (fx.end - fx.start) * fx.pos;
	},

	opacity: function( fx ){
		if( fx.state === 0 ){
			fx.start = fx.elem._style.globalAlpha;
			if( fx.start === undefined )
				fx.start = 1;
		}
		fx.elem._style.globalAlpha = fx.start + (fx.end - fx.start) * fx.pos;
	},

	fill: function( fx ){
		if( fx.state === 0 ){
			fx.start = $.color( fx.elem._style.fillStyle );

			if( fx.end === 'transparent' ){
				fx.end = fx.start.slice(0, 3).concat([ 0 ]);
			} else
				fx.end = $.color( fx.end );

			if( fx.elem._style.fillStyle === 'transparent' ||
				fx.elem._style.fillStyle === undefined )
				fx.start = fx.end.slice(0, 3).concat([ 0 ]);
		}
		fx.elem._style.fillStyle = 'rgba(' +
			[	Math.round(fx.start[0] + (fx.end[0] - fx.start[0]) * fx.pos),
				Math.round(fx.start[1] + (fx.end[1] - fx.start[1]) * fx.pos),
				Math.round(fx.start[2] + (fx.end[2] - fx.start[2]) * fx.pos),
				fx.start[3] + (fx.end[3] - fx.start[3]) * fx.pos ].join(',') + ')';
	},

	stroke: function( fx ){
		if( fx.state === 0 ){
			var end = Shape.prototype._parseStroke( fx.end );
			fx.color1 = $.color( fx.elem._style.strokeStyle );
			fx.width1 = fx.elem._style.lineWidth || 0;
			fx.width2 = end.lineWidth;

			if( end.strokeStyle === 'transparent' )
				fx.color2 = fx.color1.slice(0, 3).concat([ 0 ]);
			else if( end.strokeStyle )
				fx.color2 = $.color( end.strokeStyle );

			if( (fx.elem._style.strokeStyle === 'transparent' ||
				fx.elem._style.strokeStyle === undefined) && end.strokeStyle )
				fx.color1 = fx.color2.slice(0, 3).concat([ 0 ]);
		}

		if( fx.color2 ){
			fx.elem._style.strokeStyle = 'rgba(' +
				[	Math.round(fx.color1[0] + (fx.color2[0] - fx.color1[0]) * fx.pos),
					Math.round(fx.color1[1] + (fx.color2[1] - fx.color1[1]) * fx.pos),
					Math.round(fx.color1[2] + (fx.color2[2] - fx.color1[2]) * fx.pos),
					fx.color1[3] + (fx.color2[3] - fx.color1[3]) * fx.pos ].join(',') + ')';
		}

		if( fx.width2 )
			fx.elem._style.lineWidth = fx.width1 + (fx.width2 - fx.width1) * fx.pos;
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
			if( fx.end.length === undefined )
				fx.end = [ fx.end, fx.end ];

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
		if( fx.state === 0 )
			fx.elem._origin = fx.elem.corner( fx.end );
	}
};

function transformAnimation( fx, fn ){
	if( fx.state === 0 ){
		fx.elem._matrixStart = fx.elem._matrix || [ 1, 0, 0, 1, 0, 0 ];
		fx.elem._matrixCur = [];
		if( fx.elem.corner )
			fx.corner = fx.elem.corner( fx.elem._origin || 'center' );
		else
			fx.corner = [ 0, 0 ];
	}
	if( fx.elem._matrixCur.now !== fx.now )
		fx.elem._matrixCur = [ 1, 0, 0, 1, 0, 0 ];

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
			if(typeof fn === 'function' || isString(fn))
				return this.on.apply(this, [event].concat(slice.call(arguments)));
			else
				return this.fire.apply(this, arguments);
		};
	});

// animation slices
['x', 'y', 'width', 'height', 'cx', 'cy', 'radius'].forEach(function( param ){
	$.fx.step[ param ] = $.fx.step.int;
});

$.fn = Shape.prototype;