Animation = new Class({
	initialize : function(duration, easing, callback){
		this.setParams(duration || Animation.default.duration, easing || Animation.default.easing, callback);
	},

	paused : false,

	setParams : function(duration, easing, callback){
		if(duration){
			this.duration = duration;
		}
		if(easing){
			if(easing.constructor === String){
				var index = easing.indexOf('(');
				if(index !== -1){
					this.easingParam = easing.substring(index + 1, easing.length - 1);
					easing = easing.substring(0, index);
				}
				this.easing = Animation.easing[easing];
			} else {
				this.easing = easing;
			}
		}
		if(callback){
			this.callback = callback;
		}
	},

	play : function(tick, context){
		if(this.prePlay){
			this.prePlay();
		}
		if(tick){
			this.tick = tick;
		}
		if(context){
			this.tickContext = context;
		}

		this.startTime = Date.now();
		this.endTime = this.startTime + this.duration;
		if(!Animation.queue.length){
			requestAnimationFrame(Animation.do);
		}
		Animation.queue.push(this);
	},

	pause : function(){
		this.paused = true;
		this.pauseTime = Date.now();
		// Animation.queue.splice(Animation.queue.indexOf(this), 1);
	},

	continue : function(){
		if(!this.paused){
			return;
		}

		var delta = this.pauseTime - this.startTime;
		this.startTime = Date.now() - delta;
		this.endTime = this.startTime + this.duration;

		if(!Animation.queue.length){
			requestAnimationFrame(Animation.do);
		}
		this.paused = false;
		// Animation.queue.push(this);
	},

	cancel : function(){
		var index = Animation.queue.indexOf(this);
		if(index > -1){
			Animation.queue.splice(index, 1);
		}
	}
});

Animation.queue = [];

Animation.do = function(){
	var fx, t,
		now = Date.now();

	for(var i = 0; i < Animation.queue.length; i++){
		fx = Animation.queue[i];
		if(fx.paused){
			continue;
		}

		t = (now - fx.startTime) / fx.duration;

		if(t < 0){
			continue;
		}

		if(t > 1){
			t = 1;
		}

		fx.now = now;
		fx.pos = fx.easing(t, fx.easingParam);
		fx.tick.call(fx.tickContext, fx);

		if(t === 1){
			if(fx.callback){
				// it must be called after the last update
				requestAnimationFrame(function(){
					fx.callback.call(fx.tickContext, fx);
				});
			}

			if(fx.queue){
				fx.queue.shift();
				fx.queue[0] && fx.queue[0].play();
			}

			Animation.queue.splice(Animation.queue.indexOf(fx), 1);
		}
	}

	if(Animation.queue.length){
		requestAnimationFrame(Animation.do);
	}
};

Animation.animationsOfElem = function(elem){
	var fxs = [];
	for(var i = 0; i < Animation.queue.length; i++){
		if(Animation.queue[i].elem === elem){
			fxs.push(Animation.queue[i]);
		}
	}
	return fxs;
};

Animation.animationByName = function(name){
	var fxs = [];
	for(var i = 0; i < Animation.queue.length; i++){
		if(Animation.queue[i].name === name){
			fxs.push(Animation.queue[i]);
		}
	}
	return fxs;
};

// extends AttrMixin
Class.mixins.AnimatableMixin = {
	animQueue : [],
	animate : function(attr, value, options, easing, callback){
		// attr, value, duration, easing, callback
		// attrs, duration, easing, callback
		// attr, value, options
		// attrs, options
		// fx, options (fx is pushed to the queue)
		if(attr.constructor !== String){
			callback = easing;
			easing = options;
			options = value;
			value = null;
		}

		if(!options || options.constructor !== Object){
			if(options && options.constructor === Function){
				callback = options;
				options = null;
			}
			options = {
				duration: options || Animation.default.duration,
				easing: easing || Animation.default.easing,
				callback: callback
			};
		}

		var fx;
		if(attr instanceof Animation){
			fx = attr;
			fx.setParams(options.duration, options.easing, options.callback);
		} else {
			fx = new Animation(
				options.duration,
				options.easing,
				options.callback
			);

			if(attr.constructor === String){
				// attr, value
				fx.prop = attr;
				fx.tick = this.attrHooks[attr].anim;
				fx.prePlay = function(){
					this.attrHooks[attr].preAnim.call(this, fx, value);
					this.attrs.animation = fx;
				}.bind(this);

				if(!this.attrHooks[attr] || !this.attrHooks[attr].anim){
					throw 'Animation for "' + attr + '" is not supported';
				}
			} else {
				// attrs
				fx.prop = Object.keys(attr).map(function(prop){
					var anim = new Animation();
					anim.prop = prop;
					anim.tick = this.attrHooks[prop].anim;
					anim.tickContext = this;
					return anim;
				}, this);
				fx.tick = function(fx){
					fx.prop.forEach(function(anim){
						anim.now = fx.now;
						anim.pos = fx.pos;
						this.attrHooks[anim.prop].anim.call(this, anim);
					}, this);
				};
				fx.prePlay = function(){
					fx.prop.forEach(function(anim){
						this.attrHooks[anim.prop].preAnim.call(this, anim, attr[anim.prop]);
					}, this);
					// if queue this.attrs.animation = fx;
				}.bind(this);
			}

			fx.tickContext = this;
		}

		// is used to pause / cancel anims
		fx.elem = this;
		if(options.name){
			fx.name = options.name;
		}

		if(!options.ignoreQueue){
			fx.queue = this.animQueue;
			fx.queue.push(fx);
			if(fx.queue.length === 1){
				fx.play();
			}
		} else {
			fx.play();
		}

		return this;
	},

	// stop(clearQueue, jumpToEnd)
	pause : function(name, ignoreGlobalQueue){
		if(name){
			Animation.animationByName(name).forEach(function(fx){
				fx.pause();
			});
		} else if(ignoreGlobalQueue){
			this.animQueue[0].pause();
		} else {
			Animation.animationsOfElem(this).forEach(function(fx){
				fx.pause();
			});
		}
		return this;
	},

	continue : function(name, ignoreGlobalQueue){
		if(name){
			Animation.animationByName(name).forEach(function(fx){
				fx.continue();
			});
		} else if(ignoreGlobalQueue){
			this.animQueue[0].continue();
		} else {
			Animation.animationsOfElem(this).forEach(function(fx){
				fx.continue();
			});
		}
		return this;
	}
};

// Some tick functions
Animation.tick = {
	num: {
		preAnim: function(fx, endValue){
			fx.startValue = this.attr(fx.prop);
			fx.delta = endValue - fx.startValue;

			if(endValue.constructor === String){
				if(endValue.indexOf('+=') === 0){
					fx.delta = +endValue.substr(2);
				} else if(endValue.indexOf('-=') === 0){
					fx.delta = -endValue.substr(2);
				}
			}
		},

		anim: function(fx){
			this.attrs[fx.prop] = fx.startValue + fx.delta * fx.pos;
			this.update();
		}
	},

	numAttr: {
		anim: function(fx){
			this.attr(fx.prop, fx.startValue + fx.delta * fx.pos);
		}
	}
};

Animation.tick.numAttr.preAnim = Animation.tick.num.preAnim;

// Easing functions
Animation.easing = {
	linear: function(x){
		return x;
	},

	swing: function(x){
		return 0.5 - Math.cos(x * Math.PI) / 2;
	},

	sqrt: function(x){
		return Math.sqrt(x);
	},

	pow: function(t, v){
		return Math.pow(t, v || 6);
	},

	expo: function(t, v){
		return Math.pow(v || 2, 8 * t - 8);
	},

	sigmoid : function(t, v){
		// return 1 / (1 + Math.exp(v * (t - 0.5))) / (1 / (1 + Math.exp(v / 2)));

		v = -(v || 5);
		return (1 + Math.exp(v / 2)) / (1 + Math.exp(v * (t - 0.5)));
	},

	circ: function(t){
		return 1 - Math.sin(Math.acos(t));
	},

	sine: function(t){
		return 1 - Math.cos(t * Math.PI / 2);
	},

	back: function(t, v){
		return Math.pow(t, 2) * ((v || 1.618) * (t - 1) + t);
	},

	bounce: function(t){
		for(var a = 0, b = 1; 1; a += b, b /= 2){
			if(t >= (7 - 4 * a) / 11){
				return b * b - Math.pow((11 - 6 * a - 11 * t) / 4, 2);
			}
		}
	},

	elastic: function(t, v){
		return Math.pow(2, 10 * --t) * Math.cos(20 * t * Math.PI * (v || 1) / 3);
	},

	bezier: function(t, v){
		// todo
	},

	// [tension, elastic]

};

['quad', 'cubic', 'quart', 'quint'].forEach(function(name, i){
	Animation.easing[name] = function(t){
		return Math.pow(t, i + 2);
	};
});

Object.keys(Animation.easing).forEach(function(ease){
	Animation.easing[ease + 'In'] = Animation.easing[ease];
	Animation.easing[ease + 'Out'] = function(t, v){
		return 1 - Animation.easing[ease](1 - t, v);
	};
	Animation.easing[ease + 'InOut'] = function(t, v){
		if(t >= 0.5){
			return Animation.easing[ease](2 * t, v) / 2;
		} else {
			return (2 - Animation.easing[ease](2 * (1 - t), v)) / 2;
		}
	};
});

Animation.default = {
	duration: 500,
	easing: 'swing'
};

Delta.animation = function(duration, easing, callback){
	return new Animation(duration, easing, callback);
};