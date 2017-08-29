var CurveHermite = new Class(Curve, {
	initialize: function(method, attrs, path){
		this.super('initialize', arguments);
		// h1x, h1y, h2x, h2y, x, y, [detail]
	},

	attrHooks: new CurveAttrHooks({
		h1x: {
			set: function(value){
				this.attrs.args[4] = value;
				this.update();
			}
		},
		h1y: {
			set: function(value){
				this.attrs.args[5] = value;
				this.update();
			}
		},
		h2x: {
			set: function(value){
				this.attrs.args[0] = value;
				this.update();
			}
		},
		h2y: {
			set: function(value){
				this.attrs.args[1] = value;
				this.update();
			}
		},
		h3x: {
			set: function(value){
				this.attrs.args[2] = value;
				this.update();
			}
		},
		h3y: {
			set: function(value){
				this.attrs.args[3] = value;
				this.update();
			}
		}
	}),

	pointAt: function(t, start){
		if(!start){
			start = this.startAt();
		}

		var args = this.attrs.args,
			h0x = start[0],
			h0y = start[1],
			h2x = args[0],
			h2y = args[1],
			h3x = args[2],
			h3y = args[3],
			h1x = args[4],
			h1y = args[5];

		var a = [
			2 * h0x - 2 * h1x + h2x + h3x,
			2 * h0y - 2 * h1y + h2y + h3y
		];
		var b = [
			-3 * h0x + 3 * h1x - 2 * h2x - h3x,
			-3 * h0y + 3 * h1y - 2 * h2y - h3y
		];
		var c = [h2x, h2y];
		var d = [h0x, h0y]

		return [
			t * t * t * a[0] + t * t * b[0] + t * c[0] + d[0],
			t * t * t * a[1] + t * t * b[1] + t * c[1] + d[1]
		];
	},

	endAt: function(){
		return [this.attrs.args[4], this.attrs.args[5]];
	},

	tangentAt: function(t, start){
		if(!start){
			start = this.startAt();
		}

		var args = this.attrs.args,
			x1 = start[0],
			y1 = start[1],
			h1x = args[0],
			h1y = args[1],
			h2x = args[2],
			h2y = args[3],
			x2 = args[4],
			y2 = args[5];

		return Math.atan2(
			0.5 * (3*t * t * (-h1y + 3 * y1 - 3 * y2 + h2y)
				+ 2 * t * (2 * h1y - 5 * y1 + 4 * y2 - h2y)
				+ (-h1y + y2)),
			0.5 * (3 * t * t * (-h1x + 3 * x1 - 3 * x2 + h2x)
				+ 2 * t * (2 * h1x - 5 * x1 + 4 * x2 - h2x)
				+ (-h1x + x2))
		) / Math.PI * 180;
	},

	process: function(ctx){
		this.approx(100, function(value, prev, cur, i){
			if(i === 0){
				ctx.moveTo(prev[0], prev[1]);
			}
			ctx.lineTo(cur[0], cur[1]);
		});
	}
});

// todo: hermite for a custom grid
// https://ru.wikipedia.org/wiki/Сплайн_Эрмита
// Delta.Path.hermiteGrid(points)
// возвращает то что можно запихнуть в path.push(...)

// Cardinal spline
// Ti = a * ( Pi+1 - Pi-1 )
// CatmullRom spline
// Ti = 0.5 * ( P i+1 - Pi-1 )

// Kochanek–Bartels spline:
// https://en.wikipedia.org/wiki/Kochanek–Bartels_spline

Delta.curves['hermiteTo'] = CurveHermite;