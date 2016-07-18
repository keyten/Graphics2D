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

	var shadow = {};
	shadow.x = object.x || 0;
	shadow.y = object.y || 0;
	shadow.size = object.size || 0;
	shadow.blur = object.blur || 0;
	shadow.color = object.color || 'black';
	shadow.opacity = (object.opacity === undefined ? 1 : object.opacity);
	shadow.opacityRelative = object.opacityRelative || true; // будет ли прозрачность тени умножаться на прозрачность элемента
	shadow.inset = object.inset || false;

	this._shadows.push(shadow);
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
	// просто сделать scale
	elemClone.draw(); // и ввести width / height для любых объектов
	// и x / y
	ctx.translate(1000, 1000);
}

Shape.prototype.changeShadow = function(value){};

Shape.prototype.removeShadow = function(value){};

// shadow animation