extend(Context.prototype.eventsHooks, {
	// TODO: touch support
	mousedrag: function(){
		var self = this,

			startX = null,
			startY = null,
			startObject = null,
			lastX = null,
			lastY = null;

		this.on('mousedown', function(e){
			startX = e.contextX;
			startY = e.contextY;
			startObject = e.targetObject;
		});

		window.addEventListener('mouseup', function(e){
			if(lastX === null){
				return;
			}

			processEventObject(e, 'mousedragend');

			startX = null;
			startY = null;
		});

		window.addEventListener('mousemove', function(e){
			if(startX === null){
				return;
			}

			processEventObject(e, 'mousedrag');

			lastX = e.contextX;
			lastY = e.contextY;
		});

		function processEventObject(e, eventName){
			var propagation = true;

			e.cancelContextPropagation = function(){
				propagation = false;
			};
			e.lastX = lastX;
			e.lastY = lastY;
			e.startX = startX;
			e.startY = startY;
			e.startObject = startObject;

			// but we do not yet have contextX
			// e.deltaX = lastX - e.contextX;

			// adds contextX, contextY, targetObject
			// calls the event on the targetObject
			self._processPointParams(e, eventName, e);

			if(propagation && !self.fire(eventName, e)){
				e.stopPropagation();
				e.preventDefault();
			}
		}
	}
});

Context.prototype.eventsHooks.mousedragend = Context.prototype.eventsHooks.mousedrag;