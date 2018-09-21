/**
 * Class
 * Class.AttrMixin
 * Class.EventMixin
 * Class.LinkMixin?
 */

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
					return this.attrs[attr];
				}, this);
			}

			// if name is obj then forEach
			if(typeof name !== 'string'){
				Object.keys(name).forEach(function(attrName){
					this.attr(attrName, name[attrName]);
				}, this);
				return this;
			}

			// if value is not defined then get
			if(arguments.length === 1){
				return this.attrs[name];
			}

			// else set
			this.attrs[name] = val;
			return this;
		}
	},

	// todo: AnimatableMixin depending on the AttrMixin
	// must be defined at Animation.js

	// todo: TransformableMixin depending on the AttrMixin too

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
	LinkMixin : {
		links : [],
		pushLink : function(){},
		callLinks : function(funcName){}
	}
};

function wrapQuickCall(args){
	var name = args[2];
	return function(){
		return this[name].apply(this, Array.prototype.slice.call(args, 3));
	};
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