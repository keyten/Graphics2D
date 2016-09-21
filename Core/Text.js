Text = new Class(Shape, {

	initialize : function(args){
		// text, [font], x, y, [fill], [stroke]
		if(this.object){
			var object = this.object;
			this._text = object.text + '';
			this._x = object.x;
			this._y = object.y;
			this._font = this._parseFont(object.font || Text.font);
			if(object.baseline !== undefined)
				this.styles.textBaseline = object.baseline;
			if(object.align !== undefined)
				this.styles.textAlign = object.align;
			if(object.underline !== undefined)
				this.underline(object.underline);
			this._width = object.width;
			if(object.type === 'block'){
				this._type = object.type;
			}
			delete this.object;
		}
		else {
			// text, font, x, y, fill, stroke
			this._text = args[0] + '';
			var i = 1;
			if( !isNumberLike(args[3]) ){
				this._font = this._parseFont(Text.font);
			}
			else {
				this._font = this._parseFont(args[i++]);
			}
			this._x = args[i++];
			this._y = args[i++];

			if(args[i++])
				this.fill(args[i-1]);

			if(args[i])
				this.stroke(args[i]);
		}
		this._genFont();
	},

	_type: 'label', // label or block
	_changedText: true,
	_lineSpace: 0,

	_genLines : function(){
		if(this._type === 'label')
			return this;

		var text = this._text,
			lines = this._lines = [],
			size = this._lineHeight || this._font.size || 10,
			ctx = this.context.context,
			width = this._width || Infinity,
			countline = 1,
			align = this.styles.textAlign,
			x = (align === 'center') ? (width/2) : ((align === 'right') ? width : 0);

		ctx.save();
		this.styleToContext(ctx);

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
		this._changedText = false;
		ctx.restore();
		return this;
	},

	// options
	text : function(t){
		return this.prop('text', t);
	},
	type : function(t){
		return this.prop('type', t);
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
	font : function(font){
		if(font === true)
			return this.styles.font;
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
		switch(val){
			case undefined:
				return this._underline;

			case true: {
				this._underline = {
					color: 'auto',
					height: 'auto',
					visible: true
				};
			} break;

			case false: {
				if(this._underline)
					this._underline.visible = false;
			} break;

			default: {
				this._underline = val;
			} break;
		}
		return this.update();
	},
	width : function(w){
		if(w === undefined){
			if(this._type === 'label'){
				var ctx = this.context.context;
				ctx.save();
				this.styleToContext(ctx);
				w = ctx.measureText( this._text ).width;
				ctx.restore();
				return Math.min(w, this._width || Infinity);
			}
			else {
				if(this._width)
					return this._width;
				ctx.save();
				this.styleToContext(ctx);
				if(this._changedText)
					this._genLines();
				var max = 0;
				this._lines.forEach(function(line){
					max = Math.max( max, ctx.measureText( line.text ).width );
				});
				ctx.restore();
				return max;
			}
		}
		this._width = w;
		return this.update();
	},

	isPointIn : function(x, y){
		// transforms?
		var b = this.bounds();
		return x > b.x && y > b.y && x < b.x+b.w && y < b.y+b.h;
	},
	nativeBounds : function(){
		var align = this.styles.textAlign || 'left',
			baseline = this.styles.textBaseline || 'top',
			width = this.width(),
			size = Number(this._font.size),
			x = this._x,
			y = this._y;

		if(this._type === 'label'){
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
			return new Bounds(x, y, width, size * 1.15);
		}
		else {
			return new Bounds(x, y, width, (size + this._lineSpace) * this._lines.length);
		}
	},
	draw : function(ctx){
		if(this._visible){
			this.context.renderer.drawText(
				[this._text, this._x, this._y],
				ctx, this.styles, this.matrix, this
			);
		}
		// закомментить, не стирать
/*		if(!this._visible)
			return;
		ctx.save();
		this.styleToContext(ctx);

		if(this._type === 'label'){
		//	if(!this.styles.textBaseline)
		//		ctx.textBaseline = 'top';
			if(this._width)
				ctx.fillText(this._text, this._x, this._y, this._width);
			else
				ctx.fillText(this._text, this._x, this._y);

			if(this._underline && this._underline.visible){
				if(this._underline.color === 'auto'){
					ctx.strokeStyle = this.styles.strokeStyle || this.styles.fillStyle;
				}
				else
					ctx.strokeStyle = this._underline.color;

				drawTextLine(ctx, this._text, this._x, this._y, this._underline.height === 'auto' ? undefined : this._underline.height, this._font.size, ctx.textBaseline, 'under');
			}
		}
		else {
			if(this._changedText)
				this._genLines();

			if( this.styles.fillStyle ){
				if( this.styles.strokeStyle ){
					function drawLine(text, x, y){
						ctx.fillText(text, x, y);
						ctx.strokeText(text, x, y);
					}
				}
				else {
					function drawLine(text, x, y){
						ctx.fillText(text, x, y);
					}
				}
			}
			else if( this.style.strokeStyle ){
				function drawLine(text, x, y){
					ctx.strokeText(text, x, y);
				}
			}

			var i = 0,
				lines = this._lines,
				line,
				x = this._x,
				y = this._y;

			for(; i < lines.length; i++){
				line = lines[i];
				drawLine( line.text, x + line.x, y + line.y + this._lineSpace * i );
			}
		}
		ctx.restore(); */
	}
// TODO: mozPathText; mozTextAlongPath
// https://developer.mozilla.org/en-US/docs/Drawing_text_using_a_canvas
});

Text.font = '10px sans-serif';
Text.processStyle = true;
Text.firstObject = true; // parse the first argument if it is object

$.text = function(){
	return new Text(arguments);
};

$.fx.step.lineSpace = $.fx.step.float;

// TODO: rename to boundsParams
// empiric data
var params = {
	top: [0.1, 0.7, 1.05],
	hanging: [0, 0.5, 0.85],
	middle: [-0.5, 0, 0.5],
	alphabetic: [-0.8, -0.3, 0.2],
	ideographic: [-1, -0.5, -0.1],
	bottom: [-1, -0.5, -0.1]
};

function drawTextLine(ctx, text, x, y, lw, fontSize, baseline, type){
	var lw = lw || Math.round(fontSize / 15),
		height = Math.round(fontSize * params[baseline][type === 'over' ? 0 : type === 'through' ? 1 : 2]);

	ctx.lineWidth = lw;
	ctx.beginPath();
	ctx.moveTo(x, y + height);
	ctx.lineTo(x + ctx.measureText(text).width, y + height);
	ctx.stroke();
}