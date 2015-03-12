	$.TextBlock = TextBlock = new Class(Shape, {

		initialize : function(text, font, x, y, width, fill, stroke, context){
			// text, [font], x, y, [width], [fill], [stroke]
			if(isHash(text)){
				this._text  = text.text;
				this._x     = text.x;
				this._y     = text.y;
				this._font  = this._parseFont(text.font);
				text.align
					&& (this._style.textAlign = text.align);
				this._genFont();
				this._width = text.width === undefined ? 'auto' : text.width;
				text.limit !== undefined
					&& (this._limit = text.limit);
				this._parseHash(text);
			}
			else {
			// "ABC", "10px", "20pt", "20pt", "black"

			// text, font, x, y, width
			// text, font, x, y
			// text, x, y, width
			// text, x, y
				this._text = text;
				if(!isNumber(width)){
					if(isNumber(font)){ // но ведь там может быть и просто-размер
						stroke = fill;
						fill = width;
						width = y;
						y = x;
						x = font;
						font = '10px sans-serif';
					}
					if(!isNumber(width)){
						stroke = fill;
						fill = width;
						width = 'auto';
					}
				}
				this._font = this._parseFont(font);
				this._genFont();
				this._x = x;
				this._y = y;
				this._width = width;
				this._processStyle(fill, stroke, context.context);
			}
			this._genLines();
		},

		// параметры
		text : function(v){
			if(v === undefined) return this._text;
			this._text = v;
			this._genLines();
			return this.update();
		},
		x : Text.prototype.x,
		y : Text.prototype.y,
		font : Text.prototype.font,
		_setFont : Text.prototype._setFont,
		_genFont : function(){
			var str = '',
				font = this._font;
			font.italic
				&& (str += 'italic ');
			font.bold
				&& (str += 'bold ');
			this._style.font = str + (font.size || 10) + 'px ' + (font.family || 'sans-serif');
			return this._genLines().update();
		},
		_parseFont : Text.prototype._parseFont,
		family : Text.prototype.family,
		size : Text.prototype.size,
		bold : Text.prototype.bold,
		italic : Text.prototype.italic,
		align : function(align){
			if(align === undefined)
				return this._style.textAlign;
			this._style.textAlign = align;
			var w = this.width();
			this._lines.forEach({
				'left' : function(line){ line.x = 0; },
				'center' : function(line){ line.x = w / 2; },
				'right' : function(line){ line.x = w; }
			}[align]);
			return this.update();
		},

		// block parameters
		width : function(v){
			v = this._property('width', v);
			if(v === 'auto'){ // fixme
				v = 0;
				var ctx = this.context.context;
				this._applyStyle();
				this._lines.forEach(function(line){
					v = Math.max(ctx.measureText(line.text).width, v);
				});
				ctx.restore();
				return v;
			}
			if(v === this) this._genLines().update();
			return v;
		},
		height : function(){
			return (this._lineHeight || this._font.size) * this._lines.length;
		},
		_genLines : function(){
			var text = this._text,
				lines = this._lines = [],
				size = this._lineHeight || this._font.size || 10,
				ctx = this.context.context,
				width = this._width === 'auto' ? Infinity : this._width,
				countline = 1,
				align = this._style.textAlign,
				x = (align === 'center') ? (width/2) : ((width === 'right') ? width : 0);

			this._applyStyle();

			text.split('\n').forEach(function(line){
				if(ctx.measureText(line).width > width){ // нужно ли разбивать строку на строки
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
				else
					lines.push({ text:line, x:x, y:size * countline, count:countline++ });

			});
			ctx.restore();
			return this;
		},
		lineHeight : function(height){
			if(height === undefined)
				return this._lineHeight === undefined ? this._font.size : this._lineHeight;
			if(height === false)
				height = this._font.size;
			this._lineHeight = height;
			this._lines.forEach(function(line){
				line.y = height * line.count;
			});
			return this.update();
		},
		limit : function(v){
			return this._property('value', v);
		},


		isPointIn : Text.prototype.isPointIn,
		bounds : function(){
			return new Bounds( this._x, this._y, this.width(), this.height() );
		},
		draw : function(ctx){
			var fill = this._style.fillStyle ? ctx.fillText.bind(ctx) : emptyFunc,
				stroke = this._style.strokeStyle ? ctx.strokeText.bind(ctx) : emptyFunc,
				x = this._x,
				y = this._y,
				i, l, line;

			if(!this._visible)
				return;
			this._applyStyle();

			for(i = 0, l = Math.min(this._lines.length, this._limit); i < l; i++){
				line = this._lines[i];
				fill(line.text, x + line.x, y + line.y);
				stroke(line.text, x + line.x, y + line.y);
			}

			ctx.restore();

		},

		_limit : Infinity,
		_lineHeight : null
	});
