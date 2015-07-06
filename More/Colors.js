//# Colors

// $.color = function(color, from, to){}

$.colorSpaces = {
	cmy: {
		from: function(c, m, y){
			return {
				r: (100 - c) * 2.55,
				g: (100 - m) * 2.55,
				b: (100 - y) * 2.55
			};
		},
		to: function(r, g, b){
			return {
				c: (255 - r) / 2.55,
				m: (255 - g) / 2.55,
				y: (255 - b) / 2.55
			};
		},
		max: 100,
		min: 0,
		round: true
	},

	hsl: {
		from: function(h, s, l){

			function hue2rgb(v1, v2, vh){
				if( vh < 0 )
					vh += 1;
				else if( vh > 1 )
					vh -= 1;

				if( (6 * vh) < 1 )
					return v1 + (v2 - v1) * 6 * vh;
				if( (2 * vh) < 1 )
					return v2;
				if( (3 * vh) < 2 )
					return v1 + (v2 - v1) * ( 2/3 - vh ) * 6;
				return v1;
			}

			var v1, v2;
			if( s === 0 ){
				return {
					r: l * 255,
					g: l * 255,
					b: l * 255
				};
			}
			else {
				if( l < 0.5 )
					v2 = l * (1 + s);
				else
					v2 = (l + s) - (s * l);

				v1 = 2 * l - v2;

				return {
					r: 255 * hue2rgb( v1, v2, h + 1/3 ),
					g: 255 * hue2rgb( v1, v2, h ),
					b: 255 * hue2rgb( v1, v2, h - 1/3 )
				};
			}
		},
		to: function(r, g, b){
			r /= 255;
			g /= 255;
			b /= 255;

			var min = Math.min(r, g, b),
				max = Math.max(r, g, b),
				delta = max - min,
				l = (max + min) / 2,
				h, s,
				dr, dg, db;

			if( delta === 0 ){
				return {
					h: 0,
					s: 0,
					l: l * 100
				};
			}
			else {
				if( l < 0.5 )
					s = delta / (max + min);
				else
					s = delta / (2 - max - min);

				dr = (((max - r) / 6) + (delta / 2)) / delta;
				dg = (((max - g) / 6) + (delta / 2)) / delta;
				db = (((max - b) / 6) + (delta / 2)) / delta;

				if( r === max )
					h = db - dg;
				else if( g === max )
					h = 1/3 + dr - db;
				else if( b === max )
					h = 2/3 + dg - dr;

				if( h < 0 )
					h += 1;
				else if( h > 1 )
					h -= 1;
			}
			return {
				h: h * 360,
				s: s * 100,
				l: l * 100
			};
		},
		round: true,
		period: [360, 0, 0]
	},

	xyz: {
		from: function(x, y, z){
			x /= 100;
			y /= 100;
			z /= 100;

			var r =  x * 3.2406 - y * 1.5372 - z * 0.4986,
				g = -x * 0.9689 + y * 1.8758 + z * 0.0415,
				b =  x * 0.0557 - y * 0.2040 + z * 1.0570;

			if( r > 0.0031308 )
				r = 1.055 * (r ^ (1 / 2.4)) - 0.055;
			else
				r *= 12.92;

			if( g > 0.0031308 )
				g = 1.055 * (g ^ (1 / 2.4)) - 0.055;
			else
				g *= 12.92;

			if( b > 0.0031308 )
				b = 1.055 * (b ^ (1 / 2.4)) - 0.055;
			else
				b *= 12.92;

			return {
				r: r * 255,
				g: g * 255,
				b: b * 255
			}
		}
	}
};