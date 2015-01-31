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
			if(anim.object.matrixCur.step != step){
				anim.object.matrixCur = [1,0,0,1,0,0];
				anim.object.matrixCur.step = step;
			}

			var cur = _.interpolate(_.animTransformConstants[param], end, step);
			_.transform(anim.object.matrixCur, fn(cur), this.corner('center'));
			this._matrix = _.multiply(anim.object.matrixStart, anim.object.matrixCur);
		};
	};

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
		stroke : function(str){
			// element.stroke() => { fill : 'black', width:2 }
			// element.stroke({ fill:'black', width:3 });
			// element.stroke('black 4pt');
			var s = this._style;
			if(str === undefined)
				return {
					color : s.strokeStyle, // todo: add default values?
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
			fn.proxy = proxy; // for .off
		},
		off : function(evt, fn){
			if(evt == 'mousewheel')
				this.off('DOMMouseScroll');
			if(!fn)
				this.listeners[evt] = [];

			this.listeners[evt][this.listeners[evt].indexOf(fn.proxy || fn)] = emptyFunc;
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
				if(Object.hasOwnProperty.call(corner, 'from')){ // TODO: _.has = Object.hasOwnProperty.call
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
			if(!this._matrix)
				this._matrix = [1,0,0,1,0,0];
			_.transform(this._matrix, [a, b, c, d, e, f], this.corner(pivot));
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

		// conversions
		toPath : function(){},
		toImage : function(){},

		// animation
		_anim : {
			number : {
				start : function(end, property){
					var anim = this._animData;
					anim[property + 'Start'] = this['_' + property];
					anim[property + 'End'  ] = _.distance(end);
				},
				step : function(end, t, property){
					var anim  = this._animData,
						start = anim[property + 'Start'],
						end   = anim[property + 'End'];
					this['_' + property] = (start * (1 - t) + end * t)|0; // |0 = Math.floor
				},
				end : function(end, property){
					delete this._animData['_' + property];
				}
			},

			fill : {
				start : function(end, property){
					var anim = this._animData;
					anim.fillStart = _.color(this._style.fillStyle);
					anim.fillEnd   = _.color(end);

					// fix for transparent color
					if(this._style.fillStyle == 'transparent')
						anim.fillStart = anim.fillEnd.slice(0,3).concat([0]);
					if(end == 'transparent')
						anim.fillEnd = anim.fillStart.slice(0,3).concat([0])
				},
				step : function(end, t, property){
					var anim  = this._animData,
						start = anim.fillStart,
						end   = anim.fillEnd;
					this._style.fillStyle = 'rgba(' +
						[(start[0] * (1 - t) + end[0] * t)|0,
						 (start[1] * (1 - t) + end[1] * t)|0,
						 (start[2] * (1 - t) + end[2] * t)|0,
						 start[3] * (1 - t) + end[3] * t].join(',')
						+ ')';
				},
				end : function(end, property){
					delete this._animData.fillStart;
					delete this._animData.fillEnd;
				}
			},

			stroke : {
				start : function(end, property){

					// regexp for css distances:
					// /(#[0-9a-f]{6})|(#[0-9a-f]{3})|(rgba?\((\d{1,3})\,\s*(\d{1,3})\,\s*(\d{1,3})(\,\s*([0-9\.]{1,4}))?\))|(rgba?\((\d{1,3})\%?\,\s*(\d{1,3})\%?\,\s*(\d{1,3})\%?(\,\s*([0-9\.]{1,4}))?\))/ and /(\d+|(\d+)?\.\d+)(em|ex|ch|rem|vw|vh|vmin|vmax|cm|mm|in|px|pt|pc)?/
					// regexp for colors:
					// /(#[0-9a-f]{6})|(#[0-9a-f]{3})|(rgba?\((\d{1,3})\,\s*(\d{1,3})\,\s*(\d{1,3})(\,\s*([0-9\.]{1,4}))?\))|(rgba?\((\d{1,3})\%?\,\s*(\d{1,3})\%?\,\s*(\d{1,3})\%?(\,\s*([0-9\.]{1,4}))?\))/ and new RegExp(Object.keys(_.colors).join('|'))) || []);
					// never use it! :)

					var anim = this._animData;
					end = Shape.prototype._parseStroke(end);

					if(!this._style.strokeStyle)
						this._style.strokeStyle = 'transparent';
					if(!this._style.lineWidth)
						this._style.lineWidth = 1;

					if(end.strokeStyle){
						anim.strokeColorStart = _.color(this._style.strokeStyle);
						anim.strokeColorEnd   = _.color(end.strokeStyle);
					}
					if(end.lineWidth){
						anim.strokeWidthStart = _.distance(this._style.lineWidth);
						anim.strokeWidthEnd   = end.lineWidth;
					}

					// fix for transparent color
					if(this._style.strokeStyle == 'transparent')
						anim.strokeColorStart = anim.strokeColorEnd.slice(0,3).concat([0]);
					if(end.strokeStyle == 'transparent')
						anim.strokeColorEnd = anim.strokeColorStart.slice(0,3).concat([0]);
				},
				step : function(end, t, property){
					var anim  = this._animData,
						cstart = anim.strokeColorStart,
						cend   = anim.strokeColorEnd,
						wstart = anim.strokeWidthStart,
						wend   = anim.strokeWidthEnd;
					if(cstart){
						this._style.strokeStyle = 'rgba(' +
						[(cstart[0] * (1 - t) + cend[0] * t)|0,
						 (cstart[1] * (1 - t) + cend[1] * t)|0,
						 (cstart[2] * (1 - t) + cend[2] * t)|0,
						  cstart[3] * (1 - t) + cend[3] * t].join(',')
						+ ')';
					}
					if(wstart)
						this._style.lineWidth = (wstart * (1 - t) + wend * t)|0;
				},
				end : function(end, property){
					delete this._animData.strokeColorStart;
					delete this._animData.strokeColorEnd;
					delete this._animData.strokeWidthStart;
					delete this._animData.strokeWidthEnd;
				}
			},

			opacity : {
				start : function(){
					this._animData.opacityStart = this._style.globalAlpha || 1;
				},
				step : function(end, t){
					this._style.globalAlpha = this._animData.opacityStart * (1 - t) + end * t;
				},
				end : function(){
					delete this._animData.opacityStart;
				}
			}
		},

		animate : function(property, value, options){
			//	animate(property, value, duration, easing, after);
			//	animate(properties, duration, easing, after);
			//	animate(property, value, options);
			//	animate(properties, options);
			if(isHash(property)){
				if(!isHash(value)){
					value = {
						duration : value,
						easing : options,
						after : arguments[3]
					};
				}
				for(var i in property){
					if(Object.prototype.hasOwnProperty.call(property, i))
						this.animate(i, property[i], value);
				}
				return this;
			}

			if(!isHash(options)){
				options = {
					duration : options,
					easing : arguments[3],
					after : arguments[4] // optimize? using args by index + by name may be slow :)
				};
				// TODO: Graphics2D.animMethod = 'raf' (requestAnimationFrame) | 'timeout'
			}

			// defaults
			if(!options.duration)
				options.duration = 500;
			if(!options.easing)
				options.easing = Anim.easing.linear;

			// animate listeners
			var start = this._anim[property].start,
				step = this._anim[property].step,
				end = this._anim[property].end;


			// объект с данными анимаций
			if(!this._animData)
				this._animData = {};

			// массив анимаций контекста
			if(!Graphics2D._tweens)
				Graphics2D._tweens = [];

			// массив анимаций элемента
	//		if(!this._tweens) // TODO: реализовать очередь анимаций
	//			this._tweens = [];

			// вызываем стартовую функцию
			start.call(this, value, property);

			// вставляем в tweens объект с нашей анимацией
			var now = Date.now();
			Graphics2D._tweens.push({
				// объект
				element : this,

				// свойство
				property : property,
				stepListener : step,
				endListener : end,

				// начальное и конечное значения
				from : this._x,
				to : value,

				// время
				startTime : now,
				endTime : now + options.duration,
				duration : options.duration,

				easing : options.easing,
				after : options.after
			});

			Graphics2D._processAnimation();
			return this;
		},


		// анимация
/*		_anim : {
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
					after = easing;
					easing = dur;
					dur = value;
				}
			}

			var anim = new Anim(0, 1, dur, easing),
				param;
			anim.object = {};
			for(param in params){
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
		}, */

		// defaults
		_visible : true,
		_events : true
	});

	// events slices
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

	// animation slices
	['x', 'y', 'width', 'height', 'cx', 'cy', 'radius'].forEach(function(name){
		Shape.prototype._anim[name] = Shape.prototype._anim.number;
	});

// animation
	var tweens = $._tweens;
	if(!tweens)
		tweens = $._tweens = [];

	var i, l, t, now, tween;
	var processor = function(){
		for(i = 0, l = tweens.length; i < l; i++){
			now = Date.now();
			tween = tweens[i];

			// removing the current element may cause a wrong behavior
			if(!tween)
				continue;

			t = (now - tween.startTime) / tween.duration;
			if(t > 1)
				t = 1;

			if(tween.easing)
				t = tween.easing(t);

			tween.stepListener.call(tween.element, tween.to, t, tween.property);

			if(tween.endTime <= now){
				if(tween.after)
					tween.after.call(tween.element, tween.to, tween.property);
				if(tween.endListener)
					tween.endListener.call(tween.element, tween.to, tween.property);

				tweens.splice(tweens.indexOf(tween), 1); // remove the tween
			}

			tween.element.update();
		}

		if(tweens.length !== 0)
			$._animationProcessor = requestAnimationFrame(processor);
		else
			$._animationProcessor = null;

	};

	$._processAnimation = function(){

		if($._animationProcessor)
			return;

		$._animationProcessor = requestAnimationFrame(processor);
	};

// TODO: use the Array::splice for deleting elements (instead of slice+concat)