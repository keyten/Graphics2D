Ellipse = new Class(Shape, {

	init : function(){
		var props = this._cx;
		if(isHash( props )){
			this._cx = props.cx || props.x || 0;
			this._cy = props.cy || props.y || 0;
			if(props.radius !== undefined){
				this._rx = this._ry = props.radius;
			} else {
				this._rx = props.rx;
				this._ry = props.ry;
			}
			if(props.kappa !== undefined)
				this._kappa = props.kappa;

			this._parseHash(props);
		} else {
			this._processStyle();
		}
	},

	_kappa : 4/3 * (Math.sqrt(2) - 1),

	// parameters
	cx : function(cx){
		return this._property('cx', cx);
	},
	cy : function(cy){
		return this._property('cy', cy);
	},
	rx : function(rx){
		return this._property('rx', rx);
	},
	ry : function(ry){
		return this._property('ry', ry);
	},
	kappa : function(kappa){
		return this._property('kappa', kappa);
	},

	bounds : function(){
		return new Bounds(this._cx - this._rx, this._cy - this._ry, this._rx * 2, this._ry * 2);
	},
	processPath : function(ctx){
		// http://stackoverflow.com/questions/2172798/how-to-draw-an-oval-in-html5-canvas/23184724#23184724
		ctx.beginPath();
		if(ctx.ellipse && this._kappa === Ellipse.kappa){
			// x, y, radiusX, radiusY, rotation, startAngle, endAngle, anticlockwise
			ctx.ellipse(this._cx, this._cy, this._rx, this._ry, 0, 0, Math.PI * 2, true);
			return;
		}

		var kappa = this._kappa,
			cx = this._cx,
			cy = this._cy,
			rx = this._rx,
			ry = this._ry,

			ox = rx * kappa,
			oy = ry * kappa;

		ctx.moveTo(cx - rx, cy);
		ctx.bezierCurveTo(cx - rx, cy - oy, cx - ox, cy - ry, cx, cy - ry);
		ctx.bezierCurveTo(cx + ox, cy - ry, cx + rx, cy - oy, cx + rx, cy);
		ctx.bezierCurveTo(cx + rx, cy + oy, cx + ox, cy + ry, cx, cy + ry);
		ctx.bezierCurveTo(cx - ox, cy + ry, cx - rx, cy + oy, cx - rx, cy);
		ctx.closePath(); // fix for a last corner with kappa=0
	}

});

Ellipse.props = [ 'cx', 'cy', 'rx', 'ry', 'fill', 'stroke' ];
Ellipse.kappa = Ellipse.prototype._kappa;

Context.prototype.ellipse = function(){
	return this.push( new Ellipse(arguments, this) );
};

$.fx.step.kappa = $.fx.step.float;

$.Ellipse = Ellipse;