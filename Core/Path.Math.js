// requires Curve.Math

// todo: transforms support
extend(Path.prototype, {

    length: function(){
        return this.attrs.d.reduce(function(sum, curve){
            return sum + curve.length();
        }, 0);
    },

    startAt: function(){
        return this.pointAt(0);
    },

    curveAt: function(t){
        if(t < 0 || t > 1){
            return null;
        }
        var curves = this.attrs.d;
        if(t === 1){
            // must return the last (geometric! not moveTo) curve
            t = 1 - Number.EPSILON;
        }
        var len = this.length();
        var currentLen = 0;
        for(var i = 0; i <= curves.length; i++){
            if(currentLen / len > t){
                return curves[i - 1];
            }
            currentLen += curves[i].length();
        }
        return null;
    },

    _pathToCurveParams: function(t){
        if(t < 0 || t > 1){
            // todo: add values < 0 and > 1 for elasticOut animation
            return null;
        }
        var curves = this.attrs.d;

        var len = this.length();
        var lenStart;
        var lenEnd = 0;
        var curve;
        for(var i = 0; i <= curves.length; i++){
            if(lenEnd / len > t){
                curve = curves[i - 1];
                break;
            }
            lenStart = lenEnd;
            lenEnd += curves[i].length();
        }

        return {
            t: (t - lenStart / len) / ((lenEnd - lenStart) / len),
            curve: curve
        };
    },

    pointAt: function(t){
        if(t === 1){
            // must return the end of the last geometric (! not moveTo!) curve
            return this.curveAt(1).endAt();
        }
        var curveParams = this._pathToCurveParams(t);
        return curveParams.curve.pointAt(curveParams.t);
    },

    tangentAt: function(t){
        if(t === 1){
            t = 1 - Number.EPSILON;
        }
        var curveParams = this._pathToCurveParams(t);
        return curveParams.curve.tangentAt(curveParams.t);
    },

    normalAt: function(t){
        if(t === 1){
            t = 1 - Number.EPSILON;
        }
        var curveParams = this._pathToCurveParams(t);
        return curveParams.curve.normalAt(curveParams.t);
    },

    nearest: function(x, y, detail){
        return this.attrs.d.reduce(function(current, curve){
            var nearest = curve.nearest(x, y, detail);
            if(nearest.distance < current.distance){
                return nearest;
            }
            return current;
        }, {
            point: null,
            t: 0,
            distance: Infinity
        });
    }

});