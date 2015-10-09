/*! Graphics2D Sprites 1.0
 *  Author: Keyten aka Dmitriy Miroshnichenko
 *  License: MIT / LGPL
 */
(function(window, $, undefined){

	$.Context.prototype.sprite = function(img, x, y, w, h){
		return this.push(new Sprite(img, x, y, w, h, this));
	};

	var Sprite = $.Sprite = $.Class($.Image, {
		initialize : function(){
			this._frames = [];
			this._sequences = [];
			this._image.onload = function(){ this.fire('load') }.bind(this);
		},
		autoslice : function(width, height){
			if(!this._image.complete)
				return this._image.addEventListener('load', function(){ this.autoslice(width, height)}.bind(this));
			var iw = this._image.width,
				ih = this._image.height;
			for(var j = 0; j < ih; j+=height){
				for(var i = 0; i < iw; i+=width){
					this._frames.push([i, j, width, height]);
				}
			}

			var s = this._computeSize(width, height, { width:this._width, height:this._height })
			this._width = s[0];
			this._height = s[1];

			return this.update();
		},
		slice : function(frame, slice,y,w,h){
			if(typeof frame == 'object' && 0 in frame){
				$.util.extend(this._frames, frame);
				return this;
			}
			else if(slice === undefined)
				return this._frames[frame];

			if(y !== undefined)
				slice = [slice, y, w, h];

			this._frames[frame] = slice;
			return this;
		},
		frame : function(frame){
			if(frame === undefined)
				return this._frame;

			if(!this._image.complete)
				return this._image.addEventListener('load', function(){ this.frame(frame)}.bind(this));

			this._frame = frame;
			this._crop = this._frames[frame];
			this.fire('frame', {frame:frame});
			return this.update();
		},
		nextframe : function(){
			return this.frame(this._frame === this._frames.length-1 ? 0 : this._frame + 1)
		},
		prevframe : function(){
			return this.frame(this._frame === 0 ? this._frames.length-1 : this._frame - 1)
		},

		sequence : function(name, frames){
			this._sequences[name] = frames;
		},
		play : function(sequence, fps, loop, callback){
			if(this._timer)
				window.clearInterval(this._timer);

			if($.util.isString(sequence))
				sequence = this._sequences[sequence];

			if(!fps)
				fps = 60;

			if(typeof loop == 'function')
				callback = loop,
				loop = true;

			if(loop === undefined)
				loop = true;

			if(callback === undefined)
				callback = emptyFunc;

			var i = 0;
			if(fps < 0){
				i = sequence.length-1;
				this._timer = window.setInterval(function(){
					if(i === 0)
						!loop ? callback.call(this.stop()) : ((i = sequence.length-1), callback.call(this));
					this.frame(sequence[i--]);
				}.bind(this), -fps);
			}
			else {
				this._timer = window.setInterval(function(){
					if(sequence.length === i)
						!loop ? callback.call(this.stop()) : ((i = 0), callback.call(this));
					this.frame(sequence[i++]);
				}.bind(this), fps);
			}
		},
		stop : function(){
			window.clearInterval(this._timer);
			return this;
		},

		_frame : null,
	});


	function emptyFunc(){}

})(window, Graphics2D);