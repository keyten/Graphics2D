// todo:
Drawable.prototype._genMatrix = function(){
    this.transform(null);
    (this.attrs.transformOrder || 'translate rotate scale skew').split(' ').forEach(function(name){
        if(!this.attrs[name]){
            return;
        }

        if(name === 'translate'){
            this.translate(this.attrs.translate[0], this.attrs.translate[1]);
        } else if(name === 'rotate'){
            this.rotate(this.attrs.rotate, this.attrs.rotatePivot);
        } else if(name === 'scale'){
            this.scale(this.attrs.scale[0], this.attrs.scale[1], this.attrs.scalePivot);
        } else if(name === 'skew'){
            this.skew(this.attrs.skew[0], this.attrs.skew[1], this.attrs.skewPivot);
        }
    }.bind(this));
};

Drawable.prototype.attrHooks.translate = {
    get: function(){
        return this.matrix ? this.matrix.slice(4) : [0, 0];
    },

    set: function(value){
        this.attrs.translate = value;
        this._genMatrix();
        this.update();
    }
};

Drawable.prototype.attrHooks.rotate = {
    get: function(){
        return this.attrs.rotate || 0;
    },

    set: function(value){
        this.attrs.rotate = value;
        this._genMatrix();
        this.update();
        return null;
    }
};

Drawable.prototype.attrHooks.skew = {
    get: function(){
        return this.attrs.skew || [0, 0];
    },

    set: function(value){
        this.attrs.skew = +value === value ? [value, value] : value;
        this._genMatrix();
        this.update();
    }
};

Drawable.prototype.attrHooks.scale = {
    get: function(){
        return this.attrs.scale || [1, 1];
    },

    set: function(value){
        this.attrs.scale = +value === value ? [value, value] : value;
        this._genMatrix();
        this.update();
    }
};