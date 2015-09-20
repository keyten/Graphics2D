
var Matrix, Point, Style;

Matrix = function(){};
Matrix.prototype = ({

	a: 1,
	b: 0,
	c: 0,
	d: 1,
	e: 0,
	f: 0,

	transform: function(a, b, c, d, e, f){
		if(a === undefined)
			return [this.a, this.b, this.c, this.d, this.e, this.f];

		if(a === null){
			this.a = 1;
			this.b = 0;
			this.c = 0;
			this.d = 1;
			this.e = 0;
			this.f = 0;
		}

		var selfA = this.a,
			selfB = this.b,
			selfC = this.c,
			selfD = this.d,
			selfE = this.e,
			selfF = this.f;

		// [this.a, this.c, this.e]   [a, c, e]   [selfA * a + selfC * b, selfA * c + selfC * d, selfA * e + selfC * f + selfE]
		// [this.b, this.d, this.f] * [b, d, f] = [selfB * a + selfD * b, selfB * c + selfD * d, selfB * e + selfC * f + selfF]
		// [0, 0, 1]                  [0, 0, 1]   [0, 0, 1]

		this.a = selfA * a + selfC * b;
		this.b = selfB * a + selfD * b;
		this.c = selfA * c + selfC * d;
		this.d = selfB * c + selfD * d;
		this.e = selfA * e + selfC * f + selfE;
		this.f = selfB * e + selfD * f + selfF;

		// in shape:
		// this.matrix.transform(a, b, c, d, e, f, this.pivot(pivot));
		// return this.update();
	},

	scale: function(){},
	rotate: function(){},
	skew: function(){},
	translate: function(){},

	transformBounds: function(bounds){
		return bounds;
	}

});

Point = new Class({
	initialize: function(x, y){
		this.x = x;
		this.y = y;
	}
});

Style = new Class({
	initialize: function(){
		this.props = {};
	},

	exec: function(ctx){
		//
	}
});