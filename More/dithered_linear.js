/*! Graphics2D Dithered Linear Gradient
 *  Author: Dan Gries (rectangleworld.com)
 *  Port by: Keyten aka Dmitriy Miroshnichenko
 *  Uses Floyd-Steinberg dither algorithm.
 *  License: MIT / LGPL
 */
(function(window, $, undefined){

	var nGrad = $.Gradient.prototype, // n = native
		nInit = nGrad.initialize,
		nTCS = nGrad.toCanvasStyle,
		nUpdate = nGrad.update;

	nGrad.initialize = function(type, colors, from, to, context){
		nInit.call(this, type, colors, from, to, context);
		if($.util.isHash(type) && type.dithered){
			this._dithered = !!type.dithered;
		}
		this._changed = true;
	};

	nGrad.update = function(){
		this._changed = true;
		return nUpdate.call(this);
	};
	
	nGrad.dithered = function(is){
		if(is === undefined)
			return this._dithered;
		this._dithered = !!is;
		return this.update();
	};

	nGrad.toCanvasStyle = function(ctx, element){
		if(this._dithered !== true)
			return nTCS.call(this, ctx, element);

		if(!this._changed)
			return this._cached;

		// bounds
		var bounds = element.bounds(),
			width  = bounds.width,
			height = bounds.height,

			// steps
			steps = Object.keys(this._colors).sort(),

			// buffer
			buffer = document.createElement('canvas'),
			context = buffer.getContext('2d'),
			data = context.createImageData(bounds.width, bounds.height),
			pixels = data.data,

			// special data
			vMagSquareRecip = 1 / (width*width + height*height),
			stepIndex;

		this._buffer = buffer;
		this._bufferContext = context;

		buffer.width  = width;
		buffer.height = height;


		// start / end steps
		// ...

		// create float valued gradient
		for(var i = 0, l = data.length/4; i < l; i++){
			var x = i % width,
				y = Math.floor(i / width),

				ratio = (width * x + height * y) * vMagSquareRecip;

			if(ratio < 0)
				ratio = 0;
			else if(ratio > 1)
				ratio = 1;

			// find out what two steps this is between
			if(ratio === 1)
				stepIndex = steps[steps.length-1];
			else {
				
			}
			//
		}


/*		context.save();
		context.clearRect(bounds.x, bounds.y, bounds.w, bounds.h);
		context.setTransform(1, 0, 0, 1, 0, 0);
		context.translate(center[0], center[1]);
		context.rotate(this._angle * Math.PI / 180);

		steps[0] = Number(steps[0]);

		for(var i = 0, l = steps.length-1; i < l; i++){
			steps[i+1] = Number(steps[i+1]);
			startAngle = steps[i] * 360;
			endAngle = steps[i+1] * 360;

			drawAngle(context, lineLength, startAngle, endAngle,
				$.util.color(this._colors[steps[i]]),
				$.util.color(this._colors[steps[i+1]]),
				center, this._density);
		}
		context.restore();

		var pat = ctx.createPattern(buffer, 'no-repeat');
		this._cached = pat;
		this._changed = false;
		return pat; */
	};

	function drawAngle(ctx, length, start, end, color1, color2, center, density){
		// TODO: use pixels instead of lines
		var delta = (end-start)*density,
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