/*
 * curve.pointAt(t)
 * curve.normalAt(t)
 * curve.tangentAt(t)
 * curve.nearestOf(x, y)
 * curve.aabb() // TODO: rename bounds to aabb, and the bounds is with angle
 * curve.bounds()
 */

// и нужно, чтоб можно было писать
//#require Geometry.Bezier

function linePointAt(x1, y1, x2, y2, t){
	return [
		(1 - t) * x1 + t * x2,
		(1 - t) * y1 + t * y2
	];
}

function quadPointAt(x1, y1, px, py, x2, y2, t){
	return [
		Math.pow(1 - t, 2) * x1 + 2 * t * (1 - t) * px + t * t * x2,
		Math.pow(1 - t, 2) * y1 + 2 * t * (1 - t) * py + t * t * y2
	];
}

function cubicPointAt(x1, y1, px1, py1, px2, py2, x2, y2, t){
	return [
		Math.pow(1 - t, 3) * x1 + 3 * t * Math.pow(1 - t, 2) * px1 + 3 * t * t * (1 - t) * px2 + t * t * t * x2,
		Math.pow(1 - t, 3) * y1 + 3 * t * Math.pow(1 - t, 2) * py1 + 3 * t * t * (1 - t) * py2 + t * t * t * y2,
	];
}

function quadToCubic(x1, y1, px, py, x2, y2){
	return [
		x1, y1,
		x1 + (2 / 3) * (px - x1),
		y1 + (2 / 3) * (px - y1),
		px + (1 / 3) * (x2 - px),
		py + (1 / 3) * (y2 - py),
		x2, y2
	];
}

function cubicSplit(curve, t, start){
	var tanOne = line(curve.x1, curve.y1, curve.p1x, curve.p1y);
	var tanBetween = line(curve.p1x, curve.p1y, curve.p2x, curve.p2y);
	var tanTwo = line(curve.p2x, curve.p2y, curve.x2, curve.y2);
	var lineOne = line(tanOne.at(t), tanBetween.at(t));
	var lineTwo = line(tanBetween.at(t), tanTwo.at(t));
	var lineBetween = line()
	if(start){
		return {
			x1: curve.x1,
			y1: curve.y1,
			//
			x2: curve.pointAt(t).x,
			y2: curve.pointAt(t).y
		};
	} else {
		;
	}
}