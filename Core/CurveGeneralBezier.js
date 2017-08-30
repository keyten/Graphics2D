//# Bezier Curves
var GeneralBezier = new Class(Curve, {
	initialize: function(method, attrs, path){
		this.super('initialize', arguments);
		this.attrs.detail = 30;
	},

	attrHooks: new CurveAttrHooks({
		args: {
			set: function(value){
				this._x = this._y = null;
				this.update();
			}
		},

		detail: {
			set: function(value){
				this.update();
			}
		}
	}),

	_processCoords: function(){
		var x = [], y = [];
		this.attrs.args.forEach(function(coord, i){
			if(i % 2 === 0){
				x.push(coord);
			} else {
				y.push(coord);
			}
		});
		this._x = x;
		this._y = y;
	},

	pointAt: function(t, start){
		if(!start){
			start = this.startAt();
		}

		if(!this._x || !this._y){
			this._processCoords();
		}

		var x = [start[0]].concat(this._x),
			y = [start[1]].concat(this._y);

		return [
			bezier(x, t),
			bezier(y, t)
		];
	},

	endAt: function(){
		return this.attrs.args.slice(this.attrs.args.length - 2);
	},

	process: function(ctx){
		if(!this._x || !this._y){
			this._processCoords();
		}

		var start = this.startAt(),
			x = [start[0]].concat(this._x),
			y = [start[1]].concat(this._y),
			detail = this.attrs.detail;

		ctx.moveTo(start[0], start[1]);

		for(var i = 1; i <= detail; i++){
			ctx.lineTo(
				bezier(x, i / detail),
				bezier(y, i / detail)
			);
		}
	}
});

function factorial(n){
	if(n <= 1){
		return 1;
	}

	n++;

	var res = 1;
	while(--n){
		res *= n;
	}

	return res;
}

function C(i, m){
	return factorial(m) / (factorial(i) * factorial(m - i));
}


function bezier(points, t){
	var len = points.length,
		m = len - 1,
		i = 0,
		l = 1 - t,
		result = 0;
	for(; i < len; i++){
		result += C(i, m) * Math.pow(t, i) * Math.pow(l, m - i) * points[i];
	}
	return result;
}

Delta.curves['bezier'] = GeneralBezier;