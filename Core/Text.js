Text = new Class(Drawable, {

	initialize : function(args, context){
		this.super('initialize', arguments);

		if(isObject(args[0])){
			args = this.processObject(args[0], Text.args);
		}

		this.attrs.text = args[0];
		this.attrs.font = Text.parseFont(args[1] || Text.font);
		this.styles.font = Text.genFont(this.attrs.font);
		this.attrs.x = args[2];
		this.attrs.y = args[3];
		if(args[4]){
			this.styles.fillStyle = args[4];
		}
		if(args[5]){
			Drawable.processStroke(args[5], this.styles);
		}

		this.styles.textBaseline = 'top';
	},

	attrHooks: extend(Object.assign({}, Drawable.prototype.attrHooks), {
		text: {
			set: function(value){
				this.lines = null;
				this.update();
				return value;
			}
		},
		x: {
			set: function(value){
				this.update();
				return value;
			}
		},
		y: {
			set: function(value){
				this.update();
				return value;
			}
		},
		font: {
			set: function(value){
				value = Text.parseFont(value);
				this.styles.font = Text.genFont(value);
				this.update();
				return value;
			}
		}
	}),

	lines: null,

	processLines: function(){
		// todo: move to renderer api?
		// renderer.getTextWidth(text, style)
		var text = this.attrs.text,
			lines = this.lines = [],
			size = this.attrs.lineHeight || this.attrs.font.size,
			ctx = getTemporaryCanvas(1, 1).getContext('2d'),
			width = this.attrs.width || Infinity,
			countline = 1,
			align = this.styles.textAlign || 'left',
			x = align === 'center' ? width / 2 : align === 'right' ? width : 0;

		ctx.font = this.styles.font;

		text.split('\n').forEach(function(line){
			// Is the line had to be splitted?
			if(ctx.measureText(line).width > width){
				var words = line.split(' '),
					useline = '',
					testline, i, len;

				for(i = 0, len = words.length; i < len; i++){
					testline = useline + words[i] + ' ';

					if(ctx.measureText(testline).width > width){
						lines.push({ text:useline, x:x, y:size * countline, count:countline++ });
						useline = words[i] + ' ';
					}
					else {
						useline = testline;
					}
				}
				lines.push({ text:useline, x:x, y:size * countline, count:countline++ });
			}
			else {
				lines.push({ text:line, x:x, y:size * countline, count:countline++ });
			}

		});
		return this;
	},

	shapeBounds : function(){},

	draw : function(ctx){
		if(this._visible){
			if(!this.lines){
				this.processLines();
			}

			this.context.renderer.drawText(
				[this.attrs.text, this.attrs.x, this.attrs.y],
				ctx, this.styles, this.matrix, this
			);
		}
	},

	isPointIn : function(x, y){}

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
	} else {
		;
	}
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