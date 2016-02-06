Text = new Class(Shape, {

	init : function(){
		// text, [font], x, y, [fill], [stroke]
/*		var props = this._text;
		if(isObject( props )){
			this._text  = props.text;
			this._x     = props.x;
			this._y     = props.y;
			this._font  = this._parseFont(props.font || Text.font);
			if(props.baseline !== undefined)
				this._style.textBaseline = props.baseline;
			if(props.align !== undefined)
				this._style.textAlign = props.align;
			this._genFont();
			this._width = props.width;
			this._parseHash(props);
		}
		else {
			if( !isNumberLike(this._y) ){ // font isn't exist
				this._stroke = this._fill;
				this._fill = this._y;
				this._y = this._x;
				this._x = this._font;
				this._font = Text.font;
			}
			this._font = this._parseFont(this._font); // зачем каждому тексту ставить style.font, тем более стандартный? !
			this._genFont();
			this._processStyle();
		}
		this._genLines(); */
		if(this.object){
			var object = this.object;
			this._text = object.text;
			this._x = object.x;
			this._y = object.y;
			this._font = this._parseFont(object.font || Text.font);
			if(object.baseline !== undefined)
				this._style.textBaseline = object.baseline;
			if(object.align !== undefined)
				this._style.textAlign = object.align;
			this._width = object.width;
			delete this.object;
		}
		else {
			this._font = this._parseFont(this._font);
		}
		this._genFont();
	},

	_breaklines: true,
	_lineSpace: 0,

	_genLines : function(){
		var text = this._text + '',
			lines = this._lines = [],
			size = this._lineHeight || this._font.size || 10,
			ctx = this.context.context,
			width = this._width || Infinity,
			countline = 1,
			align = this._style.textAlign,
			x = (align === 'center') ? (width/2) : ((width === 'right') ? width : 0);

		this._applyStyle();

		text.split('\n').forEach(function(line){
			// Do we need split line to lines?
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
			else
				lines.push({ text:line, x:x, y:size * countline, count:countline++ });

		});
		ctx.restore();
		return this;
	},

	// options
	text : function(t){
		return this.prop('text', t);
	},
	x : function(x){
		return this.prop('x', x);
	},
	y : function(y){
		return this.prop('y', y);
	},
	lineSpace : function(s){
		return this.prop('lineSpace', s);
	},
	breaklines : function(a){
		return this.prop('breaklines', a);
	},
	font : function(font){
		if(font === true)
			return this._style.font;
		if(font === undefined)
			return this._font;
		extend(this._font, this._parseFont(font));
		return this._genFont();
	},
	_setFont : function(name, value){
		if(value === undefined)
			return this._font[name];
		this._font[name] = value;
		return this._genFont();
	},
	_genFont : function(){
		var str = '',
			font = this._font;
		if(font.italic)
			str += 'italic ';
		if(font.bold)
			str += 'bold ';
		return this.style('font', str + (font.size || 10) + 'px ' + (font.family || 'sans-serif'));
		// font.size can't be 0? unexpected behavior
	},
	_parseFont : function(font){
		if(isObject(font)){
			font.size = $.distance(font.size);
			return font;
		}

		var obj = {family:''};
		font.split(' ').forEach(function(val){
			if(val === 'bold')
				obj.bold = true;
			else if(val === 'italic')
				obj.italic = true;
			else if(/^\d+(px|pt)?/.test(val))
				obj.size = $.distance(val);
			else
				obj.family += ' ' + val;
		});
		if( (obj.family = obj.family.replace(/^\s*/, '').replace(/\s*$/, '')) === '' )
			delete obj.family;
		return obj;
	},
	family : function(f){
		return this._setFont('family', f);
	},
	size : function(s){
		return this._setFont('size', s === undefined ? undefined : $.distance(s));
	},
	bold : function(b){
		return this._setFont('bold', b === undefined ? undefined : !!b) || false;
	},
	italic : function(i){
		return this._setFont('italic', i === undefined ? undefined : !!i) || false;
	},
	align : function(a){
		return this.style('textAlign', a);
	},
	baseline : function(b){
		return this.style('textBaseline', b);
	},
	underline : function(val){
		if(val === undefined)
			return !!this._underline;
		return this.prop('underline', !!val);
	},
	width : function(w){
		if(w === undefined){
			if(!this._width){
				var ctx = this.context.context;
				this._applyStyle();
				var max = 0;
				this._lines.forEach(function(line){
					max = Math.max( max, ctx.measureText( line.text ).width );
				});
				ctx.restore();
				return max;
			} else
				return this._width;
		}
		this._width = w;
		this._genLines();
		return this.update();
	},

	// text.font('2px')

	// text.family('Arial');
	// text.size(10);
	// text.weight(true)
	// text.baseline(0)

	isPointIn : function(x, y){
		// transforms?
		var b = this.bounds();
		return x > b.x && y > b.y && x < b.x+b.w && y < b.y+b.h;
	},
	_bounds : function(){
		var align = this._style.textAlign || 'left',
			baseline = this._style.textBaseline || 'top',
			width = this.width(),
			size = Number(this._font.size),
			x = this._x,
			y = this._y;

		if(align === 'center')
			x -= width/2;
		else if(align === 'right')
			x -= width;

		if(baseline === 'middle')
			y -= size/2;
		else if(baseline === 'bottom' || baseline === 'ideographic')
			y -= size;
		else if(baseline === 'alphabetic')
			y -= size * 0.8;
		// 0.15 -- magic number (from LibCanvas? :))
		return new Bounds(x, y, width, size * (this._limit || this._lines.length) + size * 0.15);
	},
	draw : function(ctx){
		if(!this._visible)
			return;
		this._applyStyle();

		var x = this._x,
			y = this._y,
			i = 0,
			l = this._lines.length,
			draw = emptyFunc,
			underline,
			line;

		if(this._style.fillStyle){
			if(this._style.strokeStyle)
				draw = function(t, x, y){
					ctx.fillText(t, x, y);
					ctx.strokeText(t, x, y);
				};
			else
				draw = ctx.fillText;
		} else
			draw = ctx.strokeText;

		if(this._underline){
			var height = Math.round(this._font.size / 5),
				lw = Math.round(this._font.size / 15),
				oldSize = this._style.lineWidth || lw;

			ctx.strokeStyle = this._style.strokeStyle || this._style.fillStyle;
			underline = function(x, y, width){
				ctx.lineWidth = lw;
				ctx.beginPath();
				ctx.moveTo(x, y + height);
				ctx.lineTo(x + width, y + height);
				ctx.stroke();
				ctx.lineWidth = oldSize;
			};
		}

		for(; i < l; i++){
			line = this._lines[i];
			draw.call(ctx, line.text, x + line.x, y + line.y + this._lineSpace * i);
			if(underline !== undefined)
				underline(line.x + x, y + line.y + this._lineSpace * i, ctx.measureText(line.text).width);
		}

		ctx.restore();
	}
// TODO: mozPathText; mozTextAlongPath
// https://developer.mozilla.org/en-US/docs/Drawing_text_using_a_canvas
});

Text.props = [ 'text', 'font', 'x', 'y', 'fill', 'stroke' ];
Text.font = '10px sans-serif';
//Text.distances = [ false, false, true, true ];

$.text = function(){
	var text = new Text(arguments);
	text.init();
	return text;
};

$.fx.step.lineSpace = $.fx.step.float;