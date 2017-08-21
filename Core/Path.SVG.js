// CurveUtils
extend(Curve.prototype, {
	before: function(){
		if(!this.path){
			return null;
		}

		var d = this.path.attr('d');
		var index = d.indexOf(this);

		if(index < 1){
			return null;
		}
		return d[index - 1];
	}
});

// SVG Curves
Delta.curves['moveBy'] = new Class(Curve, {
	process: function(ctx){
		var lastPoint = this.before().endAt();
		ctx.moveTo(lastPoint[0] + this.funcAttrs[0], lastPoint[1] + this.funcAttrs[1]);
	},

	endAt: function(){
		var lastPoint = this.before().endAt();
		return [lastPoint[0] + this.funcAttrs[0], lastPoint[1] + this.funcAttrs[1]];
	}
});

Delta.curves['lineBy'] = new Class(Curve, {
	process: function(ctx){
		var lastPoint = this.before().endAt();
		ctx.lineTo(lastPoint[0] + this.funcAttrs[0], lastPoint[1] + this.funcAttrs[1]);
	},

	endAt: function(){
		var lastPoint = this.before().endAt();
		return [lastPoint[0] + this.funcAttrs[0], lastPoint[1] + this.funcAttrs[1]];
	}
});

Delta.curves['quadraticCurveBy'] = new Class(Curve, {
	process: function(ctx){
		var lastPoint = this.before().endAt();
		ctx.quadraticCurveTo(
			lastPoint[0] + this.funcAttrs[0],
			lastPoint[1] + this.funcAttrs[1],
			lastPoint[0] + this.funcAttrs[2],
			lastPoint[1] + this.funcAttrs[3]
		);
	},

	endAt: function(){
		var lastPoint = this.before().endAt();
		return [
			lastPoint[0] + this.funcAttrs[0],
			lastPoint[1] + this.funcAttrs[1],
			lastPoint[0] + this.funcAttrs[2],
			lastPoint[1] + this.funcAttrs[3]
		];
	}
});

extend(Path.prototype, {
	moveBy: function(x, y){
		return this.attrs.d.push(Delta.curve('moveBy', [x, y], this));
	}
})