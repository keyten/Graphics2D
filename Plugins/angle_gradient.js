/*! Graphics2D Angle Gradient
 *  Author: Keyten aka Dmitriy Miroshnichenko
 *  License: MIT / LGPL
 */
(function(window, $, undefined){

	var nGrad = $.Gradient.prototype, // n = native
		nInit = nGrad.initialize,
		nCenter = nGrad.center,
		nTCS = nGrad.toCanvasStyle,
		nUpdate = nGrad.update;

	nGrad.initialize = function(type, colors, from, to, context){
		if(($.util.isString(type) && type != 'angle') || type.type != 'angle'){
			nInit.call(this, type, colors, from, to, context);
		}
		else {
			this._type = 'angle';
			this._center = type.center || from || 'center';
			this._angle = type.angle || to || 0;
			this._colors = ($.util.isArray(type.colors) || $.util.isArray(colors)) ? this._parseColors(type.colors || colors) : type.colors || colors;

			this._changed = true;
			this.context = context;
		}
	};

	nGrad.update = function(){
		this._changed = true;
		return nUpdate.call(this);
	};
	
	nGrad.center = function(x, y){
		if(this._type !== 'angle')
			return nCenter.call(this, x, y);
		if(x === undefined)
			return this._center;
		if($.util.isArray(x))
			this._center = x;
		else
			this._center = [x, y];
		return this.update();
	};

	nGrad.angle = function(angle){
		if(this._type !== 'angle')
			return;
		if(angle === undefined)
			return this._angle;
		this._angle = angle;
		return this.update();
	};

	nGrad.toCanvasStyle = function(ctx, element){
		if(this._type !== 'angle')
			return nTCS.call(this, ctx, element);

		if(!this._changed)
			return this._cached;

		// draw the gradient
		var bounds = element.bounds(),
			center = $.util.corner(this._center, bounds),
			lineLength = Math.sqrt(Math.pow(bounds.h,2) + Math.pow(bounds.w,2)) / 2,

			steps = Object.keys(this._colors).sort(),
			startAngle, endAngle,

			width = ctx.canvas.width,
			height = ctx.canvas.height;

		// texture sizes
		ctx.canvas.width = bounds.x2;
		ctx.canvas.height = bounds.y2;

		// drawing
		ctx.save();
		ctx.clearRect(bounds.x, bounds.y, bounds.w, bounds.h);
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.translate(center[0], center[1]);
		ctx.rotate(this._angle * Math.PI / 180);

		steps[0] = Number(steps[0]);

		for(var i = 0, l = steps.length-1; i < l; i++){
			steps[i+1] = Number(steps[i+1]);
			startAngle = steps[i] * 360;
			endAngle = steps[i+1] * 360;

			drawAngle(ctx, lineLength, startAngle, endAngle,
				$.util.color(this._colors[steps[i]]),
				$.util.color(this._colors[steps[i+1]]), center);
		}
		ctx.restore();

		var pat = ctx.createPattern(ctx.canvas, 'no-repeat');
		ctx.canvas.width = width;
		ctx.canvas.height = height;
		this._cached = pat;
		this._changed = false;
		element.context.__update(); // TODO: use a new canvas instead of current
		return pat;
	};

	function drawAngle(ctx, length, start, end, color1, color2, center){
		// TODO: use pixels instead of lines
		var density = 10,
			delta = (end-start)*density,
			step = 1 / density / 180 * Math.PI,
			i, t;
		length = -length;
		for(i = 0; i < delta; i++){
			t = i / delta;
			ctx.strokeStyle = 'rgba(' +
				Math.round(color1[0] + (color2[0]-color1[0])*t) + ',' +
				Math.round(color1[1] + (color2[1]-color1[1])*t) + ',' +
				Math.round(color1[2] + (color2[2]-color1[2])*t) + ',' +
				color1[3] + (color2[3]-color1[3]) * t +
				')';
			ctx.beginPath();
			ctx.moveTo(0, 0);
			ctx.lineTo(0, length);
			ctx.stroke();
			ctx.rotate(step);
		}
	}

	nGrad._cached = null;

})(window, Graphics2D);

// TODO: center: 'left top' -- (and same) doesn't work correct :(