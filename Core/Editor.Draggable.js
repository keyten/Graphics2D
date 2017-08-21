/* Interface:
 - rect.editor('transform');
 - rect.editor('transform', command); // <- command = enable / disable / rotate / freeze / destroy / etc
 - rect.editor('transform', properties); // sets attrs
 */
extend(Drawable.prototype, {
	editor: function(kind, value, params){
		if(!value){
			value = 'enable';
		}

		if(!Delta.editors[kind]){
			throw 'There\'s no ' + kind + ' editor';
		}

		if(value + '' === value){
			return Delta.editors[kind][value](this, params) || this;
		}
	}
});

Delta.editors = {};

// draggable
Delta.editors.draggable = {
	defaultProps: {
		axis: 'both',
		inBounds: null,
		cursor: null,
		cursorAt: null,
		moveWith: [],
		delay: 100,
		distance: 5,
		grid: null,
		helper: null,
		helperOpacity: null,
		snap: false,
		snapMode: 'both',
		snapTolerance: 20,
		stack: [],
		stackReturnZ: false,
		zIndex: null
	},

	enable: function(object){
		var bounds;
		var coords;

		object.on('mousedown', function(e){
			bounds = this.bounds();
			coords = [
				e.contextX - bounds.x,
				e.contextY - bounds.y
			];
		});

		window.addEventListener('mouseup', function(){
			bounds = coords = null;
		});

		window.addEventListener('mousemove', function(e){
			if(!coords){
				return;
			}

			var contextCoords = object.context.contextCoords(e.clientX, e.clientY);
			object.attr('translate', [
				contextCoords[0] - bounds.x,
				contextCoords[1] - bounds.y
			]);
		});
	},

	disable: function(object){
		;
	},

	destroy: function(object){
		;
	}
};
