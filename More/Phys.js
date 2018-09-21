var defaultOptions = {
	gravity: [0, 1]
};

Context.prototype.phys = function(options){
	options = Delta.extend(Delta.extend({}, defaultOptions), options);

	// move to attrs?
	if(!this._physParameters){
		this._physParameters = {};
		this._physActiveObjects = [];
	}

	Delta.extend(this._physParameters, options);

	return this;
};

// у объекта должна быть физ. форма (например, позволить полигону работать в физике как кругу)
// позволить склеивать объекты разной массы
Drawable.prototype.phys = function(options){
	var ctx = this.context;
	if(!ctx._physActiveObjects){
		ctx.phys();
	}

	// move to attrs?
	if(!this._physParameters){
		this._physParameters = {
			velocity: [0, 0],
			acceleration: [0, 0],
			mass: 1
		};
	}
	if(options){
		Delta.extend(this._physParameters, options);
	}

	if(ctx._physActiveObjects.indexOf(this) === -1){
		ctx._physActiveObjects.push(this);
	}

	ctx.physUpdate();

	return this;
};

Context.prototype.physUpdate = function(){
	if(this._willPhysUpdate){
		return;
	}

	if(!this.physTickBound){
		this.physTickBound = this.physTick.bind(this);
	}

	requestAnimationFrame(this.physTickBound);
};

Context.prototype.physTick = function(){
	var list = this._physActiveObjects;
	list.slice().forEach(function(element, i){
		if(!element.physTick()){
			list.splice(i, 1);
		}
	});

	if(list.length){
		requestAnimationFrame(this.physTickBound);
	} else {
		this._willPhysUpdate = false;
	}
};

Drawable.prototype.physTick = function(){
	var ctxOptions = this.context._physParameters;
	var options = this._physParameters;
	if(options.velocity[0] !== 0 || options.velocity[1] !== 0){
		this.translate(options.velocity[0], options.velocity[1]);
	}
	options.velocity[0] += options.acceleration[0];
	options.velocity[1] += options.acceleration[1];
	// gravity
	if(!options.ignoreGravity){
		options.velocity[0] += ctxOptions.gravity[0] * options.mass;
		options.velocity[1] += ctxOptions.gravity[1] * options.mass;
	}
	return options.velocity[0] !== 0 || options.velocity[1] !== 0;
};