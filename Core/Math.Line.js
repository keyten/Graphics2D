Delta.Math.EPSILON_intersection = Number.EPSILON;

Delta.Math.Line = {
	pointAt: function(start, end, t){
		return [
			start[0] + t * (end[0] - start[0]),
			start[1] + t * (end[1] - start[1])
		];
	},

	splitAt: function(start, end, t){
		var point = Delta.Math.Line.pointAt(start, end, t);
		return {
			start: [start, point],
			end: [point, end]
		};
	},

	length: function(start, end){
		return Math.sqrt(
			Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2)
		);
	},

// why is this func?
	same: function(line1start, line1end, line2start, line2end){
		return (
			Math.abs(line1start[0] - line2start[0]) < Number.EPSILON &&
			Math.abs(line1start[1] - line2start[1]) < Number.EPSILON &&
			Math.abs(line1end[0] - line2end[0]) < Number.EPSILON &&
			Math.abs(line1end[1] - line1end[1]) < Number.EPSILON
		);
	},

	// todo: почитать Кормена про этот алгоритм
	intersection: function(line1start, line1end, line2start, line2end){
		// what if line1start == line1end or line2start == line2end ?
		// P1x + (P2x - P1x)t = Q1x + (Q2x - Q1x)v
		// P1y + (P2y - P1y)t = Q1y + (Q2y - Q1y)v

		// (P2x - P1x)t + (Q1x - Q2x)v = Q1x - P1x
		// (P2y - P1y)t + (Q1y - Q2y)v = Q1y - P1y

		var det = (line1end[0] - line1start[0]) * (line2start[1] - line2end[1]) - (line1end[1] - line1start[0]) * (line2start[0] - line2end[0]);
		if(Math.abs(det) < Delta.Math.EPSILON_intersection){
			if(line1end[0] < line2start[0] || line1start[0] > line2end[0]){
				return null;
			}

			// note: lines can intersect in 2 points ([-5,-5], [5, 5] and [-4, -4], [4, 4])
			// and what if they are same?
			;
		} else {
			var det1 = (line2start[0] - line1start[0]) * (line2start[1] - line2end[1]) - (line2start[1] - line1start[1]) * (line2start[0] - line2end[0]),
				t = det1 / det;
			// det2 = (line1end[0] - line1start[0]) * (line2start[0] - line1start[0]) - (line1end[1] - line1start[0]) * (line2start[1] - line1start[1]);
			// v = det2 / det;
			if(t >= 0 && t <= 1){
				return Delta.Math.Line.pointAt(line1start, line1end, t);
			} else {
				return null;
			}
		}
	}
};

// Curves
Curve.canvasFunctions.moveTo.pointAt = function(curve, t, startPoint){
	return curve.funcAttrs;
};

// todo: attrs instead of curve?
Curve.canvasFunctions.lineTo.pointAt = function(curve, t, startPoint){
	if(!startPoint){
		startPoint = curve.startAt();
	}
	return [
		startPoint[0] + t * (curve.funcAttrs[0] - startPoint[0]),
		startPoint[1] + t * (curve.funcAttrs[1] - startPoint[1]),
	];
};

Curve.canvasFunctions.lineTo.splitAt = function(curve, t, startPoint){
	if(!startPoint){
		startPoint = curve.startAt();
	}
	var point = Curve.canvasFunctions.lineTo.pointAt(curve, t, startPoint);
	return {
		start: [
			startPoint,
			point
		],
		end: [
			point,
			[curve.funcAttrs[0], curve.funcAttrs[1]]
		]
	};
};
