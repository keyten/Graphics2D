/* Context.prototype.push = function(element){
	element.context = this;
	this.elements.push(element);

	if(element.draw){
		// может, this.draw(element) ?
		var ctx = this.context;
		ctx.save();
		if(this.matrix){
			ctx.setTransform(
				this.matrix[0],
				this.matrix[1],
				this.matrix[2],
				this.matrix[3],
				this.matrix[4],
				this.matrix[5]
			);
		} else {
			ctx.setTransform(1, 0, 0, 1, 0, 0);
		}
		element.draw(ctx);
		ctx.restore();
	}

	element.update = element.updateFunction;

	return element;
};

// clip inside:

/* ctx.fillStyle = 'red';
ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)';
ctx.lineWidth = 50;

ctx.beginPath();
ctx.moveTo(280, 200);
ctx.arc(200, 200, 80, 0, 6.29);
ctx.fill();

if(1){
ctx.beginPath();
ctx.moveTo(280, 200);
ctx.arc(200, 200, 80, 0, 6.29);
ctx.lineTo(500, 200);
ctx.lineTo(500, 0);
ctx.lineTo(0, 0);
ctx.lineTo(0, 500);
ctx.lineTo(0, 500);
ctx.lineTo(500, 500);
ctx.lineTo(500, 200);
	ctx.clip();
}
ctx.beginPath();
ctx.moveTo(280, 200);
ctx.arc(200, 200, 80, 0, 6.29);
ctx.stroke();
 */

// shadow inside (works only with paths):

/* ctx.fillStyle = 'blue';
ctx.fillRect(10, 10, 200, 200);

ctx.fillStyle = 'red';
ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)';
ctx.lineWidth = 50;

ctx.beginPath();
ctx.moveTo(280, 200);
ctx.arc(200, 200, 80, 0, 6.29);
ctx.fill();
ctx.clip();

if(1){
var coef = 1000;
ctx.translate(0, -coef);
ctx.shadowOffsetX = 0;
ctx.shadowOffsetY = 5 + coef;
ctx.shadowBlur = 10;
ctx.shadowColor = 'black';
ctx.fillStyle = 'rgba(255, 255, 255, 1)';
ctx.beginPath();
ctx.moveTo(280, 200);
ctx.arc(200, 200, 80, 0, 6.29);
ctx.lineTo(500, 200);
ctx.lineTo(500, 0);
ctx.lineTo(0, 0);
ctx.lineTo(0, 500);
ctx.lineTo(0, 500);
ctx.lineTo(500, 500);
ctx.lineTo(500, 200);
ctx.fill();
} */
