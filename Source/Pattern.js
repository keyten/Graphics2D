	$.Pattern = Pattern = new Class({

		initialize : function(image, repeat, context){
			this._repeat = (!!repeat === repeat ? (repeat ? 'repeat' : 'no-repeat') : (isString(repeat) ? 'repeat-' + repeat : 'repeat'));

			if(image instanceof Image)
				this._image = image;

			else if(isString(image)){
				if(image[0] == '#')
					this._image = document.getElementById(image.substr(1));
				else
					this._image = new Image(),
					this._image.src = image;
			}
			this._image.onload = this.update.bind(this);

			this.context = context;
		},

		// параметры
		repeat : function(repeat){
			if(repeat === undefined)
				return {
					'repeat' : true,
					'no-repeat' : false,
					'repeat-x' : 'x',
					'repeat-y' : 'y'
				}[this._repeat];
			this._repeat = (!!repeat === repeat ? (repeat ? 'repeat' : 'no-repeat') : (isString(repeat) ? 'repeat-' + repeat : 'repeat'));
			return this.update();
		},

		// отрисовка
		update : Gradient.prototype.update,
		toCanvasStyle : function(context){
			return context.createPattern(this._image, this._repeat);
		}


	});
