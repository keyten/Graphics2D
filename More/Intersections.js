// возвращает ТОЧКИ
function intersect1D(a, b){
	return [
		Math.max(a[0], b[0]),
		Math.min(a[1], b[1])
	]
}

function intersectBounds(aabb1, aabb2){
	var intersection = [
		Math.max(aabb1[0], aabb2[0]),
		Math.max(aabb1[1], aabb2[1]),
		Math.min(aabb1[2], aabb2[2]),
		Math.min(aabb1[3], aabb2[3])
	];

	if(intersection[2] < intersection[0] || intersection[3] < intersection[1]){
		return [0, 0, 0, 0];
	}

	return intersection;
}


// boolean
function evenOddRule(x, y, poly){
	var c = false;
	for(var i = 0, j = poly.length - 1; i < poly.length; j = i, i++){
		if((poly[i][1] > y) !== (poly[j][1] > y) &&
			(x < (poly[j][0] - poly[i][0]) * (y - poly[i][1]) / (poly[j][1] - poly[i][1]) + poly[i][0])){
			c = !c;
		}
	}
	return c;
}

function lineIntersection(ax0, ay0, ax1, ay1, bx0, by0, bx1, by1){
	var d = (ax0 - ax1) * (by0 - by1) - (ay0 - ay1) * (bx0 - bx1);
	if(d === 0){
		return [];
	}

	var nx = (ax0 * ay1 - ay0 * ax1) * (bx0 - bx1) - (ax0 - ax1) * (bx0 * by1 - by0 * bx1),
		ny = (ax0 * ay1 - ay0 * ax1) * (by0 - by1) - (ay0 - ay1) * (bx0 * by1 - by0 * bx1);

	return [
		[nx / d | 0, ny / d | 0]
	];
}

function segmentIntersection(ax0, ay0, ax1, ay1, bx0, by0, bx1, by1){
	var d = (ax1 - ax0) * (by0 - by1) - (ay1 - ay0) * (bx0 - bx1);
	if(d === 0){
		return [];
	}

	var t = (bx0 - ax0) * (by0 - by1) - (by0 - ay0) * (bx0 - bx1);
	var w = (ax1 - ax0) * (by0 - ay0) - (bx0 - ax0) * (ay1 - ay0);

	t /= d;
	w /= d;

	if(t < 0 || t > 1 || w < 0 || w > 1){
		return [];
	}

	return [
		[
			ax0 + (ax1 - ax0) * t,
			ay0 + (ay1 - ay0) * t,
			t, w
		]
	];
}

function segmentQuadIntersection(ax0, ay0, ax1, ay1, ax2, ay2, bx0, by0, bx1, by1){
	var lineAngle = Math.atan2(by1 - by0, bx1 - bx0);
}

function pointInRect(x, y, x1, y1, x2, y2){
	return (
		x > x1 && y > y1 && x < x2 && y < y2
	);
}

function rectIntersect(ax1, ay1, ax2, ay2, bx1, by1, bx2, by2){
	/* return (
		((ax1 < bx1 && ay1 < by1) && (ax2 > bx1 && ay2 > by1))
		||
		((bx1 < ax1 && by1 < ay1) && (bx2 > ax1 && by2 > ay1))
	); */
/*
	return (
		pointInRect(ax1, ay1, bx1, by1, bx2, by2)
		||
		pointInRect(ax1, ay2, bx1, by1, bx2, by2)
		||
		pointInRect(ax2, ay1, bx1, by1, bx2, by2)
		||
		pointInRect(ax2, ay2, bx1, by1, bx2, by2)
		||
		// второй не нужно проверять!
		// точка одного во втором => точка второго в 1ом
		// нужно только понять, почему это не всегда работает, и пофиксить
		pointInRect(bx1, by1, ax1, ay1, ax2, ay2)
		||
		pointInRect(bx2, by1, ax1, ay1, ax2, ay2)
		||
		pointInRect(bx1, by2, ax1, ay1, ax2, ay2)
		||
		pointInRect(bx2, by2, ax1, ay1, ax2, ay2)
	); */

	// todo: check about normalizing coords (bx1 should be less than bx2, y analogously)

	// нужно проверять пересечение проекций на оси
	// кажется, как-то так
	return (
		(
			// intersection on x
			(ax1 > bx1 && ax1 < bx2) || (ax2 > bx1 && ax2 < bx2) // wrong? point doesn't have to lay inside projection... or not?
		) && (
			// intersection on y
			(ay1 > by1 && ay1 < by2) || (ay2 > by1 && ay2 < by2)
		)
	);
}

// http://noonat.github.io/intersect/

function polyIntersections(poly1, poly2){
	var intersection;
	return poly1.reduce(function(results, point1, i){
		if(i === 0){
			return results;
		}

		poly2.forEach(function(point2, j){
			if(j === 0){
				return;
			}

			intersection = segmentIntersection(
				poly1[i - 1][0], poly1[i - 1][1], point1[0], point1[1],
				poly2[j - 1][0], poly2[j - 1][1], point2[0], point2[1]
			);

			if(intersection.length !== 0){
				results.push(intersection);
			}
		});
		return results;
	}, []);
}
/*
function polyUnion(poly1, poly2){
	poly1 = poly1.slice();
	poly2 = poly2.slice();
	if(polyOrientArea(poly1) > 0){
		poly1.reverse();
	}
	if(polyOrientArea(poly2) > 0){
		poly2.reverse();
	}

	// note: if there are no intersections should return them both

	var intersection;
	var additions;
	var entry = !evenOddRule(poly1[0][0], poly1[0][1], poly2);
	var i, j;

	var breaker = 0;
	for(i = 1; i < poly1.length; i++){
		if(breaker++ > 50){
			throw 'too much of cicle';
		}

		additions = [];
		for(j = 1; j < poly2.length; j++){
			intersection = segmentIntersection(
				poly1[i - 1][0], poly1[i - 1][1], poly1[i][0], poly1[i][1],
				poly2[j - 1][0], poly2[j - 1][1], poly2[j][0], poly2[j][1]
			);

			if(intersection.length !== 0){
				intersection[0][4] = j;
				additions.push(intersection[0]);
			}
		}

		if(additions.length !== 0){
			// intersections has 't' param in the [2]
			// we should sort them by it bcs intersections must be added in right order
			additions.sort(function(a, b){
				return a[2] > b[2];
			});

			additions.forEach(function(addition){
				addition[5] = entry;
				entry = !entry;
			});

			poly1.splice.apply(poly1, [i, 0].concat(additions));
			i += additions.length;
		}
	}

	var result = [];
	var breaker = 0;
	for(i = 0; i < poly1.length; i++){
		if(breaker++ > 50){
			throw 'too much of cicle';
		}

		result.push(poly1[i]);

		if(poly1[i].length !== 2 && poly1[i][5]){

			// entry is here
			// if(i !== 2) continue;

			var cur = poly1[i],
				next = poly1[i + 1];

			for(j = cur[4]; j !== next[4]; j = j + 1 % poly2.length){
				if(breaker++ > 50){
					throw 'too much of cicle';
				}

				// console.log(j);
				// result.push(poly2[j]);
			}
		}
	}
	console.log(poly2);

	return result;
}
/* In the third phase, the result is generated. The algorithm starts
 * at an unprocessed intersection and picks the direction of traversal
 * based on the entry/exit flag: for an entry intersection it traverses
 * forward, and for an exit intersection it traverses in reverse.
 * Vertices are added to the result until the next intersection is found;
 * the algorithm then switches to the corresponding intersection vertex
 * in the other polygon and picks the traversal direction again using
 * the same rule. If the next intersection has already been processed,
 * the algorithm finishes the current component of the output and starts
 * again from an unprocessed intersection. The output is complete when
 * there are no more unprocessed intersections.
 */

// в greiner-hormann algo нужны полигоны с правильной ориентацией
// поэтому righthandrule
function polyOrientArea(poly){
	var area = 0;
	for(var i = 1; i < poly.length; i++){
		area += (poly[i - 1][0] * poly[i][1] - poly[i - 1][1] * poly[i][0]) / 2;
	}
	return area;
}


Delta.intersections = {};
Delta.intersections.lineIntersection = lineIntersection;
Delta.intersections.segmentIntersection = segmentIntersection;
Delta.intersections.segmentQuadIntersection = segmentQuadIntersection;
Delta.intersections.pointInRect = pointInRect;
Delta.intersections.evenOddRule = evenOddRule;
Delta.intersections.rectIntersect = rectIntersect;
Delta.intersections.polyIntersections = polyIntersections;
// Delta.intersections.polyUnion = polyUnion;