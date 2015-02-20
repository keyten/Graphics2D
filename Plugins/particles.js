/*! Graphics2D Particles
 *  Author: Keyten aka Dmitriy Miroshnichenko
 *  License: MIT / LGPL
 */
(function(window, $, undefined){

	var ParticleSystem = $.Class({
		initialize : function(parameters, context){
			// todo: reborn parameters
			// enableReborn : true, timeToReborn : 0 (instant reborn)
			this._cx = parameters.cx;
			this._cy = parameters.cy;

			// particles properties
			this._count = parameters.count; // if array then = median of [0] and [1]
			this._lifeTime = parameters.lifetime || Infinity; // array, ms
			this._spawnMethod = 'circle';
			// circle -- particles spawn on fixed distance and random radius from the center
			// rect -- spawning uses minX, maxX, minY, maxY parameters
			this._radius = parameters.radius;
			this._opacity = parameters.opacity; // array of arrays [start, end] or [startMin, startMax, endMin, endMax]
			this._size = parameters.size; // scaling
			this._rotate = parameters.rotate; // rotate speed
			this._speed = parameters.speed; // [x, y] or [...]
			this._gravity = parameters.gravity;
			this._easing = $.Anim.easing[parameters.easing] || parameters.easing || $.Anim.easing.linear;
			// TODO: make immortal particles

			this.genParticles();
			this._context = context;
			window.setInterval(context.update.bind(context), 50);

			this._draw = parameters.draw;
		},

		genParticles : function(){
			var particles = [];
			for(var i = 0; i < this._count; i++)
				particles.push(new Particle(this));
//				setTimeout(function(){ particles.push(new Particle(this)); }.bind(this), rand(1, this._spawnDelay || this._lifeTime));

			this._particles = particles;
		},

		draw : function(ctx){
			ctx.save();
			var p = this._particles;
			for(var i = 0, l = p.length; i < l; i++){
				// todo: check this expression:
				var delta = 1 - ((p[i]._lifeStart + p[i]._lifeTime - Date.now()) / p[i]._lifeTime);
				if(delta > 1)
					p[i].reborn();
				// comment to immortal particles
				// or replace to "continue;"

				delta = this._easing(delta);
				p[i].processTime(delta);
				p[i].draw(ctx, delta);
			}
			ctx.restore();
		},

		// parameters
		count : function(value){
			this._count = value;
			this.genParticles();
		},

	});

	var Particle = $.Class({
		initialize : function(system){
			this._system = system;
			this._lifeStart = Date.now();

			if(isNumber(system._lifeTime))
				this._lifeTime = system._lifeTime;
			else
				this._lifeTime = rand(system._lifeTime[0], system._lifeTime[1]);

			// position
			var angle = Math.random() * Math.PI * 2,
				distance = Math.random() * system._radius | 0;
			this._x = this._startX = Math.round(system._cx + distance * Math.cos(angle));
			this._y = this._startY = Math.round(system._cy + distance * Math.sin(angle));

			// speed
			if(system._speed.length === 2){
				this._speedX = system._speed[0];
				this._speedY = system._speed[1];
			}
			else {
				// random speed
				this._speedX = randFloat(system._speed[0], system._speed[2]);
				this._speedY = randFloat(system._speed[1], system._speed[3]);
				// dont use round or a same function !!!
			}
			this._startSpeedX = this._speedX;
			this._startSpeedY = this._speedY;

			// gravity
			if(system._gravity){
				this._gravity = true;
				if(system._gravity.length === 2){
					this._gravityX = system._gravity[0];
					this._gravityY = system._gravity[1];
				}
				else {
					this._gravityX = randFloat(system._gravity[0], system._gravity[2]);
					this._gravityY = randFloat(system._gravity[1], system._gravity[3]);
				}
			}

			// opacity
			if(system._opacity){
				// array2 or array4
				this._opacityFrom = system._opacity[0];
				this._opacityTo   = system._opacity[1];
				this._opacity = this._opacityFrom;
			}

			// rotation
			this._rotation = 0;
			this._rotate = system._rotate * Math.PI / 180;
		},

		processTime : function(t){
			// position
			this._x = (this._startX + this._speedX * t * 10) | 0;
			this._y = (this._startY + this._speedY * t * 10) | 0;

			// gravity
			if(this._gravity){
				this._speedX = this._startSpeedX + this._gravityX * t;
				this._speedY = this._startSpeedY + this._gravityY * t;
			}

			// opacity
			if(this._opacity !== undefined)
				this._opacity = this._opacityFrom + (this._opacityTo - this._opacityFrom) * t;

			// rotate
			this._rotation += this._rotate;
		},

		reborn : function(){
			this.initialize(this._system);
		},

		draw : function(ctx){
			this._system._draw.call(this, ctx);
		}
	});

	$.Context.prototype.particleSystem = function(parameters){
		return this.push(new ParticleSystem(parameters, this));
	};

	function isNumber(a){
		return Object.prototype.toString.call(a) === '[object Number]';
	}

	function rand(from, to){
		return from + Math.round(Math.random() * (to - from));
	}
	function randFloat(from, to){
		return from + Math.random() * (to - from);
	}

})(window, Graphics2D);