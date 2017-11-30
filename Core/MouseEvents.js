extend(Context.prototype.eventsHooks, {
	// TODO: touch support
	mousedrag: function(){
		var self = this,

			startObject = null,
			lastX = null,
			lastY = null,
			path = null;

		this.on('mousedown', function(e){
			path = [];
			startObject = e.targetObject;
		});

		window.addEventListener('mouseup', function(e){
			if(!path){
				return;
			}

			processEventObject(e, 'mousedragend');

			startObject = null;
			lastX = null;
			lastY = null;
			path = null;
		});

		window.addEventListener('mousemove', function(e){
			if(path === null){
				return;
			}

			e = processEventObject(e, 'mousedrag');
			path.push([e.contextX, e.contextY]);

			lastX = e.contextX;
			lastY = e.contextY;
		});

		function processEventObject(e, eventName){
			e = new MouseDragEvent(e, eventName);

			var propagation = true;

			e.cancelContextPropagation = function(){
				propagation = false;
			};

			e.dragPath = path;
			e.lastX = lastX;
			e.lastY = lastY;
			if(path.length){
				e.startX = path[0][0];
				e.startY = path[0][1];
			} else {
				e.startX = lastX;
				e.startY = lastY;
			}
			e.startObject = startObject;

			// add contextX, contextY
			var coords = self.contextCoords(e.clientX, e.clientY);
			e.contextX = coords[0];
			e.contextY = coords[1];

			// add deltas
			e.deltaX = lastX ? coords[0] - lastX : 0;
			e.deltaY = lastY ? coords[1] - lastY : 0;
			e.delta = Math.sqrt(e.deltaX * e.deltaX + e.deltaY * e.deltaY);

			e.startDeltaX = coords[0] - e.startX;
			e.startDeltaY = coords[1] - e.startY;
			e.startDelta = Math.sqrt(e.startDeltaX * e.startDeltaX + e.startDeltaY * e.startDeltaY);

			var checker = function(listener){
				var options = listener.options;
				if(!options){
					return true;
				}

				if(options.max){
					if(e.delta < options.max){
						return true;
					} else {
						var coefficient = e.delta / options.max;
						var i = 1;
						var delta = e.delta;
						while(delta > options.max){
							delta -= options.max;
							var evt = MouseDragEvent.clone(e);
							evt.contextX = lastX + (e.deltaX / coefficient) * i;
							evt.contextY = lastY + (e.deltaY / coefficient) * i;
							listener.call(null, evt);
							i++;
						}
					}
				}
				//return true;
				//if(options && options.min && e.delta < options.min){
				//	return false;
				//}
				//return true;
				return false;
			};
			/* 	if(d < delta){
		return;
	} else if(d > delta){
		var coef = d / delta;
		var i = 1;
		while(d > delta){
			d -= delta;
			var k = dy/dx;
			draw(
				last[0] + (dx / coef) * i,
				last[1] + (dy / coef) * i,
				getColor(e.clientX, e.clientY)
			);
			i++;
		}
	} else draw(e.clientX, e.clientY, getColor(e.clientX, e.clientY));
 */

			// call the event on the targetObject
			e.targetObject = self.getObjectInPoint(e.contextX, e.contextY, true);
			if(e.targetObject && e.targetObject.fire){
				if(!e.targetObject.fire(eventName, e, checker)){
					event.stopPropagation();
					event.preventDefault();
				}
			}

			if(propagation && !self.fire(eventName, e, checker)){
				e.stopPropagation();
				e.preventDefault();
			}
			return e;
		}
	}
});

Context.prototype.eventsHooks.mousedragend = Context.prototype.eventsHooks.mousedrag;

function MouseDragEvent(originalEvent, eventName){
	MouseDragEvent.propsToClone.forEach(function(prop){
		this[prop] = originalEvent[prop];
	}, this);

	this.originalEvent = originalEvent;
	this.type = eventName;
}

MouseDragEvent.propsToClone = [
	'altKey', 'ctrlKey', 'shiftKey', 'metaKey',
	'button', 'buttons', 'which',
	'clientX', 'clientY', 'layerX', 'layerY', 'pageX', 'pageY',
	'screenX', 'screenY', 'movementX', 'movementY', 'x', 'y',
	'target', 'view', 'timeStamp',
	'mozInputSource', 'mozPressure'
];

MouseDragEvent.clone = function(event){
	return Delta.extend(new MouseDragEvent(event.originalEvent, event.type), event);
};

Delta.MouseDragEvent = MouseDragEvent;