/*

 - Должно быть укладывание текста в фигуру, обтекание.
 - Анимация по буквам
 - Работа с отдельными буквами (включая события)
 - isPointIn для букв
 - Text along Path конечно же! С анимируемым оффсетом.


text.attr('shapeOutside', path); // укладывание текста в фигуру (только многострочный)
text.attr('shapeInside', path); // обтекание (только многострочный)
text.attr('xProcessor', (str) => 0); // функция, возвращающая x-offset для каждой строки,
// несовместимо с shapeOutside (только многострочный)
text.attr('alongPath', path); // несовместимо с многострочным текстом
text.animate({
	'letter:x': '+=5px'.
	'letter:delay': 100 // next letter will be animated in 100 ms after previous
});

text.attr('letter-space', 10);

// тут нужно какую-то структурку данных, которая позволит легко и удобно разбивать текст на
// части с различным форматированием, чтобы не отрисовывать по отдельности каждую букву
text.letter(1).attr({
	fill: 'blue'
});

// анимировать сразу много букв
// letter работает по типу селектора аки в jquery, а не возвращает целые объекты, соотв. буквам
// и меняет сам текст, а не какие-то другие объекты
text.letter([1, 2, 3, 4]).animate({
	x: '-=10px'
});

 */

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