// {moduleName Animation.Along}
// {requires Math.Curve}

// todo: direction
Drawable.prototype.attrHooks.along = {
    preAnim: function(fx, data){
        var curve = data.curve,
            corner = data.corner || 'center';
        if(data instanceof Curve || data instanceof Path){
            curve = data;
            // нужно для Path в fx.curve запихать объект, который будет выдавать pointAt(t) для всего пути
        }

        corner = this.corner(corner, data.cornerOptions || {
            transform: 'ignore'
        });
        if(data.offset){
            corner[0] -= data.offset[0];
            corner[1] -= data.offset[1];
        }
        fx.initialCoords = corner;
        fx.curve = curve;
        // true if the curve is changed while animation
        // and it is always works like dynamic for some curves
        if(!data.dynamic){
            fx.startCurvePoint = curve.startAt();
        }
        this.attr('rotatePivot', corner);
        if(+data.rotate === data.rotate){
            this.attr('rotate', data.rotate);
        } else if(data.rotate === true){
            fx.rotate = true;
        }
        fx.addRotate = data.addRotate || 0;
    },

    anim: function(fx){
        var point = fx.curve.pointAt(fx.pos, fx.startCurvePoint);
        point[0] -= fx.initialCoords[0];
        point[1] -= fx.initialCoords[1];
        this.attr('translate', point);
        if(fx.rotate === true){
            this.attr('rotate', fx.curve.tangentAt(fx.pos, null, fx.startCurvePoint) + fx.addRotate);
        }
    }
};