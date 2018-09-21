var CurveLagrange = new Class(Curve, {
	initialize: function(method, attrs, path){
		this.super('initialize', arguments);
		this.attrs.detail = 30;
	},

	attrHooks: new CurveAttrHooks({
		args: {
			set: function(value){
				if(this.attrs.t && this.attrs.t.length * 2 !== value.length + 2){
					this.attrs.t = null;
				}
				this.update();
			}
		},

		// t for x / y can be divided but iam not sure its neccessary
		t: {
			get: function(){
				if(!this.attrs.t){
					var ts = [];
					var l = this.attrs.args.length / 2;
					for(var i = 0; i <= l; i++){
						ts.push(i / l);
					}
					return ts;
				}
				return this.attrs.t;
			},
			set: function(value){
				this.update();
			}
		},

		detail: {
			set: function(value){
				this.update();
			}
		}
	}),

	pointAt: function(t, start){
		if(!start){
			start = this.startAt();
		}

		if(t === 0){
			return start;
		} else if(t === 1){
			return this.endAt();
		}

		var ts = this.attr('t');
		var points = start.concat(this.attrs.args);
		var x = 0;
		var y = 0;
		for(var i = 0; i < points.length; i += 2){
			var pointIndex = i / 2;
			var basisVal = 1;
			for(var j = 0; j < ts.length; j++){
				if(j !== pointIndex){
					basisVal *= ((t - ts[j]) / (ts[pointIndex] - ts[j]));
				}
			}
			x += basisVal * points[i];
			y += basisVal * points[i + 1];
		}
		return [x, y];
	},

	endAt: function(){
		return this.attrs.args.slice(this.attrs.args.length - 2);
	},

	process: function(ctx){
		var start = this.startAt(),
			args = this.attrs.args,
			detail = this.attrs.detail;

		ctx.moveTo(start[0], start[1]);

		for(var i = 1; i <= detail; i++){
			var point = this.pointAt(i / detail);
			ctx.lineTo(point[0], point[1]);
		}
	}
});

function attrHooksProcess(attrName, i){
	CurveLagrange.prototype.attrHooks[attrName] = {
		get: function(){
			return this.attrs.args[i];
		},

		set: function(value){
			this.attrs.args[i] = value;
			this.update();
		}
	};
}

Delta.curves['lagrange'] = CurveLagrange;