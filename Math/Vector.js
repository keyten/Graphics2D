// Delta is 2D lib so Vector is 2D too
function Vector(x, y){
	this.x = x;
	this.y = y;
}

Vector.prototype = {

	dot: function(vec){
		return this.x * vec.x + this.y * vec.y;
	},

	len: function(){
		return Math.sqrt(this.x * this.x + this.y * this.y);
	},

	angleWith: function(vec){
		return Math.acos(this.dot(vec) / (this.len() * vec.len())) * 180 / Math.PI;
	},

	// not sure it is needed
	complexMultiply: function(vec){
		return new Vector(this.x * vec.x - this.y * vec.y, this.x * vec.y + this.y * vec.x);
	}

};

Vector.polar = function(r, phi){
	return new Vector(r * Math.cos(phi), r * Math.sin(phi));
};
