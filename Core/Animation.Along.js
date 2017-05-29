// Some tick functions
/* Drawable.prototype.attrHooks._num = {
	preAnim: function(fx, endValue){
		fx.startValue = this.attr(fx.prop);
		fx.delta = endValue - fx.startValue;

		if(endValue + '' === endValue){
			if(endValue.indexOf('+=') === 0){
				fx.delta = +endValue.substr(2);
			} else if(endValue.indexOf('-=') === 0){
				fx.delta = -endValue.substr(2);
			}
		}
	},

	anim: function(fx){
		this.attrs[fx.prop] = fx.startValue + fx.delta * fx.pos;
		this.update();
	}
};
 */

// {moduleName Animation.Along}
// {requires Math.Curve}

// todo: нужно как-то научиться расширять attrHooks у Drawable, чтобы это переносилось на дочерние attrHooks
Rect.prototype.attrHooks.along = {
    preAnim: function(fx, curve){
        if(!(curve instanceof Curve)){
            // нужно в fx.curve запихать объект, который будет выдавать pointAt(t) для всего пути
        }
        var bounds = this.bounds();
        fx.initialCoords = [bounds.x, bounds.y];

        fx.startCurvePoint = curve.startAt();
        fx.curve = curve;
        // todo: smth.animate('curve', { curve: ..., rotate: true, corner: 'center', offset: [10, 0] })
        // чтоб объект мог двигаться за центр, а не за уголок, например
    },

    anim: function(fx){
        var point = fx.curve.pointAt(fx.pos);
        point[0] -= fx.initialCoords[0];
        point[1] -= fx.initialCoords[1];
        this.attr('translate', point);
    }
};

// перенести в math
Curve.prototype.pointAt = function(t, startPoint){
    var type = Curve.types[this.method];
    if(type && type.pointAt){
        return type.pointAt(this, t);
    }
    throw "The method \"pointAt\" is not supported for \"" + this.method + "\" curves";
};

Curve.prototype.startAt = function(){
    var index = this.path.attrs.d.indexOf(this);
    return index === 0 ? [0, 0] : this.path.attrs.d[index - 1].endAt();
};

Curve.types.lineTo.pointAt = function(curve, t, startPoint){
    if(!startPoint){
        startPoint = curve.startAt();
    }
    return [
        startPoint[0] + t * (curve.attrs[0] - startPoint[0]),
        startPoint[1] + t * (curve.attrs[1] - startPoint[1]),
    ];
};

// перенести в TransformAttrs
Drawable.prototype._genMatrix = function(){
    // todo: заранее всё перемножить и тут описать в общем виде
    this.matrix = [1, 0, 0, 1, this.attrs.translate[0], this.attrs.translate[1]];
};

Rect.prototype.attrHooks.translate = {
    get: function(){
        return this.matrix ? this.matrix.slice(4) : [0, 0];
    },

    set: function(value){
        this.attrs.translate = value;
        this._genMatrix();
        this.update();
    }
};
// Drawable.prototype.attrHooks.rotate = ...