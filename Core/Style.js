var shadowProps = {
	x: 'shadowOffsetX',
	y: 'shadowOffsetY',
	color: 'shadowColor',
	blur: 'shadowBlur'
};

// for objects with style
Style = new Class({

	initialize: function(updfunc){
		this.props = {};
		if(updfunc)
			this.update = updfunc;
	},

	update: function(){},

	parseFromObject: function(object){
		if($.has(object, 'opacity'))
			this.opacity(object.opacity);
		if($.has(object, 'composite'))
			this.composite(object.composite);
		if($.has(object, 'fill'))
			this.fill(object.fill);
		if($.has(object, 'stroke'))
			this.stroke(object.stroke);
		if($.has(object, 'visible'))
			this._visible = object.visible;
		if($.has(object, 'clip'))
			this.clip(object.clip);
	},

	style: function(name, value){
		if(value === undefined)
			return this.props[name];
		if(value === null)
			delete this.props[name];
		else
			this.props[name] = value;
		return this.update();
	},

	fill: function(value){
		// todo: move conditions to function (because they are used in stroke too)

		// object with gradient { type, colors, from, to, ... }
		if(isObject(value) && value.colors && !(value instanceof Gradient)){
			value = new Gradient(value, null, null, null, this.context);
		}
		// object, string or image with pattern
		else if(isPatternLike(value)){
			value = new Pattern(value, null, this.context);
		}
		// function
		else if(value instanceof Function){
			value = { toCanvasStyle: value.bind(this) };
		}
		return this.style('fillStyle', value);
	},

	stroke: function(name, value){
		var props = this.props;
		switch(name){
			// return as object
			case undefined: {
				return {
					color: props.strokeStyle,
					width: props.lineWidth,
					cap: props.lineCap,
					join: props.lineJoin,
					dash: this._lineDash
				};
			} break;

			// return as string
			case true: {
				return [props.strokeStyle, props.lineWidth, props.lineCap, props.lineJoin, this._lineDash]
							.filter(function(n){ return n !== undefined; })
							.join(' ');
			} break;

			// delete all values
			case null: {
				delete props.strokeStyle;
				delete props.lineWidth;
				delete props.lineCap;
				delete props.lineJoin;
				delete this._lineDash;
			} break;

			case 'width': {
				if(value !== undefined)
					value = $.distance(value);
				return this.style('lineWidth', value);
			} break;
			case 'color': {
				if(isObject(value) && value.colors && !(value instanceof Gradient)){
					value = new Gradient(value, null, null, null, this.context);
				}
				else if(isPatternLike(value)){
					value = new Pattern(value, null, this.context);
				}
				else if(value instanceof Function){
					value = { toCanvasStyle: value.bind(this) };
				}
				return this.style('strokeStyle', value);
			} break;
			case 'cap':   { return this.style('lineCap', value); } break;
			case 'join':  { return this.style('lineJoin', value); } break;
			case 'dash':  {
				if(value === undefined)
					return this._lineDash;
				if(value === null)
					delete this._lineDash;
				else {
					if(isString(value))
						this._lineDash = $.dashes[value];
					else
						this._lineDash = value;
				}
				return this.update();
			} break;
			case 'opacity': { // gradients / patterns support?
				var color = $.color(props.strokeStyle);
				if(value === undefined)
					return color[3];
				color[3] = value;
				return this.style('strokeStyle', 'rgba(' + color.join(',') + ')');
			} break;

			default: {
				value = name;

				if(isObject(value)){
					for(var k in value){
						if($.has(value, k)){
							this.stroke(k, value[k]);
						}
					}
					return this;
				}

				if(!isString(value))
					throw ('Can\'t parse stroke ' + value);

				// remove spaces from colors & dashes
				value = value.replace(/\,\s/g, ',');
				value = value.split(' ');

				var l = value.length,
					opacity;
				while(l--){
					// opacity
					if(reFloat.test(value[l]))
						opacity = parseFloat(value[l]);

					// width
					else if(isNumberLike(value[l]))
						props.lineWidth = $.distance(value[l]);

					// join & cap
					else if(value[l] === 'round'){ // wrong
						props.lineJoin = props.lineJoin || 'round';
						props.lineCap = props.lineCap || 'round';
					}

					// join
					else if(value[l] === 'miter' || value[l] === 'bevel')
						props.lineJoin = value[l];

					// cap
					else if(value[l] === 'butt' || value[l] === 'square')
						props.lineCap = value[l];

					// dash (array)
					else if(value[l][0] === '[')
						this._lineDash = value[l].substr(1, value[l].length-2).split(',');

					// dash (name)
					else if(value[l] in $.dashes)
						this._lineDash = $.dashes[value[l]];

					// color
					else
						props.strokeStyle = value[l];
				}

				if(opacity){
					value = $.color(props.strokeStyle);
					value[3] = opacity;
					props.strokeStyle = 'rgba(' + value.join(',') + ')';
				}
			} break;
		}
		return this.update();
	},

	opacity: function(value){
		return this.style('globalAlpha', value);
	},

	composite: function(value){
		return this.style('globalCompositeOperation', value);
	},

	shadow: function(name, value){
		var props = this.props;
		if(isString(name)){
			// prop, val
			if(name in shadowProps){
				if(value === undefined)
					return props[shadowProps[name]];

				if(name === 'color')
					props[shadowProps[name]] = value;
				else
					props[shadowProps[name]] = $.distance(value);
			}
			// css-like
			else {
				value = name;

				// remove spaces from color
				value = value.replace(/\,\s/g, ',');
				value = value.split(' ');

				var props = ['shadowOffsetX', 'shadowOffsetY', 'shadowBlur'];

				for(var i = 0; i < value.length; i++){
					if(isNumberLike(value[i]))
						props[props[i]] = $.distance(value[i]);
					else
						props.shadowColor = value[i];
				}
			}
		}
		else if(name === null){
			delete props.shadowOffsetX;
			delete props.shadowOffsetY;
			delete props.shadowBlur;
			delete props.shadowColor;
		}
		else if(name === undefined){
			return {
				x: props.shadowOffsetX,
				y: props.shadowOffsetY,
				blur: props.shadowBlur,
				color: props.shadowColor
			};
		}
		return this.update();
	},

	clip : function(clip, a, b, c){
		if(clip === undefined)
			return this._clip;
		if(clip === null)
			delete this._clip;

		if(clip.processPath)
			this._clip = clip;
		else if(c !== undefined)
			this._clip = new Rect([clip, a, b, c, null, null]);
		else if(b !== undefined)
			this._clip = new Circle([clip, a, b, null, null]);
		else
			this._clip = new Path([clip, null, null]);
		// problems with path

		this._clip.context = this.context;
//		this._clip.init(); // maybe need only if clip.context == undefined (before the last operation)
		return this.update();
	},

	hide : function(){
		return this.prop('visible', false);
	},

	show : function(){
		return this.prop('visible', true);
	},

	toContext: function(ctx){
		// replace to extend(ctx, this.props);
		for(var k in this.props){
			if($.has(this.props, k)){
				ctx[k] = this.props[k];
			}
		}

		if(this.props.fillStyle && this.props.fillStyle.toCanvasStyle){
			ctx.fillStyle = this.props.fillStyle.toCanvasStyle(ctx, this);
		}
		if(this.props.strokeStyle && this.props.strokeStyle.toCanvasStyle){
			ctx.strokeStyle = this.props.strokeStyle.toCanvasStyle(ctx, this);
		}

		if(this._lineDash){
			if(ctx.setLineDash) // webkit
				ctx.setLineDash(this._lineDash);
			else
				ctx.mozDash = this._lineDash;
		}

		if(this._clip){
			if(this._clip._matrix){
				ctx.save();
				ctx.transform.apply(ctx, this._clip._matrix);
				this._clip.processPath(ctx);
				ctx.restore();
			}
			else
				this._clip.processPath(ctx);
			ctx.clip();
		}
	}

});

$.Style = Style;