// var anim = $.animation(300, 500, options);
// anim.start(value => dosmth(value));

Animation = new Class({

	initialize: function(start, end, duration, easing, callback){
		this.start = start;
		this.end = end;
		this.duration = duration || Animation.default.duration;
		if(easing + '' === easing){
			if(easing.indexOf('(') > -1){
				this.easingParam = +easing.split('(')[1].split(')')[0];
			}
			this.easing = Animation.easing[easing.split('(')[0]];
		} else {
			this.easing = easing || Animation.easing.linear;
		}
		this.callback = callback;
	},

	start: function(tickFunc){
		this.startTime = Date.now();
		this.endTime = this.startTime + this.duration;
		Animation.queue.push(this);
		if(!Animation.enabled){
			requestAnimationFrame(Animation.do);
		}
	}

});

Animation.queue = [];

Animation.enabled = false;
Animation.do = function(){
	var fx, t,
		i = 0
		now = Date.now();

	for(var i = 0; i < Animation.queue.length; i++){
		fx = Animation.queue[i];
		t = (now - fx.startTime) / fx.duration;

		if(t < 0){
			continue;
		}

		if(t > 1){
			t = 1;
		}

		fx.now = now;
		fx.pos = fx.easing(t);
		fx.tick(fx);

		if(t === 1){
			if(fx.callback){
				fx.callback.call();
			}
			// if(!elem._queue) elem._queue = [];
			// fx.queue = elem._queue;
			if(fx.queue){
				// will it work right?!
				fx.queue.shift();
				if(fx.queue.length){
					;
				}
			}
		}
	}

	if(Animation.queue.length){
		requestAnimationFrame(Animation.do);
	} else {
		Animation.enabled = false;
	}
};

// Some step functions
Drawable.prototype.attrHooks._int = {
	preAnim: function(fx){
		fx.delta = fx.start - fx.end;
		// +=, etc
	},
	anim: function(fx){
		fx.elem.attr(fx.prop, fx.start + fx.delta * fx.pos);
	}
};

// Easing functions
Animation.easing = {

	linear: function(x){
		return x;
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
	}

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
	duration: 500
};

$.animation = function(){
	return new Animation();
};