var temporaryCanvas;

function getTemporaryCanvas(width, height){
	if(!temporaryCanvas){
		temporaryCanvas = document.createElement('canvas');
	}
	temporaryCanvas.width = width;
	temporaryCanvas.height = height;
	return temporaryCanvas;
}

function DrawableAttrHooks(attrs){
	extend(this, attrs); // todo: deepExtend neccessary?
}

Drawable = new Class({
	initialize: function(args){
		this.listeners = {};
		this.styles = {};
		this.cache = {};
		this.attrs = {
			interaction: true,
			visible: true,
			transform: 'attributes'
		};
	},

	// actual update function
	updateFunction: function(){
		if(this.context){
			this.context.update();
		}
		return this;
	},

	// update function for the state before the first draw
	update: function(){
		return this;
	},

	clone : function(attrs, styles, events){
		// todo: test on all obs
		var clone = new this.constructor([], this.context);
		// todo: необходим deepClone везде

		if(attrs === false){
			clone.attrs = this.attrs;
		} else {
			clone.attrs = extend({}, this.attrs);
		}

		if(styles === false){
			clone.styles = this.styles;
			clone.matrix = this.matrix;
		} else {
			clone.styles = extend({}, this.styles);
			// must gradients be cloned?
			// yep, they should
			if(this.matrix){
				clone.matrix = this.matrix.slice();
			}
		}

		if(events === false){
			clone.listeners = this.listeners;
		} else {
			clone.listeners = extend({}, this.listeners);
		}

		return this.context.push(clone);
	},

	remove : function(){
		// todo: stop animation
		this.context.elements.splice(this.context.elements.indexOf(this), 1);
		this.update();
		this.context = null;
		return this;
	},

	// Attributes
	attr: Class.attr,

	attrHooks: DrawableAttrHooks.prototype = {
		z: {
			get: function(){
				return this.context.elements.indexOf(this);
			},
			set: function(value){
				var elements = this.context.elements;
				if(value === 'top'){
					value = elements.length;
				}

				elements.splice(this.context.elements.indexOf(this), 1);
				elements.splice(value, 0, this);
				this.update();
			}
		},

		visible: {
			set: function(){
				this.update();
			}
		},

		fill: {
			get: function(){
				return this.styles.fillStyle;
			},
			set: function(value){
				// if(oldValue is gradient) oldValue.unbind(this);
				this.styles.fillStyle = value;
				this.update();
			}
		},

		stroke: {
			set: function(value){
				Drawable.processStroke(value, this.styles);
				this.update();
			}
		},

		strokeMode: {
			get: function(){
				return this.attrs.strokeMode || 'over';
			},
			set: function(value){
				this.update();
			}
		},

		shadow: {
			set: function(value){
				Drawable.processShadow(value, this.styles);
				this.update();
			}
		},

		opacity: {
			get: function(){
				return this.styles.globalAlpha !== undefined ? this.styles.globalAlpha : 1;
			},
			set: function(value){
				this.styles.globalAlpha = +value;
				this.update();
			}
		},

		composite: {
			get: function(){
				return this.styles.globalCompositeOperation;
			},
			set: function(value){
				this.styles.globalCompositeOperation = value;
				this.update();
			}
		},

		clip: {
			set: function(value){
				value.context = this.context;
				this.attrs.clip = value; // is it neccessary?
				this.update();
			}
		},

		cursor: {
			set: function(value){
				// this._setCursorListener();
				// this._teardownCursorListener();
			}
		},

		transform: {
			set: function(value){
				this.cache.transform = null;
				this.update();
			}
		},

		translate: {
			get: function(){
				return this.attrs.translate || [0, 0];
			},
			set: function(value){
				if(this.attrs.transform === 'attributes'){
					this.cache.transform = null;
					this.update();
				}
			}
		},

		rotate: {
			get: function(){
				return this.attrs.rotate || 0;
			},
			set: function(){
				if(this.attrs.transform === 'attributes'){
					this.cache.transform = null;
					this.update();
				}
			}
		},

		scale: {
			get: function(){
				return this.attrs.scale || [1, 1];
			},
			set: function(){
				if(this.attrs.transform === 'attributes'){
					this.cache.transform = null;
					this.update();
				}
			}
		},

		skew: {
			get: function(){
				return this.attrs.skew || [0, 0];
			},
			set: function(){
				if(this.attrs.transform === 'attributes'){
					this.cache.transform = null;
					this.update();
				}
			}
		}
	},

	// Transforms
	getTransform: function(){
		if(this.cache.transform){
			return this.cache.transform;
		}

		var matrix = Delta.parseTransform(this.attrs, this);
		this.cache.transform = matrix;
		return matrix;
	},

	processObject: function(object, arglist){
		['opacity', 'composite', 'clip', 'visible', 'interaction',
		'z', 'transform', 'transformOrder', 'rotate', 'skew', 'scale'].forEach(function(prop){
			if(object[prop] !== undefined){
				this.attr(prop, object[prop]);
			}
		}, this);

		return arglist.map(function(name){
			return object[name];
		});
	},

	isPointInBefore : function(x, y, options){
		if(options){
			if(options.transform !== false){
				var transform = this.getTransform();
				if(!Delta.isIdentityTransform(transform)){
					var inverse = Delta.inverseTransform(transform);
					return Delta.transformPoint(inverse, [x, y]);
				}
			}
		}

		return [x, y, options];
	},

	// Bounds
	bounds: function(rect, transform, around){
		// todo:
		// 'rough' / 'precise'
		// 'stroke-with' / 'stroke-out'
		// 'clip-exclude'
		// 'self' / 'transformed' / 'tight'
		// self - only self transforms
		// transformed - self & context

		// example: 'rough tight'

		if((around === 'fill' || !around) && this.styles.strokeStyle){
			var weight = (this.styles.lineWidth || 1) / 2;
			if(around === 'strokeExclude'){
				weight = -weight;
			}
			rect[0] -= weight;
			rect[1] -= weight;
			rect[2] += weight * 2;
			rect[3] += weight * 2;
		}

		if(transform !== false && this.matrix){
			var tight = [
				// left top
				Delta.transformPoint(this.matrix, [rect[0], rect[1]]),
				// right top
				Delta.transformPoint(this.matrix, [rect[0] + rect[2], rect[1]]),
				// left bottom
				Delta.transformPoint(this.matrix, [rect[0], rect[1] + rect[3]]),
				// right bottom
				Delta.transformPoint(this.matrix, [rect[0] + rect[2], rect[1] + rect[3]])
			];

			if(transform === 'tight'){
				return tight;
			}

			rect[0] = Math.min(tight[0][0], tight[1][0], tight[2][0], tight[3][0]);
			rect[1] = Math.min(tight[0][1], tight[1][1], tight[2][1], tight[3][1]);
			rect[2] = Math.max(tight[0][0], tight[1][0], tight[2][0], tight[3][0]) - rect[0];
			rect[3] = Math.max(tight[0][1], tight[1][1], tight[2][1], tight[3][1]) - rect[1];
		}

		return new Bounds(rect[0], rect[1], rect[2], rect[3]);
	},

	corner : function(corner, bounds){
		// todo: remove
		if(Array.isArray(corner)){
			return corner;
		}

		bounds = bounds instanceof Bounds ? bounds : this.bounds(bounds);
		return [
			bounds.x + bounds.w * Delta.corners[corner][0],
			bounds.y + bounds.h * Delta.corners[corner][1]
		];
	},

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
	},

	// Drawing (2D Context)
	preDraw: function(ctx){
		ctx.save();

		var style = this.styles;
		// styles
		// note1: we might cache Object.keys
		// note2: we should hold gradients / patterns in attrs not in styles
		Object.keys(style).forEach(function(key){
			ctx[key] = style[key];
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
		}
	},

	postDraw: function(ctx){
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
		if(style.fillStyle){
			ctx.fill(this.attrs.fillRule);
		}
		if(style.strokeStyle){
			ctx.stroke();
		}
		ctx.restore();
	},

	// Rasterization
	toDataURL: function(type, bounds){
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

	toBlob: function(type, quality, bounds, callback){
		;
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
	},

	// Animation
	animate: function(attr, value, options){
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

	pause: function(name){
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

	continue: function(name){
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
	}

});

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

Delta.Drawable = Drawable;

// events aliases
eventsToInteract.forEach(function(eventName){
	Drawable.prototype[eventName] = Context.prototype[eventName];
});