// возвращает ТОЧКИ
function intersect1D(a, b){
	return [
		Math.max(a[0], b[0]), // x1
		Math.min(a[1], b[1]) // x2
	]
}

function boundsIntersection(aabb1, aabb2){
	var intersection = [
		Math.max(aabb1[0], aabb2[0]), // x1
		Math.max(aabb1[1], aabb2[1]), // y1
		Math.min(aabb1[2], aabb2[2]), // x2
		Math.min(aabb1[3], aabb2[3]) // y2
	];

	if(intersection[2] < intersection[0] || intersection[3] < intersection[1]){
		return [0, 0, 0, 0];
	}

	return intersection;
}

function doBoundsIntersect(aabb1, aabb2){
	// return aabb1[0] > aabb2[0];
}

// drawing
// 1. Get the bounds.
// 2. Are the bounds in canvas? Yes — draw.

// redrawing
// 1. Get the bounds.
// 2. Are the bounds in canvas? Yes — add into list.
// 3. Add everything intersected with.
// 4. Count the sum of bounds, clear it and draw all of them.

// don't forget about canvas transforms

// var aabbMap = getAABBMap(context);
function addObjectToList(object){
	if(list.includes(object)){
		return;
	}

	var aabb = aabbMap.get(object);
	if(doBoundsIntersect(contextAABB, aabb)){
		list.push(object);

		context.elements.forEach(element => {
			if(doBoundsIntersect(aabb, aabbMap.get(element))){
				addObjectToList(object);
			}
		});
	}
}

// на самом деле aabb должно быть постоянно в памяти и просто обновляться каждый раз при перерисовке

function getAABBMap(context){
	var map = new Map();
	context.elements.forEach(element => {
		map.set(element.getAABB());
	});
	return map;
}
