var elProto = window.Element.prototype,
	prefix,
	funcName = 'requestFullScreen',
	cancName = 'cancelFullScreen',
	eventName = 'fullscreenchange',
	elementName = 'fullScreenElement',
	enabledName = 'fullScreenEnabled';

if('mozRequestFullScreen' in elProto)
	prefix = 'moz';
else if('webkitRequestFullScreen' in elProto)
	prefix = 'webkit';

if(prefix){
	funcName = camelPrefix(prefix, funcName);
	cancName = camelPrefix(prefix, cancName);
	eventName = prefix + eventName;
	elementName = camelPrefix(prefix, elementName);
	enabledName = camelPrefix(prefix, enabledName);
}

Context.prototype.fullscreen = function(resizecanvas){
	if(this.isFullscreen())
		return;

	this.canvas[funcName]();
	if(resizecanvas){
		this.normalState = {
			width: this.canvas.width,
			height: this.canvas.height
		};
		setTimeout(function(){
			this.canvas.width = window.innerWidth;
			this.canvas.height = window.innerHeight;
			this.update();
		}.bind(this), 10);

		this._resizeListener = function(e){
			if(document[elementName] === null){
				document.removeEventListener(eventName, this._resizeListener);
				this.fire('exitfull', e);
				this.canvas.width = this.normalState.width;
				this.canvas.height = this.normalState.height;
				this.normalState = null;
				this._resizeListener = null;
				this.update();
			}
		}.bind(this);
		document.addEventListener(eventName, this._resizeListener);
	}
	else {
		this._resizeListener = function(e){
			if(document[elementName] === null){
				document.removeEventListener(eventName, this._resizeListener);
				this.fire('exitfull', e);
			}
		}.bind(this);
		document.addEventListener(eventName, this._resizeListener);
	}
	this.fire('fullscreen'); // TODO: move this to the listener
};

Context.prototype.isFullscreen = function(){
	return document[elementName] === this.canvas;
};

Context.prototype.exitfull = function(){
	if(!this.isFullscreen())
		return;

	document[cancName]();
	this.fire('exitfull');
	if(this._resizeListener){
		document.removeEventListener(eventName, this._resizeListener);
		this._resizeListener = null;
	}
	if(this.normalState){
		this.canvas.width = this.normalState.width;
		this.canvas.height = this.normalState.height;
		this.normalState = null;
		this.update();
	}
};

function camelPrefix(prefix, name){
	return prefix + name[0].toUpperCase() + name.substr(1);
}

if(!prefix && !('requestFullScreen' in elProto)){
	// Fullscreen API isn't supported.
	Context.prototype.fullscreen = function(){};
	Context.prototype.isFullscreen = function(){};
	Context.prototype.exitfull = function(){};
}