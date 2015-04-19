//# Animation
// 1. Path to path.
// 2. Move by path.
// 3. Gradient to gradient.

// Moving by path
$.fx.step.curve = function( fx ){
	if( fx.state === 0 ){
		if( !fx.elem._matrix )
			fx.elem._matrix = [1, 0, 0, 1, 0, 0];

		if( fx.elem._bounds || (fx.elem.bounds && fx.elem.bounds !== Shape.prototype.bounds) ){
			var b = fx.elem.bounds();
			fx.elem._matrix[4] -= b.cx;
			fx.elem._matrix[5] -= b.cy;
		}
	}

	if( fx.pointLast ){
		fx.elem._matrix[4] -= fx.pointLast.x;
		fx.elem._matrix[5] -= fx.pointLast.y;
	}
	var point = fx.end.pointAt(fx.pos);
	fx.elem._matrix[4] += point.x;
	fx.elem._matrix[5] += point.y;
	fx.pointLast = point;
};

$.fx.step.curveAngle = function( fx ){
	if( fx.state === 0 ){
		if( !fx.elem._matrix )
			fx.elem._matrix = [1, 0, 0, 1, 0, 0];

		if( fx.elem._bounds ){
			var b = fx.elem.bounds();
			fx.elem._matrix[4] -= b.cx;
			fx.elem._matrix[5] -= b.cy;
		}
	}

	if( fx.pointLast ){
		fx.elem._matrix[4] -= fx.pointLast.x;
		fx.elem._matrix[5] -= fx.pointLast.y;
		fx.elem.rotate(-fx.ang)
	}
	var point = fx.end.pointAt(fx.pos),
		angle = fx.end.tangentAt(fx.pos);
	fx.elem._matrix[4] += point.x;
	fx.elem._matrix[5] += point.y;
	fx.elem.rotate(angle);
	fx.pointLast = point;
	fx.ang = angle;
};