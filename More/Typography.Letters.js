var TextImproved = new Class(Text, {

	_letterSpace: 0,
	_wordSpace: 0,

	draw: function(ctx){
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

});

TextImproved.props = Text.props;

Text.prototype.improve = function(){
	$.extend(this, TextImproved.prototype);
	return this;
};

Context.prototype.textImproved = function(){
	return this.push( new TextImproved(arguments, this) );
};

/* var textNativeDraw = Text.prototype.draw;
$.extend(Text.prototype, {
	
	_letterSpace: 0,
	letterSpace: function(space){
		return this.prop('letterSpace', space);
	},

	letter: function(index, style){
		if(style){
			if(!this._letterStyle)
				this._letterStyle = {};
			if(!this._letterStyle[index])
				this._letterStyle[index] = {};
			$.extend(this._letterStyle[index], style);
			this.update();
		}
		return this._letterStyle[index];
	},

	draw: function(ctx){
		if(this._letterSpace === 0 && this._letterStyle == null){
			return textNativeDraw.call(this, ctx);
		}

		if(!this._visible)
			return;
		this._applyStyle();

		var x = this._x,
			y = this._y,
			i = 0,
			l = this._lines.length,
			draw = emptyFunc,
			line,
			j,
			letterX,
			style;

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

		for(; i < l; i++){
			line = this._lines[i];
			letterX = 0;
			for(j = 0; j < line.text.length; j++){
				draw.call(ctx, line.text[j], x + line.x + letterX, y + line.y + this._lineSpace * i);
				letterX += ctx.measureText(line.text[j]).width + this._letterSpace;
			}
		}
	}

});

$.fx.step.letterSpace = $.fx.step.float;
/*
	- letterSpace.
	- letter.

*/