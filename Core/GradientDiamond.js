Gradient.types.diamond = {
	// todo: parameters like in circle (size, angle, etc)
	toCanvasStyle: function(ctx, element){
		// todo: bounds('untransformed');
		var bounds = element.bounds(),
			canvas = getTemporaryCanvas(bounds.width, bounds.height),
			context = canvas.getContext('2d'),
			w = bounds.width / 2,
			h = bounds.height / 2,
			lt = context.createLinearGradient(w, h, 0, 0),
			rt = context.createLinearGradient(w, h, w * 2, 0),
			lb = context.createLinearGradient(w, h, 0, h * 2),
			rb = context.createLinearGradient(w, h, w * 2, h * 2),
			colors = this.attrs.colors;

		// it's adaptive
		Object.keys(colors).forEach(function(offset){
			lt.addColorStop(offset, colors[offset]);
			rt.addColorStop(offset, colors[offset]);
			lb.addColorStop(offset, colors[offset]);
			rb.addColorStop(offset, colors[offset]);
		});

		context.fillStyle = lt;
		context.fillRect(0, 0, w, h);
		context.fillStyle = rt;
		context.fillRect(w, 0, w, h);
		context.fillStyle = lb;
		context.fillRect(0, h, w, h);
		context.fillStyle = rb;
		context.fillRect(w, h, w, h);

		var img = new Image;
		img.src = canvas.toDataURL('image/png');

		return ctx.createPattern(img, 'no-repeat');
		/* return this.context.renderer.makeGradient(
			this.context,
			'linear',
			element.corner(this.attrs.from),
			element.corner(this.attrs.to),
			this.attrs.colors
		); */
	}
};