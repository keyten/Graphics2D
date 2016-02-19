var shadowProps = {
	x: 'shadowOffsetX',
	y: 'shadowOffsetY',
	color: 'shadowColor',
	blur: 'shadowBlur'
};

// is using in fill and stroke
function normalizeFill(value, object){
	// object with gradient { type, colors, from, to, ... }
	if(isObject(value) && value.colors && !(value instanceof Gradient)){
		value = new Gradient(value, null, null, null, object.context);
	}
	// object, string or image with pattern
	else if(isPatternLike(value)){
		value = new Pattern(value, null, object.context);
	}
	// function
	else if(value instanceof Function){
		value = { toCanvasStyle: value.bind(object) };
	}
	return value;
}

// for objects with style
Style = { prototype: {

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
		return this.style('fillStyle', normalizeFill(value, this));
	},

	// stroke() -- returns an object
	// stroke(null) -- clears the stroke
	// stroke(key) -- returns value
	// stroke(key, value) -- sets value
	// stroke(string)
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

			// delete all values
			case null: {
				delete styles.strokeStyle;
				delete styles.lineWidth;
				delete styles.lineCap;
				delete styles.lineJoin;
				delete this._lineDash;
			} break;

			case 'width': {
				if(value !== undefined)
					value = $.distance(value);
				return this.style('lineWidth', value);
			} break;
			case 'color': {
				return this.style('strokeStyle', normalizeFill(value, this));
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
						styles.lineWidth = $.distance(value[l]);

					// join & cap
					else if(value[l] === 'round'){ // wrong
						styles.lineJoin = styles.lineJoin || 'round';
						styles.lineCap = styles.lineCap || 'round';
					}

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
				value = value.replace(/\s*\,\s+/g, ',');
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
		this._visible = false;
		return this.update();
	},

	show : function(){
		this._visible = true;
		return this.update();
	},

	styleToContext: function(ctx){
		extend(ctx, this.styles);

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

}};

$.Style = Style;