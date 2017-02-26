/* function doRectsIntersect(r1, r2){
	return !(r1.x1 > r2.x2 || r1.x2 < r2.x1 || r1.y1 < r2.y2 || r1.y2 > r2.y1);
} */

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
		this.attrs = {
			interaction: true
		};
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

	clone : function(attrs, styles, events){
		// todo: test on every obj
		var clone = new this.constructor([], this.context);

		if(attrs === false){
			clone.attrs = this.attrs;
		} else {
			clone.attrs = Object.assign({}, this.attrs);
		}

		if(styles === false){
			clone.styles = this.styles;
			clone.matrix = this.matrix;
		} else {
			clone.styles = Object.assign({}, this.styles); // how about deep extend? check
			// must gradients be cloned?
			if(this.matrix){
				clone.matrix = this.matrix.slice();
			}
		}

		if(events === false){
			clone.listeners = this.listeners;
		} else {
			clone.listeners = Object.assign({}, this.listeners);
		}

		return this.context.push(clone);
	},

	remove : function(){
		this.context.elements.splice(this.context.elements.indexOf(this), 1);
		this.context = null;
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
			}, this);
			return this;
		}

		if(value === undefined){
			// todo: check the fastest check of property
			// ...[name] or name in or hasOwnProperty
			if(this.attrHooks[name] && this.attrHooks[name].get){
				return this.attrHooks[name].get.call(this);
			}
			return this.attrs[name];
		}

		if(this.attrHooks[name] && this.attrHooks[name].set){
			var result = this.attrHooks[name].set.call(this, value);
			if(result !== null){
				this.attrs[name] = result === undefined ? value : result;
			}
		} else {
			this.attrs[name] = value;
		}

		return this;
	},

	attrHooks: {
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
				this.attrs.clip = value;
				this.update();
			}
		}
	},

	processObject: function(object, arglist){
		if(has(object, 'opacity')){
			this.styles.globalAlpha = object.opacity;
		}
		if(has(object, 'composite')){
			this.styles.globalCompositeOperation = object.composite;
		}
		if(has(object, 'clip')){
			object.clip.context = this.context;
			this.attrs.clip = object.clip;
		}

		return arglist.map(function(name){
			return object[name];
		});
	},

	// Bounds
	bounds : function(options){
		if(!this.shapeBounds){
			throw ('The object doesn\'t have shapeBounds method.');
		}

		// options.transform - 3 possible values (transformed boundbox, normalized boundbox (maximize transformed vertices), ignore transforms)
		// options.around = 'fill' or 'stroke' or 'exclude' (stroke)
		// maybe, options.processClip = true or false
		var bounds = Array.isArray(this.shapeBounds) ? this.shapeBounds : this.shapeBounds();
		// do smth here
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
		}, this);
		return this;
	},

	// Transforms
	transform: function(a, b, c, d, e, f, pivot){
		if(a === null){
			this.matrix = null;
		} else {
			if(pivot){
				pivot = this.corner(pivot);
				e = pivot[0] + e - a * pivot[0] - c * pivot[1];
				f = pivot[1] + f - b * pivot[0] - d * pivot[1];
			}
			this.matrix = $.transform(this.matrix || [1, 0, 0, 1, 0, 0], [a, b, c, d, e, f]);
		}
		return this.update();
	},

	translate: function(x, y){
		return this.transform(
			1, 0,
			0, 1,
			x, y
		);
	},

	rotate: function(angle, pivot){
		angle = angle / 180 * Math.PI;
		return this.transform(
			Math.cos(angle), Math.sin(angle),
			-Math.sin(angle), Math.cos(angle),
			0, 0,

			pivot || 'center'
		);
	},

	scale: function(x, y, pivot){
		if(y === undefined){
			y = x;
		}
		return this.transform(
			x, 0,
			0, y,
			0, 0,

			pivot || 'center'
		);
	},

	skew: function(x, y, pivot){
		if(y === undefined){
			y = x;
		}
		return this.transform(
			1, Math.tan(y),
			Math.tan(x), 1,
			0, 0,

			pivot || 'center'
		);
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
	},

	// Animation
	animate: function(attr, value, options){
		// attr, value, duration, easing, callback
		// attrs, duration, easing, callback
		// attr, value, options
		// attrs, options
		if(attr + '' !== attr){
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
	}

});

Drawable.processStroke = function(stroke, style){
	if(stroke + '' === stroke){
		stroke = stroke.replace(/\s*\,\s*/g, ',').split(' ');

		var opacity, l = stroke.length;
		while(l--){
			if(reFloat.test(stroke[l])){
				opacity = parseFloat(stroke[l]);
			} else if(isNumberLike(stroke[l])){
				style.lineWidth = $.distance(stroke[l]);
			} else if(stroke[l] === 'round'){
				// wrong when changing!
				style.lineJoin = style.lineJoin || 'round';
				style.lineCap = style.lineCap || 'round';
			} else if(stroke[l] === 'miter' || stroke[l] === 'bevel'){
				style.lineJoin = stroke[l];
			} else if(stroke[l] === 'butt' || stroke[l] === 'square'){
				style.lineCap = stroke[l];
			} else if(stroke[l][0] === '['){
				style.lineDash = stroke[l].substr(1, stroke[l].length - 2).split(',');
			} else if(stroke[l] in $.dashes){
				style.lineDash = $.dashes[stroke[l]];
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
		if(stroke.color){
			style.strokeStyle = stroke.color;
		}
		if(stroke.opacity && style.strokeStyle){
			var parsed = $.color(style.strokeStyle);
			parsed[3] = stroke.opacity;
			style.strokeStyle = 'rgba(' + parsed.join(',') + ')';
		}
		if(stroke.width){
			style.lineWidth = $.distance(stroke.width);
		}
		if(stroke.join){
			style.lineJoin = stroke.join;
		}
		if(stroke.cap){
			style.lineCap = stroke.cap;
		}
		if(stroke.dash){
			if(stroke.dash in $.dashes){
				style.lineDash = $.dashes[stroke.dash];
			} else {
				style.lineDash = stroke.dash;
			}
		}
	}
};

Drawable.processShadow = function(shadow, style){
	if(shadow + '' === shadow){
		var shadowProps = ['shadowOffsetX', 'shadowOffsetY', 'shadowBlur'];
		shadow = shadow.replace(/\s*\,\s*/g, ',').split(' ');
		for(var i = 0; i < shadow.length; i++){
			if(isNaN(+shadow[i][0])){
				style.shadowColor = shadow[i];
			} else {
				style[shadowProps.shift()] = $.distance(shadow[i]);
			}
		}
	} else {
		if(shadow.x !== undefined){
			style.shadowOffsetX = $.distance(shadow.x);
		}
		if(shadow.y !== undefined){
			style.shadowOffsetY = $.distance(shadow.y);
		}
		if(shadow.blur !== undefined){
			style.shadowBlur = $.distance(shadow.blur || 0);
		}
		if(shadow.color){
			style.shadowColor = shadow.color;
		}
	}
}

$.Drawable = Drawable;

// events aliases
Context.prototype.eventsInteract.forEach(function(eventName){
	Drawable.prototype[eventName] = Context.prototype[eventName] = function(callback){
		return this[
			typeof callback === 'function' || callback + '' === callback ? 'on' : 'fire'
		].apply(this, [eventName].concat(slice.call(arguments)));
	};
});