function doCirclesIntersect(circ1, circ2){
	return Math.sqrt(Math.pow(circ2.x - circ1.x, 2) + Math.pow(circ2.y - circ1.y, 2)) < circ1.r + circ2.r;
}