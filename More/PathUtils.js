//# Path Utils

extend(Path.prototype, {

	curveAt: function(t){
		var lengths = [],
			i = 0,
			currentLength,
			totalLength = 0;

		for(; i < this._curves.length; i++){
			if(this._curves[i].length){
				currentLength = this._curves[i].length(detail);
				totalLength += currentLength;
				lengths.push( currentLength );
			}
		}

		totalLength *= t;
		currentLength = 0;

		for(i = 0; i < this._curves.length; i++){
			if(this._curves[i].length){
				currentLength += this._curves[i].length(detail);
				if(currentLength <= totalLength)
					return this._curves[i];
			}
		}
	},

	pointAt: function(t, detail){

		return totalLength * t;
	},

	length: function(detail){
		var totalLength = 0,
			i = 0;
		for(; i < this._curves.length; i++){
			if(this._curves[i].length)
				totalLength += this._curves[i].length(detail);
		}
		return totalLength;
	}

});