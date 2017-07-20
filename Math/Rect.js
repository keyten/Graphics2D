Delta.Math.Rect = {};

function intersect(box1, box2){
	if(box1.x1 > box2.x2 || box2.x1 > box1.x2){
		return false;
	}
	if(box1.y1 > box2.y2 || box2.y1 > box1.y2){
		return false;
	}
	return true;
}
// wtf

function intersectRay(box, rayStart, rayDir, finiteCast){
	var invDir = new Vector(1 / rayDir.x, 1 / rayDir.y),
		t1 = (box.x1 - rayStart.x) * invDir.x,
		t2 = (box.x2 - rayStart.x) * invDir.x,
		t3 = (box.y1 - rayStart.y) * invDir.y,
		t4 = (box.y2 - rayStart.y) * invDir.y,
		paramMin = Math.max(Math.min(t1, t2), Math.min(t3, t4)),
		paramMax = Math.min(Math.max(t1, t2), Math.max(t3, t4));

	if(isFiniteCast && paramMax < 0){
		return false;
	}

	return paramMin <= paramMax;
}