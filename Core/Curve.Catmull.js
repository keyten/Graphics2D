var CurveCatmull = new Class(Curve, {
	initialize: function(method, attrs, path, detail){
        this.super('initialize', arguments);
        // h1x, h1y, h2x, h2y, x, y, [detail]
    },

    tangentAt: function(t, startPoint){
        if(!startPoint){
            // startAt is defined in Curve.Math
            startPoint = this.startAt();
        }

        var x1 = startPoint[0],
            y1 = startPoint[1],
            h1x = this.funcAttrs[0],
            h1y = this.funcAttrs[1],
            h2x = this.funcAttrs[2],
            h2y = this.funcAttrs[3],
            x2 = this.funcAttrs[4],
            y2 = this.funcAttrs[5];

		return Math.atan2(
			0.5 * ( 3*t*t*(-h1y+3*y1-3*y2+h2y) + 2*t*(2*h1y-5*y1+4*y2-h2y) + (-h1y+y2)  ),
			0.5 * ( 3*t*t*(-h1x+3*x1-3*x2+h2x) + 2*t*(2*h1x-5*x1+4*x2-h2x) + (-h1x+x2)  )
		) / Math.PI * 180;
    },

    pointAt: function(t, startPoint){
        if(!startPoint){
            // startAt is defined in Curve.Math
            startPoint = this.startAt();
        }

        var x1 = startPoint[0],
            y1 = startPoint[1],
            h1x = this.funcAttrs[0],
            h1y = this.funcAttrs[1],
            h2x = this.funcAttrs[2],
            h2y = this.funcAttrs[3],
            x2 = this.funcAttrs[4],
            y2 = this.funcAttrs[5];

		return [
            0.5 * ((-h1x + 3*x1 - 3*x2 + h2x)*t*t*t
				+ (2*h1x - 5*x1 + 4*x2 - h2x)*t*t
				+ (-x1 + x2)*t
				+ 2*x1),
		    0.5 * ((-h1y + 3*y1 - 3*y2 + h2y)*t*t*t
				+ (2*h1y - 5*y1 + 4*y2 - h2y)*t*t
				+ (-y1 + y2)*t
                + 2*y1)
        ];
    },

    // todo: convert to bezier
    process: function(ctx){
        // startAt is defined in Curve.Math
        var startPoint = this.startAt(),
            detail = Curve.detail,
            point;
        for(var i = 0; i <= detail; i++){
            point = this.pointAt(i / detail, startPoint);
            ctx.lineTo(point[0], point[1]);
        }
    }
});

Delta.curves['catmullTo'] = CurveCatmull;