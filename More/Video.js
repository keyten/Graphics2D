var Video;

Video = new Class({
	init: function(src, x, y, w, h){

		var v = document.createElement('video');
		v.src = src;
		this._video = v;

		this._x = x;
		this._y = y;
		this._width = w;
		this._height = h;

	},

	// mixin: [RectBounds],

	draw: function(ctx){

		ctx.drawImage(this.video, this._x, this._y);

	}
});
