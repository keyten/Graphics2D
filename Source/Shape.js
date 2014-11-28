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
			_.transform(anim.object.matrixCur, fn(cur), _.corner('center', this.bounds()));
			this._matrix = _.multiply(anim.object.matrixStart, anim.object.matrixCur);
		};
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
		},

		// defaults
		_visible : true
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
