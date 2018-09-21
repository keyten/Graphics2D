// Context
Context.prototype.toSVG = function(options){
	options = options || {};

	var svg = {
		root: {
			xmlns: 'http://www.w3.org/2000/svg',
			width: this.canvas.width,
			height: this.canvas.height,
			viewBox: options.viewBox || [0, 0, this.canvas.width, this.canvas.height]
		},
		elements: []
	};

	this.elements.forEach(function(element){
		if(element.toSVG){
			svg.elements.push(element.toSVG(svg));
		}
	});


	if(options.format === 'string' || !options.format){
		var svgTag = [
			'<svg',
			' xmlns="', svg.root.xmlns, '"',
			' width="', svg.root.width, '"',
			' height="', svg.root.height, '"',
			' viewBox="', svg.root.viewBox.join(' '), '"',
			'>'
		].join('');
		// <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">

		return [
			svgTag,
			svg.elements.join('\n'),
			'</svg>'
		].join('\n');
	} else if(options.format === 'config'){
		return svg;
	} else if(options.format === 'dom'){
		// var elem = document.createElement('svg');
		// elem.innerHTML = ...?
		;// dom node
	} else if(options.format === 'file'){
		// blob? dataurl?
	} else {
		throw 'Unknown SVG format "' + options.format + '"';
	}
};

// Drawable
var directSVGAttribute = function(value, name){
	return name + '="' + value + '"';
}

// градиенты должны храниться в атрибутах, зачем эта конверсия?
var styleToAttrConversion = {
	fillStyle: 'fill'
};

function rgbToHex(rgb){
	var r = rgb[0].toString(16),
		g = rgb[1].toString(16),
		b = rgb[2].toString(16);

	if(r.length === 1){
		r += r;
	}
	if(g.length === 1){
		g += g;
	}
	if(b.length === 1){
		b += b;
	}

	return '#' + r + g + b;
}

Drawable.prototype.attrHooks.fill.toSVG = function(value, name, svg){
	var fill = this.styles.fillStyle;
	if(fill){
		if(fill + '' === fill){
			fill = Delta.color(fill);
			return 'fill="' + (fill[3] === 1 ? rgbToHex(fill) : ('rgba(' + fill.join(',') + ')')) + '"';
		} else {
			// ...
			// svg.head.push({blablabla})
			// fill.toSVG()
		}
	} else {
		return 'fill="none"';
	}
};

Drawable.prototype.attrHooks.stroke.toSVG = function(value, name, svg){
	var stroke = this.styles.strokeStyle;
	if(!stroke){
		return '';
	}

	var result = '';
	if(stroke + '' === stroke){
		stroke = Delta.color(stroke);
		result = 'stroke="' + (stroke[3] === 1 ? rgbToHex(stroke) : ('rgba(' + stroke.join(',') + ')')) + '"'
	} else {
		// gradients
	}

	if(this.styles.lineWidth){
		result += ' stroke-width="' + this.styles.lineWidth + '"';
	}

	return result;
};

Drawable.prototype.toSVG = function(svg){
	if(!this.svgTagName){
		return '';
	}

	var attrs = Object.keys(this.attrs).reduce(function(result, attrName){
		if(this.attrHooks[attrName] && this.attrHooks[attrName].toSVG){
			return result + ' ' + this.attrHooks[attrName].toSVG.call(this, this.attrs[attrName], attrName, svg);
		}
		return result;
	}.bind(this), '');

	attrs = Object.keys(this.styles).reduce(function(result, attrName){
		attrName = styleToAttrConversion[attrName];
		if(attrName && this.attrHooks[attrName] && this.attrHooks[attrName].toSVG){
			return result + ' ' + this.attrHooks[attrName].toSVG.call(this, this.attrs[attrName], attrName, svg);
		}
		return result;
	}.bind(this), attrs);
	// если fill нет, то нужно поставить fill="none", иначе некоторые элементы заливаются автоматически

	return '<' + this.svgTagName + attrs + '/>';
};

// Rect
Rect.prototype.svgTagName = 'rect';

['x', 'y', 'width', 'height'].forEach(function(paramName){
	Rect.prototype.attrHooks[paramName].toSVG = directSVGAttribute;
});
/*

а теперь будет if(svgDoc.options.quickCalls)

Rect.prototype.toSVG = function(quickCalls, svgContext){
	// svgContext.style.push(...)
	// svgContext.head.push(...)
	// для фильтров и етс
	return (
		'<rect x="' + this.attrs.x + '" y="' + this.attrs.y +
		'" width="' + this.attrs.width + '" height="' + this.attrs.height + '"' +
		this.toSVGGetStyle() + '/>'
	);
}; */

// Circle
Circle.prototype.svgTagName = 'circle';

['cx', 'cy'].forEach(function(paramName){
	Circle.prototype.attrHooks[paramName].toSVG = directSVGAttribute;
});

Circle.prototype.attrHooks.radius.toSVG = function(value){
	return 'r="' + value + '"';
};


// Path
Path.prototype.svgTagName = 'path';
Path.prototype.attrHooks.d.toSVG = function(value, name, svg){
	var result = [];
	this.attrs.d.forEach(function(curve, i){
		result.push(curve.toSVG());
	}, this);
	return 'd="' + result.join(' ') + '"';
};

// Curve
Delta.curvesSVGNames = {
	moveTo: 'M',
	moveBy: 'm',
	lineTo: 'L',
	lineBy: 'l',
	horizontalLineTo: 'H',
	horizontalLineBy: 'h',
	verticalLineTo: 'V',
	verticalLineBy: 'v',
	bezierCurveTo: 'C',
	bezierCurveBy: 'c',
	shorthandCurveTo: 'S',
	shorthandCurveBy: 's',
	quadraticCurveTo: 'Q',
	quadraticCurveBy: 'q',
	shorthandQuadraticCurveTo: 'T',
	shorthandQuadraticCurveBy: 't',
	ellipticalArcTo: 'A',
	ellipticalArcBy: 'a',
	closePath: 'Z'
};

// todo: check about conversion between boolean and 1 / 0
Curve.prototype.toSVG = function(){
	return Delta.curvesSVGNames[this.method] ?
		Delta.curvesSVGNames[this.method] + this.attrs.args.join(',') :
		Curve.canvasFunctions[this.method].toSVG(this);
};

Curve.canvasFunctions.arc.toSVG = function(curve){
	// into ellipticalArcTo
};

Curve.canvasFunctions.arcTo.toSVG = function(curve){
	// into ellipticalArcTo
};

// Image
// toSVG(document){
// 	if(document.options.imagesToDataURL) <- 'all' / 'possible' (loaded not with data url but from rasterize, document Image, etc)
// }
// Text
// Gradient
// Pattern











