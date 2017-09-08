Delta.renderers['2d'] = {

	// renderer.init(g2dcontext, canvas);
	init: function(delta, canvas){
		delta.context = canvas.getContext('2d');
		delta._cache = {}; // for gradients
	},

	preRedraw: function(ctx, delta){
		ctx.save();
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
		if(delta.matrix){
			ctx.setTransform.apply(ctx, delta.matrix);
		}
	},

	preDraw: function(ctx, delta){
		ctx.save();
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		if(delta.matrix){
			ctx.setTransform.apply(ctx, delta.matrix);
		}
	},

	postDraw: function(ctx){
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

	// params is an array of curves
	drawPath: function(params, ctx, style, matrix, object){
		this.pre(ctx, style, matrix, object);
		if(params[1] || params[2]){
			ctx.translate(params[1] || 0, params[2] || 0);
		}
		ctx.beginPath();
		params[0].forEach(function(curve){
			curve.process(ctx);
		});
		this.post(ctx, style);
	},

	// params = [image, x, y]
	// params = [image, x, y, w, h]
	// params = [image, x, y, w, h, cx, cy, cw, ch]
	drawImage: function(params, ctx, style, matrix, object){
		this.pre(ctx, style, matrix, object);
		switch(params.length){
			// with size
			case 5: {
				ctx.drawImage(params[0], params[1], params[2], params[3], params[4]);
			} break;

			// with size & crop
			case 9: {
				ctx.drawImage(
					params[0],
					params[5], params[6],
					params[7], params[8],

					params[1], params[2],
					params[3], params[4]
				);
			} break;

			// without size
			default: {
				ctx.drawImage(params[0], params[1], params[2]);
			} break;
		}
		ctx.restore();
	},

	drawData: function(params, ctx, style, matrix, object){
		ctx.putImageData(params[0], params[1], params[2]);
	},

	// params = [text, x, y]
	drawTextLines: function(params, ctx, style, matrix, object){
		this.pre(ctx, style, matrix, object);
		var func;
		if(style.fillStyle && !style.strokeStyle){
			func = function(line){
				ctx.fillText(line.text, params[1], params[2] + line.y);
			};
		} else if(style.fillStyle){
			func = function(line){
				ctx.fillText(line.text, params[1], params[2] + line.y);
				ctx.strokeText(line.text, params[1], params[2] + line.y);
			};
		} else {
			func = function(line){
				ctx.strokeText(line.text, params[1], params[2] + line.y);
			};
		}
		params[0].forEach(func);
		ctx.restore();
	},

	// params = [text, x, y]
	drawText: function(params, ctx, style, matrix, object){
		this.pre(ctx, style, matrix, object);
		// lolwat
		// why did i do that
		if(style.fillStyle && !style.strokeStyle){
			ctx.fillText(params[0], params[1], params[2], params[3]);
		} else if(style.fillStyle){
			ctx.fillText(params[0], params[1], params[2]);
			ctx.strokeText(params[0], params[1], params[2]);
		} else {
			ctx.strokeText(params[0], params[1], params[2]);
		}
		ctx.restore();
	},

	makeGradient: function(delta, type, from, to, colors){
		var hash;
		if(delta.useCache){
			hash = this.hashGradient(type, from, to, colors);
			if(delta._cache[hash]){
				return delta._cache[hash];
			}
		}

		var grad;
		if(type === 'linear'){
			grad = delta.context.createLinearGradient(from[0], from[1], to[0], to[1]);
		} else {
			grad = delta.context.createRadialGradient(from[0], from[1], from[2], to[0], to[1], to[2]);
		}

		Object.keys(colors).forEach(function(offset){
			grad.addColorStop(offset, colors[offset]);
		});

		if(delta.useCache){
			delta._cache[hash] = grad;
		}

		return grad;
	},

	// with caching works in chromes worser
	hashGradient: function(type, from, to, colors){
		var hash;
		colors = JSON.stringify(colors);

		if(type === 'linear'){
			if(from[0] === to[0]){
				hash = ['ver', from[1], to[1], colors];
			} else if(from[1] === to[1]){
				hash = ['hor', from[0], to[0], colors];
			} else {
				hash = [from[0], from[1], to[0], to[1], colors];
			}
		} else {
			hash = [
				from[0], from[1], from[2],
				to[0], to[1], to[2],
				colors
			];
		}

		return hash.join(';');
	},

	pre: function(ctx, style, matrix, object){
		ctx.save();

		// styles
		Object.keys(style).forEach(function(key){
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
				// there's also available ctx.lineDashOffset
				ctx.setLineDash(style.lineDash);
			} else {
				ctx.mozDash = style.lineDash;
			}
		}

		// clip
		if(object.attrs.clip){
			if(object.attrs.clip.matrix){
				ctx.save();
				ctx.transform.apply(ctx, object.attrs.clip.matrix);
				object.attrs.clip.processPath(ctx);
				ctx.restore();
			} else {
				object.attrs.clip.processPath(ctx);
			}
			ctx.clip();
		}

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

	// text
	_currentMeasureContext: null,
	preMeasure: function(font){
		this._currentMeasureContext = getTemporaryCanvas(1, 1).getContext('2d');
		this._currentMeasureContext.save();
		this._currentMeasureContext.font = font;
	},
	measure: function(text){
		return this._currentMeasureContext.measureText(text).width;
	},
	postMeasure: function(){
		this._currentMeasureContext.restore();
		this._currentMeasureContext = null;
	}
};