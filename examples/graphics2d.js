/*  Graphics2D 0.9.0
 * 
 *  Author: Dmitriy Miroshnichenko aka Keyten <ikeyten@gmail.com>
 *  Last edit: 17.11.2014
 *  License: MIT / LGPL
 */

(function(window, undefined){

	// Classes
	var Context,

		Shape, Rect, Circle, Path, Img, Text, TextBlock,

		Gradient, Pattern, Anim, Bounds;

	// Local variables
	var emptyFunc = function(){},
		_ = {},
		toString = Object.prototype.toString,
		requestAnimationFrame =
				window.requestAnimationFrame		|| 
				window.webkitRequestAnimationFrame	|| 
				window.mozRequestAnimationFrame		|| 
				window.oRequestAnimationFrame		|| 
				window.msRequestAnimationFrame		||
				window.setTimeout,
		cancelAnimationFrame =
				window.cancelAnimationFrame			|| 
				window.webkitCancelAnimationFrame	|| 
				window.mozCancelAnimationFrame		|| 
				window.oCancelAnimationFrame		|| 
				window.msCancelAnimationFrame		||

				window.cancelRequestAnimationFrame			|| 
				window.webkitCancelRequestAnimationFrame	|| 
				window.mozCancelRequestAnimationFrame		|| 
				window.oCancelRequestAnimationFrame			|| 
				window.msCancelRequestAnimationFrame		||

				window.clearTimeout;


		Context = function(canvas){
		this.context   = canvas.getContext('2d');
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
				
				element = this.getObjectInPoint(e.contextX, e.contextY);

				if(event == 'mouseout'){
					element = this.hoverElement;
					this.hoverElement = null;
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

		// Transform animation
	var trStart = function(anim){
			if(!this._matrix)
				this._matrix = [1,0,0,1,0,0];
			anim.object.matrixStart = this._matrix;
			anim.object.matrixCur = [1,0,0,1,0,0];
			anim.object.matrixCur.step = 0;
		};
	var trProcess = function(fn){
			return function(anim, end, step, param){
				// если матрица с прошлого "тика" - мы её обнуляем
				if(anim.object.matrixCur.step != step){
					anim.object.matrixCur = [1,0,0,1,0,0];
					anim.object.matrixCur.step = step;
				}

				var cur = _.interpolate(_.animTransformConstants[param], end, step);
				_.transform(anim.object.matrixCur, fn(cur), _.corner('center', this.bounds()));
				this._matrix = _.multiply(anim.object.matrixStart, anim.object.matrixCur);
			}
		};

	Shape = new Class({

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
				if(Object.prototype.hasOwnProperty.call(this._style, i))
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
				else if(val[0] == '[')
					obj._lineDash = val.substring(1, val.length-1).split(',');
				else if(isNumber(val))
					obj.lineWidth = _.distance(val);
				else if(val == 'miter' || val == 'bevel')
					obj.lineJoin = val;
				else if(val == 'butt' || val == 'square')
					obj.lineCap = val;
				else if(val == 'round'){
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

		// параметры
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
		z : function(z){
			if(z === undefined)
				return this._z;
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
				this._clip = new Path(clip, 0, 0, null, null, this.context);
			return this.update();
		},
		remove : function(){
			this.context.elements = this.context.elements.slice(0, this._z).concat(this.context.elements.slice(this._z+1));
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
		stroke : function(str){
			// element.stroke() => { fill : 'black', width:2 }
			// element.stroke({ fill:'black', width:3 });
			// element.stroke('black 4pt');
			var s = this._style;
			if(str === undefined)
				return {
					color : s.strokeStyle, // todo: наставить дефолтных значений?
					width : s.lineWidth,
					cap   : s.lineCap,
					join  : s.lineJoin,
					dash  : s._lineDash
				};
			if(str === null){
				delete this._style.strokeStyle;
				delete this._style.lineWidth;
				delete this._style.lineCap;
				delete this._style.lineJoin;
				delete this._style._lineDash;
			}
			extend(this._style, this._parseStroke(str));
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

		// события
		on : function(evt, fn){
			if(isString(fn)){
				var command = fn,
					args = Array.prototype.slice.call(arguments, 2);
				fn = function(){
					this[command].apply(this, args);
				};
				// [fn, proxy] = [proxy, fn];
			}
			if(toString.call(evt) == '[object Number]')
				return window.setTimeout(fn.bind(this), evt), this;

			this.context.listener(evt);
			if(evt == 'mousewheel') // for firefox
				(this.listeners.DOMMouseScroll || (this.listeners.DOMMouseScroll = [])).push(fn);
			(this.listeners[ evt ] || (this.listeners[ evt ] = [])).push(fn);
			return this;

		},
		once : function(evt, fn){
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

			this.listeners[evt][this.listeners[evt].indexOf(fn)] = emptyFunc;
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
			try { return ctx.isPointInPath(x, y); }
			finally { ctx.restore(); }
		},

		// transformations
		transform : function(a, b, c, d, e, f, pivot){
			if(!this._matrix)
				this._matrix = [1,0,0,1,0,0];
			_.transform(this._matrix, [a, b, c, d, e, f], _.corner(pivot, this.bounds()));
			return this.update();
		},
		scale : function(x, y, pivot){
			return this.transform( isNumber(x) ? x : (x[0] || x.x || 0), 0, 0, (y === undefined ? (isNumber(x) ? x : (x[1] || x.y || 0)) : y), 0, 0, pivot );
		},
		rotate : function(angle, pivot){
			angle = angle * Math.PI / 180;
			return this.transform(Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), 0, 0, pivot);
		},
		skew : function(x, y, pivot){
			return this.transform( 1, Math.tan((y === undefined ? (isNumber(x) ? x : (x[1] || x.y || 0)) : y) * Math.PI / 180), Math.tan((isNumber(x) ? x : (x[0] || x.x || 0)) * Math.PI / 180), 1, 0, 0, pivot );
		},
		translate : function(x, y){
			return this.transform(1, 0, 0, 1, x, y);
		},

		// анимация
		_anim : {
			fill : {
				start : function(anim, end){
					anim.object.fill = _.color(this._style.fillStyle);
					if(end == 'transparent')
						anim.object.fillEnd = [anim.object.fill[0], anim.object.fill[1], anim.object.fill[2], 0];
					else
						anim.object.fillEnd = _.color(end);

					if(this._style.fillStyle == 'transparent')
						anim.object.fill = [anim.object.fillEnd[0], anim.object.fillEnd[1], anim.object.fillEnd[2], 0];
				},
				process : function(anim, end, step){
					var start = anim.object.fill;
					end = anim.object.fillEnd;
					this._style.fillStyle = [
						'rgba(',
						Math.round(_.interpolate(start[0], end[0], step)), ',',
						Math.round(_.interpolate(start[1], end[1], step)), ',',
						Math.round(_.interpolate(start[2], end[2], step)), ',',
						_.interpolate(start[3], end[3], step), ')'				
					].join('');
				}
			},
			stroke : {
				start : function(anim, end){
					anim.object.strokeWidth = this._style.lineWidth;
					anim.object.strokeColor = _.color(this._style.strokeStyle);					
					if(isHash(end)){
						anim.object.strokeWidthEnd = _.distance(end.width);
						if(end.color == 'transparent')
							anim.object.strokeColorEnd = [anim.object.strokeColor[0], anim.object.strokeColor[1], anim.object.strokeColor[2], 0];
						else
							anim.object.strokeColorEnd = _.color(end.color);
					}
					else {
						anim.object.strokeWidthEnd = _.distance((end.replace(/(#[0-9a-f]{6})|(#[0-9a-f]{3})|(rgba?\((\d{1,3})\,\s*(\d{1,3})\,\s*(\d{1,3})(\,\s*([0-9\.]{1,4}))?\))|(rgba?\((\d{1,3})\%?\,\s*(\d{1,3})\%?\,\s*(\d{1,3})\%?(\,\s*([0-9\.]{1,4}))?\))/, '').match(/(\d+|(\d+)?\.\d+)(em|ex|ch|rem|vw|vh|vmin|vmax|cm|mm|in|px|pt|pc)?/) || [])[0]);
						if(end.indexOf('transparent') > -1)
							anim.object.strokeColorEnd = [anim.object.strokeColor[0], anim.object.strokeColor[1], anim.object.strokeColor[2], 0];
						else
							anim.object.strokeColorEnd = _.color((end.match(/(#[0-9a-f]{6})|(#[0-9a-f]{3})|(rgba?\((\d{1,3})\,\s*(\d{1,3})\,\s*(\d{1,3})(\,\s*([0-9\.]{1,4}))?\))|(rgba?\((\d{1,3})\%?\,\s*(\d{1,3})\%?\,\s*(\d{1,3})\%?(\,\s*([0-9\.]{1,4}))?\))/) || end.match(new RegExp(Object.keys(_.colors).join('|'))) || [])[0]);
						// монструозненько
					}
					if(this._style.strokeStyle == 'transparent')
						anim.object.strokeColor = [anim.object.strokeColorEnd[0], anim.object.strokeColorEnd[1], anim.object.strokeColorEnd[2], 0];
				},
				process : function(anim, end, step){
					if(anim.object.strokeWidthEnd !== undefined)
						this._style.lineWidth = _.interpolate(anim.object.strokeWidth, anim.object.strokeWidthEnd, step);
					if(anim.object.strokeColorEnd !== undefined){
						var start = anim.object.strokeColor;
						end = anim.object.strokeColorEnd;
						this._style.strokeStyle = [
							'rgba(',
							Math.round(_.interpolate(start[0], end[0], step)), ',',
							Math.round(_.interpolate(start[1], end[1], step)), ',',
							Math.round(_.interpolate(start[2], end[2], step)), ',',
							_.interpolate(start[3], end[3], step), ')'				
						].join('');
					}
				}
			},
			opacity : {
				start : function(anim){
					anim.object.opacity = this._style.globalAlpha === undefined ? 1 : this._style.globalAlpha;
				},
				process : function(anim, end, step){
					this._style.globalAlpha = _.interpolate(anim.object.opacity, end, step);
				}
			},
			crop : {
				start : function(anim){
					anim.object.crop = this._crop;
				},
				process :function(anim, end, step){
					var start = anim.object.crop;
					this._crop = [
						_.interpolate(start[0], end[0], step),
						_.interpolate(start[1], end[1], step),
						_.interpolate(start[2], end[2], step),
						_.interpolate(start[3], end[3], step)
					];
				}
			},

			number : {
				start: function(anim, end, param){
					anim[param] = this['_' + param];
				},
				process: function(anim, end, step, param){
					this['_' + param] = _.interpolate(anim[param], end, step);
				}
			},

			rotate : {
				start : trStart,
				process : trProcess(function(ang){
					return [Math.cos(ang = ang*Math.PI/180), Math.sin(ang), -Math.sin(ang), Math.cos(ang), 0, 0];
				})
			},
			scale : {
				start : trStart,
				process : trProcess(function(cur){
					return [cur, 0, 0, cur, 0, 0];
				})
			},
			scaleX : {
				start : trStart,
				process : trProcess(function(cur){
					return [cur, 0, 0, 1, 0, 0];
				})
			},
			scaleY : {
				start : trStart,
				process : trProcess(function(cur){
					return [1, 0, 0, cur, 0, 0];
				})
			},
			skew : {
				start : trStart,
				process : trProcess(function(ang){
					return [1, Math.tan(ang = ang*Math.PI/180), Math.tan(ang), 1, 0, 0];
				})
			},
			skewX : {
				start : trStart,
				process : trProcess(function(ang){
					return [1, 0, Math.tan(ang * Math.PI / 180), 1, 0, 0];
				})
			},
			skewY : {
				start : trStart,
				process : trProcess(function(ang){
					return [1, Math.tan(ang * Math.PI / 180), 0, 1, 0, 0];
				})
			},
			translate : {
				start : trStart,
				process : trProcess(function(cur){
					return [1, 0, 0, 1, cur, cur];
				})
			},
			translateX : {
				start : trStart,
				process : trProcess(function(cur){
					return [1, 0, 0, 1, cur, 0];
				})
			},
			translateY : {
				start : trStart,
				process : trProcess(function(cur){
					return [1, 0, 0, 1, 0, cur];
				})
			}

		},
		animate : function(params, value, dur, easing, after){
			//	r.animate(param, value, dur, easing, after);
			//	r.animate(params, dur, easing, after);
			//	r.animate(param, value, options);
			//	r.animate(params, options);

			if(isString(params)){
				var obj = {};
				obj[params] = value;
				params = obj;

				if(isHash(dur)){
					after  = dur.after;
					easing = dur.easing;
					dur    = dur.duration;
				}
			}
			else {
				if(isHash(value)){
					after  = value.after;
					easing = value.easing;
					dur    = value.duration;
				}
				else {
					after = easing,
					easing = dur,
					dur = value;
				}
			}

			var anim = new Anim(0, 1, dur, easing);
			anim.object = {};
			for(var param in params){
				if(Object.prototype.hasOwnProperty.call(params, param))
					(this._anim[param].start || emptyFunc).call(this, anim, params[param], param);
			}

			anim.start(function(step){

				for(param in params){
					if(Object.prototype.hasOwnProperty.call(params, param))
						this._anim[param].process.call(this, anim, params[param], step, param);
						// animObject, endValue, step, parameter
				}

				this.update();

			}.bind(this));

			if(after)
				setTimeout(after.bind(this), dur || 500);

			return this;
		},

		// defaults
		_visible : true
	});

	// сокращения для событий
	['click', 'dblclick', 'mousedown', 'mousewheel',
		'mouseup', 'mousemove', 'mouseover',
		'mouseout', 'focus', 'blur'].forEach(function(event){
			Shape.prototype[event] = Context.prototype[event] = function(fn){
				if(typeof fn == 'function' || isString(fn))
					return this.on.apply(this, [event].concat(Array.prototype.slice.call(arguments)));
				else
					return this.fire.apply(this, arguments);
			};
		});

	// сокращения для анимаций
	['x', 'y', 'width', 'height', 'cx', 'cy', 'radius'].forEach(function(name){
		Shape.prototype._anim[name] = Shape.prototype._anim.number;
	});


		Rect = new Class(Shape, {

		initialize : function(x, y, w, h, fill, stroke, context){
			this._z = context.elements.length;
			this.context = context;
			if(isHash(x)){
				this._x = x.x;
				this._y = x.y;
				this._width = x.width;
				this._height = x.height;
				this._parseHash(x);
			}
			else {
				this._x = x;
				this._y = y;
				this._width = w;
				this._height = h;
				this._processStyle(fill, stroke, context.context);
			}
		},

		// параметры
		x : function(x){
			return this._property('x', x);
		},
		y : function(y){
			return this._property('y', y);
		},
		width : function(w){
			return this._property('width', w);
		},
		height : function(h){
			return this._property('height', h);
		},
		x1 : function(x){
			return x === undefined ?
				this._x :
				this._property('width', this._width - x + this._x).
					 _property('x', x);
		},
		y1 : function(y){
			return y === undefined ?
				this._y :
				this._property('height', this._height - y + this._y).
					 _property('y', y);
		},
		x2 : function(x){
			return x === undefined ?
				this._x + this._width :
				this._property('width', x - this._x);
		},
		y2 : function(y){
			return y === undefined ?
				this._y + this._height :
				this._property('height', y - this._y);
		},

		bounds : function(){
			return new Bounds(this._x, this._y, this._width, this._height);
		},
		processPath : function(ctx){
			ctx.beginPath();
			ctx.rect(this._x, this._y, this._width, this._height);
		}

	});


		Circle = new Class(Shape, {

		initialize : function(cx, cy, radius, fill, stroke, context){
			this._z = context.elements.length;
			this.context = context;
			if(isHash(cx)){
				this._cx = cx.cx || cx.x;
				this._cy = cx.cy || cx.y;
				this._radius = cx.radius;
				this._parseHash(cx);
			}
			else {
				this._cx = cx;
				this._cy = cy;
				this._radius = radius;
				this._processStyle(fill, stroke, context.context);
			}
		},

		// параметры
		cx : function(cx){
			return this._property('cx', cx);
		},
		cy : function(cy){
			return this._property('cy', cy);
		},
		radius : function(r){
			return this._property('radius', r);
		},

		bounds : function(){
			return new Bounds(this._cx - this._radius, this._cy - this._radius, this._radius * 2, this._radius * 2);
		},
		processPath : function(ctx){
			ctx.beginPath();
			ctx.arc(this._cx, this._cy, this._radius, 0, Math.PI*2, true);
		}

	});


		Path = new Class(Shape, {

		initialize : function(points, fill, stroke, context){
			this._z = context.elements.length;
			this.context = context;
			if(isHash(points)){
				this._points = this._parsePath(points.points);
				this._parseHash(points);
			}
			else {
				this._points = this._parsePath(points);
				this._processStyle(fill, stroke, context.context);
			}
		},

		// points
		point : function(index, value){
			if(value === undefined)
				return this._points[index];
			this._points = this._points.slice(0, index).concat(this._parsePath(value).concat(this._points.slice(index+1)));
			return this.update();
		},
		before : function(index, points){
			this._points = this._points.slice(0, index).concat(this._parsePath(points).concat(this._points.slice(index)));
			return this.update();
		},
		after : function(index, points){
			return this.before(index+1, points);
		},
		remove : function(index){
			if(index === undefined)
				return Shape.prototype.remove.call(this);
			this._points = this._points.slice(0, index).concat( this._points.slice(index+1) );
			return this.update();
		},

		points : function(points){
			if(points === undefined){
				return this._points;
			}
			this._points = this._parsePath(points);
			return this.update();
		},

		push : function(object){
			this._points.push(object);
			return this.update();
		},
		add : function(name, arg){
			return this.push( new _.pathFunctions[name](arg, this._points, this) );
		},
		moveTo : function(x, y){
			return this.add('moveTo', [x, y]);
		},
		lineTo : function(x, y){
			return this.add('lineTo', [x, y]);
		},
		quadraticCurveTo : function(hx, hy, x, y){
			return this.add('quadraticCurveTo', [hx, hy, x, y]);
		},
		bezierCurveTo : function(h1x, h1y, h2x, h2y, x, y){
			return this.add('bezierCurveTo', [h1x, h1y, h2x, h2y, x, y]);
		},
		arcTo : function(x1, y1, x2, y2, radius, clockwise){
			return this.add('arcTo', [x1, y1, x2, y2, radius, clockwise]);
		},
		arc : function(x, y, radius, start, end, clockwise){
			return this.add('arc', [x, y, radius, start, end, clockwise]);
		},
		closePath : function(){
			return this.add('closePath');
		},

		// transformations
		allPoints : function(fn){
			// path.allPoints() => [[0,0], [10,10]]
			// path.allPoints(function(func, arg){ return [0,0] })
			var allPoints = [],
				returnData, temp;
			if(fn === undefined){
				fn = function(x,y){
					allPoints.push([x,y]);
				};
				returnData = true;
			}
			this._points.forEach(function(func){
				var arg = func._arguments;
				if( temp = fn(Number(arg[0]), Number(arg[1])) ){
					arg[0] = temp[0];
					arg[1] = temp[1];
				}
				if( arg.length > 3 && func.name != 'arc' && (temp = fn(Number(arg[2]), Number(arg[3]))) ){
					arg[2] = temp[0];
					arg[3] = temp[1];
				}
				if( func.name == 'bezierCurveTo' && (temp = fn(Number(arg[4]), Number(arg[5]))) ){
					arg[4] = temp[0];
					arg[5] = temp[1];
				}
			});
			return returnData ? allPoints : this.update();
		},
		transformPath : function(a,b,c,d,e,f, pivot){
			if(isString(a) && a in _.transformFunctions){
				a = _.transformFunctions[a].apply(null, Array.prototype.slice.call(arguments,1));
				b = a[1];
				c = a[2];
				d = a[3];
				e = a[4];
				f = a[5];
				a = a[0];
			}

			var m = [1,0,0,1,0,0], m2 = [a,b,c,d,e,f];
			_.transform(m, m2, _.corner(pivot, this.bounds()));
			return this.allPoints(function(x, y){
				return _.transformPoint(x, y, m);
			});
		},


		bounds : function(){
			var x  =  Infinity,
				y  =  Infinity,
				x2 = -Infinity,
				y2 = -Infinity;
			this._points.forEach(function(point){
				if(point.name != 'lineTo'
					&& point.name != 'moveTo'
					&& point.name != 'quadraticCurveTo'
					&& point.name != 'bezierCurveTo')
					return;
				var a = point._arguments; // and if a[2] or a[4] == 0?
				x  = Math.min( x,  a[0], a[2] || x,  a[4] || x  );
				y  = Math.min( y,  a[1], a[3] || y,  a[5] || y  );
				x2 = Math.max( x2, a[0], a[2] || x2, a[4] || x2 );
				y2 = Math.max( y2, a[1], a[3] || y2, a[5] || y2 );
			});
			return new Bounds(x, y, x2 - x, y2 - y);
		},
		processPath : function(ctx){
			ctx.save();
			ctx.beginPath();
			this._points.forEach(function(point, i){
				point.process(ctx, i);
			});
			ctx.restore();
		},
		_parsePath : function(path){
			if(!path) return [];
			var curves = [];
			if(isArray(path)){

				// number array
				if(isArray(path[0])){
					curves[0] = new _.pathFunctions.moveTo(path[0], curves, this);

					path.forEach(function(value, i){
						if(i === 0)
							return;

						if(value === true){
							curves[i] = new _.pathFunctions.closePath([], curves, this);
							return;
						}

						curves[i] = new _.pathFunctions[
							{
								2: 'lineTo',
								4: 'quadraticCurveTo',
								6: 'bezierCurveTo'
							}[value.length]
						](value, curves, this);
					}.bind(this));
				}

				// objects
				else {
					path.forEach(function(value, i){
						// {name, args, ?x,y}
						curves[i] = new _.pathFunctions[value.name](value.arguments, curves, this);
					}.bind(this));
				}

			}

			// SVG-like
			else if(isString(path)){
				// regular for numbers: /\-?\d*\.\d+|\-?\d+/g
				var match = path.match(/([A-Za-z])\s*((\-?\d*\.\d+|\-?\d+)((\s*,\s*|\s|\-)(\-?\d*\.\d+|\-?\d+))*)?/g);
				// TODO: make possible more than one letter?
				var command;
				var numbers;
				var length;
				var toNumber = function(v){ return Number(v); };
				for(var i = 0, l = match.length; i < l; i++){
					command = _.svgFunctions[match[i][0]];
					numbers = match[i].match(/\-?\d*\.\d+|\-?\d+/g); // arguments
					length = _.svgPathLengths[match[i][0]]; // count of the arguments (L - 2, H - 1...)
					if(numbers){
						numbers = numbers.map(toNumber);

						if(numbers.length > length){
							// multiple in one command: L100,100,200,200,300,300,400,400 (== L100,100 L200,200, ...)
							var exist = numbers.length,
								mustb = length;
				//				iters = exist / mustb;
							for(; mustb <= exist; mustb+=length){
								curves.push(new _.pathFunctions[command](numbers.slice(mustb-length, mustb), curves, this));
							}
						}
						else
							curves.push(new _.pathFunctions[command](numbers, curves, this));
					}
					else
						curves.push(new _.pathFunctions[command](numbers, curves, this));
				}
			}
			return curves;
		}

	});


		Img = new Class(Shape, {

		initialize : function(image, x, y, width, height, context){
			this._z = context.elements.length;
			this.context = context;

			if(x === undefined){
				this._image = image.image;
				this._x = image.x;
				this._y = image.y;
				this._width = image.width;
				this._height = image.height;
				this._crop = image.crop;
				this._parseHash(image);
			}
			else {
				this._image = image;
				this._x = x;
				this._y = y;
				this._width = width;
				this._height = height;
			}

			if(isString(this._image)){
				if(this._image[0] == '#')
					this._image = document.getElementById( this._image.substr(1) );
				else {
					x = new Image();
					x.src = this._image;
					this._image = x;
				}
			}

			var s;

			// image already loaded
			if(this._image.complete){
				s = this._computeSize(this._width, this._height, this._image);
				this._width = s[0];
				this._height = s[1];
			}
			
			this._image.onload = function(){
				this.fire('load');
				s = this._computeSize(this._width, this._height, this._image);
				this._width = s[0];
				this._height = s[1];
				this.update();
			}.bind(this);

		},
		
		_computeSize : function(w, h, image){
			// num, num
			if(isNumber(w) && isNumber(h))
				return [w, h];

			// 'native', 'native' or 'auto', 'auto'
			// and undefined, undefined
			if((isString(w) && isString(h)) || (w === undefined && h === undefined))
				return [image.width, image.height];

			// native
			if(w === 'native' || h === 'native')
				return [w === 'native' ? image.width : w,
						h === 'native' ? image.height : h];
		
			// auto
			if(w === 'auto' || h === 'auto')
				return [w === 'auto' ? image.width * (h / image.height) : w,
						h === 'auto' ? image.height * (w / image.width) : h];
		},

		x  : Rect.prototype.x,
		y  : Rect.prototype.y,
		x1 : Rect.prototype.x1,
		y1 : Rect.prototype.y1,
		x2 : Rect.prototype.x2,
		y2 : Rect.prototype.y2,
		width : function(w){
			if(w === undefined) return this._width;
			return this._property('width', this._computeSize(w, this._height, this._image)[0]);
		},
		height : function(h){
			if(h === undefined) return this._height;
			return this._property('height', this._computeSize(this._width, h, this._image)[1]);
		},
		bounds : Rect.prototype.bounds,
		processPath : Rect.prototype.processPath, // for event listeners

		crop : function(arr){
			if(arguments.length === 0)
				return this._crop;
			if(arguments.length > 1)
				this._crop = Array.prototype.slice.call(arguments, 0);
			else if(arr === null)
				delete this._crop;
			else this._crop = arr;
			return this.update();
		},

		draw : function(ctx){
			if(!this._visible)
				return;
			this._applyStyle();

			if(this._crop !== undefined)
				ctx.drawImage(this._image, this._crop[0], this._crop[1], this._crop[2], this._crop[3], this._x, this._y, this._width, this._height);
			else
				ctx.drawImage(this._image, this._x, this._y, this._width, this._height);

			if(this._style.strokeStyle !== undefined)
				ctx.strokeRect(this._x, this._y, this._width, this._height);
			ctx.restore();
		}

	});


		Text = new Class(Shape, {

		initialize : function(text, font, x, y, fill, stroke, context){
			// text, [font], x, y, [fill], [stroke]
			this._z = context.elements.length;
			this.context = context;
			this._style.textBaseline = 'top';

			if(isHash(text)){
				this._text  = text.text;
				this._x     = text.x;
				this._y     = text.y;
				this._font  = this._parseFont(text.font || '10px sans-serif');
				text.baseline !== undefined
					&& (this._style.textBaseline = text.baseline);
				text.align !== undefined
					&& (this._style.textAlign = text.align);
				this._genFont();
				this._width = text.width;
				this._parseHash(text);
			}
			else {
			// "ABC", "10px", "20pt", "20pt", "black"
				this._text = text;
				if(!isNumber(y))
					stroke = fill,
					fill = y,
					y = x,
					x = font,
					font = '10px sans-serif';
				this._font = this._parseFont(font);
				this._genFont();
				this._x = x;
				this._y = y;
				this._processStyle(fill, stroke, context.context);
			}
		},

		// параметры
		text : function(t){
			return this._property('text', t);
		},
		x : function(x){
			return this._property('x', x);
		},
		y : function(y){
			return this._property('y', y);
		},
		font : function(font){
			if(font === true)
				return this._style.font;
			if(font === undefined)
				return this._font;
			extend(this._font, this._parseFont(font));
			return this._genFont();
		},
		_setFont : function(name, value){
			if(value === undefined)
				return this._font[name];
			this._font[name] = value;
			return this._genFont();
		},
		_genFont : function(){
			var str = '',
				font = this._font;
			font.italic && (str += 'italic ');
			font.bold && (str += 'bold ');
			return this._setstyle('font', str + (font.size || 10) + 'px ' + (font.family || 'sans-serif'));
		},
		_parseFont : function(font){
			if(isHash(font)){
				font.size = _.distance(font.size);
				return font;
			}

			var obj = {family:''};
			font.split(' ').forEach(function(val){
				if(val == 'bold')
					obj.bold = true;
				else if(val == 'italic')
					obj.italic = true;
				else if(/^\d+(px|pt)?/.test(val))
					obj.size = _.distance(val);
				else
					obj.family += ' ' + val;
			});
			if( (obj.family = obj.family.replace(/^\s*/, '').replace(/\s*$/, '')) === '' )
				delete obj.family;
			return obj;
		},
		family : function(f){
			return this._setFont('family', f);
		},
		size : function(s){
			return this._setFont('size', s === undefined ? undefined : _.distance(s));
		},
		bold : function(b){
			return this._setFont('bold', b === undefined ? undefined : !!b) || false;
		},
		italic : function(i){
			return this._setFont('italic', i === undefined ? undefined : !!i) || false;
		},
		align : function(a){
			return this._setstyle('textAlign', a);
		},
		baseline : function(b){
			return this._setstyle('textBaseline', b);
		},
		underline : function(val){
			if(val === undefined)
				return !!this._underline;
			return this._property('underline', !!val);
		},
		width : function(w){
			if(w === undefined && this._width === undefined){
				var ctx = this.context.context;
				this._applyStyle();
				var m = ctx.measureText( this._text ).width;
				ctx.restore();
				return m;
			}
			return this._property('width', w);
		},

		// text.font('2px')

		// text.family('Arial');
		// text.size(10);
		// text.weight(true)
		// text.baseline(0)

		isPointIn : function(x, y){
			var b = this.bounds();
			return x > b.x && y > b.y && x < b.x+b.w && y < b.y+b.h;
		},
		bounds : function(){
			var align = this._style.textAlign || 'left',
				baseline = this._style.textBaseline || 'top',
				width = this.width(),
				size = parseInt(this._font.size) * 1.15, // не помню, откуда это число взялось. вроде привет LibCanvas?)
				x = this._x,
				y = this._y;

			if(align == 'center')
				x -= width/2;
			else if(align == 'right')
				x -= width;

			if(baseline == 'middle')
				y -= size/2;
			else if(baseline == 'bottom' || baseline == 'ideographic')
				y -= size;
			else if(baseline == 'alphabetic')
				y -= size * 0.8;
			return new Bounds(x, y, width, size);
		},
		draw : function(ctx){
			if(!this._visible)
				return;
			this._applyStyle();
			var params = [this._text, this._x, this._y];
			if(this._width)
				params.push(this.width());
			if(this._style.fillStyle)
				ctx.fillText.apply(ctx, params);
			if(this._style.strokeStyle)
				ctx.strokeText.apply(ctx, params);

			// underline
			if(this._underline){
				var b = this.bounds();
				ctx.beginPath();
				var height = Math.round(this._font.size / 5)
				ctx.moveTo(b.x, b.y + b.h - height);
				ctx.lineTo(b.x + b.w, b.y + b.h - height);
				ctx.strokeStyle = this._style.strokeStyle || this._style.fillStyle;
				ctx.lineWidth   = Math.round(this._font.size / 15);
				ctx.stroke();
			}
			ctx.restore();
		}
	// TODO: mozPathText; mozTextAlongPath
	// https://developer.mozilla.org/en-US/docs/Drawing_text_using_a_canvas
	});


		TextBlock = new Class(Shape, {

		initialize : function(text, font, x, y, width, fill, stroke, context){
			// text, [font], x, y, [width], [fill], [stroke]
			this._z = context.elements.length;
			this.context = context;
			if(isHash(text)){
				this._text  = text.text;
				this._x     = text.x;
				this._y     = text.y;
				this._font  = this._parseFont(text.font);
				text.align
					&& (this._style.textAlign = text.align);
				this._genFont();
				this._width = text.width === undefined ? 'auto' : text.width;
				text.limit !== undefined
					&& (this._limit = text.limit);
				this._parseHash(text);
			}
			else {
			// "ABC", "10px", "20pt", "20pt", "black"

			// text, font, x, y, width
			// text, font, x, y
			// text, x, y, width
			// text, x, y
				this._text = text;
				if(!isNumber(width)){
					if(isNumber(font)) // но ведь там может быть и просто-размер
						stroke = fill,
						fill = width,
						width = y,
						y = x,
						x = font,
						font = '10px sans-serif';
					if(!isNumber(width))
						stroke = fill,
						fill = width,
						width = 'auto';
				}
				this._font = this._parseFont(font);
				this._genFont();
				this._x = x;
				this._y = y;
				this._width = width;
				this._processStyle(fill, stroke, context.context);
			}
			this._genLines();
		},

		// параметры
		text : function(v){
			if(v === undefined) return this._text;
			this._text = v;
			this._genLines();
			return this.update();
		},
		x : Text.prototype.x,
		y : Text.prototype.y,
		font : Text.prototype.font,
		_setFont : Text.prototype._setFont,
		_genFont : function(){
			var str = '',
				font = this._font;
			font.italic
				&& (str += 'italic ');
			font.bold
				&& (str += 'bold ');
			this._style.font = str + (font.size || 10) + 'px ' + (font.family || 'sans-serif');
			return this._genLines().update();
		},
		_parseFont : Text.prototype._parseFont,
		family : Text.prototype.family,
		size : Text.prototype.size,
		bold : Text.prototype.bold,
		italic : Text.prototype.italic,
		align : function(align){
			if(align === undefined)
				return this._style.textAlign;
			this._style.textAlign = align;
			var w = this.width();
			this._lines.forEach({
				'left' : function(line){ line.x = 0; },
				'center' : function(line){ line.x = w / 2; },
				'right' : function(line){ line.x = w; }
			}[align]);
			return this.update();
		},

		// block parameters
		width : function(v){
			v = this._property('width', v);
			if(v == 'auto'){ // fixme
				v = 0;
				var ctx = this.context.context;
				this._applyStyle();
				this._lines.forEach(function(line){
					v = Math.max(ctx.measureText(line.text).width, v);
				});
				ctx.restore();
				return v;
			}
			if(v == this) this._genLines().update();
			return v;
		},
		height : function(){
			return (this._lineHeight || this._font.size) * this._lines.length;
		},
		_genLines : function(){
			var text = this._text,
				lines = this._lines = [],
				size = this._lineHeight || this._font.size || 10,
				ctx = this.context.context,
				width = this._width == 'auto' ? Infinity : this._width,
				countline = 1,
				align = this._style.textAlign,
				x = (align == 'center') ? (width/2) : ((width == 'right') ? width : 0);

			this._applyStyle();

			text.split('\n').forEach(function(line){
				if(ctx.measureText(line).width > width){ // нужно ли разбивать строку на строки
					var words = line.split(' '),
						useline = '',
						testline, i, len;

					for(i = 0, len = words.length; i < len; i++){
						testline = useline + words[i] + ' ';

						if(ctx.measureText(testline).width > width){
							lines.push({ text:useline, x:x, y:size * countline, count:countline++ });
							useline = words[i] + ' ';
						}
						else {
							useline = testline;
						}
					}
					lines.push({ text:useline, x:x, y:size * countline, count:countline++ });
				}
				else
					lines.push({ text:line, x:x, y:size * countline, count:countline++ });

			});
			ctx.restore();
			return this;
		},
		lineHeight : function(height){
			if(height === undefined)
				return this._lineHeight === undefined ? this._font.size : this._lineHeight;
			if(height === false)
				height = this._font.size;
			this._lineHeight = height;
			this._lines.forEach(function(line){
				line.y = height * line.count;
			});
			return this.update();
		},
		limit : function(v){
			return this._property('value', v);
		},


		isPointIn : Text.prototype.isPointIn,
		bounds : function(){
			return new Bounds( this._x, this._y, this.width(), this.height() );
		},
		draw : function(ctx){
			var fill = this._style.fillStyle ? ctx.fillText.bind(ctx) : emptyFunc,
				stroke = this._style.strokeStyle ? ctx.strokeText.bind(ctx) : emptyFunc,
				x = this._x,
				y = this._y,
				i, l, line;

			if(!this._visible)
				return;
			this._applyStyle();

			for(i = 0, l = Math.min(this._lines.length, this._limit); i < l; i++){
				line = this._lines[i];
				fill(line.text, x + line.x, y + line.y);
				stroke(line.text, x + line.x, y + line.y);
			}

			ctx.restore();

		},

		_limit : Infinity,
		_lineHeight : null
	});


		Gradient = new Class({

		initialize : function(type, colors, from, to, context){
			if(isHash(type)){
				this._type = type.type || 'linear';
				this._colors = isArray(type.colors) ? this._parseColors(type.colors) : type.colors;

				this._from = type.from || [];
				this._to = type.to || [];

				// radial
				if(type.center)
					this._to[0] = type.center[0], // TODO: distance
					this._to[1] = type.center[1];

				if(type.hilite)
					this._from[0] = this._to[0] + type.hilite[0],
					this._from[1] = this._to[1] + type.hilite[1];
				else if(!type.from)
					this._from[0] = this._to[0],
					this._from[1] = this._to[1];

				if(isNumber(type.radius))
					this._to[2] = _.distance(type.radius);
				else if(isArray(type.radius))
					this._to[2] = Math.round(Math.sqrt( Math.pow(this._to[0] - type.radius[0], 2) + Math.pow(this._to[1] - type.radius[1], 2) ));
				
				if(isNumber(type.startRadius))
					this._from[2] = _.distance(type.startRadius);
				else if(isArray(type.startRadius))
					this._from[2] = Math.round(Math.sqrt( Math.pow(this._to[0] - type.startRadius[0], 2) + Math.pow(this._to[1] - type.startRadius[1], 2) ));
			}
			else {
				if(to === undefined)
					to = from,
					from = colors,
					colors = type,
					type = 'linear';
				this._type = type || 'linear';
				this._colors = isArray(colors) ? this._parseColors(colors) : colors;
				this._from = from;
				this._to = to;
			}
			this.context = context;
		},

		_parseColors : function(colors){
			var stops = {},
				step = 1 / (colors.length - 1);
			colors.forEach(function(color, i){
				stops[ step * i ] = color;
			});
			return stops;
		},

		colorMix : function(t){
			var last,
				stops = this._colors,
				keys  = Object.keys( stops ).sort();

			for(var i = 0, l = keys.length; i < l; i++){
				if(keys[i] == t)
					return _.color(stops[keys[i]]);
				else if(parseFloat(last) < t && parseFloat(keys[i]) > t){
					return _.interpolate( _.color(stops[last]), _.color(stops[keys[i]]), (t - parseFloat(last)) / (parseFloat(keys[i]) - parseFloat(last)) );
				}
				last = keys[i];
			}

		},
		color : function(i, color){
			if(color === undefined)
				return this._colors[i];
			this._colors[i] = color;
			return this.update();
		},
		colors : function(colors){
			if(colors === undefined)
				return this._colors;
			this._colors = colors;
			return this.update();
		},

		// general
		from : function(x,y,r){
			if(isString(x) && x in _.corners){
				this._from = x;
				return this.update();
			}
			if(isArray(x)){
				r = x[2];
				y = x[1];
				x = x[0];
			}

			if(!isArray(this._from))
				this._from = [];

			if(x !== undefined) this._from[0] = x; // TODO: distance ?
			if(y !== undefined) this._from[1] = y;
			if(r !== undefined) this._from[2] = r;
			return this.update();
		},
		to : function(x,y,r){
			if(isString(x) && x in _.corners){
				this._from = x;
				return this.update();
			}
			if(isArray(x)){
				r = x[2];
				y = x[1];
				x = x[0];
			}

			if(!isArray(this._from))
				this._from = [];

			if(x !== undefined) this._to[0] = x;
			if(y !== undefined) this._to[1] = y;
			if(r !== undefined) this._to[2] = r;
			return this.update();
		},

		// radial
		radius : function(radius, y){
			if(radius === undefined)
				return this._to[2];

			if(y !== undefined)
				radius = [radius, y];

			if(!isNumber(radius)){
				var vx = this._to[0] - radius[0];
				var vy = this._to[1] - radius[1];

				this._to[2] = Math.round(Math.sqrt( vx*vx + vy*vy ));
			}
			else {
				this._to[2] = _.distance(radius);
			}
			return this.update();
		},
		startRadius : function(radius, y){
			if(radius === undefined)
				return this._from[2];

			if(y !== undefined)
				radius = [radius, y];

			if(!isNumber(radius)){
				var vx = this._to[0] - radius[0];
				var vy = this._to[1] - radius[1];

				this._from[2] = Math.round(Math.sqrt( vx*vx + vy*vy ));
			}
			else {
				this._from[2] = _.distance(radius);
			}
			return this.update();
		},
		center : function(x, y){
			if(x === undefined)
				return this._to.slice(0, 2);
			if(y === undefined){
				y = x[1];
				x = x[0];
			}
			this._to[0] = x;
			this._to[1] = y;
			return this.update();
		},
		hilite : function(x, y){
			if(x === undefined)
				return [this._from[0] - this._to[0], this._from[1] - this._to[1]];
			if(y === undefined){
				y = x[1];
				x = x[0];
			}
			this._from[0] = this._to[0] + x;
			this._from[1] = this._to[1] + y;
			return this.update();
		},

		// drawing and _set
		update : function(){
			this.context.update();
			return this;
		},
		toCanvasStyle : function(ctx, element){
			var grad,
				from = this._from,
				to = this._to,
				bounds;

			// for corners like 'top left'
			if(isString(from)){
				if(/^\d+(px|pt)?/.test(from))
					this._from = from = _.distance(from);
				else
					from = _.corner(from, bounds = element.bounds());
			}
			if(isString(to)){
				if(/^\d+(px|pt)?/.test(to))
					this._to = to = _.distance(to);
				else
					to = _.corner(to, bounds || (bounds = element.bounds()));
			}

			if(this._type == 'linear')
				grad = ctx.createLinearGradient(from[0], from[1], to[0], to[1]);
			else 
				grad = ctx.createRadialGradient(from[0], from[1], from[2] || 0, to[0], to[1], to[2] || (bounds || (bounds = element.bounds())).height);

			for(var offset in this._colors){
				if(Object.prototype.hasOwnProperty.call(this._colors, offset))
					grad.addColorStop( offset, this._colors[offset] );
			}
			return grad;
		}

	});


		Pattern = new Class({

		initialize : function(image, repeat, context){
			this._repeat = (!!repeat === repeat ? (repeat ? 'repeat' : 'no-repeat') : (isString(repeat) ? 'repeat-' + repeat : 'repeat'));

			if(image instanceof Image)
				this._image = image;

			else if(isString(image)){
				if(image[0] == '#')
					this._image = document.getElementById(image.substr(1));
				else
					this._image = new Image(),
					this._image.src = image;
			}
			this._image.onload = this.update.bind(this);

			this.context = context;
		},

		// параметры
		repeat : function(repeat){
			if(repeat === undefined)
				return {
					'repeat' : true,
					'no-repeat' : false,
					'repeat-x' : 'x',
					'repeat-y' : 'y'
				}[this._repeat];
			this._repeat = (!!repeat === repeat ? (repeat ? 'repeat' : 'no-repeat') : (isString(repeat) ? 'repeat-' + repeat : 'repeat'));
			return this.update();
		},

		// отрисовка
		update : Gradient.prototype.update,
		toCanvasStyle : function(context){
			return context.createPattern(this._image, this._repeat);
		}


	});


		Anim = new Class({

		initialize : function(from, to, dur, easing){
			this.from = from;
			this.delta = to - from;
			this.dur = dur || 500;
			this.ease = easing || 'linear';
		},

		start : function(fn, fps){
			var delta = this.delta,
				from  = this.from,
				dur   = this.dur,
				ease  = Anim.easing[this.ease] || function(x){return x;},
				start = Date.now(),
				finish = start + dur,
				interval, time, frame;

			interval = this.interval = setInterval(function(){ // fixme! requestAnimationFrame -- посмотреть, что там, а то фигня какая-то с ним получается
				if(time == (time = Date.now())) return;
				frame = ease( time > finish ? 1 : (time - start) / dur );
				fn(from + delta * frame, frame);

				if(time > finish)
					clearInterval(interval);
			}, fps || 10); // fixme или можно 1000 / fps, так точнее будет... реально fps

			return this;
		},
		stop : function(){
			clearInterval(this.interval);
			return this;
		}

	});

	// Mootools :)
	Anim.easing = {
		linear : function(x){ return x; },
		half : function(x){ return Math.sqrt(x); },
		pow : function(t, v){
			return Math.pow(t, v || 6);
		},
		expo : function(t, v){
			return Math.pow(v || 2, 8 * (t-1));
		},
		circ : function(t){
			return 1 - Math.sin(Math.acos(t));
		},
		sine : function(t){
			return 1 - Math.cos(t * Math.PI / 2);
		},
		back : function(t, v){
			v = v || 1.618;
			return Math.pow(t, 2) * ((v + 1) * t - v);
		},
		bounce : function(t){
			for(var a = 0, b = 1; 1; a += b, b /= 2){
				if(t >= (7 - 4 * a) / 11){
					return b * b - Math.pow((11 - 6 * a - 11 * t) / 4, 2);
				}
			}
		},
		elastic : function(t, v){
			return Math.pow(2, 10 * --t) * Math.cos(20 * t * Math.PI * (v || 1) / 3);
		}
	};
	['quad', 'cubic', 'quart', 'quint'].forEach(function(name, i){
		Anim.easing[name] = function(t){ return Math.pow(t, i+2); };
	});

	function processEasing(func){
		Anim.easing[i + 'In'] = func;
		Anim.easing[i + 'Out'] = function(t){
			return 1 - func(1 - t);
		};
		Anim.easing[i + 'InOut'] = function(t){
			return t <= 0.5 ? func(2 * t) / 2 : (2 - func(2 * (1 - t))) / 2;
		};
	}

	for(var i in Anim.easing){
		// don't make functions within a loop
		if(Object.prototype.hasOwnProperty.call(Anim.easing, i))
			processEasing(Anim.easing[i]);
	}



	function Bounds(x,y,w,h){
		this.x = this.x1 = x;
		this.y = this.y1 = y;
		this.w = this.width  = w;
		this.h = this.height = h;
		this.x2 = x + w;
		this.y2 = y + h;
		this.cx = x + w / 2;
		this.cy = y + h / 2;
	}



	function Class(parent, properties, base){

		if(!properties) properties = parent, parent = null;

		var cls = function(){ return (cls.prototype.initialize || emptyFunc).apply(this,arguments); };
		if(parent){

			// go to the parent
			cls = function(){

				if(cls.prototype.__initialize__)
					return cls.prototype.__initialize__.apply(this,arguments);

				var parent = this.constructor.parent;
				while(parent){
					if('initialize' in parent.prototype)
						parent.prototype.initialize.apply(this, arguments);
					parent = parent.parent;
				}

				return (cls.prototype.initialize || emptyFunc).apply(this,arguments);
			};


			// prototype inheriting
			var sklass = function(){};
			sklass.prototype = parent.prototype;
			cls.prototype = new sklass();
			cls.parent = parent;
			cls.prototype.constructor = cls;

		}
		if(base)
			extend(cls, base);

		extend(cls.prototype, properties);

		return cls;

	}


	function extend(a,b){
		for(var i in b){
			if(Object.prototype.hasOwnProperty.call(b,i))
				a[i] = b[i];
		}
		return a;
	}

	// typeofs
	function isString(a){
		return toString.call(a) == '[object String]';
	}
	function isArray(a) {
		return toString.call(a) == '[object Array]';
	}
	function isHash(a){
		try {
			JSON.stringify(a); // only hashes
			return toString.call(a) == '[object Object]';
		}
		catch(e){
			return false;
		}
	}
	function isNumber(value){
		if(toString.call(value) == '[object Number]')
			return true;
		if( isString(value) && /^(\d+|(\d+)?\.\d+)(em|ex|ch|rem|vw|vh|vmin|vmax|cm|mm|in|px|pt|pc)?$/.test(value) )
			return true;
		return false;
	}
//	function isPoint(a){
//		return isNumber(a) || typeof a == 'object';
//	}

	_.Bounds = Bounds;
	_.extend = extend;
	_.isString = isString;
	_.isArray = isArray;
	_.isHash = isHash;
	_.isNumber = isNumber;

	// constants

	_.dashes = {
		shortdash:			[4, 1],
		shortdot:			[1, 1],
		shortdashdot:		[4, 1, 1, 1],
		shortdashdotdot:	[4, 1, 1, 1, 1, 1],
		dot:				[1, 3],
		dash:				[4, 3],
		longdash:			[8, 3],
		dashdot:			[4, 3, 1, 3],
		longdashdot:		[8, 3, 1, 3],
		longdashdotdot:		[8, 3, 1, 3, 1, 3]
	};

	_.reg = {
//		decimal : /^\d*\.\d+$/,
//		distance : /^\d*(\.\d*)?(em|ex|ch|rem|vw|vh|vmin|vmax|cm|mm|in|px|pt|pc)?$/,
//		number : /^\d*$/,
//		distanceValue : /[^\d]*/
	};

	_.corners = {
		'left'  : [0, 0.5],
		'right' : [1, 0.5],
		'top'   : [0.5, 0],
		'bottom': [0.5, 1],
		'center': [0.5, 0.5],
		'left top'    : [0, 0],
		'top left'    : [0, 0],
		'left bottom' : [0, 1],
		'bottom left' : [0, 1],
		'right top'   : [1, 0],
		'top right'   : [1, 0],
		'right bottom': [1, 1],
		'bottom right': [1, 1],

		'lt'	: [0, 0],
		'tl'	: [0, 0],
		'lb'	: [0, 1],
		'bl'	: [0, 1],
		'rt'	: [1, 0],
		'tr'	: [1, 0],
		'rb'	: [1, 1],
		'br'	: [1, 1]
	};

	_.pathStrFunctions = {
		'M' : 'moveTo',
		'L' : 'lineTo',
		'B' : 'bezierCurveTo',
		'Q' : 'quadraticCurveTo',
		'R' : 'rect',
		'A' : 'arc'
	};

	_.colors = { // http://www.w3.org/TR/css3-color/#svg-color
		'aliceblue': 'f0f8ff',
		'antiquewhite': 'faebd7',
		'aqua': '0ff',
		'aquamarine': '7fffd4',
		'azure': 'f0ffff',
		'beige': 'f5f5dc',
		'bisque': 'ffe4c4',
		'black': '000',
		'blanchedalmond': 'ffebcd',
		'blue': '00f',
		'blueviolet': '8a2be2',
		'brown': 'a52a2a',
		'burlywood': 'deb887',
		'burntsienna': 'ea7e5d',
		'cadetblue': '5f9ea0',
		'chartreuse': '7fff00',
		'chocolate': 'd2691e',
		'coral': 'ff7f50',
		'cornflowerblue': '6495ed',
		'cornsilk': 'fff8dc',
		'crimson': 'dc143c',
		'cyan': '0ff',
		'darkblue': '00008b',
		'darkcyan': '008b8b',
		'darkgoldenrod': 'b8860b',
		'darkgray': 'a9a9a9',
		'darkgreen': '006400',
		'darkgrey': 'a9a9a9',
		'darkkhaki': 'bdb76b',
		'darkmagenta': '8b008b',
		'darkolivegreen': '556b2f',
		'darkorange': 'ff8c00',
		'darkorchid': '9932cc',
		'darkred': '8b0000',
		'darksalmon': 'e9967a',
		'darkseagreen': '8fbc8f',
		'darkslateblue': '483d8b',
		'darkslategray': '2f4f4f',
		'darkslategrey': '2f4f4f',
		'darkturquoise': '00ced1',
		'darkviolet': '9400d3',
		'deeppink': 'ff1493',
		'deepskyblue': '00bfff',
		'dimgray': '696969',
		'dimgrey': '696969',
		'dodgerblue': '1e90ff',
		'firebrick': 'b22222',
		'floralwhite': 'fffaf0',
		'forestgreen': '228b22',
		'fuchsia': 'f0f',
		'gainsboro': 'dcdcdc',
		'ghostwhite': 'f8f8ff',
		'gold': 'ffd700',
		'goldenrod': 'daa520',
		'gray': '808080',
		'green': '008000',
		'greenyellow': 'adff2f',
		'grey': '808080',
		'honeydew': 'f0fff0',
		'hotpink': 'ff69b4',
		'indianred': 'cd5c5c',
		'indigo': '4b0082',
		'ivory': 'fffff0',
		'khaki': 'f0e68c',
		'lavender': 'e6e6fa',
		'lavenderblush': 'fff0f5',
		'lawngreen': '7cfc00',
		'lemonchiffon': 'fffacd',
		'lightblue': 'add8e6',
		'lightcoral': 'f08080',
		'lightcyan': 'e0ffff',
		'lightgoldenrodyellow': 'fafad2',
		'lightgray': 'd3d3d3',
		'lightgreen': '90ee90',
		'lightgrey': 'd3d3d3',
		'lightpink': 'ffb6c1',
		'lightsalmon': 'ffa07a',
		'lightseagreen': '20b2aa',
		'lightskyblue': '87cefa',
		'lightslategray': '789',
		'lightslategrey': '789',
		'lightsteelblue': 'b0c4de',
		'lightyellow': 'ffffe0',
		'lime': '0f0',
		'limegreen': '32cd32',
		'linen': 'faf0e6',
		'magenta': 'f0f',
		'maroon': '800000',
		'mediumaquamarine': '66cdaa',
		'mediumblue': '0000cd',
		'mediumorchid': 'ba55d3',
		'mediumpurple': '9370db',
		'mediumseagreen': '3cb371',
		'mediumslateblue': '7b68ee',
		'mediumspringgreen': '00fa9a',
		'mediumturquoise': '48d1cc',
		'mediumvioletred': 'c71585',
		'midnightblue': '191970',
		'mintcream': 'f5fffa',
		'mistyrose': 'ffe4e1',
		'moccasin': 'ffe4b5',
		'navajowhite': 'ffdead',
		'navy': '000080',
		'oldlace': 'fdf5e6',
		'olive': '808000',
		'olivedrab': '6b8e23',
		'orange': 'ffa500',
		'orangered': 'ff4500',
		'orchid': 'da70d6',
		'palegoldenrod': 'eee8aa',
		'palegreen': '98fb98',
		'paleturquoise': 'afeeee',
		'palevioletred': 'db7093',
		'papayawhip': 'ffefd5',
		'peachpuff': 'ffdab9',
		'peru': 'cd853f',
		'pink': 'ffc0cb',
		'plum': 'dda0dd',
		'powderblue': 'b0e0e6',
		'purple': '800080',
		'red': 'f00',
		'rosybrown': 'bc8f8f',
		'royalblue': '4169e1',
		'saddlebrown': '8b4513',
		'salmon': 'fa8072',
		'sandybrown': 'f4a460',
		'seagreen': '2e8b57',
		'seashell': 'fff5ee',
		'sienna': 'a0522d',
		'silver': 'c0c0c0',
		'skyblue': '87ceeb',
		'slateblue': '6a5acd',
		'slategray': '708090',
		'slategrey': '708090',
		'snow': 'fffafa',
		'springgreen': '00ff7f',
		'steelblue': '4682b4',
		'tan': 'd2b48c',
		'teal': '008080',
		'thistle': 'd8bfd8',
		'tomato': 'ff6347',
		'turquoise': '40e0d0',
		'violet': 'ee82ee',
		'wheat': 'f5deb3',
		'white': 'fff',
		'whitesmoke': 'f5f5f5',
		'yellow': 'ff0',
		'yellowgreen': '9acd32'
	};


	// Clear functions
	_.move = function(from, to){ // moves an element of array
		if(from < to) to++; // учёт того, что с перемещением элемента массив сам изменяется. и изменяются координаты
		var first = this.slice(0,to),
			last  = this.slice(to),
			res = first.concat([this[from]]).concat(last);
		if(from > to) from++;
		first = res.slice(0,from);
		last  = res.slice(from+1);
		return first.concat(last);
	};

	_.multiply = function(m1, m2){ // multiplies two matrixes
		return [
			m1[0] * m2[0] + m1[2] * m2[1],
			m1[1] * m2[0] + m1[3] * m2[1],
			m1[0] * m2[2] + m1[2] * m2[3],
			m1[1] * m2[2] + m1[3] * m2[3],
			m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
			m1[1] * m2[4] + m1[3] * m2[5] + m1[5]
		];
	};

	_.interpolate = function(from, to, t){ // for example: interpolate(0, 5, 0.5) => 2.5
		return from + (to - from) * t;
	};

	_.transformPoint = function(x,y, m){
		return [x * m[0] + y * m[2] + m[4], x * m[1] + y * m[3] + m[5]];
	};




	// Сокращения
	_.transform = function( m1, m2, pivot ){ // transforms the matrix with a pivot
		extend( m1, _.multiply( m1, [ 1,0,0,1,pivot[0],pivot[1] ] ) );
		extend( m1, _.multiply( m1, m2 ) );
		extend( m1, _.multiply( m1, [ 1,0,0,1,-pivot[0],-pivot[1] ] ) );
	};


	// DOM
	_.coordsOfElement = function(element){ // returns coords of DOM element
		var x = 0, y = 0,
			temp = element.getBoundingClientRect();
		x += temp.x;
		y += temp.y;

		temp = element.ownerDocument.documentElement;
		x += temp.clientLeft || 0;
		y += temp.clientTop  || 0;

		temp = window.getComputedStyle(element);
		x += parseInt(temp.borderLeftWidth);
		x += parseInt(temp.paddingLeft);
		y += parseInt(temp.borderTopWidth);
		y += parseInt(temp.paddingTop);

		return { x: x, y: y };
	};

	_.color = function(value){ // parses CSS-like colors (rgba(255,0,0,0.5), green, #f00...)
		if(value === undefined) return;

		var test;
		if(value in _.colors)
			return _.color('#' + _.colors[value]);
		if(test = value.match(/^rgba?\((\d{1,3})\,\s*(\d{1,3})\,\s*(\d{1,3})(\,\s*([0-9\.]{1,4}))?\)/))
			return [parseInt(test[1]), parseInt(test[2]), parseInt(test[3]), parseFloat(test[5] || 1)];
		if(test = value.match(/^rgba?\((\d{1,3})\%?\,\s*(\d{1,3})\%?\,\s*(\d{1,3})\%?(\,\s*([0-9\.]{1,4}))?\)/))
			return [ Math.round(parseInt(test[1]) * 2.55), Math.round(parseInt(test[2]) * 2.55), Math.round(parseInt(test[3]) * 2.55), parseFloat(test[5] || 1) ];
		if(test = value.match(/^\#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i))
			return [parseInt(test[1], 16), parseInt(test[2], 16), parseInt(test[3], 16), 1];
		if(test = value.match(/^\#([0-9a-f])([0-9a-f])([0-9a-f])/i))
			return [parseInt(test[1] + test[1], 16), parseInt(test[2] + test[2], 16), parseInt(test[3] + test[3], 16), 1];
		if(value == 'rand')
			return [Math.round(Math.random() * 255), Math.round(Math.random() * 255), Math.round(Math.random() * 255), Number(Math.random().toFixed(2))];

		return [0,0,0,0];
	};

	_.distance = function(value){
		if(value === undefined) return;
		if(!value) return 0;
		if(toString.call(value) == '[object Number]') // not isNumber :(
			return value;

		if((value + '').indexOf('px') == (value + '').length-2)
			return parseInt((value + '').replace(/[^\d]*/, ''));

		if(!_.units){
			var div = document.createElement('div');
			document.body.appendChild(div); // FF don't need this :)
			_.units = {};
			['em', 'ex', 'ch', 'rem', 'vw',
			 'vh', 'vmin', 'vmax', 'cm',
			 'mm', 'in', 'pt', 'pc'].forEach(function(unit){
				div.style.width = '1' + unit;
				_.units[unit] = parseFloat(getComputedStyle(div).width);
			});
			document.body.removeChild(div);
		}

		var unit = value.replace(/\d+?/gi, '');
		value = value.replace(/[^\d]+?/gi, '');
		return Math.round(_.units[unit] * value);
	};

	_.corner = function(corner, bounds){
		if(isArray(corner))
			return corner;
		if(isHash(corner))
			return [corner.x, corner.y];
		if(!corner)
			corner = 'center';
		return [bounds.x + bounds.w * _.corners[corner][0], bounds.y + bounds.h * _.corners[corner][1] ];
	};

	// Animation
	_.animTransformConstants = {
		rotate : 0,
		scale : 1,
		scaleX : 1,
		scaleY : 1,
		skew : 0,
		skewX : 0,
		skewY : 0,
		translate : 0,
		translateX : 0,
		translateY : 0
	};

	// Path
	_.pathFunctions = {
		moveTo: { name:'moveTo', params:['x','y'] },
		lineTo: { name:'lineTo', params:['x','y'] },
		quadraticCurveTo: { name:'quadraticCurveTo', params:['hx','hy', 'x','y'] },
		bezierCurveTo: { name:'bezierCurveTo', params:['h1x','h1y', 'h2x','h2y', 'x','y'] },
		closePath: { name:'closePath', params:[] }
	};
	var proto = {
		arguments : function(value){
			if(value === undefined)
				return this._arguments;
			if(arguments.length > 1)
				value = Array.prototype.slice.call(arguments);

			this._arguments = value;
			for(var i = 0; i < this.base.params.length;i++)
				this[this.base.params[i]] = value[i];
			this.update();
			return this;
		},
		set : function(name, value){
			var index = this.base.params.indexOf(name);
			this._arguments[index] = value;
			this[name] = value;
			this.update();
			return this;
		},
		process : function(ctx){
			ctx[this.name].apply(ctx, this._arguments);
		}
	};

	for(var cm in _.pathFunctions){
		if(Object.prototype.hasOwnProperty.call(_.pathFunctions, cm)){
			var cur = _.pathFunctions[cm];
			_.pathFunctions[cm] = function(numbers, curves, path){
				this.name = this.base.name;
				this._arguments = numbers;
				this.update = path.update.bind(path);
				for(var i = 0; i < this.base.params.length;i++)
					this[this.base.params[i]] = numbers[i];
			};
			_.pathFunctions[cm].prototype = extend({
				base: cur
			}, proto);
		}
	}
	// It's not real SVG!
	_.svgFunctions = { M:'moveTo', L:'lineTo', C:'bezierCurveTo', Q:'quadraticCurveTo', Z:'closePath',
		m:'moveTo', l:'lineTo', c:'bezierCurveTo', q:'quadraticCurveTo', z:'closePath' };
	_.svgPathLengths = { M:2, L:2, C:6, Q:4, Z:0, m:2, l:2, c:6, q:4, z:0 };

	_.transformFunctions = {
		scale : function(x, y){
			if(isArray(x)){
				y = x[1];
				x = x[0];
			}
			if(y === undefined)
				y = x;
			return [x, 0, 0, y, 0, 0];
		},
		rotate : function(angle, unit){
			if(unit !== 'rad')
				angle = angle * Math.PI / 180;
			return [Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), 0, 0];
		},
		skew : function(x, y){
			if(isArray(x)){
				y = x[1];
				x = x[0];
			}
			if(y === undefined)
				y = x;
			return [1, Math.tan(y * Math.PI / 180), Math.tan(x * Math.PI / 180), 1, 0, 0];
		},
		translate : function(x, y){
			if(isArray(x)){
				y = x[1];
				x = x[0];
			}
			if(y === undefined)
				y = x;
			return [1, 0, 0, 1, x, y];
		}
	};


	window.Graphics2D = {

		version : Math.PI / Math.PI, // :)
		util : _,
		Class : Class,

		Context : Context,
		Shape : Shape,
		Rect : Rect,
		Circle : Circle,
		Path : Path,
		Image : Img,
		Text : Text,
		TextBlock : TextBlock,

		Gradient : Gradient,
		Pattern : Pattern,
		Anim : Anim,

		query : function(query, index, element){
			return new Context( isString(query) ? (element || document).querySelectorAll(query)[element || 0] : query.canvas || query );
		},
		id : function(id){
			return new Context( document.getElementById(id) );
		}

	};

})(this);