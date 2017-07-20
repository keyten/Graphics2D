// Delta is 2D lib so Vector is 2D too
function Vector(x, y){
	this.x = x;
	this.y = y;
}

Vector.prototype = {
	add: function(vec){
		return new Vector(this.x + vec.x, this.y + vec.y);
	},

	dot: function(vec){
		return this.x * vec.x + this.y * vec.y;
	},

	len: function(){
		return Math.sqrt(this.x * this.x + this.y * this.y);
	},

	angleWith: function(vec){
		return Math.acos(this.dot(vec) / (this.len() * vec.len())) * 180 / Math.PI;
	},

	perpDot: function(vec){
		return this.x * vec.y - this.y * vec.x;
	},

	perp: function(){
		return new Vector(-this.y, this.x);
	},

	negative: function(){
		return new Vector(-this.x, -this.y);
	},

	rotate: function(vec){
		return new Vector(
			this.x * vec.x - this.y * vec.y,
			this.x * vec.y + this.y * vec.x
		);
	},

	normalize: function(){
		var len = this.len();
		return new Vector(this.x / len, this.y / len);
	}
};

Vector.polar = function(r, phi){
	return new Vector(r * Math.cos(phi), r * Math.sin(phi));
};

Delta.Math.Vector = Vector;