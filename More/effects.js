	Graphics2D.effects = {
		appear: function(){
			this.show()
			    .opacity(0)
			    .animate('opacity', 1);
		},
		fade: function(){
			this.show()
			    .animate('opacity', 0);
		},
		puff: function(){
			this.animate({
				scale: 2,
				opacity: 0,
			}, {
				callback: function(){
					this.scale(1/2).opacity(1).hide();
				}
			});
		},
		dropOut: function(){
			this.animate({
				translate: [0, 30],
				opacity: 0
			}, {
				callback: function(){
					this.translate(0, -30).opacity(1).hide();
				}
			});
		},
		blind: function(){
			this.show();
			var b = this.bounds();
			var r = this.context.rect(b.x, b.y, b.w, 0); // TODO: abstract shape
			this.clip(r);
			r.animate('height', b.h);
		},
		// todo: merge
		blindDouble: function(){
			this.show();
			var b = this.bounds();
			var r = this.context.rect(b.x, b.y + b.h / 2, b.w, 0); // TODO: abstract shape
			this.clip(r);
			r.animate({
				height: b.h,
				y: b.y
			}, {
				callback: function(){
					r.remove();
				}
			});
		},
		shake: function(){
			var times = 3 * 2, // (options.times || 3) * 2
				i = 0,
				offset = 20 * 2;
			function anim(){
				if(i >= times) return;

				var current = offset;
				if(i % 2 === 1)
					current = -current;
				if(i === 0 || i === times - 1)
					current /= 2;
				this.animate('translate', [current, 0], {
					duration: 100,
					callback: anim.bind(this)
				});
				i++;
			};
			anim.call(this);
		},
		pulsate: function(){
			var times = 3 * 2,
				i = 0;
			for(; i < times; i++){
				this.animate('opacity', i % 2 === 1 ? 1 : 0, 200);
			}
		}
	};

	Graphics2D.Shape.prototype.effect = function(name, dur){
		// TODO: throw
		return Graphics2D.effects[name].call(this) || this;
	}
