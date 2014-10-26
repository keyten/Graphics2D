/*! Graphics2D ImageAnim 1.0
 *  Author: Keyten aka Dmitriy Miroshnichenko
 *  License: MIT / LGPL
 */
(function(window, $, undefined){

	$.Context.prototype.imageanim = function(img, x, y, w, h){
		return this.push(new ImageAnim(img, x, y, w, h, this));
	};

	$.util.multiplePath = function(path){
		var array = [];
		var match = path.match(/\[(\d+)\-(\d+)\]/);
		for(var from = Number(match[1]), to = Number(match[2]); from <= to; from++)
			array.push(path.replace(/\[(\d+)\-(\d+)\]/, from));
		return array;
	}

	var ImageAnim = $.ImageAnim = $.Class($.Image, {
		__initialize__ : function(image, x, y, width, height, context){
			this._z = context.elements.length;
			this.context = context;
			this.listeners = {};
			this._style = {};
			this._frames = [];
			this._sequences = [];

			if(x === undefined){
				this._image = image.image;
				this._x = image.x;
				this._y = image.y;
				this._width = image.width;
				this._height = image.height;
				this._crop = image.crop;
				this._parseHash(image);
			}
			else {
				this._image = image;
				this._x = x;
				this._y = y;
				this._width = width;
				this._height = height;
			}

			if($.util.isString(this._image)){
				this._image = $.util.multiplePath(this._image);
			}

			var img;
			this._image.forEach(function(frame, i){
				if(!(frame instanceof Image)){
					img = new Image;
					img.src = frame;
					frame = img;
				}
				this._frames.push(frame);
			}.bind(this));

			this._image = this._frames[0];

			// image already loaded
			if(this._image.complete){
				s = this._computeSize(this._width, this._height, this._image);
				this._width = s[0];
				this._height = s[1];
			}

			this._image.onload = function(){
				this.fire('load');
				s = this._computeSize(this._width, this._height, this._image);
				this._width = s[0];
				this._height = s[1];
				this.update();
			}.bind(this);
		},
		frame : function(frame){
			if(frame === undefined)
				return this._frame;

			if(!this._frames[frame].complete)
				return this._frames[frame].addEventListener('load', function(){ this.frame(frame)}.bind(this));

			this._frame = frame;
			this._image = this._frames[frame];
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

		_frame : 0
	});

	function emptyFunc(){}

})(window, Graphics2D);