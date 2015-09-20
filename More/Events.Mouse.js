// TODO: eventhooks in core.
// и id событий в core
// и простой парсинг параметров
$.events.keyholdon = function(){};
$.events.keyholdoff = function(){};

/*! Graphics2D Events 1.0
 *  Author: Keyten aka Dmitriy Miroshnichenko
 *  License: MIT / LGPL
 */
 /*
(function(window, $, undefined){

	var on = $.Context.prototype.on;
	$.Context.prototype.on = function(event, func, parameters){

		// keyhold event
		if(event == 'keyhold'){
			var keys = {};
			this.on('keydown', function(e){
				if(keys[e.which])
					return;
				keys[e.which] = true;
				this.fire('keyhold', e);
			});
			this.on('keyup', function(e){
				keys[e.which] = false;
			});
		}
		
		// mousedrag event
		if(event == 'mousedrag'){
			var drag = false,
				lastPoint = null,
				startPoint = null,
				listeners = [],

				min = parameters ? parameters.minDelta === undefined ? 0 : parameters.minDelta : 0,
				max = parameters ? parameters.maxDelta === undefined ? Infinity : parameters.maxDelta : Infinity;
			
			listeners[0] = function(e){
				drag = true;
				startPoint = lastPoint = [e.contextX, e.contextY];
			};
			this.on('mousedown', listeners[0]);
			
			listeners[1] = function(e){
				drag = false;
				e.startX = startPoint[0];
				e.startY = startPoint[1];
				this.fire('mousedragrelease', e); // mouseup?
			}.bind(this);
			this.on('mouseup', listeners[1]);

			listeners[2] = function(e){
				drag = false;
				e.startX = startPoint[0];
				e.startY = startPoint[1];
				this.fire('mousedragrelease', e); // mouseup?
			}.bind(this);
			// ??? 	document.body.addEventListener('mouseup', listeners[1] ); !!!
			document.body.addEventListener('mouseup', listeners[2]);
			
			listeners[3] = function(e){
				if(!drag) return;
				e.lastX = lastPoint[0];
				e.lastY = lastPoint[1];
				e.deltaX = e.contextX - e.lastX;
				e.deltaY = e.contextY - e.lastY;
				e.delta = Math.sqrt(Math.pow(e.deltaX, 2) + Math.pow(e.deltaY, 2));
				e.sdeltaX = e.contextX - startPoint[0];
				e.sdeltaY = e.contextY - startPoint[1];
				e.sdelta = Math.sqrt(Math.pow(e.sdeltaX, 2) + Math.pow(e.sdeltaY, 2));
				if(e.delta < min)
					return;
				if(e.delta > max){
					var n = e.delta / max | 0,
						stepX = e.deltaX / n,
						stepY = e.deltaY / n;
					// steps are different every time
					e.delta = max;
					for(var i = 1; i < n; i++){
						var object = Graphics2D.util.extend({}, e);
						object.contextX = e.contextX - stepX*i;
						object.contextY = e.contextY - stepY*i;
						func.call(this, object);
					}					
				}
				func.call(this, e);
				lastPoint = [e.contextX, e.contextY];
			};
			this.on('mousemove', listeners[3]);

			this._draglisteners = listeners;
			// ctx.off doesn't works
			return this;
		}

		// key property
		if(event == 'keydown' || event == 'keyup' || event == 'keypress'){
			var f = func;
			func = function(e){
				if(e.which in $.keyMap)
					e.key = $.keyMap[e.which];
				else
					e.key = String.fromCharCode(e.which);
				f.call(this, e);
			};
			f.proxy = func; // for .off
		}

		// keydown(shift+z)
		if(event.indexOf('key') > -1 && event.indexOf('(') > -1){
			// var keys = $.parseKeys(event);
			var keys = event.split('(')[1].replace(')', '').split(',');
			event = event.split('(')[0];
			var f = func;
			func = function(e){
				// Bug: breaks native browser property (!)
				if(e.which in $.keyMap)
					e.key = $.keyMap[e.which];
				else
					e.key = String.fromCharCode(e.which);

				if(keys.indexOf(e.key) &&
					(!keys.indexOf('shift') || e.shiftKey) &&
					(!keys.indexOf('alt') || e.altKey) &&
					(!keys.indexOf('ctrl') || e.ctrlKey))

					f.call(this, e);
			};
			f.proxy = func; // for .off
		}

		return on.call(this, event, func);
	};

	// TODO:
	// function to change parameters of the event ( minDelta, maxDelta, etc )

	var off = $.Context.prototype.off;
	$.Context.prototype.off = function(event, func){
		if( event === 'mousedrag' ){
			this.off( 'mousedown', this._draglisteners[0] );
			this.off( 'mouseup', this._draglisteners[1] );
			this.off( 'mousemove', this._draglisteners[3] );
			document.body.removeEventListener( 'mousedown', this._draglisteners[2] );
			return this;
		}
		return off.call( this, event, func );
	};

	$.keyMap = {
		// F keys
		112: 'F1',
		113: 'F2',
		114: 'F3',
		115: 'F4',
		116: 'F5',
		117: 'F6',
		118: 'F7',
		119: 'F8',
		120: 'F9',
		121: 'F10',
		122: 'F11',
		123: 'F12',

		// arrows
		37: 'Left',
		38: 'Top',
		39: 'Right',
		40: 'Down',

		// special keys
		27: 'Esc',
		9:  'Tab',
		13: 'Enter',
		8:  'Backspace',
		19: 'Pause',
		45: 'Insert',
		46: 'Delete',

		// scrolling
		36: 'Home',
		35: 'End',
		33: 'PageUp',
		34: 'PageDown',

		// locks
		144: 'NumLock',
		20:  'CapsLock',
		145: 'ScrollLock'
	};

})(window, Graphics2D); */

/*
	Using:
		- .on('keydown(Shift+K, 5, Delete)#anyid', func);
		- .changeEvent('anyid', 'delete', 'Shift+L');
		- .changeEvent('anyid', 'add', '8');
		- .changeEvent('anyid', 'off');
		- .changeEvent('anyid', 'on');

		- .on('mousedown(x: 0 10, y: 0 50)#anyid', func); -- coordinates on object or ctx
		- .on('mousemove(minDelta: 5, maxDelta: 8)', func);
		- .on('mousedrag', func);
		- .changeEvent('anyid', 'minDelta', 0);
 */