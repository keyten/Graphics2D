/* Interface:
 - rect.editor('transform');
 - rect.editor('transform', command); // <- command = enable / disable / rotate / freeze / destroy / etc
 - rect.editor('transform', properties); // sets attrs
 */
extend(Drawable.prototype, {
	editor: function(kind, value){
		if(!value){
			value = 'enable';
		}

		if(!Delta.editors[kind]){
			throw 'There\'s no ' + kind + ' editor';
		}

		if(value + '' === value){
			return Delta.editors[kind][value](this) || this;
		}
	}
});

Delta.editors = {};

// draggable
Delta.editors.draggable = {
	enable: function(object){
		var coords;

		object.on('mousedown', function(e){
			var bounds = this.bounds();
			coords = [
				e.contextX - bounds.x,
				e.contextY - bounds.y
			];
		});

		window.addEventListener('mousemove', function(e){
			if(!coords){
				return;
			}

			coords = [0, 0];
			var ctxCoords = object.context.contextCoords(e.clientX, e.clientY);
			var bounds = object.bounds();
			object.transform(null);
			object.translate(ctxCoords[0] + coords[0] - bounds.x, ctxCoords[1] + coords[1] - bounds.y);
		});

		window.addEventListener('mouseup', function(){
			coords = null;
		});
	},

	disable: function(object){
		;
	}
};

Delta.editors.__commonControls = {
	style: {
		radius: 5,
		color: '#0af',
		opacity: 0.3
	},

	point: function(x, y){
		return ctx.circle({
			cx: x,
			cy: y,
			radius: this.style.radius,
			fill: this.style.color,
			stroke: this.style.stroke,
			opacity: this.style.opacity
		});
	},

	border: function(x, y, width, height){
		return ctx.rect({
			x: x,
			y: y,
			width: width,
			height: height,
			stroke: this.style.color,
			opacity: this.style.opacity
		});
	}
};

Delta.editors.transform = {
	enable: function(object){
		var bounds = object.bounds();
		if(!object._editorTransform){
			var controls = this.__controls;
			var lt, lb, rt, rb, border;

			object._editorTransform = {
				border: border = controls.border(bounds.x, bounds.y, bounds.width, bounds.height),
				lt: lt = controls.point(bounds.x1, bounds.y1),
				lb: lb = controls.point(bounds.x1, bounds.y2),
				rt: rt = controls.point(bounds.x2, bounds.y1),
				rb: rb = controls.point(bounds.x2, bounds.y2)
			};

			var ltDown, lbDown, rtDown, rbDown;

			window.addEventListener('mouseup', function(){
				ltDown = lbDown = rtDown = rbDown = null;
			});

			window.addEventListener('mousemove', function(e){
				var coords = object.context.contextCoords(e.clientX, e.clientY);
				if(ltDown){
					lt.attr({
						cx: coords[0],
						cy: coords[1]
					});

					lb.attr('cx', coords[0]);
					rt.attr('cy', coords[1]);

					border.attr({
						x1: coords[0],
						y1: coords[1]
					});

					object.transform(null);
					// attr scale?
					object.scale(
						border.attr('width') / ltDown.width,
						border.attr('height') / ltDown.height,
						'rb'
					);
				} else if(lbDown){
					lb.attr({
						cx: coords[0],
						cy: coords[1]
					});

					lt.attr('cx', coords[0]);
					rb.attr('cy', coords[1]);

					border.attr({
						x1: coords[0],
						y2: coords[1]
					});

					object.transform(null);
					// attr scale?
					object.scale(
						border.attr('width') / lbDown.width,
						border.attr('height') / lbDown.height,
						'rt'
					);
				} else if(rtDown){
					;
				} else if(rbDown){
					;
				}
			});

			// todo: add and use editor.draggable
			lt.on('mousedown', function(){
				ltDown = object.bounds();
			});
			lb.on('mousedown', function(){
				lbDown = object.bounds();
			});
			rt.on('mousedown', function(){
				rtDown = object.bounds();
			});
			rb.on('mousedown', function(){
				rbDown = object.bounds();
			});

		} else {
			object._editorTransform.border.attr('visible', true);
			object._editorTransform.lt.attr('visible', true);
			object._editorTransform.lb.attr('visible', true);
			object._editorTransform.rt.attr('visible', true);
			object._editorTransform.rb.attr('visible', true);
			// fix bounds
			// the object could change
		}
	},

	disable: function(object){
		;
	},

	attr: function(name, value){
		// for rect.editor('transform', properties);
	},

	__controls: Delta.editors.__commonControls
};