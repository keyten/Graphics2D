var defaultBaseline = 'top';

Text = new Class(Drawable, {

	initialize : function(args, context){
		this.super('initialize', arguments);

		if(isObject(args[0])){
			if(args[0].align){
				this.attrs.align = args[0].align;
				this.styles.textAlign = args[0].align;
			}

			if(args[0].baseline){
				this.attrs.baseline = args[0].baseline;
			} else {
				this.attrs.baseline = defaultBaseline;
			}

			if(args[0].breaklines !== undefined){
				this.attrs.breaklines = args[0].breaklines;
			} else {
				this.attrs.breaklines = true;
			}

			if(args[0].lineHeight !== undefined){
				this.attrs.lineHeight = args[0].lineHeight;
			} else {
				this.attrs.lineHeight = 'auto';
			}

			if(args[0].maxStringWidth !== undefined){
				this.attrs.maxStringWidth = args[0].maxStringWidth;
			} else {
				this.attrs.maxStringWidth = Infinity;
			}

			if(args[0].blockWidth !== undefined){
				this.attrs.blockWidth = args[0].blockWidth;
			} else {
				this.attrs.blockWidth = Infinity;
			}

			if(args[0].boundsMode){
				this.attrs.boundsMode = args[0].boundsMode;
			} else {
				this.attrs.boundsMode = 'inline';
			}

			if(args[0].text){
				args[0].string = args[0].text;
			}

			// todo
			// change to: this.attrs.boundsMode = args[0].boundsMode || 'inline';
			// and so on

			args = this.processObject(args[0], Text.args);
		} else {
			this.attrs.baseline = defaultBaseline;
			this.attrs.breaklines = true;
			this.attrs.lineHeight = 'auto';
			this.attrs.maxStringWidth = Infinity; // in the draw: if this.attrs.maxStringWidth < Infinity then ...
			this.attrs.blockWidth = Infinity;
			this.attrs.boundsMode = 'inline';
		}

		this.styles.textBaseline = this.attrs.baseline;

		this.attrs.string = args[0] + '';
		this.attrs.x = args[1];
		this.attrs.y = args[2];
		this.attrs.font = Text.parseFont(args[3] || Text.font);
		this.styles.font = Text.genFont(this.attrs.font);
		if(args[4]){
			this.styles.fillStyle = args[4];
		}
		if(args[5]){
			this.styles.stroke = args[5];
			Drawable.processStroke(args[5], this.styles);
		}

	},

	attrHooks: new DrawableAttrHooks({
		string: {
			set: function(value){
				this.lines = null;
				this.update();
				return value + '';
			}
		},

		x: {
			set: function(value){
				this.update();
			}
		},

		y: {
			set: function(value){
				this.update();
			}
		},

		font: {
			set: function(value){
				extend(this.attrs.font, Text.parseFont(value));
				this.styles.font = Text.genFont(this.attrs.font);
				this.update();
				return null;
			}
		},

		align: {
			get: function(){
				return this.styles.textAlign || 'left';
			},
			set: function(value){
				this.styles.textAlign = value;
				this.update();
				return null;
			}
		},

		baseline: {
			get: function(){
				return this.styles.textBaseline;
			},
			set: function(value){
				this.styles.textBaseline = value;
				this.update();
				return null;
			}
		},

		breaklines: {
			set: function(){
				this.update();
			}
		},

		lineHeight: {
			set: function(){
				this.lines = null;
				this.update();
			}
		},

		maxStringWidth: {
			set: function(){
				this.update();
			}
		},

		blockWidth: {
			set: function(){
				this.lines = null;
				this.update();
			}
		}
	}),

	lines: null,

	processLines: function(ctx){
		var text = this.attrs.string,
			lines = this.lines = [],

			height = this.attrs.lineHeight === 'auto' ? this.attrs.font.size : this.attrs.lineHeight,
			maxWidth = this.attrs.blockWidth,
			x = maxWidth * (this.styles.textAlign === 'center' ? 1/2 : this.styles.textAlign === 'right' ? 1 : 0),

			rend = this.context.renderer;

		rend.preMeasure(this.styles.font);
		text.split('\n').forEach(function(line){
			if(rend.measure(line) > maxWidth){
				var words = line.split(' '),
					curline = '',
					testline;

				for(var i = 0; i < words.length; i++){
					testline = curline + words[i] + ' ';

					if(rend.measure(testline) > maxWidth){
						lines.push({
							text: curline,
							y: height * lines.length
						});
						curline = words[i] + ' ';
					} else {
						curline = testline;
					}
				}
				lines.push({
					text: curline,
					y: height * lines.length
				});
			} else {
				lines.push({
					text: line,
					y: height * lines.length
				});
			}
		}, this);
		rend.postMeasure();
		return this;
	},

	draw : function(ctx){
		if(this.attrs.visible){
			this.context.renderer.pre(ctx, this.styles, this.matrix, this);

			if(!this.attrs.breaklines){
				var width = this.attrs.maxStringWidth < Infinity ? this.attrs.maxStringWidth : undefined;

				if(this.styles.fillStyle){
					ctx.fillText(this.attrs.string, this.attrs.x, this.attrs.y, width);
				}
				if(this.styles.strokeStyle){
					ctx.strokeText(this.attrs.string, this.attrs.x, this.attrs.y, width);
				}
			} else {
				if(!this.lines){
					this.processLines(ctx);
				}

				var x = this.attrs.x,
					y = this.attrs.y;

				if(this.styles.fillStyle && !this.styles.strokeStyle){
					this.lines.forEach(function(line){
						ctx.fillText(line.text, x, y + line.y);
					});
				} else if(this.styles.fillStyle){
					this.lines.forEach(function(line){
						ctx.fillText(line.text, x, y + line.y);
						ctx.strokeText(line.text, x, y + line.y);
					});
				} else {
					this.lines.forEach(function(line){
						ctx.strokeText(line.text, x, y + line.y);
					});
				}
			}
			ctx.restore();
		}
	},

	isPointIn : function(x, y, options){
		var point = this.isPointInBefore(x, y, options);
		x = point[0];
		y = point[1];

		var bounds = this.bounds(false);
		return x > bounds.x1 && y > bounds.y1 && x < bounds.x2 && y < bounds.y2;
	},

	measure: function(){
		var width;
		// todo: if(this.context is 2d) measure through it else make new 2d context
		if(this.attrs.breaklines){
			if(!this.lines){
				this.processLines(this.context.context);
			}

			this.context.renderer.preMeasure(this.styles.font);
			width = this.lines.reduce(function(prev, cur){
				cur = this.context.renderer.measure(cur.text);
				if(prev < cur){
					return cur;
				}
				return prev;
			}.bind(this), 0);
			this.context.renderer.postMeasure();
		} else {
			this.context.renderer.preMeasure(this.styles.font);
			width = this.context.renderer.measure(this.attrs.string);
			this.context.renderer.postMeasure();
		}
		return width;
	},

	bounds: function(transform, around){
		var bounds,
			blockX = this.attrs.x,
			blockY = this.attrs.y,
			width,
			height = this.attrs.lineHeight === 'auto' ? this.attrs.font.size : this.attrs.lineHeight;

		// text processing
		if(this.attrs.breaklines){
			width = this.attrs.blockWidth;

			if(this.attrs.boundsMode === 'inline' || !isFinite(width)){
				width = this.measure();
			}

			if(!this.lines){
				this.processLines();
			}
			height *= this.lines.length;
		} else {
			width = this.measure();
			if(this.attrs.maxStringWidth < width){
				width = this.attrs.maxStringWidth;
			}
		}

		// modifiers
		var baseline = this.styles.textBaseline,
			align = this.styles.textAlign;

		if(baseline === 'middle'){
			blockY -= this.attrs.font.size / 2;
		} else if(baseline === 'bottom' || baseline === 'ideographic'){
			blockY -= this.attrs.font.size;
		} else if(baseline === 'alphabetic'){
			blockY -= this.attrs.font.size * 0.8;
		}

		if(align === 'center'){
			blockX -= width / 2;
		} else if(align === 'right'){
			blockX -= width;
		}

		return this.super('bounds', [
			[blockX, blockY, width, height], transform, around
		]);
	}

});

Text.font = '10px sans-serif';
Text.args = ['string', 'x', 'y', 'font', 'fill', 'stroke'];

// 'Arial bold 10px' -> {family: 'Arial', size: 10, bold: true}
Text.parseFont = function(font){
	if(font + '' === font){
		var object = {
			family: ''
		};
		font.split(' ').forEach(function(part){
			if(part === 'bold'){
				object.bold = true;
			} else if(part === 'italic'){
				object.italic = true;
			} else if(reNumberLike.test(part)){
				object.size = Delta.distance(part);
			} else {
				object.family += ' ' + part;
			}
		});

		object.family = object.family.trim();
		return object;
	}
	return font;
};

// {family: 'Arial', size: 10, bold: true} -> 'bold 10px Arial'
Text.genFont = function(font){
	var string = '';
	if(font.italic){
		string += 'italic ';
	}
	if(font.bold){
		string += 'bold ';
	}
	return string + (font.size || 10) + 'px ' + (font.family || 'sans-serif');
};

Delta.text = function(){
	return new Text(arguments);
};

Delta.Text = Text;