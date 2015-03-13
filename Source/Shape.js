	$.Shape = Shape = new Class({

		initialize : function(){
			this.listeners = {};
			this._style = {};
		},

		_parseHash : function(object){
			var s = this._style;
			if(object.opacity !== undefined)
				s.globalAlpha = object.opacity;
			if(object.composite !== undefined)
				s.globalCompositeOperation = object.composite;
			if(object.visible !== undefined)
				this._visible = object.visible;
			if(object.clip !== undefined)
				this._clip = object.clip;

			this._processStyle(object.fill, object.stroke, this.context.context);
		},
		_processStyle : function(fill, stroke){
			if(fill)
				this._style.fillStyle = fill;
			if(stroke)
				extend(this._style, this._parseStroke(stroke));

			if(fill instanceof Gradient || fill instanceof Pattern)
				return;

			if(isHash(fill) && fill.colors)
				this._style.fillStyle = new Gradient(fill, null, null, null, this.context);

			if(fill && (isString(fill) || isHash(fill))){
				if((isHash(fill) && fill.image) || fill.indexOf && (fill.indexOf('http://') === 0 || fill.indexOf('.') === 0))
					this._style.fillStyle = new Pattern(fill, null, this.context);
			}
			if(fill instanceof Image){
				this._style.fillStyle = new Pattern(fill, null, this.context);
			}

			// TODO: gradient stroke
		},
		_applyStyle : function(){
			var ctx = this.context.context;
			ctx.save();
			for(var i in this._style){
				if(_.has(this._style, i))
					ctx[i] = this._style[i];
			}
			if(this._clip){
				if(this._clip._matrix){
					ctx.save();
					ctx.transform.apply(ctx, this._clip._matrix);
					this._clip.processPath(ctx);
					ctx.restore();
				}
				else
					this._clip.processPath(ctx);
				ctx.clip();
			}
			if(this._matrix)
				ctx.transform.apply(ctx, this._matrix);
			if(this._style.fillStyle && this._style.fillStyle.toCanvasStyle)
				ctx.fillStyle = this._style.fillStyle.toCanvasStyle(ctx, this);
			else if(typeof this._style.fillStyle === 'function')
				ctx.fillStyle = this._style.fillStyle.call(this, ctx);
			if(this._style.strokeStyle && this._style.strokeStyle.toCanvasStyle)
				ctx.strokeStyle = this._style.strokeStyle.toCanvasStyle(ctx, this);
			if(this._style._lineDash){
				if(ctx.setLineDash) // webkit
					ctx.setLineDash(this._style._lineDash);
				else // gecko
					ctx.mozDash = this._style._lineDash;
			}
		},
		_parseStroke : function(stroke){
			var obj = {}, opacity;
			if(isHash(stroke)){
				stroke.width !== undefined
					&& (obj.lineWidth   = stroke.width);
				stroke.color
					&& (obj.strokeStyle = stroke.color);
				stroke.cap
					&& (obj.lineCap     = stroke.cap  );
				stroke.join
					&& (obj.lineJoin    = stroke.join );
				stroke.dash
					&& (obj._lineDash   = isString(stroke.dash)
						&& _.dashes[stroke.dash]
						|| stroke.dash);
				return obj;
			}

			stroke.split(' ').forEach(function(val){
				if(/^\d*\.\d+$/.test(val))
					opacity = parseFloat(val);
				else if(val[0] === '[')
					obj._lineDash = val.substring(1, val.length-1).split(',');
				else if(isNumber(val))
					obj.lineWidth = _.distance(val);
				else if(val === 'miter' || val === 'bevel')
					obj.lineJoin = val;
				else if(val === 'butt' || val === 'square')
					obj.lineCap = val;
				else if(val === 'round'){
					obj.lineJoin = obj.lineJoin || val;
					obj.lineCap  = obj.lineCap  || val;
				}
				else if(val in _.dashes)
					obj._lineDash = _.dashes[val];
				else
					obj.strokeStyle = val;
			});
			if(opacity){
				var cl = _.color(obj.strokeStyle);
				cl[3] *= opacity;
				obj.strokeStyle = 'rgba(' + cl.join(',') + ')';
			}
			return obj;
		},
		draw : function(ctx){
			if(!this._visible)
				return;
			this._applyStyle();
			this.processPath(ctx);
			if(this._style.fillStyle)
				ctx.fill();
			if(this._style.strokeStyle)
				ctx.stroke();
			ctx.restore();
		},
		update : function(){
			return this.context.update(), this;
		},

		// properties
		_property : function(name, value){
			if(value === undefined)
				return this['_' + name];
			this['_' + name] = value;
			return this.update();
		},
		_setstyle : function(name, value){
			if(value === undefined)
				return this._style[name];
			this._style[name] = value;
			return this.update();
		},
		mouse : function(state){
			return this._property('events', !!state);
		},
		z : function(z){
			if(z === undefined)
				return this._z;
			if(z === 'top')
				z = this.context.elements.length;
			this.context.elements = _.move.call(this.context.elements, this._z, z);
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
			else if(c !== undefined)
				this._clip = new Rect(clip, a, b, c, null, null, this.context);
			else if(b !== undefined)
				this._clip = new Circle(clip, a, b, null, null, this.context);
			else
				this._clip = new Path(clip, null, null, this.context);
			return this.update();
		},
		remove : function(){
			this.context.elements.splice(this._z, 1);
			return this.update();
		},
		fill : function(fill){
			if(isHash(fill) && fill.colors){
				this._style.fillStyle = new Gradient(fill, null, null, null, this.context);
				return this.update();
			}
			else if(fill && (fill.indexOf || isHash(fill))){
				if((isHash(fill) && fill.image) || (fill.indexOf('http://') === 0 || fill.indexOf('.') === 0)){
					this._style.fillStyle = new Pattern(fill, null, this.context);
					return this.update();
				}
			}
			return this._setstyle('fillStyle', fill);
		},
		stroke : function(stroke){
			// element.stroke() => { fill : 'black', width:2 }
			// element.stroke({ fill:'black', width:3 });
			// element.stroke('black 4pt');
			var style = this._style;
			if(stroke === undefined)
				return {
					color : style.strokeStyle, // todo: add default values?
					width : style.lineWidth,
					cap   : style.lineCap,
					join  : style.lineJoin,
					dash  : style._lineDash
				};
			if(stroke === null){
				delete style.strokeStyle;
				delete style.lineWidth;
				delete style.lineCap;
				delete style.lineJoin;
				delete style._lineDash;
			}
			extend(style, this._parseStroke(stroke));
			return this.update();
		},
		opacity : function(opacity){
			return this._setstyle('globalAlpha', opacity);
		},
		composite : function(composite){
			return this._setstyle('globalCompositeOperation', composite);
		},
		hide : function(){
			return this._property('visible', false);
		},
		show : function(){
			return this._property('visible', true);
		},
		cursor : function(cur){
			var cnv = this.context.canvas,
				old = cnv.style.cursor;
			return this.on('mouseover', function(){
				cnv.style.cursor = cur;
			}).on('mouseout', function(){
				cnv.style.cursor = old;
			});
		},
		shadow : function(name, value){
			// shape.shadow({ x, y, color, blur });
			// shape.shadow('x')
			// shape.shadow('x', value)
			// shape.shadow('1px 1px red 2px')
			var style = this._style;
			var shadowToStyle = {
				'x': 'shadowOffsetX',
				'y': 'shadowOffsetY',
				'color': 'shadowColor',
				'blur': 'shadowBlur'
			};
			if(isString(name)){
				if(value === undefined){
					return style[shadowToStyle[name]];
				}
				else if(name.indexOf(' ') === -1){
					// distance ?
					style[shadowToStyle[name]] = value;
				}
				else {
					// '1px 1px 2px red'
				}
			}
			else {
				value = name;
				if(value.opacity){
					value.color = _.color(value.color || style.shadowColor || 'black');
					value.color[3] *= value.opacity;
					value.color = 'rgba(' + value.color.join(',') + ')';
				}
				for(name in value){
					if(_.has(value, name)){
						style[shadowToStyle[name]] = value[name];
					}
				}
			}
			return this.update();
		},

		// events
		on : function(event, fn){
			if(isString(fn)){
				var method = fn,
					args = Array.prototype.slice.call(arguments, 2);
				fn = function(){
					this[method].apply(this, args);
				};
				// [fn, proxy] = [proxy, fn];
			}
			if(toString.call(event) === '[object Number]')
				return window.setTimeout(fn.bind(this), event), this;

			this.context.listener(event);
			(this.listeners[ event ] || (this.listeners[ event ] = [])).push(fn);
			return this;

		},
		once : function(event, fn){
			var proxy;
			this.on(event, proxy = function(e){
				fn.call(this, e);
				this.off(event, proxy);
			}.bind(this));

			fn.proxy = proxy; // for .off
			// BAD, BAD, BAD!

			// func.proxy = true;
			// shape.once(func);
			// func.proxy -- ?
		},
		off : function(event, fn){
			if(!fn)
				this.listeners[event] = [];

			this.listeners[event][this.listeners[event].indexOf(fn.proxy || fn)] = emptyFunc;
			return this;
		},
		fire : function(evt, data){
			(this.listeners[ evt ] || []).forEach(function(func){
				func.call(this, data);
			}.bind(this));
			return this;
		},
		isPointIn : function(x, y){
			if(!this.processPath)
				return false;
			var ctx = this.context.context;
			ctx.save();
			if(this._matrix)
				ctx.transform.apply(ctx, this._matrix);
			this.processPath(ctx);
			x = ctx.isPointInPath(x, y);
			ctx.restore();
			return x;
		},
		corner : function(corner){
			if(isArray(corner))
				return corner;
			if(isHash(corner)){
				if(_.has(corner, 'from')){
					var from = this.corner(corner.from);
					return [from[0] + corner.x, from[1] + corner.y];
				}
				else
					return [corner.x, corner.y];
			}
			if(!this.bounds)
				throw new Error('Object hasn\'t bounds() method.');
			if(!corner)
				corner = 'center';
			var bounds = this.bounds();
			return [
				bounds.x + bounds.w * _.corners[corner][0],
				bounds.y + bounds.h * _.corners[corner][1]
			];
		},

		// transformations
		transform : function(a, b, c, d, e, f, pivot){
			/* px, py = pivot
				[1,0,px]   [a,c,e]   [1,0,-px]   [a,c,e+px]   [1,0,-px]   [a,c,-px*a - py*c + e+px]
				[0,1,py] * [b,d,f] * [0,1,-py] = [b,d,f+py] * [0,1,-py] = [b,d,-px*b - py*d + f+py]
				[0,0,1]    [0,0,1]   [0,0,1]     [0,0,1]      [0,0,1]     [0,0,1]
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
				matrix = _.multiply(this._matrix, matrix);
			
			this._matrix = matrix;
			return this.update();
		},

		scale : function(x, y, pivot){
			// pivot dont work
			if(y === undefined){
				if(isNumber(x))
					y = x;
				else
					y = x[1] !== undefined? x[1]
						: x.y !== undefined? x.y
						: 1;
			}
			if(!isNumber(x)){
				x = x[0] !== undefined? x[0]
						: x.x !== undefined? x.x
						: 1;
			}
			return this.transform( x, 0, 0, y, 0, 0, pivot);
		},

		rotate : function(angle, pivot){
			angle = angle * Math.PI / 180;
			return this.transform(Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), 0, 0, pivot);
		},

		skew : function(x, y, pivot){
			// todo: shape.skew(size, pivot)
			if(y === undefined){
				if(isNumber(x))
					y = x;
				else
					y = x[1] || x.y || 0;
			}
			if(!isNumber(x)){
				x = x[0] || x.x || 0;
			}
			return this.transform( 1, Math.tan(y * Math.PI / 180), Math.tan(x * Math.PI / 180), 1, 0, 0, pivot);
		},

		translate : function(x, y){
			return this.transform(1, 0, 0, 1, x, y);
		},

		// conversions
		toPath : function(){},
		toImage : function(){},

		// animation
		animate : function( prop, value, options ){
			//	animate(property, value, duration, easing, after);
			//	animate(properties, duration, easing, after);
			//	animate(property, value, options);
			//	animate(properties, options);

			if( isHash( prop ) ){
				if( isHash( value ) )
					value.queue = false;
				else
					value = { duration: value, easing: options, callback: arguments[4], queue: false };

				for( var i in prop ){
					if( _.has( prop, i ) )
						this.animate( i, prop[i], value, options, arguments[4] );
				}
				return this;
			}

			if( !isHash( options ) ){
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
				fx.start = _.color( fx.elem._style.fillStyle );

				if( fx.end === 'transparent' ){
					fx.end = fx.start.slice(0, 3).concat([ 0 ]);
				} else
					fx.end = _.color( fx.end );

				if( fx.elem._style.fillStyle === 'transparent'
					|| fx.elem._style.fillStyle === undefined )
					fx.start = fx.end.slice(0, 3).concat([ 0 ]);
			}
			fx.elem._style.fillStyle = 'rgba(' +
				[ Math.round(fx.start[0] + (fx.end[0] - fx.start[0]) * fx.pos),
				  Math.round(fx.start[1] + (fx.end[1] - fx.start[1]) * fx.pos),
				  Math.round(fx.start[2] + (fx.end[2] - fx.start[2]) * fx.pos),
				 fx.start[3] + (fx.end[3] - fx.start[3]) * fx.pos ].join(',') + ')';
		},

		stroke: function( fx ){
			if( fx.state === 0 ){
				var end = Shape.prototype._parseStroke( fx.end );
				fx.color1 = _.color( fx.elem._style.strokeStyle );
				fx.width1 = fx.elem._style.lineWidth || 0;
				fx.width2 = end.lineWidth;

				if( end.strokeStyle === 'transparent' )
					fx.color2 = fx.color1.slice(0, 3).concat([ 0 ]);
				else if( end.strokeStyle )
					fx.color2 = _.color( end.strokeStyle );

				if( (fx.elem._style.strokeStyle === 'transparent'
					|| fx.elem._style.strokeStyle === undefined)&& end.strokeStyle )
					fx.color1 = fx.color2.slice(0, 3).concat([ 0 ]);
			}

			if( fx.color2 ){
				fx.elem._style.strokeStyle = 'rgba(' +
					[ Math.round(fx.color1[0] + (fx.color2[0] - fx.color1[0]) * fx.pos),
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
			if( fx.state === 0 )
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

				fx.end[0] = fx.end[0] * Math.PI / 180;
				fx.end[1] = fx.end[1] * Math.PI / 180;
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

		fx.elem._matrixCur = _.multiply( fx.elem._matrixCur, matrix );
		fx.elem._matrixCur.now = fx.now;
		fx.elem._matrix = _.multiply( fx.elem._matrixStart, fx.elem._matrixCur );
	}

	// events slices
	['click', 'dblclick', 'mousedown', 'mousewheel',
		'mouseup', 'mousemove', 'mouseover',
		'mouseout', 'focus', 'blur',
		'touchstart', 'touchmove', 'touchend'].forEach(function(event){
			Shape.prototype[event] = Context.prototype[event] = function(fn){
				if(typeof fn === 'function' || isString(fn))
					return this.on.apply(this, [event].concat(Array.prototype.slice.call(arguments)));
				else
					return this.fire.apply(this, arguments);
			};
		});

	// animation slices
	['x', 'y', 'width', 'height', 'cx', 'cy', 'radius'].forEach(function( param ){
		$.fx.step[ param ] = $.fx.step.int;
	});