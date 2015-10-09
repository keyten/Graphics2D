var shadowProps = {
	x: 'shadowOffsetX',
	y: 'shadowOffsetY',
	color: 'shadowColor',
	blur: 'shadowBlur'
};

// for objects with style
Style = new Class({

	initialize: function(){
		this.styles = {};
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
			return this.styles[name];
		if(value === null)
			delete this.styles[name];
		else
			this.styles[name] = value;
		return this.update();
	},

	fill: function(value){
		if(isObject(value) && value.colors){
			value = new Gradient(fill, null, null, null, this.context);
		}
		else if(isPatternLike(value)){
			value = new Pattern(fill, null, this.context);
		}
		return this.style('fillStyle', value);
	},

	stroke: function(name, value){
		var styles = this.styles;
		switch(name){
			// return as object
			case undefined: {
				return {
					color: styles.strokeStyle,
					width: styles.lineWidth,
					cap: styles.lineCap,
					join: styles.lineJoin,
					dash: this._lineDash
				};
			} break;

			// return as string
			case true: {
				return [styles.strokeStyle, styles.lineWidth, styles.lineCap, styles.lineJoin, this._lineDash]
							.filter(function(n){ return n !== undefined; })
							.join(' ');
			} break;

			// delete all values
			case null: {
				delete styles.strokeStyle;
				delete styles.lineWidth;
				delete styles.lineCap;
				delete styles.lineJoin;
				delete this._lineDash;
				return this;
			} break;

			case 'width': {
				if(value !== undefined)
					value = $.distance(value);
				return this.style('lineWidth', value);
			} break;
			case 'color': { return this.style('strokeStyle', value); } break;
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
			case 'opacity': {
				var color = $.color(styles.strokeStyle);
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
							this.style(k, value[k]);
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
						styles.lineWidth = $.distance(value[l]);

					// join
					else if(value[l] === 'miter' || value[l] === 'bevel')
						styles.lineJoin = value[l];

					// cap
					else if(value[l] === 'butt' || value[l] === 'square')
						styles.lineCap = value[l];

					// dash (array)
					else if(value[l][0] === '[')
						this._lineDash = value[l].substr(1, value[l].length-2).split(',');

					// dash (name)
					else if(value[l] in $.dashes)
						this._lineDash = $.dashes[value[l]];

					// color
					else
						styles.strokeStyle = value[l];
				}

				if(opacity){
					value = $.color(styles.strokeStyle);
					value[3] = opacity;
					styles.strokeStyle = 'rgba(' + value.join(',') + ')';
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
		var styles = this.styles;
		if(isString(name)){
			// prop, val
			if(name in shadowProps){
				if(value === undefined)
					return styles[shadowProps[name]];

				if(name === 'color')
					styles[shadowProps[name]] = value;
				else
					styles[shadowProps[name]] = $.distance(value);
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
						styles[props[i]] = $.distance(value[i]);
					else
						styles.shadowColor = value[i];
				}
			}
		}
		else if(name === null){
			delete styles.shadowOffsetX;
			delete styles.shadowOffsetY;
			delete styles.shadowBlur;
			delete styles.shadowColor;
		}
		else if(name === undefined){
			return {
				x: styles.shadowOffsetX,
				y: styles.shadowOffsetY,
				blur: styles.shadowBlur,
				color: styles.shadowColor
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
		else if(c !== undefined){
			this._clip = new Rect([clip, a, b, c, null, null]);
		}
		else if(b !== undefined)
			this._clip = new Circle([clip, a, b, null, null]);
		else
			this._clip = new Path([clip, null, null]);
		// problems with path

		this._clip.context = this.context;
//		this._clip.init();
		return this.update();
	},

	toContext: function(ctx){
		for(var k in this.styles){
			if($.has(this.styles, k)){
				ctx[k] = this.styles[k];
			}
		}

		if(this.styles.fillStyle && this.styles.fillStyle.toCanvasStyle){
			ctx.fillStyle = this.styles.fillStyle.toCanvasStyle(ctx, this);
		}
		if(this.styles.strokeStyle && this.styles.strokeStyle.toCanvasStyle){
			ctx.strokeStyle = this.styles.strokeStyle.toCanvasStyle(ctx, this);
		}

		if(this._lineDash){
			if(ctx.setLineDash) // webkit
				ctx.setLineDash(this._lineDash);
			else
				ctx.mozDash = this._lineDash;
		}

		if(this._clip){
			this._clip.processPath(ctx);
			ctx.clip();
		}
	}

});

$.Style = Style;
/*
	this.style = new Style;
	extend(this, StyleMixin);
 */