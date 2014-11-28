/*! Graphics2D Fullscreen 1.0
 *  Author: Keyten aka Dmitriy Miroshnichenko
 *  License: MIT / LGPL
 */
(function(window, $, undefined){

	$.resizeCanvasByBody = function(canvas, context){
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
		context.update();
	};

	$.Context.prototype.fullbody = function(processResize){
		var canvas = this.canvas;
		this.normalState = {
			width: canvas.width,
			height: canvas.height,
			position: canvas.style.position,
			top: canvas.style.top,
			left: canvas.style.left
		};
		canvas.style.position = 'absolute';
		canvas.style.top = 0;
		canvas.style.left = 0;
		$.resizeCanvasByBody(canvas, this);

		if(processResize !== false){
			this.resizeListener = function(){ $.resizeCanvasByBody(canvas, this); }.bind(this);
			window.addEventListener('resize', this.resizeListener);
		}
	};

	$.Context.prototype.fullscreen = function(hideMouse){
		// todo: fullscreen
		this.fullbody();

		if(hideMouse === true){ // hideCursor!
			this.normalState.cursor = this.canvas.style.cursor;
			this.canvas.style.cursor = 'none';
		}
	};

	$.Context.prototype.unfull = function(){
		var canvas = this.canvas,
			state = this.normalState;
		canvas.style.position = state.position;
		canvas.style.top = state.top;
		canvas.style.left = state.left;
		canvas.width = state.width;
		canvas.height = state.height;
		if(state.cursor !== undefined){
			canvas.style.cursor = state.cursor;
		}
		this.update();

		if(this.resizeListener)
			window.removeEventListener('resize', this.resizeListener);

		this.normalState = this.resizeListener = null;
	};

})(window, Graphics2D);