/* A part of DeltaJS More */

var config = {

	pointColor: 'red',
	pointOpacity: 0.5,
	pointRadius: 5,
	pointStroke: null,

	lineStroke: 'black 1px',

	pathFill: null,
	pathStroke: 'blue 1px'

};

Context.prototype.control = function(){
	var type = arguments[0],
		object;

	if(type === 'point'){
		object = ControlPoint;
	} else if(type === 'line'){
		object = ControlLine;
	} else if(type === 'mirror'){
		object = ControlMirror;
	} else if(type === 'path'){
		object = ControlPath;
	}

	return this.push(new object(Array.prototype.slice.call(arguments, 1), this));
};

ControlPoint = new Class(Drawable, {
	initialize: function(args, context){
		this.super('initialize', arguments);

		this.attrs.cx = args[0];
		this.attrs.cy = args[1];
		this.attrs.radius = config.pointRadius;

		if(config.pointOpacity){
			this.styles.globalAlpha = config.pointOpacity;
		}
		if(config.pointColor){
			this.styles.fillStyle = config.pointColor;
		}
		if(config.pointStroke){
			Drawable.processStroke(config.pointStroke, this.styles);
		}

		this.context = context;
		this.addListeners();
	},

	_isDragged: false,

	addListeners: function(){
		this.on('mousedown', function(){
			this._isDragged = true;
		});

		this.context
			.on('mouseup', function(e){
				if(this._isDragged){
					this._isDragged = false;
					this.fire('dragend', e);
				}
			}.bind(this))
			.on('mousemove', function(e){
				if(this._isDragged){
					this.attr({
						cx: e.contextX,
						cy: e.contextY
					});
					this.fire('drag', e);
				}
			}.bind(this));
	},

	attrHooks: Circle.prototype.attrHooks,

	draw: Circle.prototype.draw,

	isPointIn: Circle.prototype.isPointIn
});

ControlLine = new Class(Drawable, {
	initialize: function(args, context){
		this.super('initialize', arguments);

		this.startPoint = context.control('point', args[0], args[1]);
		this.endPoint = context.control('point', args[2], args[3]);
		this.line = context.line(args[0], args[1], args[2], args[3], config.lineStroke);

		this.context = context;
		this.addListeners();
	},

	attrHooks: {
		interaction: {
			set: function(value){
				this.startPoint.attr('interaction', value);
				this.endPoint.attr('interaction', value);
				this.line.attr('interaction', value);
			}
		}
	},

	addListeners: function(){
		this.line.attr('interaction', false);

		this.startPoint.on('drag', function(e){
			this.line.part(0).attr({
				x: e.contextX,
				y: e.contextY
			});
			this.fire('dragStart', e);
		}.bind(this));

		this.endPoint.on('drag', function(e){
			this.line.part(1).attr({
				x: e.contextX,
				y: e.contextY
			});
			this.fire('dragEnd', e);
		}.bind(this));
	},

	draw: function(){}
});

ControlMirror = new Class(Drawable, {
	initialize: function(args, context){
		this.super('initialize', arguments);

		this.middlePoint = context.control('point', args[0], args[1]);
		this.point1 = context.control('point', args[2], args[3]);
		this.point2 = context.control('point', args[0] * 2 - args[2], args[1] * 2 - args[3]);
		this.line = context.line(args[2], args[3], args[0] * 2 - args[2], args[1] * 2 - args[3], config.lineStroke);

		this._middleX = this.middlePoint.attr('cx');
		this._middleY = this.middlePoint.attr('cy');

		this.context = context;
		this.addListeners();
	},

	attrHooks: {
		interaction: {
			set: function(value){
				this.middlePoint.attr('interaction', value);
				this.point1.attr('interaction', value);
				this.point2.attr('interaction', value);
				this.line.attr('interaction', value);
			}
		}
	},

	setPoint: function(point, x, y, fireEvent){
		if(point === 'middle'){
			var dx = x - this._middleX,
				dy = y - this._middleY;

			this._middleX = x;
			this._middleY = y;

			this.point1.attr({
				cx: this.point1.attr('cx') + dx,
				cy: this.point1.attr('cy') + dy
			});
			this.point2.attr({
				cx: this.point2.attr('cx') + dx,
				cy: this.point2.attr('cy') + dy
			});
		} else {
			var other = point === 1 ? this.point2 : this.point1;

			other.attr({
				cx: this.middlePoint.attr('cx') * 2 - x,
				cy: this.middlePoint.attr('cy') * 2 - y
			});
		}

		this.line.part(0).attr({
			x: this.point2.attr('cx'),
			y: this.point2.attr('cy')
		});

		this.line.part(1).attr({
			x: this.point1.attr('cx'),
			y: this.point1.attr('cy')
		});

		if(fireEvent){
			this.fire('drag' + (point === 'middle' ? 'Middle' : point), {
				contextX: x,
				contextY: y
			});
		}
	},

	addListeners: function(){
		this.line.attr('interaction', false);

		this.point1.on('drag', function(e){
			this.setPoint(1, e.contextX, e.contextY, false);
			this.fire('drag1', e);
		}.bind(this));

		this.point2.on('drag', function(e){
			this.setPoint(2, e.contextX, e.contextY, false);
			this.fire('drag2', e);
		}.bind(this));

		this.middlePoint.on('drag', function(e){
			this.setPoint('middle', e.contextX, e.contextY, false);
			this.fire('dragMiddle', e);
		}.bind(this));
	},

	draw: function(){}
});

ControlPath = new Class(Drawable, {
	initialize: function(args, context){
		this.super('initialize', arguments);

		this.controls = [];
		this.path = context.path(args[0].attrs.d, config.pathFill, config.pathStroke);
		this.buildPath(args[0].attrs.d);
	},

	buildPath: function(d){
		d.forEach(function(part){
			/* switch(){
				case 'lineTo': {
					;
				} break;
			} */
		});
	},

	draw: function(){}
});
