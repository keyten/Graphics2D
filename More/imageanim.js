//# ImageAnim

$.Context.prototype.imageanim = function(){
	return this.push( new ImageAnim(arguments, this) );
};

$.multiplePath = function(path){
	var array = [],
		re = /\[(\d+)\-(\d+)\]/,
		match = path.match(re),
		from = Number(match[1]),
		to = Number(match[2]);
	for(; from <= to; from++)
		array.push( path.replace(re, from) );
	return array;
};

function genSequence(length){
	var array = [];
	while(length--)
		array[length] = length;
	return array;
}

var ImageAnim = $.Class(Img, {

	init : function(){
		var props = this._image;
		this._frames = [];
		this._sequences = [];

		if(isObject(props)){
			this._image = props.image;
			this._x = props.x;
			this._y = props.y;
			this._width = props.width;
			this._height = props.height;
			this._crop = props.crop;
			this._parseHash(props);
		}

		if(isString(this._image))
			this._image = $.multiplePath(this._image);

		var image;
		this._image.forEach(function(frame){
			if( isString(frame) ){
				// other types? svg, #id?
				image = new Image();
				image.src = frame;
				frame = image;
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

		this._image.addEventListener('load', function(e){
			s = this._computeSize(this._width, this._height, this._image);
			this._width = s[0];
			this._height = s[1];
			this.update();

			this.fire('load', e);
		}.bind(this));

		this._image.addEventListener('error', function(e){
			this.fire('error', e);
		}.bind(this));
	},

	_startFrame: 0,

	frame : function(frame){
		if(frame === undefined)
			return this._frame;

		// wtf?
//		if(!this._frames[frame].complete)
//			return this._frames[frame].addEventListener('load', function(){ this.frame(frame); }.bind(this));

		this._frame = frame;
		this._image = this._frames[frame];
		this.fire('frame', {frame:frame});
		return this.update();
	},

	nextframe : function(){
		return this.frame(this._frame === this._frames.length-1 ? 0 : this._frame + 1);
	},

	prevframe : function(){
		return this.frame(this._frame === 0 ? this._frames.length-1 : this._frame - 1);
	},

	sequence : function(name, frames){
		this._sequences[name] = frames;
	},

	play : function(sequence, fps, loop, callback){
		if(isString(sequence))
			sequence = this._sequences[sequence];

		if(!sequence)
			sequence = genSequence(this._frames.length);

		if(!fps)
			fps = 60;

		if(typeof loop === 'function'){
			callback = loop;
			loop = true;
		}

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
		this._timer = null;
		return this;
	},

	toggle : function(){
		if( this._timer === null )
			this.play.apply(this, arguments);
		else
			this.stop();
		return this;
	},

	isPlaying : function(){
		return this._timer !== null;
	},

	_frame : 0
});

ImageAnim.props = [ 'image', 'x', 'y', 'width', 'height', 'crop' ];
ImageAnim.distances = [false, true, true, true, true]; // TODO: check on errors! 'auto', 'native' values?