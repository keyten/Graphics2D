// todo: move into utils
var temporaryCanvas;
function getTemporaryCanvas(width, height){
	if(!temporaryCanvas){
		temporaryCanvas = document.createElement('canvas');
	}
	temporaryCanvas.width = width;
	temporaryCanvas.height = height;
	return temporaryCanvas;
}

var svgNS = 'http://www.w3.org/2000/svg';
var filterSVG;
function getSVGFilter(){
	if(!filterSVG){
		filterSVG = document.createElement('svg');
		filterSVG.setAttribute('xmlns', svgNS);
		filterSVG.setAttribute('version', '1.1');
		filterSVG.defs = document.createElementNS(svgNS, 'defs');
		filterSVG.appendChild(filterSVG.defs);
		document.body.appendChild(filterSVG);
	}
	return filterSVG;
}

function DrawableAttrHooks(attrs){
	Object.assign(this, attrs);
}

function updateSetter(){
	this.update();
}

function Pair(k, v){
	this.k = k;
	this.v = v;
}

function Drawable(args){
	this.listeners = {};
	// todo: попробовать заменить styles на массив
	// проходить по нему приходится гораздо чаще, чем изменять
	// (потенциально)
	// или просто кэшировать Object.keys
	this.styles = [];
	this.cache = {};
	this.attrs = {
		interaction: true,
		visible: true,
		transform: 'attributes',
		pivot: 'center'
	};

	if(this.argsOrder){
		this.processArguments(args, this.argsOrder);
	}
}

Drawable.prototype = {
	initialize: Drawable,

	// actual update function
	updateFunction : function(){
		if(this.context){
			this.context.update();
		}
		return this;
	},

	// update function for the state before the first draw
	update : function(){
		return this;
	},

	style : function(k, v){
		if(v === undefined){
			for(var i = 0; i < this.styles.length; i++){
				if(this.styles[i].k === k){
					return this.styles[i].v;
				}
			}
			return;
		}

		var elem;
		for(var i = 0; i < this.styles.length; i++){
			if(this.styles[i].k === k){
				elem = this.styles[i];
			}
		}

		if(elem){
			elem.v = v;
		} else {
			this.styles.push(new Pair(k, v));
		}
	},

	cloneReducers : {
		order : 'clone',
		clone : function(value, nothing, options){
			var clone = new this.constructor([this.attrs]);
			if(options.attrs === false){
				clone.attrs = this.attrs;
			}
			if(options.events !== 'no-copy'){
				if(options.events === false){
					clone.listeners = this.listeners;
				} else {
					clone.listeners = {};
					Object.keys(this.listeners).forEach(function(event){
						clone.listeners[event] = this.listeners[event].slice();
					}, this);
				}
			}
			if(options.fills){
				if(this.attrs.fill && this.attrs.fill.clone){
					clone.attr('fill', this.attrs.fill.clone(options.fillOptions));
				}
				// todo: stroke
			}
			if(options.push !== false && this.context){
				this.context.push(clone);
			}
			return clone;
		},
	},

	clone : function(options){
		options = Object.assign({
			clone : true
		}, options);

		return this.cloneReducers.order.split(' ').reduce(function(result, caller){
			if(options[caller] === undefined){
				return result;
			}

			return this.cloneReducers[caller].call(this, options[caller], result, options);
		}.bind(this), null);
	},

	remove : function(){
		// todo: stop animation
		this.context.elements.splice(this.context.elements.indexOf(this), 1);
		this.update();
		this.context = null;
		return this;
	},

	// Before -> Pre
	isPointInBefore : function(x, y, options){
		options = options === 'mouse' ? this.attrs.interactionProps : options;
		if(options && options.transform !== false){
			var transform = this.getTransform();
			if(!Delta.isIdentityTransform(transform)){
				var inverse = Delta.inverseTransform(transform);
				return Delta.transformPoint(inverse, [x, y]);
			}
		}

		return [x, y, options];
	},

	// Bounds
	boundsReducers : {
		order : 'accuracy transform stroke tight',
		accuracy : function(value, result, options){
			if(value === 'precise'){
				return (this.preciseBounds || this.roughBounds).call(this, options);
			}
			if(value === 'rough'){
				return (this.roughBounds || this.preciseBounds).call(this, options);
			}
		},

		stroke : function(value, bounds){
			var lineWidthHalf = this.styles.lineWidth;
			if(!lineWidthHalf || value === 'ignore'){
				return bounds;
			}

			lineWidthHalf /= 2;
			if(value === '-'){
				lineWidthHalf = -lineWidthHalf;
			}

			bounds.lt[0] -= lineWidthHalf;
			bounds.lt[1] -= lineWidthHalf;
			bounds.lb[0] -= lineWidthHalf;
			bounds.rt[1] -= lineWidthHalf;
			bounds.lb[1] += lineWidthHalf;
			bounds.rt[0] += lineWidthHalf;
			bounds.rb[0] += lineWidthHalf;
			bounds.rb[1] += lineWidthHalf;

			return bounds;
		},

		transform : function(value, bounds){
			var contextMatrix = this.context && this.context.attrs.matrix,
				selfMatrix = this.attrs.matrix,
				matrix;
			if(value === 'full' && contextMatrix && selfMatrix){
				if(contextMatrix === 'dirty'){
					contextMatrix = this.context.calcMatrix();
				}
				if(selfMatrix === 'dirty'){
					selfMatrix = this.calcMatrix();
				}
				matrix = Delta.transform(contextMatrix, selfMatrix);
			} else if((value === 'context' || value === 'full') && contextMatrix){
				matrix = contextMatrix === 'dirty' ? this.context.calcMatrix() : contextMatrix;
			} else if((value === 'self' || value === 'full') && selfMatrix){
				matrix = selfMatrix === 'dirty' ? this.calcMatrix() : selfMatrix;
			}

			if(value === 'none' || !matrix){
				return {
					lt: [bounds.x1, bounds.y1],
					lb: [bounds.x1, bounds.y2],
					rt: [bounds.x2, bounds.y1],
					rb: [bounds.x2, bounds.y2]
				};
			}

			var lt = Delta.transformPoint(matrix, [bounds.x1, bounds.y1]),
				lb = Delta.transformPoint(matrix, [bounds.x1, bounds.y2]),
				rt = Delta.transformPoint(matrix, [bounds.x2, bounds.y1]),
				rb = Delta.transformPoint(matrix, [bounds.x2, bounds.y2]);

			return {
				lt: lt,
				lb: lb,
				rt: rt,
				rb: rb
			};
		},

		tight : function(value, tight){
			if(value){
				return tight;
			}

			var minx = Math.min(tight.lt[0], tight.lb[0], tight.rt[0], tight.rb[0]),
				miny = Math.min(tight.lt[1], tight.lb[1], tight.rt[1], tight.rb[1]),
				maxx = Math.max(tight.lt[0], tight.lb[0], tight.rt[0], tight.rb[0]),
				maxy = Math.max(tight.lt[1], tight.lb[1], tight.rt[1], tight.rb[1]);
			return new Bounds(minx, miny, maxx - minx, maxy - miny);
		}
	},

	bounds : function(options){
		options = Object.assign({
			accuracy : 'precise', // precise, rough
			transform : 'full', // full, context, self, none
			stroke : 'ignore', // +, -, ignore
			tight: false // if true returns tight box from transform, if false then modifies it to non-tight
			// additions: clip, ...
		}, options);

		return this.boundsReducers.order.split(' ').reduce(function(result, caller){
			if(options[caller] === undefined){
				return result;
			}

			return this.boundsReducers[caller].call(this, options[caller], result, options);
		}.bind(this), null);
	},

	corner : function(corner, bounds){
		// todo: transformed state
		bounds = bounds instanceof Bounds ? bounds : this.bounds(bounds);
		// todo: bounds.tight = true support (return bounds.lt if corner.lt)
		return [
			bounds.x + bounds.w * Delta.corners[corner][0],
			bounds.y + bounds.h * Delta.corners[corner][1]
		];
	},
/*
	// Events
	on : function(event, options, callback){
		if(event + '' !== event){
			for(var key in event) if(has(event, key)){
				this.on(key, event[key]);
			}
		}

		if(typeof options === 'function'){
			callback = options;
			options = null;
		} else if(options + '' === options){
			Array.prototype.splice.call(arguments, 1, 0, null);
		}

		if(callback + '' === callback){
			callback = wrap(arguments, 2);
		}

		this.context.listener(event);
		// todo: прокидывать отсюда событие канвасу, а он пусть подсчитывает линки и удаляет обработчики, когда нужно
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

	fire : function(event, data, checker){
		if(!this.listeners[event]){
			return this;
		}

		var listeners = this.listeners[event];
		if(checker){
			listeners = listeners.filter(checker, this);
		}

		listeners.forEach(function(callback){
			callback.call(this, data);
		}, this);
		return this;
	}, */

	// Drawing (2D Context)
	preDraw : function(ctx){
		ctx.save();

		this.styles.forEach(function(pair){
			ctx[pair.k] = pair.v;
		});

		if(this.attrs.matrix){
			var matrix = this.attrs.matrix !== 'dirty' ? this.attrs.matrix : this.calcMatrix();
			ctx.transform(matrix[0], matrix[1], matrix[2],
				matrix[3], matrix[4], matrix[5]);
		}

		if(this.attrs.fill && this.attrs.fill.toCanvasStyle){
			ctx.fillStyle = this.attrs.fill.toCanvasStyle(ctx, this);
		}

		// если какие-то особые штуки, то пишем их не в styles, а в attrs
		// и тут их проверяем
/*
		var style = this.styles;
		// styles
		// note1: we might cache Object.keys
		// note2: we should hold gradients / patterns in attrs not in styles
		Object.keys(style).forEach(function(key){ // it is created each redraw!
			ctx[key] = style[key]; // and replace it to for
		});

		if(style.fillStyle && style.fillStyle.toCanvasStyle){
			ctx.fillStyle = style.fillStyle.toCanvasStyle(ctx, object)
		}
		if(style.strokeStyle && style.strokeStyle.toCanvasStyle){
			ctx.strokeStyle = style.strokeStyle.toCanvasStyle(ctx, object);
		}

		if(style.lineDash){
			if(ctx.setLineDash){ // webkit
				// there's also available ctx.lineDashOffset
				ctx.setLineDash(style.lineDash);
			} else {
				ctx.mozDash = style.lineDash;
			}
		}

		// clip
		if(this.attrs.clip){
			if(this.attrs.clip.matrix){
				ctx.save();
				ctx.transform.apply(ctx, this.attrs.clip.matrix);
				this.attrs.clip.processPath(ctx);
				ctx.restore();
			} else {
				this.attrs.clip.processPath(ctx);
			}
			// несколько фигур, склиппеных последовательно, складываются
			ctx.clip();
		}

		var transform = this.getTransform();
		if(!Delta.isIdentityTransform(transform)){
			ctx.transform(transform[0], transform[1], transform[2], transform[3], transform[4], transform[5]);
		} */
	},

	postDraw : function(ctx){
		var style = this.styles;
		/*var strokeMode = this.attrs.strokeMode || 'over';
		if(strokeMode === 'clipInsideUnder' && style.strokeStyle){
			ctx.clip();
			ctx.stroke();
		}
		if(strokeMode === 'under' && style.strokeStyle){
			ctx.stroke();
		}

		if(style.fillStyle){
			ctx.fill();
		}

		if(strokeMode === 'over' && style.strokeStyle){
			ctx.stroke();
		}
		if(strokeMode === 'clipInsideOver' && style.strokeStyle){
			ctx.clip();
			ctx.stroke();
		}
		if(strokeMode === 'clip' && style.strokeStyle){
			// i have no idea
		//	ctx.scale(5, 1.5);
		//	ctx.stroke();
		} */
		if(this.attrs.fill){
			ctx.fill(this.attrs.fillRule);
		}
		if(this.attrs.stroke){
			ctx.stroke();
		}
		ctx.restore();
	},

	// Rasterization
	toDataURL : function(type, bounds){
		if(bounds === undefined){
			if(typeof this.bounds === 'function'){
				bounds = this.bounds();
			} else {
				throw 'Object #' + this.attr('z') + ' can\'t be rasterized: need the bounds.';
			}
		}

		if(type === undefined){
			type = 'image/png';
		} else if(type in Delta.fileTypes){
			type = Delta.fileTypes[type];
		}

		// todo: other renderers support
		// как насчёт отрицательных x, y
		var canvas = getTemporaryCanvas(bounds.width, bounds.height),
			context = canvas.getContext('2d');

		context.setTransform(1, 0, 0, 1, -bounds.x, -bounds.y);
		// там подключается renderer, что не прокатит для объектов чисто в памяти ( Graphics2D.rect(x,y,w,h) )
		this.draw(context);
		return canvas.toDataURL(type.type || type, type.quality || 1);
	},

	toBlob : function(type, quality, bounds, callback){
		;
	},

	toImageData : function(bounds){
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
	},
/*
	// Animation
	animate : function(attr, value, options){
		// attr, value, duration, easing, callback
		// attrs, duration, easing, callback
		// attr, value, options
		// attrs, options
		if(attr + '' !== attr){
			// todo:
			// the fx ob wiil not represent others
			// object.fx.stop() will stop only one anim
			if(+value === value || !value){
				options = {duration: value, easing: options, callback: arguments[3]};
			} else if(typeof value === 'function'){
				options = {callback: value};
			} else {
				options = value;
			}

			Object.keys(attr).forEach(function(key, i){
				this.animate(key, attr[key], options);
				if(i === 0){
					options.queue = false;
					options.callback = null;
				}
			}, this);
			return this;
		}

		if(!this.attrHooks[attr] || !this.attrHooks[attr].anim){
			throw 'Animation for "' + attr + '" is not supported';
		}

		if(+options === options || !options){
			options = {duration: options, callback: arguments[4], easing: arguments[3]};
		} else if(typeof options === 'function'){
			options = {callback: options};
		}

		var fx = new Animation(
			options.duration,
			options.easing,
			options.callback
		);

		fx.prop = attr;
		fx.tick = this.attrHooks[attr].anim;
		fx.tickContext = this;
		fx.prePlay = function(){
			this.fx = fx;
			this.attrHooks[attr].preAnim.call(this, fx, value);
		}.bind(this);

		// is used to pause / cancel anims
		fx.elem = this;
		if(options.name){
			fx.name = options.name;
		}

		var queue = options.queue;
		if(queue !== false){
			if(queue === true || queue === undefined){
				if(!this._queue){
					this._queue = [];
				}
				queue = this._queue;
			} else if(queue instanceof Drawable){
				queue = queue._queue;
			}
			fx.queue = queue;
			queue.push(fx);
			if(queue.length > 1){
				return this;
			}
		}

		fx.play();

		return this;
	},

	pause : function(name){
		if(!this._paused){
			this._paused = [];
		}

		// pause changes the original array
		// so we need slice
		Animation.queue.slice().forEach(function(anim){
			if(anim.elem === this && (anim.name === name || !name)){
				anim.pause();
				this._paused.push(anim);
			}
		}, this);
		return this;
	},

	continue : function(name){
		if(!this._paused){
			return;
		}

		this._paused.slice().forEach(function(anim, index){
			if(!name || anim.name === name){
				anim.continue();
				this._paused.splice(index, 1);
			}
		}, this);

		return this;
	} */
};

Drawable.AttrHooks = DrawableAttrHooks;

Drawable.processStroke = function(stroke, style){
	if(stroke + '' === stroke){
		// remove spaces between commas
		stroke = stroke.replace(/\s*\,\s*/g, ',').split(' ');

		var opacity, l = stroke.length,
			joinSet = false,
			capSet = false;

		while(l--){
			if(reFloat.test(stroke[l])){
				opacity = parseFloat(stroke[l]);
			} else if(isNumberLike(stroke[l])){
				style.lineWidth = Delta.distance(stroke[l]);
			} else if(stroke[l] === 'round'){
				if(!joinSet){
					style.lineJoin = 'round';
				}
				if(!capSet){
					style.lineCap = style.lineCap || 'round';
				}
			} else if(stroke[l] === 'miter' || stroke[l] === 'bevel'){
				joinSet = true;
				style.lineJoin = stroke[l];
			} else if(stroke[l] === 'butt' || stroke[l] === 'square'){
				capSet = true;
				style.lineCap = stroke[l];
			} else if(stroke[l][0] === '['){
				style.lineDash = stroke[l].substr(1, stroke[l].length - 2).split(',');
			} else if(stroke[l] in Delta.dashes){
				style.lineDash = Delta.dashes[stroke[l]];
			} else if(stroke[l].lastIndexOf('ml') === stroke[l].length - 2){
				style.miterLimit = +stroke[l].slice(0, stroke[l].length - 2);
			} else if(stroke[l].indexOf('do') === 0){
				// todo: check about cross-browser support
				// mozDashOffset
				// webkitLineDashOffset
				style.lineDashOffset = Delta.distance(stroke[l].slice(2));
			} else {
				style.strokeStyle = stroke[l];
			}
		}
		if(opacity){
			stroke = Delta.color(style.strokeStyle);
			stroke[3] = opacity;
			style.strokeStyle = 'rgba(' + stroke.join(',') + ')';
		}
	} else {
		if(stroke.color !== undefined){
			style.strokeStyle = stroke.color;
		}
		if(stroke.opacity !== undefined && style.strokeStyle){
			var parsed = Delta.color(style.strokeStyle);
			parsed[3] = stroke.opacity;
			style.strokeStyle = 'rgba(' + parsed.join(',') + ')';
		}
		if(stroke.width !== undefined){
			style.lineWidth = Delta.distance(stroke.width);
		}
		if(stroke.join !== undefined){
			style.lineJoin = stroke.join;
		}
		if(stroke.cap !== undefined){
			style.lineCap = stroke.cap;
		}
		if(stroke.miterLimit !== undefined){
			style.miterLimit = stroke.miterLimit;
		}
		if(stroke.dash !== undefined){
			if(stroke.dash in Delta.dashes){
				style.lineDash = Delta.dashes[stroke.dash];
			} else {
				style.lineDash = stroke.dash;
			}
		}
		if(stroke.dashOffset !== undefined){
			style.lineDashOffset = Delta.distance(stroke.dashOffset);
		}
	}
};

Drawable.processShadow = function(shadow, style){
	if(shadow + '' === shadow){
		var shadowProps = ['shadowOffsetX', 'shadowOffsetY', 'shadowBlur'];
		// remove spaces between commas
		shadow = shadow.replace(/\s*\,\s*/g, ',').split(' ');
		for(var i = 0; i < shadow.length; i++){
			if(isNaN(+shadow[i][0])){
				style.shadowColor = shadow[i];
			} else {
				style[shadowProps.shift()] = Delta.distance(shadow[i]);
			}
		}
	} else {
		if(shadow.x !== undefined){
			style.shadowOffsetX = Delta.distance(shadow.x);
		}
		if(shadow.y !== undefined){
			style.shadowOffsetY = Delta.distance(shadow.y);
		}
		if(shadow.blur !== undefined){
			style.shadowBlur = Delta.distance(shadow.blur || 0);
		}
		if(shadow.color){
			style.shadowColor = shadow.color;
		}
	}
};

// Events
Object.assign(Drawable.prototype, Class.mixins['EventMixin'], {
	eventHooks: {}
});

// todo: любой вызов teardown отключит этот обработчик, например, добавить и удалить обработчик на событие к самому канвасу
// нужно, чтобы context ориентировался не только на listeners, но и на какие-то счётчики

Drawable.browserCommonEvent = {
	init : function(event){
		if(this.context){
			this.context.eventHooks[event].init.call(this.context, event);
		}
	},

	teardown : function(event){
		if(this.context){
			this.context.eventHooks[event].teardown.call(this.context, event);
		}
	}
};

Array.prototype.concat.call(browserEvents.mouse, browserEvents.touch,
	browserEvents.pointer, browserEvents.keyboard).forEach(function(eventName){
	Drawable.prototype.eventHooks[eventName] = Drawable.browserCommonEvent;
	Drawable.prototype[eventName] = Context.prototype[eventName];
});

Drawable.browserMouseOverOut = function(event){
	if(this.hoverElement !== event.targetObject){
		var prev = this.hoverElement;
		this.hoverElement = event.targetObject;

		if(prev && prev.fire){
			prev.fire('mouseout', event);
		}
		if(event.targetObject && event.targetObject.fire){
			event.targetObject.fire('mouseover', event);
		}
	}
};

Drawable.prototype.eventHooks.mouseover = Drawable.prototype.eventHooks.mouseout = {
	init : function(event){
		if(this.context && !this.context.listeners._specialMouseOverOutHook_){
			this.context.listeners._specialMouseOverOutHook_ = Drawable.browserMouseOverOut;
			this.context.on('mousemove', Drawable.browserMouseOverOut);
		}
	},

	teardown : function(event){
		if(this.context){
			this.context.listeners._specialMouseOverOutHook_ = null;
			this.context.off('mousemove', Drawable.browserMouseOverOut);
		}
	}
};

// Attrs
Object.assign(Drawable.prototype,
	Class.mixins['AttrMixin'],
	Class.mixins['TransformableMixin'],
	Class.mixins['AnimatableMixin'], {
	attrHooks : DrawableAttrHooks.prototype = Object.assign({}, Class.mixins['TransformableMixin'].attrHooks, {
		z : {
			get : function(){
				return this.context.elements.indexOf(this);
			},
			set : function(value){
				var elements = this.context.elements;
				if(value === 'top'){
					value = elements.length;
				}

				elements.splice(this.context.elements.indexOf(this), 1);
				elements.splice(value, 0, this);
				this.update();
			}
		},

		visible : {
			set : updateSetter
		},

		clip : {
			// todo: if value.changeable then value.on('update', this.update)
			set : updateSetter
		},

		// note: value = null is an official way to remove styles
		fill : {
			set : function(value){
				if(this.attrs.fillLink && this.attrs.fillLink !== value){
					var index = this.attrs.fillLink.updateList.indexOf(this);
					if(index !== -1){
						this.attrs.fillLink.updateList.splice(index, 1);
					}
				}

				if (value.toCanvasStyle) {
					if(value.updateList){
						this.attrs.fillLink = value;
						value.updateList.push(this);
					}
					this.style('fillStyle', null);
				} else {
					this.style('fillStyle', value);
				}
				this.update();
			}
		},

		fillRule : {
			set : updateSetter
		},

		stroke : {
			set : function(value){
				var style = {};

				if(value === null){}
				else if(isString(value)){
					// remove spaces between commas
					value = value.replace(/\s*\,\s*/g, ',').split(' '); // without braces regexp

					var opacity, color, l = value.length,
						joinSet = false,
						capSet = false;

					while(l--){
						if(reFloat.test(value[l])){
							opacity = parseFloat(value[l]);
						} else if(isNumberLike(value[l])){
							style.lineWidth = Delta.distance(value[l]);
						} else if(value[l] === 'round'){
							if(!joinSet){
								style.lineJoin = 'round';
							}
							if(!capSet){
								style.lineCap = 'round';
							}
						} else if(value[l] === 'miter' || value[l] === 'bevel'){
							joinSet = true;
							style.lineJoin = value[l];
						} else if(value[l] === 'butt' || value[l] === 'square'){
							capSet = true;
							style.lineCap = value[l];
						} else if(value[l][0] === '['){
							style.strokeDash = value[l].substr(1, value[l].length - 2).split(',');
						} else if(value[l] in Delta.dashes){
							style.strokeDash = Delta.dashes[value[l]];
						} else if(value[l].lastIndexOf('ml') === value[l].length - 2){
							style.miterLimit = +value[l].slice(0, value[l].length - 2);
						} else if(value[l].indexOf('do') === value[l].length - 2){
							// todo: check about cross-browser support
							// mozDashOffset
							// webkitLineDashOffset
							// style.lineDashOffset = Delta.distance(value[l].slice(2));
							style.strokeDashOffset = Delta.distance(value[l].slice(0, value[l].length - 2));
						} else {
							color = value[l];
						}
					}
					if(color){
						if(opacity){
							color = Delta.color(color);
							color[3] = opacity;
							color = 'rgba(' + color.join(',') + ')';
						}
						style.strokeStyle = color;
					}
				} else {
					if(value.color !== undefined){
						style.strokeStyle = value.color;
					}
					if(value.opacity !== undefined && style.strokeStyle){
						var parsed = Delta.color(style.strokeStyle);
						parsed[3] = value.opacity;
						style.strokeStyle = 'rgba(' + parsed.join(',') + ')';
					}
					if(value.width !== undefined){
						style.lineWidth = Delta.distance(value.width);
					}
					if(value.join !== undefined){
						style.lineJoin = value.join;
					}
					if(value.cap !== undefined){
						style.lineCap = value.cap;
					}
					if(value.miterLimit !== undefined){
						style.miterLimit = value.miterLimit;
					}
					if(value.dash !== undefined){
						if(value.dash in Delta.dashes){
							// style.lineDash = Delta.dashes[value.dash];
							style.strokeDash = Delta.dashes[value.dash];
						} else {
							// style.lineDash = value.dash;
							style.strokeDash = value.dash;
						}
					}
					if(value.dashOffset !== undefined){
						// style.lineDashOffset = Delta.distance(value.dashOffset);
						style.strokeDashOffset = Delta.distance(value.dashOffset);
					}
				}

				[
					'strokeStyle',
					'lineWidth',
					'lineJoin',
					'lineCap',
					'miterLimit'
				].forEach(function(prop){
					if(style[prop]){
						this.style(prop, style[prop]);
					} else {
						this.style(prop, null);
					}
				}, this);
				// на самом деле этот всё не нужно пихать в стили, нужно применять стили из параметров
				if(style.strokeDash){
					this.attrs.strokeDash = style.strokeDash;
				} else {
					delete this.attrs.strokeDash;
				}

				if(style.strokeDashOffset){
					this.attrs.strokeDashOffset = style.strokeDashOffset;
				} else {
					delete this.attrs.strokeDashOffset;
				}
			}
		},

		// todo: to plugin
		/* strokeMode: {
			get: function(){
				return this.attrs.strokeMode || 'over';
			},
			set: function(value){
				this.update();
			}
		}, */

		/* cursor: {
			set: function(value){
				// this._setCursorListener();
				// this._teardownCursorListener();
			}
		}, */

		shadow : {
			set : function(value){
				var style = {};

				if(value === null){}
				else if(isString(value)){
					var shadowProps = ['shadowOffsetX', 'shadowOffsetY', 'shadowBlur'];
					value = value.replace(/\s*\,\s*/g, ',').split(' ');
					for(var i = 0; i < value.length; i++){
						if(isNaN(+value[i][0])){
							style.shadowColor = value[i];
						} else {
							style[shadowProps.shift()] = Delta.distance(value[i]);
						}
					}
				} else {
					if(value.x !== undefined){
						style.shadowOffsetX = Delta.distance(value.x);
					}
					if(value.y !== undefined){
						style.shadowOffsetY = Delta.distance(value.y);
					}
					if(value.blur !== undefined){
						style.shadowBlur = Delta.distance(value.blur);
					}
					if(value.color){
						style.shadowColor = value.color;
					}
				}

				['shadowOffsetX', 'shadowOffsetY', 'shadowColor', 'shadowBlur'].forEach(function(prop){
					if(style[prop]){
						this.style(prop, style[prop]);
					} else {
						this.style(prop, null);
					}
				}, this);
			}
		},

		opacity : {
			get : function(){
				return this.attrs.opacity === undefined ? 1 : this.attrs.opacity;
			},
			set : function(value){
				this.style('globalAlpha', +value);
				this.update();
			}
		},

		composite : {
			set : function(value){
				this.style('globalCompositeOperation', value);
				this.update();
			}
		},

		filter : {
			set : function(value){
				// this.oldFilters.forEach(remove)
				if(Array.isArray(value)){
					value = value.map(function(filter){
						if(isString(filter)){
							return filter;
						}

						if(isObject(filter)){
							filter = [filter];
						}

						// todo: интересно, влияют ли фильтры на isPointInPath
						var defs = getSVGFilter().defs;
						var id = Date.now() + '_' + String(Math.random()).substr(2);
						var filterElem = document.createElementNS(svgNS, 'filter');
						filterElem.setAttribute('id', id);
						filter.forEach(function(filterEffect){
							var effectElem = document.createElementNS(svgNS, filterEffect.effect);
							Object.keys(filterEffect).forEach(function(param){
								if(param !== 'effect'){
									effectElem.setAttribute(param, filterEffect[param]);
								}
							});
							filterElem.appendChild(effectElem);
						});
						defs.appendChild(filterElem);

						return 'url(#' + id + ')';
					}).join(' ');
				}

				this.style('filter', value);
				this.update();
			}
		}
	})
});


Delta.Drawable = Drawable;