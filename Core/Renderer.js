$.renderers['2d'] = {

	// renderer.init(g2dcontext, canvas);
	init: function(delta, canvas){
		delta.context = canvas.getContext('2d');
		delta._cache = {}; // for gradients
	},

	preRedraw: function(ctx, delta){
		ctx.save();
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
		ctx.setTransform.apply(ctx, delta.matrix);
		// todo: dont make an identical matrix each time!
		// var ident = ...
		// if(delta.matrix != ident)...
		// todo2: заменить на null, когда она там не нужна.
	},

	postRedraw: function(ctx){
		ctx.restore();
	},

	// params = [cx, cy, radius]
	drawCircle: function(params, ctx, style, matrix, object){
		this.pre(ctx, style, matrix, object);
		ctx.beginPath();
		ctx.arc(params[0], params[1], Math.abs(params[2]), 0, Math.PI * 2, true);
		this.post(ctx, style);
	},

	// params = [x, y, width, height]
	drawRect: function(params, ctx, style, matrix, object){
		this.pre(ctx, style, matrix, object);
		if(style.fillStyle){
			ctx.fillRect(params[0], params[1], params[2], params[3]);
		}
		if(style.strokeStyle){
			ctx.strokeRect(params[0], params[1], params[2], params[3]);
		}
		ctx.restore();
	},

	drawCircle: function(params, ctx, style, matrix, object){
		this.pre(ctx, style, matrix, object);
		ctx.beginPath();
		ctx.arc(params[0], params[1], params[2], 0, Math.PI * 2, true);
		if(style.fillStyle){
			ctx.fill();
		}
		if(style.strokeStyle){
			ctx.stroke();
		}
		ctx.restore();
	},

	// params is an array of curves
	drawPath: function(params, ctx, style, matrix, object){
		this.pre(ctx, style, matrix, object);
		ctx.beginPath();
		params.forEach(function(curve){
			curve.process(ctx);
		});
		this.post(ctx, style);
	},

	drawImage: function(params, ctx, style, matrix, object){
		this.pre(ctx, style, matrix, object);
		switch(params.length){
			case 5: {
				ctx.drawImage(params[0], params[1], params[2], params[3], params[4]);
			} break;

			case 9: {
				ctx.drawImage(
					params[0],
					params[1], params[2],
					params[3], params[4],
					params[5], params[6],
					params[7], params[8]
				);
			} break;

			default: {
				ctx.drawImage(params[0], params[1], params[2]);
			} break;
		}
		// we don't need stroke to image
		// this.post(ctx, style);
		ctx.restore();
	},

	drawData: function(params, ctx, style, matrix, object){
		ctx.putImageData(params[0], params[1], params[2]);
	},

	// params = [text, x, y]
	drawText: function(params, ctx, style, matrix, object){
		this.pre(ctx, style, matrix, object);
		if(style.fillStyle){
			ctx.fillText(params[0], params[1], params[2]);
		}
		if(style.strokeStyle){
			ctx.strokeText(params[0], params[1], params[2]);
		}
		ctx.restore();
	},

	pre: function(ctx, style, matrix, object){
		ctx.save();

		// styles
		Object.keys(style).forEach(function(key){
			// todo: check the performance in this case:
			// if(ctx[key] !== style[key]) ctx[key] = style[key];
			ctx[key] = style[key];
		});

		if(style.fillStyle && style.fillStyle.toCanvasStyle){
			ctx.fillStyle = style.fillStyle.toCanvasStyle(ctx, object)
		}
		if(style.strokeStyle && style.strokeStyle.toCanvasStyle){
			ctx.strokeStyle = style.strokeStyle.toCanvasStyle(ctx, object);
		}

		if(style.lineDash){
			if(ctx.setLineDash){ // webkit
				ctx.setLineDash(style.lineDash);
			} else {
				ctx.mozDash = style.lineDash;
			}
		}

		// clip
		// ...

		if(matrix){
			ctx.transform(
				matrix[0], matrix[1], matrix[2],
				matrix[3], matrix[4], matrix[5]
			);
		}
	},

	post: function(ctx, style){
		if(style.fillStyle){
			ctx.fill();
		}
		if(style.strokeStyle){
			ctx.stroke();
		}
		ctx.restore();
	},

	// gradients, patterns

};