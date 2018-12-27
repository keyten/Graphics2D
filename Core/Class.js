/**
 * Class
 * Class.AttrMixin
 * Class.EventMixin
 * Class.LinkMixin?
 */
// todo: move everything to utils

// Class
function Class(parent, properties){
	if(!properties){
		properties = parent;
		parent = null;
	}

	var init = function(){
		return this.initialize && this.initialize.apply(this, arguments);
	};

	if(parent){
		// prototype inheriting
		var sklass = function(){};
		sklass.prototype = parent.prototype;
		init.prototype = new sklass();
		init.prototype.superclass = parent.prototype;
		init.prototype.constructor = init;

		init.prototype.super = function(name, args){
			// при вызове super внутри таймаута получим бесконечный цикл
			// по-хорошему, проверять бы arguments.callee.caller === arguments.callee
			// по-плохому, не стоит: это вроде как плохо, и вообще use strict
			if(!this.superclass.superclass || !this.superclass.superclass[name]){
				return this.superclass[name].apply(this, args);
			}

			var superclass = this.superclass; // нужно подумать, можно ли это сделать иначе
			this.superclass = this.superclass.superclass;
			var result = superclass[name].apply(this, args);
			this.superclass = parent.prototype;
			return result;
		};
	}

	if(properties.mixins){
		properties.mixins.forEach(function(mixinName){
			extend(init.prototype, Class.mixins[mixinName]);
		});
	}

	extend(init.prototype, properties);

	return init;
}

Class.mixins = {
	AttrMixin : {
		attrs : {},
		attrHooks : {},
		attr : function(name, value){
			// if name is arr then map
			if(name.constructor === Array){
				// Array.isArray is too slow in V8
				return name.map(function(attr){
					return this.attr(attr);
				}, this);
			}

			// if name is obj then forEach
			if(name.constructor !== String){
				Object.keys(name).forEach(function(attrName){
					this.attr(attrName, name[attrName]);
				}, this);
				return this;
			}

			// if value is not defined then get
			if(value === undefined){ // if arguments.length === 1
				if(this.attrHooks[name] && this.attrHooks[name].get){
					return this.attrHooks[name].get.call(this);
				}
				return this.attrs[name];
			}

			// else set
			this.attrs[name] = value;
			if(this.attrHooks[name] && this.attrHooks[name].set){
				this.attrHooks[name].set.call(this, value);
			}
			return this;
		}
	},

	TransformableMixin : {
		attrHooks : {
			// transform = [1, 0, 0, 1, 0, 0]
			// transform = 'attributes'
			// transform = 'translate(1,1) rotate(45)'
			transform : {
				set : function(value){
					if(value === null){
						this.attrs.matrix = null;
					} else {
						this.attrs.matrix = 'dirty';
					}
					this.update();
				}
			},

			transformOrder: {set: updateTransformSetter},
			pivot: {set: updateTransformSetter},

			translate : {
				get : function(){
					return this.attrs.translate || [0, 0];
				},
				set : updateTransformSetter
			},

			rotate : {
				get : function(){
					return this.attrs.rotate || 0;
				},
				set : updateTransformSetter
			},

			scale : {
				get : function(){
					return this.attrs.scale || [1, 1];
				},
				set : updateTransformSetter
			},

			skew : {
				get : function(){
					return this.attrs.skew || [0, 0];
				},
				set : updateTransformSetter
			}
		},

		calcMatrix : function(){
			var matrix, transform = this.attrs.transform;

			if(transform.constructor === Array){
				matrix = new Float32Array(transform); //new Transform2D(transform[0], transform[1], transform[2],
					//transform[3], transform[4], transform[5]);
			} else if(transform === 'attributes'){
				matrix = new Float32Array([1, 0, 0, 1, 0, 0]);
				(this.attrs.transformOrder || Delta.transformOrder).split(' ').forEach(function(tr){
					var attr = this.attrs[tr];
					if(!attr){
						return;
					}
					this.transformFunctions[tr].call(this, matrix, attr.constructor === Array ? attr : [attr]);
				}, this);
			} else {
				matrix = new Float32Array([1, 0, 0, 1, 0, 0]);
				Delta.strParse.functions(transform).forEach(function(func){
					this.transformFunctions[func.method].call(this, matrix, func.args);
				}, this);
			}

			return this.attrs.matrix = matrix;
		},

		transformFunctions : {
			pivot : function(pivot){
				if(pivot && pivot.indexOf(';') > -1){
					pivot = pivot.split(';');
					// todo: distance
					return [
						Number(pivot[0].trim()),
						Number(pivot[1].trim())
					];
				}

				return this.corner(pivot || this.attrs.pivot, {
					transform: 'none'
				});
			},

			translate : function(matrix, args){
				var x = Number(args[0]),
					y = Number(args[1]);
				if(args[2]){
					// args[2] is called 'independent'
					matrix[4] += x;
					matrix[5] += y;
				} else {
					matrix[4] = matrix[0] * x + matrix[2] * y + matrix[4];
					matrix[5] = matrix[1] * x + matrix[3] * y + matrix[5];
				}
			},

			matrix : function(matrix, matrix2){
				var a = matrix[0],
					b = matrix[1],
					c = matrix[2],
					d = matrix[3],
					e = matrix[4],
					f = matrix[5];
				matrix[0] = a * matrix2[0] + c * matrix2[1];
				matrix[1] = b * matrix2[0] + d * matrix2[1];
				matrix[2] = a * matrix2[2] + c * matrix2[3];
				matrix[3] = b * matrix2[2] + d * matrix2[3];
				matrix[4] = a * matrix2[4] + c * matrix2[5] + e;
				matrix[5] = b * matrix2[4] + d * matrix2[5] + f;
			},

			lmatrix : function(matrix, matrix2){
				this.transformFunctions.matrix.call(this, matrix2, matrix);
			},

			rotate : function(matrix, args){
				var pivot = this.transformFunctions.pivot.call(this, args[1]),
					angle = Number(args[0]) * Math.PI / 180,
					cos = Math.cos(angle),
					sin = Math.sin(angle);

				this.transformFunctions.matrix.call(this, matrix, [
					cos, sin, -sin, cos,
					-pivot[0] * cos + pivot[1] * sin + pivot[0],
					-pivot[0] * sin - pivot[1] * cos + pivot[1]]);
			},

			scale : function(matrix, args){
				if(isNaN(args[1])){
					args[2] = args[1];
					args[1] = args[0];
				}
				var x = Number(args[0]),
					y = Number(args[1]),
					pivot = this.transformFunctions.pivot.call(this, args[2]);

				this.transformFunctions.matrix.call(this, matrix, [
					x, 0, 0, y,
					-pivot[0] * x + pivot[0],
					-pivot[1] * y + pivot[1]]);
			},

			skew : function(matrix, args){
				if(isNaN(args[1])){
					args[2] = args[1];
					args[1] = args[0];
				}
				var x = Math.tan(Number(args[0]) * Math.PI / 180),
					y = Math.tan(Number(args[1]) * Math.PI / 180),
					pivot = this.transformFunctions.pivot.call(this, args[2]);

				this.transformFunctions.matrix.call(this, matrix, [
					1, y, x, 1,
					-pivot[1] * x,
					-pivot[0] * y]);
			}

			// reflect(alpha) -- reflects the plain by the line with angle = alpha
			// [cos 2a, sin 2a, sin 2a, -cos 2a]
		}
	},

	// todo: AnimatableMixin depending on the AttrMixin
	// must be defined at Animation.js

	EventMixin : {
		listeners : {},

		// for inspiration:
		// http://benalman.com/news/2010/03/jquery-special-events/
		// http://learn.jquery.com/events/event-extensions/
		eventHooks : {},

		// hooks for add & remove are commented cause they dont seem to be neccessary
		on : function(event, options, callback){
			// if event is obj then keys(event) foreach
			if(event.constructor !== String){
				Object.keys(event).forEach(function(eventName){
					this.on(eventName, event[eventName]);
				}, this);
				return this;
			}

			// if options is not obj then callback = options
			if(options){
				if(options.constructor === Function){
					// event, callback
					callback = options;
					options = null;
				} else if(options.constructor === String){
					// event, methodName, arg1, arg2...
					Array.prototype.splice.call(arguments, 1, 0, null);
				}
			}

			// if callback is string then process quick call
			if(callback.constructor === String){
				callback = wrapQuickCall(arguments);
			}

			// if event isnt inited then init it
			if(!this.listeners[event]){
				this.listeners[event] = [];
				if(this.eventHooks[event] && this.eventHooks[event].init){
					this.eventHooks[event].init.call(this, event);
				}
			}

			// add the callback (with options)
			this.listeners[event].push({
				callback: callback,
				options: options
			});

			// call the hook
			/* if(this.eventHooks[event] && this.eventHooks[event].add){
				this.eventHooks[event].add.call(this, options, callback, event);
			} */

			return this;
		},

		off : function(event, callback){
			var listeners = this.listeners[event],
				hooks = this.eventHooks[event];

			if(listeners){
				if(callback){
					// if callback then remove it
					for(var i = 0; i < listeners.length; i++){
						if(listeners[i].callback === callback){
							listeners.splice(i, 1);
							break;
						}
					}

					if(hooks){
						/* if(hooks.remove){
							hooks.remove.call(this, callback, event);
						} */
						if(!listeners.length && hooks.teardown){
							this.listeners[event] = null;

							hooks.teardown.call(this, event);
						}
					}
				} else {
					// otherwise remove all callbacks
					this.listeners[event] = null;

					if(hooks && hooks.teardown){
						hooks.teardown.call(this, event);
					}
				}
			}

			return this;
		},

		fire : function(event, data, checker){
			var listeners = this.listeners[event];

			if(listeners){
				if(checker){
					listeners = listeners.filter(checker, this);
				}

				listeners.forEach(function(callbackData){
					callbackData.callback.call(this, data);
				}, this);
			}

			return this;
		}
	},

// gradients, patterns, clip
// todo: not neccessary
	LinkMixin : {
		links : [],
		pushLink : function(){},
		callLinks : function(funcName){}
	}
};

Delta.transformOrder = 'translate rotate scale skew';

function wrapQuickCall(args){
	var name = args[2];
	return function(){
		return this[name].apply(this, Array.prototype.slice.call(args, 3));
	};
}

function updateTransformSetter(value){
	this.attrs.matrix = 'dirty';
	this.update();
}

Class.attr = function(name, value){
	if(Array.isArray(name)){
		// getter attr(['attr1', 'attr2'])
		return name.map(function(name){
			return this.attr(name);
		}, this);
	} else if(name + '' !== name){
		// setter attr({ attr1: val1, attr2: val2 });
		Object.keys(name).forEach(function(key){
			this.attr(key, name[key]);
		}, this);
		return this;
	}

	// afaik its not good to use arguments?
	if(arguments.length === 1){
		// getter attr('attr1')
		if(this.attrHooks[name] && this.attrHooks[name].get){
			return this.attrHooks[name].get.call(this);
		}
		return this.attrs[name];
	}

	// setter attr('attr1', 'val1')
	if(this.attrHooks[name] && this.attrHooks[name].set){
		var result = this.attrHooks[name].set.call(this, value);
		if(result !== null){ // replace to result !== Delta._doNotSetProperty;
			// сжатие _-свойств минимизатором можно обойти через Delta['_doNot...'] = ...
			this.attrs[name] = result === undefined ? value : result;
		}
	} else {
		this.attrs[name] = value;
	}

	return this;
};