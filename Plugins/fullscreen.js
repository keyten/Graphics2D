/*! Graphics2D Fullscreen 1.0
 *  Author: Keyten aka Dmitriy Miroshnichenko
 *  License: MIT / LGPL
 */
(function(window, $, undefined){

	$.enterFullScreen = Element.prototype.requestFullScreen     ||
	                    Element.prototype.mozRequestFullscreen    ||
	                    Element.prototype.webkitRequestFullscreen ||
	                    Element.prototype.msRequestFullscreen     ||
	                    isNotSupported;

	$.exitFullScreen = (document.exitFullScreen      ||
	                   document.mozCancelFullScreen  ||
	                   document.webkitExitFullscreen ||
	                   document.msExitFullscreen     ||
	                   isNotSupported).bind(document);

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
		// todo: polyfill?
		$.enterFullScreen.call(this.canvas);
		this.resizeListener = function(){ $.resizeCanvasByBody(canvas, this); }.bind(this);
		window.addEventListener('resize', this.resizeListener);

		if(hideMouse === true){ // hideCursor!
			this.normalState.cursor = this.canvas.style.cursor;
			this.canvas.style.cursor = 'none';
		}
	};

	$.Context.prototype.exitfull = function(){
		if(document.fullScreen)
			$.exitFullScreen();

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

	function isNotSupported(){
		if(window.console)
			window.console.log("Fullscreen API isn't supported.");
	}

})(window, Graphics2D);