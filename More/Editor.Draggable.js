Delta.draggable = {
	defaultProps: {
		axis: 'both',
		inBounds: null,
		cursor: null,
		cursorAt: null,
		moveWith: [],
		delay: 100,
		distance: 5,
		grid: null,
		helper: null,
		helperFixPosition: true,
		helperAttrs: {
			opacity: 0.5
		},
		originalAttrs: {},
		zIndex: null,
		zIndexReturn: true
	},

	methods: {
		enable: function(element, options){
			if(!element.attr('draggable')){
				element.attr('draggable', extend({}, Delta.draggable.defaultProps));
			}
			this.updateMods(element, extend(element.attr('draggable'), options || {}));

			element.context.on('mousedown', Delta.draggable.listeners.canvasMouseDown);
			if(!Delta.draggable.listeners._windowSet){
				window.addEventListener('mousemove', Delta.draggable.listeners.windowMouseMove);
				window.addEventListener('mouseup', Delta.draggable.listeners.windowMouseUp);
				Delta.draggable.listeners._windowSet = true;
			}
		},

		updateMods: function(element, options){
			var mods = element.attr('draggable').mods = [];

			if(['lt', 'tl', 'left top'].indexOf(options.cursorAt) === -1){
				mods.push('cursorAt');
			}
			;
		},

		hold: function(element, event){
			if(Delta.dragElement && Delta.dragElement !== element){
				// var oldElement = Delta.dragElement; // hoiting
				Delta.dragElement.draggable('release');
			}

			Delta.dragElement = element;

			element._drag = {
				downCoords: [event.contextX, event.contextY],
				downTime: Date.now(),
				bounds: element.bounds(),
				nativeBounds: element.bounds(false)
			};

			/* element.context.fire('dragElementChange', extend(event, {
				oldElem: oldElement,
				newElem: element
			})); */

			var options = element.attr('draggable');

			if(options.cursor){
				element._drag.initialCursor = element.context.canvas.style.cursor;
				element.context.canvas.style.cursor = options.cursor;
			}

			if(options.zIndex !== null){
				element._drag.initialZ = element.attr('z');
				element.attr('z', options.zIndex);
			}

			if(options.helper){
				if(options.helper === 'clone'){
					element._drag.helper = element.clone();
				} else {
					element._drag.helper = options.helper.clone();
					// нужны функции для работы с abstract element place / bounds
					// ну типа element.placeLTtoPoint(x, y)
					// работающие с translate и т.п.
					// они нужны и для лейаутов
					if(options.helperFixPosition){
						// works with bugs
						var helperBounds = element._drag.helper.bounds();
						element._drag.helperTranslation = [
							element._drag.bounds.x - helperBounds.x,
							element._drag.bounds.y - helperBounds.y
						];
					}
				}

				if(options.helperAttrs){
					element._drag.helper.attr(options.helperAttrs);
				}

				element._drag.helper['_meta'] = true; // must be at all the meta obs (not made by user)
				// todo: make sure it is not spoiled by minimizer
			}
		},

		release: function(element){
			if(Delta.dragElement === element){
				Delta.dragElement._drag = null;
				Delta.dragElement = null;
			}
		}
	},

	listeners: {
		canvasMouseDown: function(event){
			var draggable = event.targetObject && event.targetObject.attr('draggable');
			if(!draggable){
				return;
			}

			var elem = event.targetObject;

			Delta.draggable.methods.hold(elem, event);
		},

		_windowSet: false,

		windowMouseMove: function(event){
			var element = Delta.dragElement;
			if(!element || !element._drag){
				return;
			}

			var coords = element.context.contextCoords(event.clientX, event.clientY);
			event.contextX = coords[0];
			event.contextY = coords[1];
			coords[0] -= element._drag.nativeBounds.x;
			coords[1] -= element._drag.nativeBounds.y;

			var mods = element.attr('draggable').mods;
			mods.forEach(function(modName){
				coords = Delta.draggable.mods[modName].call(element, coords[0], coords[1], event);
			});

			element.attr('translate', coords);
			element.fire('drag', event);
		},

		windowMouseUp: function(event){
			if(Delta.dragElement){
				Delta.draggable.methods.release(Delta.dragElement);
			}
		}
	},

	mods: {
		cursorAt: function(x, y, event){
			var corner = this.attr('draggable').cursorAt;

			if(!corner){
				var delta = [
					this._drag.downCoords[0] - this._drag.bounds.x,
					this._drag.downCoords[1] - this._drag.bounds.y
				];

				return [
					x - delta[0],
					y - delta[1]
				];
			}

			return [
				x - this._drag.bounds.width * Delta.corners[corner][0],
				y - this._drag.bounds.height * Delta.corners[corner][1],
			];
		},
	}
};

Drawable.prototype.draggable = function(method, options){
	// мб set, а не enable
	if(method + '' !== method){
		options = method;
		method = 'enable';
	} else if(!method){
		method = 'enable';
	}

	return Delta.draggable.methods[method](this, options); //this.draggable[method].call(this, options);
};

//
// ---
//
Drawable.prototype.draggable.init = function(options){
	if(!options){
		options = {};
	}

	this._draggingOptions = extend(extend({}, defaultProps), options);
	this.draggable.updateMods.call(this);

	this.on('mousedown', draggableElemMousedown);
	window.addEventListener('mouseup', windowMouseup.bind(this));
	window.addEventListener('mousemove', windowMousemove.bind(this));

	// todo: заменить на один обработчик
	// Delta._dragging = {canvas, object}
	// и переменную Delta._draggables = (count of draggable obs)
	// когда она обнуляется, скидываем обработчики событий
	// такая чистка мусора
};

Drawable.prototype.draggable.destroy = function(){};
Drawable.prototype.draggable.enable = function(options){
	if(!this._draggingOptions){
		this._draggingOptions = extend(extend({}, defaultProps), options);
	}
};
Drawable.prototype.draggable.disable = function(){};

Drawable.prototype.draggable.updateMods = function(){
	var mods = [];

	if(this._draggingOptions.cursorAt !== 'left top' &&
		this._draggingOptions.cursorAt !== 'lt' &&
		this._draggingOptions.cursorAt !== 'tl'){
		mods.push('cursorAt');
	}

	if(this._draggingOptions.distance){
		mods.push('distance');
	}

	if(this._draggingOptions.delay){
		mods.push('delay');
	}

	if(this._draggingOptions.inBounds){
		if(!(this._draggingOptions.inBounds instanceof Bounds) && this._draggingOptions.inBounds.bounds){
			this._draggingOptions.inBounds = this._draggingOptions.inBounds.bounds();
		}
		mods.push('inBounds');
	}

	if(this._draggingOptions.axis !== 'both'){
		mods.push('axis');
	}

	if(this._draggingOptions.grid){
		if(+this._draggingOptions.grid === this._draggingOptions.grid){
			this._draggingOptions.grid = [
				this._draggingOptions.grid,
				this._draggingOptions.grid
			];
		}
		// just a fix for a common mistake
		if(this._draggingOptions.grid[0] === 0){
			this._draggingOptions.grid[0] = 1;
		}
		if(this._draggingOptions.grid[1] === 0){
			this._draggingOptions.grid[1] = 1;
		}
		mods.push('grid');
	}

	if(this._draggingOptions.moveWith){
		if(!this._draggingOptions.moveWith.length){
			this._draggingOptions.moveWith = [this._draggingOptions.moveWith];
		}
		mods.push('moveWith');
	}

	if(this._draggingOptions.helper){
		mods.push('helper');
	}

	this._draggingOptions.mods = mods;
};

var mods = {
	cursorAt: function(x, y, event){
		var corner = this._draggingOptions.cursorAt;

		if(!corner){
			var delta = [
				this._dragging.downCoords[0] - this._dragging.bounds.x,
				this._dragging.downCoords[1] - this._dragging.bounds.y
			];

			return [
				x - delta[0],
				y - delta[1]
			];
		}

		return [
			x - this._dragging.bounds.width * Delta.corners[corner][0],
			y - this._dragging.bounds.height * Delta.corners[corner][1],
		];
	},

	distance: function(x, y, event){
		if(this._dragging.doNotCheckDistance){
			return [x, y];
		}

		var distance = Math.sqrt(
			Math.pow(this._dragging.downCoords[0] - event.contextX, 2) +
			Math.pow(this._dragging.downCoords[1] - event.contextY, 2)
		);

		if(distance < this._draggingOptions.distance){
			return [
				this._dragging.bounds.x - this._dragging.nativeBounds.x,
				this._dragging.bounds.y - this._dragging.nativeBounds.y
			];
		}

		this._dragging.doNotCheckDistance = true;
		return [x, y];
	},

	delay: function(x, y, event){
		if(this._dragging.doNotCheckDelay){
			return [x, y];
		}

		var delay = Date.now() - this._dragging.downTime;

		if(delay < this._draggingOptions.delay){
			return [
				this._dragging.bounds.x - this._dragging.nativeBounds.x,
				this._dragging.bounds.y - this._dragging.nativeBounds.y
			];
		}

		this._dragging.doNotCheckDelay = true;
		return [x, y];
	},

	inBounds: function(x, y, event){
		// coords of the dragging object
		var coords = [
			x + this._dragging.nativeBounds.x,
			y + this._dragging.nativeBounds.y
		];

		var value = this._draggingOptions.inBounds;
		if(coords[0] < value.x){
			x = value.x - this._dragging.nativeBounds.x;
		} else if(coords[0] + this._dragging.bounds.width > value.x2){
			x = value.x2 - this._dragging.nativeBounds.x - this._dragging.bounds.width;
		}

		if(coords[1] < value.y){
			y = value.y - this._dragging.nativeBounds.y;
		} else if(coords[1] + this._dragging.bounds.height > value.y2){
			y = value.y2 - this._dragging.nativeBounds.y - this._dragging.bounds.height;
		}

		return [x, y];
	},

	axis: function(x, y, event){
		if(this._draggingOptions.axis === 'x'){
			y = this._dragging.bounds.y - this._dragging.nativeBounds.y;
		} else if(this._draggingOptions.axis === 'y'){
			x = this._dragging.bounds.x - this._dragging.nativeBounds.x;
		}
		return [x, y];
	},

	moveWith: function(x, y, event){
		this._draggingOptions.moveWith.forEach(function(element){
			;
		}, this);
		return [x, y];
		// проходим по массиву moveWith, всем ставим translate = -bounds + translation;
	},

	grid: function(x, y, event){
		var grid = this._draggingOptions.grid;
		return [
			x - x % grid[0],
			y - y % grid[1]
		];
	},

	helper: function(x, y, event){
		if(this._dragging.helper){
			if(this._dragging.helperTranslation){
				x += this._dragging.helperTranslation[0];
				y += this._dragging.helperTranslation[1];
			}
			this._dragging.helper.attr('translate', [x, y]);
		}

		return [
			this._dragging.bounds.x - this._dragging.nativeBounds.x,
			this._dragging.bounds.y - this._dragging.nativeBounds.y
		];
	}
};

function draggableElemMousedown(e){
	this._dragging = {
		downCoords: [e.contextX, e.contextY],
		downTime: Date.now(),
		bounds: this.bounds(),
		nativeBounds: this.bounds(false),
		context: this.context
	};

	if(this._draggingOptions.cursor){
		this._dragging.oldCursor = this.context.canvas.style.cursor;
		this.context.canvas.style.cursor = this._draggingOptions.cursor;
	}

	if(this._draggingOptions.zIndex || this._draggingOptions.zIndex === 0){
		this._dragging.zIndexOld = this.attr('z');
		this.attr('z', this._draggingOptions.zIndex);
	}

	if(this._draggingOptions.helper){
		if(this._draggingOptions.helper === 'clone'){
			this._dragging.helper = this.clone();
		} else {
			this._dragging.helper = this._draggingOptions.helper.clone();
			// нужны функции для работы с abstract element place / bounds
			// ну типа element.placeLTtoPoint(x, y)
			// работающие с translate и т.п.
			// они нужны и для лейаутов
			if(this._draggingOptions.helperFixPosition){
				// works with bugs
				var helperBounds = this._dragging.helper.bounds();
				this._dragging.helperTranslation = [
					this._dragging.bounds.x - helperBounds.x,
					this._dragging.bounds.y - helperBounds.y
				];
			}
		}

		if(this._draggingOptions.helperAttrs){
			this._dragging.helper.attr(this._draggingOptions.helperAttrs);
		}

		this._dragging.helper['_meta'] = true; // must be at all the meta obs (made by not the user)
		// todo: make sure it is not spoiled by minimizer
	}

	this.fire('dragstart', e);
}

function windowMouseup(e){
	if(this._dragging){
		if(this._dragging.oldCursor !== undefined){
			this.context.canvas.style.cursor = this._dragging.oldCursor;
			this._dragging.oldCursor = null;
		}

		if(this._dragging.zIndexOld !== undefined && this._draggingOptions.zIndexReturn){
			this.attr('z', this._dragging.zIndexOld);
			this._dragging.zIndexOld = null;
		}

		if(this._dragging.helper){
			this.attr('translate', this._dragging.helper.attr('translate'));
			this._dragging.helper.remove();
			this._dragging.helper = null;
			this._dragging.helperTranslation = null;
		}
	}

	this._dragging = null;
	this.fire('dragend', e);
}

function windowMousemove(e){
	var dragging = this._dragging;

	if(!dragging){
		return;
	}

	var coords = dragging.context.contextCoords(e.clientX, e.clientY);
	event.contextX = coords[0];
	event.contextY = coords[1];
	coords[0] -= dragging.nativeBounds.x;
	coords[1] -= dragging.nativeBounds.y;

	this._draggingOptions.mods.forEach(function(modName){
		coords = mods[modName].call(this, coords[0], coords[1], e);
	}.bind(this));

	this.attr('translate', coords);
	this.fire('drag', e);
}