Context.prototype.toSVG = function(format, quickCalls){

	;

};

Drawable.prototype.toSVGGetStyle = function(){
	var result = [];

	// fill
	if(this.styles.fillStyle){
		// todo: gradients

		if(this.styles.fillStyle + '' === this.styles.fillStyle){
			result.push('fill="rgba(' + Delta.color(this.styles.fillStyle).join(',') + ')"');
		}
	} else {
		result.push('fill="transparent"');
	}

	console.log(this.styles);
	if(this.styles.strokeStyle){
		// todo: gradients

		if(this.styles.strokeStyle + '' === this.styles.strokeStyle){
			result.push('stroke="rgba(' + Delta.color(this.styles.strokeStyle).join(',') + ')"');
		}

		var lineWidth = this.styles.lineWidth;
		if(lineWidth === undefined){
			lineWidth = 1;
		}
		result.push('stroke-width="' + lineWidth + '"');
	}

	// stroke

	return ' ' + result.join(' ');
};

Rect.prototype.toSVG = function(quickCalls, svgContext){
	// svgContext.style.push(...)
	// svgContext.head.push(...)
	// для фильтров и етс
	return (
		'<rect x="' + this.attrs.x + '" y="' + this.attrs.y +
		'" width="' + this.attrs.width + '" height="' + this.attrs.height + '"' +
		this.toSVGGetStyle() + '/>'
	);
};