Text = new Class(Drawable, {

	initialize : function(args, context){
		this.super('initialize', arguments);

		if(isObject(args[0])){
			args = this.processObject(args[0], Text.args);
		}

		this.attrs.text = args[0] + '';
		this.attrs.font = Text.parseFont(args[1] || Text.font);
		this.styles.font = Text.genFont(this.attrs.font);
		this.attrs.x = args[2];
		this.attrs.y = args[3];
		if(args[4]){
			this.styles.fillStyle = args[4];
		}
		if(args[5]){
			this.attrs.stroke = args[5];
			Drawable.processStroke(args[5], this.styles);
		}

		this.attrs.breakLines = true;
		this.styles.textBaseline = 'top';
	},

	attrHooks: extend(extend({}, Drawable.prototype.attrHooks), {
		text: {
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
				return this.attrs.font;
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
		breakLines: {
			set: function(){
				this.update();
			}
		},
		width: {
			set: function(){
				this.lines = null;
				this.update();
			}
		},
		lineHeight: {
			set: function(){
				this.lines = null;
				this.update();
			}
		}
	}),

	lines: null,

	processLines: function(ctx){
		var text = this.attrs.text,
			lines = this.lines = [],

			height = this.attrs.lineHeight || this.attrs.font.size,
			maxWidth = this.attrs.width || Infinity,
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

	shapeBounds : function(){
		var align = this.styles.textAlign || 'left',
			baseline = this.styles.textBaseline,

			width = this.attrs.width,
			height = this.attrs.lineHeight || this.attrs.font.size,

			x = this.attrs.x,
			y = this.attrs.y;

		if(baseline === 'middle'){
			y -= this.attrs.font.size / 2;
		} else if(baseline === 'bottom' || baseline === 'ideographic'){
			y -= this.attrs.font.size;
		} else if(baseline === 'alphabetic'){
			y -= this.attrs.font.size * 0.8;
		}

		if(!this.attrs.breakLines){
			this.context.renderer.preMeasure(this.styles.font);
			width = this.context.renderer.measure(this.attrs.text);
			this.context.renderer.postMeasure();

			x -= width * ({
				left: 0,
				right: 1,
				center: 0.5
			})[align || 'left'];

			return [x, y, width, this.attrs.font.size * 1.15];
		} else {
			if(!this.lines){
				this.processLines();
			}

			if(!width){
				width = 0;
				this.context.renderer.preMeasure(this.styles.font);
				this.lines.forEach(function(line){
					width = Math.max(width, this.context.renderer.measure(line.text));
				}, this);
				this.context.renderer.postMeasure();
			}

			return [x, y, width, height * this.lines.length];
		}
	},

	draw : function(ctx){
		if(this._visible){
			if(!this.attrs.breakLines){
				this.context.renderer.drawTextLines(
					[[{
						text: this.attrs.text,
						y: 0
					}], this.attrs.x, this.attrs.y],
					ctx, this.styles, this.matrix, this
				);
			} else {
				if(!this.lines){
					this.processLines(ctx);
				}

				var x = this.attrs.x;
				if(this.attrs.width){
					x += this.attrs.width * ({
						left: 0,
						center: 0.5,
						right: 1
					})[this.styles.textAlign || 'left'];
				}

				this.context.renderer.drawTextLines(
					[this.lines, x, this.attrs.y],
					ctx, this.styles, this.matrix, this
				);
			}
		}
	},

	isPointIn : function(x, y){
		var bounds = this.shapeBounds();
		return x > bounds[0] && y > bounds[1] && x < bounds[0] + bounds[2] && y < bounds[1] + bounds[3];
	}

});

Text.font = '10px sans-serif';
Text.args = ['text', 'font', 'x', 'y', 'fill', 'stroke'];

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
				object.size = $.distance(part);
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

$.text = function(){
	return new Text(arguments);
};

$.Text = Text;