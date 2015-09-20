// for objects with style
Style = new Class({

	initialize: function(){
		this.styles = {};
	},

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
					dash: styles._lineDash
				};
			} break;

			// return as string
			case true: {
				return [style.strokeStyle, style.lineWidth, style.lineCap, style.lineJoin, style._lineDash]
							.filter(function(n){ return n !== undefined; })
							.join(' ');
			} break;

			// delete all values
			case null: {
				delete styles.strokeStyle;
				delete styles.lineWidth;
				delete styles.lineCap;
				delete styles.lineJoin;
				delete styles._lineDash;
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
				if(isString(value))
					value = $.dashes[value];
				return this.style('_lineDash', value);
			} break;
			case 'opacity': {
				var color = $.color(styles.strokeStyle);
				if(value === undefined)
					return color[3];
				color[3] = value;
				return this.style('strokeStyle', 'rgba(' + color.join(',') + ')');
			} break;

			default: {
				if(isObject(name)){
					for(var k in name){
						if($.has(name, k)){
							this.style(k, name[k]);
						}
					}
					return this;
				}

				if(!isString(name))
					throw ('Can\'t parse stroke ' + name);

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
						styles.strokeStyle = $.distance(value[l]);

					// join
					else if(value[l] === 'miter' || value[l] === 'bevel')
						styles.lineJoin = value[l];

					// cap
					else if(value[l] === 'butt' || value[l] === 'square')
						styles.lineCap = value[l];

					// dash (array)
					else if(value[l][0] === '[')
						styles._lineDash = value[l].substr(1, value[l].length-2).split(',');

					// dash (name)
					else if(value[l] in $.dashes)
						styles._lineDash = $.dashes[value[l]];

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
		var styles = this.styles,
			props = {
				x: 'shadowOffsetX',
				y: 'shadowOffsetY',
				color: 'shadowColor',
				blur: 'shadowBlur'
			};
		if(isString(name)){
			// prop, val
			if(name in props){
				if(value === undefined)
					return styles[props[name]];

				if(name === 'color')
					styles[props[name]] = value;
				else
					styles[props[name]] = $.distance(value);
			}
			// css-like
			else {
				// remove spaces from color
				value = value.replace(/\,\s/g, ',');
				value = value.split(' ');

				props = ['shadowOffsetX', 'shadowOffsetY', 'shadowBlur'];

				for(var i = 0; i < value.length; i++){
					if(isNumberLike(value[i]))
						styles[props[i]] = $.distance(value[i]);
					else
						styles.shadowColor = value[i];
				}
			}
		}
	},

	clip: function(){},
	hide: function(){},
	show: function(){},

	toContext: function(ctx){
		for(var k in this.styles){
			if($.has(this.styles, k)){
				ctx[k] = this.styles[k];
			}
		}
	}

});
/*
	this.style = new Style;
	extend(this, StyleMixin);
 */