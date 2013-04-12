/*! Graphics2D
 * 
 *  Author: Keyten aka Dmitriy Miroshnichenko
 *
 *  10.09.12 / 23:11
 */

var Graphics2D = (function(window, undefined){

	var Context,

		// shapes
		Shape, Rect, Circle, Path,

		emptyFunc = function(){};


	Context = function(canvas){

		this.context   = canvas.getContext('2d');
		this.canvas    = canvas;
		this.elements  = [];
		this.listeners = {};

	}

	Context.prototype = {

		// shapes
		rect : function(x,y,w,h,fill,stroke){
			return this.push( new Rect(x,y,w,h,fill,stroke,this) );
		},

		circle : function(x,y,r,fill,stroke){
			return this.push( new Circle(x,y,r,fill,stroke,this) );
		},

		path : function(path,x,y,closed,fill,stroke){
			return this.push( new Path(path,x,y,closed,fill,stroke,this) );
		},

		image : function(image,x,y,w,h){
			return this.push( new Img(image,x,y,w,h,this) );
		},

		text : function(text,font,x,y,fill,stroke){
			return this.push( new Text(text,font,x,y,fill,stroke,this) );
		},

		textblock : function(text,font,x,y,w,fill,stroke){
			return this.push( new TextBlock(text,font,x,y,w,fill,stroke,this) );
		},


		push : function(element){
			this.elements.push(element);
			if( element.draw )
				element.draw(this.context);
			return element;
		},


		// methods
		update : function(){

			var ctx = this.context;
			ctx.clearRect( 0, 0, this.canvas.width, this.canvas.height );
			this.elements.forEach(function(object){

				object.draw(ctx);

			});
			this.fire('update');

		},

		getObjectInPoint : function(x,y){
			var element = null,
				elements = this.elements;
			
			var i = elements.length;
			while(i--){
				if( elements[i].isPointIn && elements[i].isPointIn( distance(x), distance(y)) ){
					element = elements[i];
					return elements[i];
					break;
				}
			}
			return element;
		},

		// events
		_setupped : false,
		hoverElement : null,
		focusElement : null,
		_checkListeners : function(){

			if(this._setupped) return;
			this._setupped = true;

			var element = this.canvas,
				listeners = this.listeners,
				context = this;

			[ 'click', 'dblclick', 'mousedown',
			  'mouseup', 'mousemove', 'mouseover', 'mouseout' ].forEach(function(event){

				element.addEventListener(event, function(e){

					var object = context.getObjectInPoint(
							e.contextX = e.clientX - element.offsetLeft,
							e.contextY = e.clientY - element.offsetTop
						);

					if(object && object.fire)
						e.targetObject = object,
						object.fire(event, e);

					context.fire(event, e);

				});

			});

			[{ evt:'mousemove', in:'mouseover', out:'mouseout' }, { evt:'mousedown', in:'focus', out:'blur' }].forEach(function(obj, i){

				var id = '_evt' + i;

				context.on(obj.evt, function(e){

					var targ = e.targetObject;
					if(context[id] != targ && context[id])
						context[id].fire(obj.out, e)[id] = false;

					if(targ && !targ[id])
						targ.fire(obj.in, e)[id] = true;

					context[id] = targ;

				});

			});


		},
		
		on : function(evt, fn){

			this._checkListeners();
			(this.listeners[ evt ] || (this.listeners[ evt ] = [])).push(fn);
			return this;

		},

		fire : function(evt, data){

			var listeners = this.listeners[ evt ];
			if(!listeners) return this;

			var object = this.canvas;
			listeners.forEach(function(func){
				func.call(object, data);
			});
			return this;
		
		}

	};


	/* Shape
		abstract class for inheriting shapes */

	Shape = Class({

		initialize : function(){
			this._attr = extend(new Shape.attributes, this.constructor.defaults || {});
			this.data = {};
			this.listeners = {};
		},


		_set : function(name, value, obj){
			if(value == null) return obj[name];
			obj[name] = value;
			this.context.update();
			return this;
		},

		property : function(name, value){
			return this._set(name, value, this._attr)
		},
		
		style : function(name, value){
			return this._set(name, value, this._attr.style)
		},


		fill : function(color){
			return this.style('fillStyle', color);
		},
		
		opacity : function(opacity){
			return this.style('globalAlpha', opacity);
		},
		
		composite : function(composite){
			return this.style('globalCompositeOperation', composite);
		},
		
		stroke : function(str){
			var s = this._attr.style;
			if(str == null)
				return {
					color : s.strokeStyle,
					width : s.lineWidth,
					cap   : s.lineCap,
					join  : s.lineJoin,
					dash  : s._lineDash
				};
			extend(s, stroke(str));
			this.context.update();
			return this;
		},

		mask : function(shape){
			return this.property('mask', shape);
		},
		
		hide : function(){
			return this.property('visible', false);
		},
		
		show : function(){
			return this.property('visible', true);
		},

		cursor : function(cur){
			var cnv = this.context.canvas,
				old = cnv.style.cursor;
			return this.on('mouseover', function(){
				cnv.style.cursor = cur
			}).on('mouseout', function(){
				cnv.style.cursor = old;
			});
		},

		on : function(event,fn){
			this.context._checkListeners();
			(this.listeners[ event ] || (this.listeners[ event ] = [])).push(fn);
			return this;
		},

		fire : function(event, data){
			(this.listeners[ event ] || []).forEach(function(func){
				func.call(this, data);
			}.bind(this));
			return this;
		},

		draw : function(ctx){
			var a = this._attr;

			if(!a.visible) return;
			style(ctx, a.style);
//			if(a.gradient && a.gradient.redraw){
//				ctx.fillStyle = createGradient(ctx, a.gradient, this.bounds());
//			}
			this.processPath(ctx);
			if(a.style.fillStyle) ctx.fill();
			if(a.style.strokeStyle) ctx.stroke();
			ctx.restore();
		},

		isPointIn : function(x,y){
			var ctx = this.context.context;
			this.processPath( ctx );
			return ctx.isPointInPath( x, y );
		}

	});

	Shape.attributes = function(){
		this.matrix = [ 1,0,0,1,0,0 ];
		this.style  = {};
		this.visible = true;
	}


	/* Rect
		base rect class */
	Rect = Class(Shape, {

		initialize : function(x, y, w, h, fill, stroke, context){
			var a = this._attr;
			if( all(isNumeric, [x, y, w, h]) )
				extend(a, { x:distance(x), y:distance(y), width:distance(w), height:distance(h) }),
				fillAndStroke(this, fill, stroke, context);
			else
				attributes(a, x),
				a.x = distance(x.x),
				a.y = distance(x.y),
				a.width  = distance(select(x.width, x.w)),
				a.height = distance(select(x.height, x.h));
			
			this.context = context;
		},

		x : function(v){
			return this.property('x', distance(v));
		},

		y : function(v){
			return this.property('y', distance(v));
		},

		width : function(v){
			return this.property('width', distance(v));
		},

		height : function(v){
			return this.property('height', distance(v));
		},

		bounds : function(){
			return {
				x : this._attr.x,
				y : this._attr.y,
				w : this._attr.width,
				h : this._attr.height,
			};
		},

		processPath : function(ctx){
			var a = this._attr;
			ctx.beginPath();
			ctx.rect( a.x, a.y, a.width, a.height );
		}

	});

	/* Circle
		base circle / ellipse class */

	Circle = Class(Shape, {

		initialize : function(cx, cy, r, fill, stroke, context){
			var a = this._attr;
			if( all(isNumeric, [cx, cy, r]) )
				extend(a, { cx:distance(cx), cy:distance(cy), r:distance(r) }),
				fillAndStroke(this, fill, stroke, context);
			else
				attributes(a, cx),
				a.cx = distance(select(cx.cx, cx.center)),
				a.cy = distance(select(cx.cy, cx.center)),
				a.r  = distance(select(cx.r,  cx.radius));
			
			this.context = context;
		},

		cx : function(v){
			return this.property('cx', distance(v));
		},

		cy : function(v){
			return this.property('cy', distance(v));
		},
		
		r : function(v){
			return this.property('r', distance(v));
		},
		
		processPath : function(ctx){
			var a = this._attr;
			ctx.beginPath();
			ctx.arc(a.cx, a.cy, a.r, 0, Math.PI * 2, true);
		}

	});

	/* Path
		base path class */

	Path = Class(Shape, {

		initialize : function(points, x,y, closed, fill, stroke, context){
			if(!all(isNumeric, [x,y])) // если отсутствуют x & y
				stroke = closed,
				fill   = y,
				closed = x,
				x = y = 0;

			if(isString(closed) || closed == null) // если отсутствует closed
				stroke  = fill,
				fill    = closed,
				closed  = false;

			var a = this._attr;

			if( isString(points) || isArray(points) )
				extend(a, { path:path(points), closed:!!closed, x:x, y:y }),
				fillAndStroke(this, fill, stroke, context);
			else
				attributes(a, points),
				a.path   = path(points.path),
				a.closed = !!points.closed,
				a.x      = x,
				a.y      = y;
			
			this.context = context;
		},

		x : function(x){
			return this.property('x', x);
		},

		y : function(y){
			return this.property('y', y);
		},

		close : function(v){
			return this.property('closed', v == null ? !this._attr.closed : !!v);
		},

		point : function(index, cmd){
			function slice(index1, index2, segments){
				var arr = [];
				segments.forEach(function(seg, i){
					arr = arr.concat( path(seg) );
				});
				attr.path = points.slice(0, index1).concat( arr.concat( points.slice(index2) ) );
				this.context.update();
			} // .bind(this)

			var attr = this._attr,
				points = attr.path,
				seg = Array.prototype.slice.call(arguments, 1),
				funcs = {

				'get' : function(index){
					return point( points[index] );
				},
				'replace' : function(index, segments){
					slice.call(this, index, index+1, segments)
				},
				'after' : function(index, segments){
					slice.call(this, index+1, index+1, segments)
				},
				'before' : function(index, segments){
					funcs.after.call(this, index ? index-1 : 0, segments)
				},
				'delete' : function(index){
					attr.path = points.slice(0, index).concat( points.slice(index+1) );
					this.context.update();
				}

			};

			// ищем команду
			if(cmd in funcs)
				seg = seg.slice(1);
			else if(arguments.length == 1)
				cmd = 'get';
			else cmd = 'replace';

			return funcs[cmd].call(this, index, seg) || this;
		},

		points : function(points){
			if(points == null)
				return this._attr.path.map(function(value){
					return point(value);
				});
			this._attr.path = path( points );
			this.context.update();
			return this;
		},

		add : function(f, arg){
			this._attr.path.push({ f:f, arg:arg });
			this.context.update();
			return this;
		},

		moveTo : function(x,y){
			return this.add('moveTo', [x,y]);
		},

		lineTo : function(x,y){
			return this.add('lineTo', [x,y]);
		},

		quadraticCurveTo : function(x,y,hx,hy){
			return this.add('quadraticCurveTo', [hx,hy,x,y]);
		},

		bezierCurveTo : function(x,y,h1x,h1y,h2x,h2y){
			return this.add('bezierCurveTo', [h1x,h1y,h2x,h2y,x,y]);
		},

		arcTo : function(x1,y1,x2,y2,radius,clockwise){
			return this.add('arcTo', [x1,y1,x2,y2,radius,clockwise]);
		},

		arc : function(x,y,radius,start,end,clockwise){
			return this.add('arc', [x,y,radius,start,end,clockwise]);
		},

		bounds : function(){
			var p = this._attr.path,
				x  =  Infinity,
				y  =  Infinity,
				x2 = -Infinity,
				y2 = -Infinity;
			p.forEach(function(point){
				var a = point.arg;
				x  = Math.min( x,  a[0], a[2] || x,  a[4] || x  );
				y  = Math.min( y,  a[1], a[3] || y,  a[5] || y  );
				x2 = Math.max( x2, a[0], a[2] || x2, a[4] || x2 );
				y2 = Math.max( y2, a[1], a[3] || y2, a[5] || y2 );

			});
			return { x:x, y:y, w:x2 - x, h:y2 - y }
		},

		processPath : function(ctx){
			var a = this._attr,
				x = a.x,
				y = a.y;

			ctx.translate(x,y);

			ctx.beginPath();
			a.path.forEach(function(seg){

				ctx[ seg.f ].apply( ctx, seg.arg);
			});
			if(a.closed)
				ctx.closePath();
			
			ctx.translate(-x,-y);
		}

	});


	/* Image
		base image class */

	Img = Class(Shape, {

		initialize : function(image, x, y, w, h, context){
			var a = this._attr;

			if( all(isNumeric, [x, y, w, h]) )
				extend(a, { x:distance(x), y:distance(y), width:w == 'auto' ? 'auto' : distance(w), height:h == 'auto' ? 'auto' : distance(h) });
			else if( all(isNumeric, [x, y]) )
				extend(a, { x:distance(x), y:distance(y) });

			if(image instanceof Image)
				a.image = image;

			else if(isString(image)){
				if(image[0] == '#')
					a.image = document.getElementById(image.substring(1));
				else
					a.image = new Image,
					a.image.src = image;
			}

			else {
				attributes(a, image);
				if(image.image instanceof Image)
					a.image = image.image;
				else if(image.image[0] == '#')
					a.image = document.getElementById(image.image.substring(1));
				else
					a.image = new Image,
					a.image.src = image.image;
				
				a.x = distance(image.x);
				a.y = distance(image.y);
				a.width  = select(image.width,  image.w);
				a.width  = a.width  == 'auto' ? 'auto' : distance(a.width);
				a.height = select(image.height, image.h);
				a.height = a.height == 'auto' ? 'auto' : distance(a.height);
				a.crop = image.crop;
			}

			a.image.onload = function(){
				context.update();
			}


			this.context = context;

		},

		x : Rect.prototype.x,
		y : Rect.prototype.y,
		width  : Rect.prototype.width,
		height : Rect.prototype.height,

		processPath : Rect.prototype.processPath,

		draw : function(ctx){
			var a = this._attr;

			if(!a.visible) return;
			
			var w = a.width  == 'auto' ? a.image.width  * (a.height / a.image.height) : a.width  || a.image.width,
				h = a.height == 'auto' ? a.image.height * (a.width  / a.image.width ) : a.height || a.image.height;
			if(a.crop)
				ctx.drawImage(a.image, a.crop[0], a.crop[1], a.crop[2], a.crop[3], a.x, a.y, w, h);
			else
				ctx.drawImage(a.image, a.x, a.y, w, h);
			
			if(a.style.strokeStyle){
				style(ctx, a.style);
				ctx.strokeRect(a.x, a.y, w, h);
				ctx.restore();
			}
		}

	});

	
	/* Text
		base text class */

	Text = Class(Shape, {

		initialize : function(text, fnt, x, y, fill, stroke, context){ // hash object!
			var a = this._attr;
			if(!isNumeric(y))
				stroke = fill,
				fill   = y,
				y      = x,
				x      = fnt,
				fnt   = '10px sans-serif';

			if(isObject(text)){
				attributes(a, text);
				
				a.text = text.text;
				
				a.x = distance(text.x);
				a.y = distance(text.y);
				a.font = font(text.font);
				extend(a.style, a.font[1]);
				a.font = a.font[0];
				a.style.textAlign = select(text.align, text.textAlign);
				a.style.textBaseline = select(text.baseline, text.textBaseline);
				a.width = select(text.minWidth, text.width)
			} else {
				a.text = text;
				a.x = x; // distance
				a.y = y;
				fnt = font(fnt);
				a.font = fnt[0];
				extend(a.style, fnt[1]);
				fillAndStroke(this, fill, stroke, context);
			}

			this.context = context;
		},

		x : function(x){
			return this.property('x', distance(x));
		},

		y : function(y){
			return this.property('y', distance(y));
		},

		font : function(fnt){
			if(fnt == null) return this._attr.font;
			extend(this._attr.font, font(fnt)[0]);
			return this._genFont();
		},

		_font : function(name, arg){
			if(arg == null) return this._attr.font[name];
			this._attr.font[name] = arg;
			return this._genFont();
		},

		_genFont : function(){
			var str = '',
				font = this._attr.font;

			if(font.italic) str += 'italic ';
			if(font.bold)   str += 'bold ';

			return this.style('font', str + (font.size || 10) + 'px ' + (font.family || 'sans-serif'));
		},

		fontFamily : function(family){
			return this._font('family', family);
		},

		fontSize : function(size){
			return this._font('size', distance(size));
		},
		
		fontWeight : function(weight){
			return this._font('bold', !!weight);
		},
		
		fontStyle : function(style){
			return this._font('italic', !!style);
		},

		textAlign : function(align){
			return this.style('textAlign', align);
		},

		textBaseline : function(baseline){
			return this.style('textBaseline', baseline);
		},

		width : function(w){
			if(w == null && this._attr.width == null){
				var ctx = this.context.context;
				style(ctx, this._attr.style);
				var m = ctx.measureText( this._attr.text ).width;
				ctx.restore();
				return m;
			}
			return this.property('width', w);
		},

		isPointIn : function(x,y){
			var a   = this._attr,
				ctx = this.context.context,

				align = a.style.textAlign || 'left', // left | center | right
				baseline = a.style.textBaseline || 'alphabetic', // top | middle | bottom | hanging | alphabetic | ideographic
				width = this.width(),
				size = this.fontSize() * 1.15, // line-height from libcanvas :)
				x = a.x,
				y = a.y;

			if( align == 'left' )
				;
			else if( align == 'center' )
				x -= width / 2;
			else if( align == 'right' )
				x -= width;

			if( baseline == 'top' )
				;
			else if( baseline == 'middle' )
				y -= size / 2;
			else if( baseline == 'bottom' || baseline == 'ideographic' )
				y -= size;
			else if( baseline == 'alphabetic' )
				y -= (size * 0.8);


			ctx.rect( x, y, width, size );

			return ctx.isPointInPath(x,y);
		},

		draw : function(ctx){
			var a = this._attr;

			if(!a.visible) return;

			style(ctx, a.style);
			if(a.style.fillStyle)
				ctx.fillText(a.text, a.x, a.y, this.width());
			if(a.style.strokeStyle)
				ctx.strokeText(a.text, a.x, a.y, this.width());

			ctx.restore();
		}

	});

	/* TextBlock
		base text block class */
	TextBlock = Class(Shape, {

		initialize : function(text, fnt, x, y, width, fill, stroke, context){
			var a = this._attr;
			if(!isNumeric(width))
				stroke = fill,
				fill   = width,
				width = y,
				y      = x,
				x      = fnt,
				fnt   = '10px sans-serif';
			if(isObject(text)){
				attributes(a, text);

				a.source = text.text;

				a.x = distance(text.x);
				a.y = distance(text.y);
				a.width = text.width;
				a.font = font(text.font);
				extend(a.style, a.font[1]);
				a.font = a.font[0];
				a.style.textAlign = select(text.align, text.textAlign);
				a.lineHeight = text.lineHeight;
				a.limit = text.limit;
			}
			else {
				a.source = text;
				a.x = x;
				a.y = y;
				fnt = font(fnt);
				a.font = fnt[0];
				extend(a.style, fnt[1]);
				a.width  = width;
				fillAndStroke(this, fill, stroke, context);
			}

			this.context = context;
			this._genLines()
		},

		text : function(text){
			if(text == null) return this._attr.source;
			this._attr.source = text;
			this._genLines();
			this.context.update();
			return this;
		},

		x : function(x){
			return this.property('x', distance(x));
		},

		y : function(y){
			return this.property('y', distance(y));
		},

		width : function(w){
			if(w == null) return this._attr.width;
			this._attr.width = w;
			this._genLines();
			this.context.update();
			return this;
		},

		height : function(){
			return this._attr.font.size * this._attr.lines.length;
		},

		_genLines : function(){
			var a = this._attr,
				s = a.source,
				l = a.lines = [],
				size = a.lineHeight || a.font.size || 10,
				ctx = this.context.context,
				w = a.width,
				countline = 1,
				t = a.style.textAlign,
				x = t == 'center' ? w / 2 : t == 'right' ? w : 0;

			style(ctx, a.style);

			s.split('\n').forEach(function(line,i){

				if( ctx.measureText(line).width > w ){
					var words = line.split(' '),
						useline = '',
						testline, i, len;

					for(i = 0, len = words.length; i < len; i++){
						testline = useline + words[i] + ' '; // прибавляем к временной переменной новое слово

						if( ctx.measureText(testline).width > w ){ // если ширина получившейся строки больше ширины блока
							// то мы вставляем новую строку
							l.push({ t:useline, x:x, y:size * countline, count:countline++ });
							// а последнее слово вставляем для следующей строки
							useline = words[i] + ' ';
						}
						else
							useline = testline;
					}
					l.push({ t:useline, x:x, y:size * countline, count:countline++ });
				}
				else
					l.push({ t:line, x:x, y:size * countline, count:countline++ });

			});

			ctx.restore();
		},

		font : Text.prototype.font,

		_font : Text.prototype._font,

		_genFont : function(){
			Text.prototype._genFont.call(this);
			this._genLines();
			this.context.update();
			return this;
		},

		fontFamily : Text.prototype.fontFamily,

		fontSize : Text.prototype.fontSize,
		
		fontWeight : Text.prototype.fontWeight,
		
		fontStyle : Text.prototype.fontStyle,

		textAlign : function(align){
			if(align == null) return this.style('textAlign');
			this._attr.style.textAlign = align;
			var w = this._attr.width;

			if(align == 'left')
				this._attr.lines.forEach(function(line){ line.x = 0 });
			else if(align == 'center')
				this._attr.lines.forEach(function(line){ line.x = w / 2 });
			else if(align == 'right')
				this._attr.lines.forEach(function(line){ line.x = w });

			this.context.update();
			return this;
		},

		lineHeight : function(height){
			if(height == null) return this._attr.lineHeight || this._attr.font.size;
			this._attr.lineHeight = height;

			this._attr.lines.forEach(function(line){
				line.y = height * line.count;
			});

			this.context.update();
			return this;
		},

		limit : function(l){
			return this.property('limit', l);
		},

		draw : function(ctx){
			var a = this._attr,
				fill   = emptyFunc,
				stroke = emptyFunc,
				x = a.x,
				y = a.y;

			if(!a.visible) return;

			style(ctx, a.style);
			if(a.style.fillStyle)
				fill = function(t,x,y){
					ctx.fillText(t,x,y);
				}
			if(a.style.strokeStyle)
				stroke = function(t,x,y){
					ctx.strokeText(t,x,y);
				}
			for(var i = 0, l = a.lines.length, l = Math.min(l, a.limit || l); i < l; i++){
				var line = a.lines[i];
				fill  (line.t, x + line.x, y + line.y);
				stroke(line.t, x + line.x, y + line.y);
			}

			ctx.restore();
		},

		isPointIn : function(x,y){
			var a = this._attr,
				rx = a.x,
				ry = a.y,
				w = a.width,
				h = a.lines.length * (a.lineHeight || a.font.size);
			return x > rx && y > ry && x < rx + w && y < ry + h;
		}

	});

	/* Gradient
		gradient class */
	Gradient = Class({

		initialize : function(type, stops){
			var a = this._attr = new Gradient.attributes;
			a.stops = stops;
		},

		getColor : function(t){

			var last,
				stops = this._attr.stops,
				keys  = Object.keys( stops ).sort();

			for(var i = 0, l = keys.length; i < l; i++){
				if(keys[i] == t)
					return stops[keys[i]];
				else if(parseFloat(last) < t && parseFloat(keys[i]) > t){
					return blendColors( stops[last], stops[keys[i]], (t - parseFloat(last)) / (parseFloat(keys[i]) - parseFloat(last)) );
				}
				last = keys[i];
			};
		},

		toCanvasGradient : function(bounds, context){
			var grad  = context.createLinearGradient(bounds.x, bounds.y, bounds.x2, bounds.y2),
				stops = this._attr.stops;

			Object.keys( stops ).sort().forEach(function(value){
				grad.addColorStop(value, 'rgba(' + stops[value].join(',') + ')');
			});
//			for(var i in stops){
//				if(stops.hasOwnProperty(i))
//					grad.addColorStop(i, stops[i]);
//			}
			return grad;
		}

	});

	Gradient.attributes = function(){
		this.colors = [];
	}


	// ctx util

	function attributes(attrs, object){ // в случае передачи хэша парсит общие аргументы
		if(object.fill)
			attrs.style.fillStyle = object.fill;
		if(object.stroke)
			extend(attrs.style, stroke( object.stroke ));
		if(object.opacity)
			attrs.style.globalAlpha = object.opacity;
		if(object.composite)
			attrs.style.globalCompositeOperation = object.composite;
		if(object.visible)
			attrs.visible = object.visible;
		if(object.mask)
			attrs.mask = object.mask;
	}

	function style(ctx, style){
		ctx.save();
		[ 'fillStyle', 'strokeStyle', 'lineWidth',
		  'lineCap', 'lineJoin', 'miterLimit',
		  'font', 'textAlign', 'textBaseline',
		  'globalAlpha', 'globalCompositeOperation',
		  'shadowColor', 'shadowOffsetX', 'shadowOffsetY',
		  'shadowBlur' ]
			.forEach(function(name){

			if(name in style)
				ctx[name] = style[name];

		});
		if(style._lineDash){
			if(ctx.setLineDash) // webkit
				ctx.setLineDash(style._lineDash);
			else // gecko
				ctx.mozDash = style._lineDash;
		}
	}

	function fillAndStroke(self, fill, str, ctx){
		ctx = ctx.context;
		if(fill) self._attr.style.fillStyle = fill;
		if(str)  extend(self._attr.style, stroke(str));

		if(isObject(fill)){
			if('url' in fill || 'image' in fill){
				// pattern
			}
			else {
		//		self._attr.gradient = { relative : true, stops : fill, angle:angle(fill.angle) || 0 };
		//		self._attr.gradient.redraw = true;

				// создание градиента
				var bounds = self.bounds();
				if( ('x' in fill && 'y' in fill) || 'bounds' in fill ){
					// absolute
				}
				else {

					var px = fill.padding ? fill.padding[0] || fill.padding : 0,
						py = fill.padding ? fill.padding[1] || fill.padding[1] || fill.padding : 0,
						pw = fill.padding ? fill.padding[2] || fill.padding[0] || fill.padding : 0,
						ph = fill.padding ? fill.padding[3] || fill.padding[1] || fill.padding : 0,

						x  = bounds.x - px,
						y  = bounds.y - py,
						xcoef = Math.cos( angle( fill.angle ) ),
						ycoef = Math.sin( angle( fill.angle ) ),
						x2 = bounds.x + bounds.w * xcoef,
						y2 = bounds.y + bounds.h * ycoef,

						grad = self._attr.style.fillStyle = ctx.createLinearGradient( x, y, x2, y2 ),
						stops = fill.stops || fill;
console.log(px,py,pw,ph);

					// парсим массив стоп
					if( isArray(stops) ){
						var temp = {};
						for(var i = 0, l = stops.length, step = 1 / (l-1); i < l; i++){
							temp[ step * i ] = stops[i];
						}
						stops = temp;
					}
					// устанавливаем стопы
					Object.keys( stops ).forEach(function(val){
						if(!isNaN(val))
							grad.addColorStop( val, stops[val] );
					});

					grad.stops = stops;
					grad.padding = [ px,py,pw,ph ];
					grad.x  = x;
					grad.y  = y;
					grad.x2 = x2;
					grad.y2 = y2;
					grad.xcoef = xcoef;
					grad.ycoef = ycoef;
				}
			}
		}
	}

	function stroke(stroke){ // parses string like '2px blue 0.5 butt'
		stroke = stroke.split(' ');
		var obj = {}, opacity, dashes = {
			shortdash:			[4, 1],
			shortdot:			[1, 1],
			shortdashdot:		[4, 1, 1, 1],
			shortdashdotdot:	[4, 1, 1, 1, 1, 1],
			dot:				[1, 3],
			dash:				[4, 3],
			longdash:			[8, 3],
			dashdot:			[4, 3, 1, 3],
			longdashdot:		[8, 3, 1, 3],
			longdashdotdot:		[8, 3, 1, 3, 1, 3]
		};
		stroke.forEach(function(value){

			if( /^\d*(\.\d*)?(px|pt|em|ex|cm)?$/.test(value) )
				obj.lineWidth = distance(value);

			else if( /^\d*\.\d+$/.test(value) )
				opacity = value;

			else if( value == 'butt' || value == 'square' )
				obj.lineCap = value;

			else if( value == 'miter' || value == 'bevel' )
				obj.lineJoin = value;

			else if( value == 'round' )
				obj.lineCap = obj.lineCap || value,
				obj.lineJoin = obj.lineJoin || value;

			else if( value in dashes )
				obj._lineDash = dashes[ value ];
			else if( value[0] == '[' && value[value.length-1] == ']')
				obj._lineDash = value.substring(1, value.length-1).split(',');

			else
				obj.strokeStyle = value;

		});
		return obj;
	}

	function distance(value){ // parses CSS-like distances (1pt, 0.5cm...)
		if(value === undefined) return;
		if(!value) return 0;
		if(isNumber(value) || /^\d*$/.test(value + '')) return value;
		var div = document.createElement('div');
		div.style.width = value;
		document.body.appendChild(div);
		var w = parseInt(getComputedStyle(div).width.split('.')[0].replace(/[^\d]/gi, ''));
		document.body.removeChild(div);
		return w;
	}

	function color(value){ // parses CSS-like colors (rgba(255,0,0,0.5), green, #f00...)
		if(value === undefined) return;
		if(!value) return 0;

		var div = document.createElement('div');
		div.style.color = value;
		document.body.appendChild(div);
		var c = getComputedStyle(div).color.split('(')[1].split(', ').map(function(v){ return parseFloat(v) });
		document.body.removeChild(div);
		if(c.length == 3)
			c.push(1);
		return c;
	}


	function blendColors(color1, color2, t){
		return [
			color1[0] + (color2[0] - color1[0]) * t,
			color1[1] + (color2[1] - color1[1]) * t,
			color1[2] + (color2[2] - color1[2]) * t,
			color1[3] + (color2[3] - color1[3]) * t
		];
	}

	function createGradient(ctx, grad, bounds){
		var g;
//		временно
		bounds.x2 = bounds.x + bounds.w;
		bounds.y2 = bounds.y + bounds.h;

		if(grad.relative){ // angle
			var x  = bounds.x,
				y  = bounds.y,
				x2 = bounds.x2,
				y2 = bounds.y2,
				a  = grad.angle,
				xcoef = Math.cos(a),
				ycoef = Math.sin(a);

			g = ctx.createLinearGradient( x, y, bounds.x + bounds.w * xcoef, bounds.y + bounds.h * ycoef );
		}
		else
			g = ctx.createLinearGradient( grad.x, grad.y, grad.x2, grad.y2 );
		Object.keys( grad.stops ).forEach(function(val){
			if(!isNaN(val))
				g.addColorStop( val, grad.stops[val] )
		});
		return g;
	}

	function angle(angle){
		var num  = parseFloat( (angle += '').replace(/[^0-9\.\,]*$/, '').split(',').join('.') ),
			unit = angle.replace(/^[0-9\.\,]*/, '');
		if(unit == '' || unit == 'deg') return num / 180 * Math.PI;
		else if(unit == 'rad')  return num;
		else if(unit == 'turn') return (num * 360) / 180 * Math.PI;
		else if(unit == 'grad') return (num / 100 * 90) / 180 * Math.PI;
	}

	function path(path){
		// TODO [ ['moveTo', x,y], ['lineTo', x,y] ]

		if(!path) return [];
		if(isArray(path)){ 
			if(isArray(path[0])){
				path[0] = { f:'moveTo', arg:path[0] };
				path.forEach(function(value, i){
					if(!i) return; // first segment
					path[i] = {};
					switch(value.length){
						case 2: path[i] = { f:'lineTo', arg:value }; break;
						case 4: path[i] = { f:'quadraticCurveTo', arg:[ value[2], value[3], value[0], value[1] ] }; break;
						case 5: path[i] = { f:'bezierCurveTo',arg:[ value[2], value[3], value[4], value[5], value[0], value[1] ] }; break;
						case 6: path[i] = { f:'arcTo', arg:value }; break;
					}
				});
			} else {
				var a = {
					'moveTo' : [ 'x', 'y' ],
					'lineTo' : [ 'x', 'y' ],
					'quadraticCurveTo' : [ 'hx', 'hy', 'x', 'y' ],
					'bezierCurveTo' : ['h1x', 'h1y', 'h2x', 'h2y', 'x', 'y'],
					'arc' : ['x', 'y', 'radius', 'start', 'end', 'clockwise'],
					'arcTo' : ['x1', 'y1', 'x2', 'y2', 'radius', 'anticlockwise'],
					'closePath' : []
				};
				path.forEach(function(fn){
					if(!fn.arg)
						set(fn, a[fn.f]);
				});

				function set(fn, names){
					fn.arg = [];
					for(var i = 0, l = names.length; i < l; i++)
						fn.arg.push( fn[ names[i] ] );
				}
			}
		} else { // SVG-like
			var str  = (path + '').toUpperCase().match(/([a-z][0-9]*,[0-9]*(,[0-9]*)?(,[0-9]*)?(,[0-9]*)?(,[0-9]*)?)/gi),
				path = [], f;

			str.forEach(function(value, i){
				path[i] = {
					f : {
						'M' : 'moveTo',
						'L' : 'lineTo',
						'B' : 'bezierCurveTo',
						'Q' : 'quadraticCurveTo',
						'R' : 'rect',
						'A' : 'arc',
						'Z' : 'closePath' // fix bug
					}[ value[0] ],

					arg : value.substr(1).split(',')
				};
			});

		}
		return path;
	}

	function point(point){
		function args(){
			for(var i = 0, l = arguments.length; i < l; i++)
				point[ arguments[i] ] = point.arg[i];
		}
		switch(point.f){
			case 'moveTo':
			case 'lineTo':
				args('x', 'y');
				break;
			case 'quadraticCurveTo':
				args('hx', 'hy', 'x', 'y');
				break;
			case 'bezierCurveTo':
				args('h1x', 'h1y', 'h2x', 'h2y', 'x', 'y');
				break;
			case 'arcTo':
				args('x1', 'y1', 'x2', 'y2', 'radius', 'clockwise');
				break;
			case 'arc':
				args('x', 'y', 'radius', 'start', 'end', 'anti');
		}
		return point;
	}

	function font(font){
		if(isString(font)){
			font = font.split(' ');
			var obj = { family:'' };
			font.forEach(function(value){

				if( /^\d*(px|pt|em)?$/.test(value) )
					obj.size = distance(value);

				else if( value == 'bold' )
					obj.bold = true;

				else if( value == 'italic' )
					obj.italic = true;

				else
					obj.family = obj.family + ' ' + value;

			});
			if( (obj.family = obj.family.replace(/^\s*/, '').replace(/\s*$/, '')) == '' )
				delete obj.family;
		}
		else {
			var obj = font;
			if(obj.size)
				obj.size = distance(obj.size);
		}
		var str = '';
		if(obj.italic) str += 'italic ';
		if(obj.bold)   str += 'bold ';
		return [ obj, {font : str + (obj.size || 10) + 'px ' + (obj.family || 'sans-serif')} ];
	}
	

	// utilities

	function extend(a,b){
		for(var i in b){
			if(Object.prototype.hasOwnProperty.call(b,i))
				a[i] = b[i];
		}
		return a;
	}

	function is(a, b){ // array1 == array2 ?..
		if(a.length != b.length) return false;
		for(var i = 0, l = a.length; i < l; i++){
			if(a[i] != b[i])
				return false;
		}
		return true;
	}

	function select(){
		for(var i = 0, l = arguments.length; i < l; i++){
			if(arguments[i] != null) return arguments[i];
		}
	}

	function all(func, params){ // isNumeric(a) && isNumeric(b) == all(isNumeric, [a,b]);
		for(var i = 0, l = params.length; i < l; i++){
			if(!func(params[i]))
				return false;
		}
		return true;
	}

	function isString(a){ return Object.prototype.toString.call(a) == '[object String]'; };
	function isArray(a) { return Object.prototype.toString.call(a) == '[object Array]' ; }
	function isObject(a){ return Object.prototype.toString.call(a) == '[object Object]'; }
	function isNumber(a){ return Object.prototype.toString.call(a) == '[object Number]'; }

	function isNumeric(a){ return isNumber(a) || !isNaN( parseFloat(a) ); }
	function isPoint(a){ return isNumeric(a) || typeof a == 'object'; }


	function Class(parent, properties){

		if(!properties) properties = parent, parent = null;

		var cls = function(){ return (cls.prototype.initialize || emptyFunc).apply(this,arguments) }
		if(parent){

			// переход в parent
			cls = function(){

				if(cls.prototype.__initialize__)
					return cls.prototype.__initialize__.apply(this,arguments);

				var parent = this.constructor.parent;
				while(parent){
					if('initialize' in parent.prototype)
						parent.prototype.initialize.apply(this, arguments);
					parent = parent.parent;
				}

				return (cls.prototype.initialize || emptyFunc).apply(this,arguments);
			}


			// наследование прототипа
			var sklass = function(){}
			sklass.prototype = parent.prototype;
			cls.prototype = new sklass;
			cls.parent = parent;
			cls.prototype.constructor = cls;

		}
		extend(cls.prototype, properties)

		return cls;

	}



	return {

		version:0.1,
		
		Context : Context,
		Shape : Shape,

		start: function(element){
			return new Context( isString(element) ? document.getElementById(element) : element.canvas ? element.canvas : element );
		}

	};

})(window);