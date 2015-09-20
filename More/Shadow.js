//# Shadow

/* * shape.shadows
* shape.addShadow
* shape.changeShadow
* shape.removeShadow
// Size of the shadow; shadow for invisible elements; multiple shadows; inset shadows. */

Shape.prototype.shadows = function(value){};

Shape.prototype.addShadow = function(object){

	if(!this._shadows)
		this._shadows = [];

	var obj = {};
	obj.x = object.x || 0;
	obj.y = object.y || 0;
	obj.size = object.size || 0;
	obj.blur = object.blur || 0;
	obj.color = object.color || 'black';
	obj.opacity = (object.opacity === undefined ? 1 : object.opacity);
	obj.inset = object.inset || false;
	obj.linked = object.linked || false; // будет ли прозрачность тени умножаться на прозрачность элемента

	this._shadows.push(obj);
	return this.update();

};

function drawShadow(ctx, obj){
	ctx.translate(-1000, -1000); // вычислять размеры объекта
	/*
		if(inset){ // хз что // }
		else {
			resultX = cloneTranslateX + objX + shadowX;
			resultY = cloneTranslateY + objY + shadowY;
			clone.scale( (obj.size + size) / obj.size );
			if(linked)
				opacity *= objOpacity;
		}
	 */
	elemClone.draw(); // и ввести width / height для любых объектов
	// и x / y
	ctx.translate(1000, 1000);
}

Shape.prototype.changeShadow = function(value){};

Shape.prototype.removeShadow = function(value){};

// shadow animation