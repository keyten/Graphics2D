Text = new Class(Drawable, {
	initialize : function(args){
		this.super('initialize', arguments);

		if(!this.attrs.baseline){
			this.styles.textBaseline = this.attrs.baseline = Text.baseline;
		}
	},
	argsOrder : ['text', 'x', 'y', 'font', 'fill', 'stroke'],

	// Context2D specific stuff:

	attrHooks : new DrawableAttrHooks({
		text : {
			set : function(value){
				this.lines = null;
				this.attrs.text = value + '';
				this.update();
			}
		},

		x : Rect.prototype.attrHooks.x,
		y : Rect.prototype.attrHooks.y,

		font : {
			get : function(){
				return this.attrs.font || Text.font;
			},
			set: function(value){
				if(value){
					this.attrs.parsedFont = Text.parseFont(value);
					this.styles.font = Text.genFont(this.attrs.parsedFont);
				} else {
					delete this.attrs.parsedFont;
					delete this.styles.font;
				}
				this.update();
			}
		},

		align : {
			get : function(){
				return this.styles.textAlign || 'left';
			},
			set : function(value){
				this.styles.textAlign = value;
				this.update();
			}
		},

		baseline : {
			get : function(){
				return this.styles.textBaseline;
			},
			set : function(value){
				this.styles.textBaseline = value;
				this.update();
			}
		},

		mode : {
			// 'string' or 'block'
			get : function(){
				return this.attrs.mode || 'string';
			},
			set : updateSetter
		},

		maxStringWidth : {
			get : function(){
				return this.attrs.maxStringWidth || Infinity;
			},
			set : function(value){
				if(value){
					this.attrs.maxStringWidth = distance(value);
				}
				this.update();
			}
		},

		trimLines : {
			get : function(){
				return this.attrs.trimLines !== false;
			},
			set : function(){
				this.lines = null;
				this.update();
			}
		},

		lineHeight : {
			get : function(){
				return this.attrs.lineHeight || 'auto';
			},
			set : function(value){
				if(value){
					this.attrs.lineHeight = distance(value);
				}
				this.lines = null;
				this.update();
			}
		},

		blockWidth : {
			get : function(){
				return this.attrs.blockWidth || Infinity;
			},
			set : function(value){
				if(value){
					this.attrs.blockWidth = distance(value);
				}
				this.lines = null;
				this.update();
			}
		}
	}),

	lines : null,

	processLines : function(ctx){
		var text = this.attrs.text,
			lines = this.lines = [],

			lineHeight = (this.attrs.lineHeight || 'auto') !== 'auto' ? this.attrs.lineHeight : (
				this.attrs.parsedFont ? this.attrs.parsedFont.size : Text.parseFont(Text.font).size
			),
			blockWidth = this.attrs.blockWidth || Infinity,
			x = blockWidth * (this.styles.textAlign === 'center' ? 1/2 : this.styles.textAlign === 'right' ? 1 : 0);

		ctx.save();
		ctx.font = this.styles.font;
		text.split('\n').forEach(function(line){
			if(ctx.measureText(line).width <= blockWidth){
				lines.push({
					text: line,
					y: lineHeight * lines.length
				});
			} else {
				var words = Delta.strParse.partition(line, Text.wordSeparators),
					curline = '',
					testline;
				for(var i = 0; i < words.length; i++){
					testline = curline + words[i];
					if(ctx.measureText(testline).width <= blockWidth){
						curline = testline;
					} else {
						lines.push({
							text: curline,
							y: lineHeight * lines.length
						});
						curline = words[i];
					}
				}
				lines.push({
					text: curline,
					y: lineHeight * lines.length
				});
			}
		});
		if(this.attrs.trimLines !== false){
			lines.forEach(function(line){
				line.text = line.text.trim();
			});
		}
		ctx.restore();
		return this;
	},

	draw : function(ctx){
		if(this.attrs.visible){
			this.preDraw(ctx);

			if(this.attrs.mode === 'block'){
				if(!this.lines){
					this.processLines(ctx);
				}

				var x = this.attrs.x,
					y = this.attrs.y;

				if(this.attrs.fill && !this.attrs.stroke){
					this.lines.forEach(function(line){
						ctx.fillText(line.text, x, y + line.y);
					});
				} else if(this.attrs.fill){
					this.lines.forEach(function(line){
						ctx.fillText(line.text, x, y + line.y);
						ctx.strokeText(line.text, x, y + line.y);
					});
				} else {
					this.lines.forEach(function(line){
						ctx.strokeText(line.text, x, y + line.y);
					});
				}
			} else {
				var width = this.attrs.maxStringWidth < Infinity ? this.attrs.maxStringWidth : undefined;

				if(this.styles.fillStyle){
					ctx.fillText(this.attrs.text, this.attrs.x, this.attrs.y, width);
				}
				if(this.styles.strokeStyle){
					ctx.strokeText(this.attrs.text, this.attrs.x, this.attrs.y, width);
				}
			}

			ctx.restore();
		}
	},

	isPointIn : function(x, y, options){
		var point = this.isPointInBefore(x, y, options);
		var bounds = this.preciseBounds(options);
		return Delta.isPointInRect(point[0], point[1], bounds.x, bounds.y, bounds.w, bounds.h);
	},

	measure : function(){
		var ctx = this.context ? this.context.context : getTemporaryCanvas(0, 0).getContext('2d');
		var width;
		ctx.save();
		ctx.font = this.styles.font;
		if(this.attrs.mode === 'block'){
			if(!this.lines){
				this.processLines(ctx);
			}

			width = this.lines.reduce(function(maxWidth, cur){
				cur = ctx.measureText(cur.text).width;
				return Math.max(cur, maxWidth);
			}, 0);
		} else {
			width = ctx.measureText(this.attrs.text).width;
		}
		ctx.restore();
		return width;
	},

	preciseBounds : function(options){
		var bounds,
			blockX = this.attrs.x,
			blockY = this.attrs.y,
			width,
			fontSize = this.attrs.parsedFont ? this.attrs.parsedFont.size : Text.parseFont(Text.font).size,
			height = (this.attrs.lineHeight || 'auto') === 'auto' ? fontSize : this.attrs.lineHeight;

		// text processing
		if(this.attrs.mode === 'block'){
			width = this.attrs.blockWidth;

			if(options.blockWidth === 'inline' || !isFinite(width)){
				width = this.measure();
			}

			if(!this.lines){
				this.processLines(this.context ? this.context.context : getTemporaryCanvas(0, 0).getContext('2d'));
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
			blockY -= fontSize / 2;
		} else if(baseline === 'bottom' || baseline === 'ideographic'){
			blockY -= fontSize;
		} else if(baseline === 'alphabetic'){
			blockY -= fontSize * 0.8;
		}

		if(align === 'center'){
			blockX -= width / 2;
		} else if(align === 'right'){
			blockX -= width;
		}

		return new Bounds(blockX, blockY, width, height);
	}

});

Text.baseline = 'top';
Text.font = '10px sans-serif';

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
				object.size = distance(part);
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
	// todo: use values from Text.font
	return string + (font.size || 10) + 'px ' + (font.family || 'sans-serif');
};

Text.wordSeparators = [' ', '-'];

Delta.text = function(){
	return new Text(arguments);
};

Delta.Text = Text;