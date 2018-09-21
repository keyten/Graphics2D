var GLContext;

// всё, где комментарий "// {{debug}}", нужно убрать из прода (todo: встроить {{debug}} ... {{/debug}} в grunt модуль)
/*
Основные оптимизации:
 - Рисовать объекты с одним буфером вместе.
 - Рисовать более ближние объекты первыми.
 */

GLContext = new Class(Context, {
	initialize: function(canvas){
		// WebGL
		this.gl = this._getAndPrepareGLContext(canvas);
		if(!this.gl){
			return new Delta.contexts['2d'](canvas);
		}
		this.shaders = {};
		this.buffers = {};

		// Context
		this.canvas    = canvas;
		this.elements  = [];
		this.listeners = {};
		// array for not yet drawn obs
		this._missing  = [];

		// todo: this.drawMissing = this.drawMissing.bind(this)
		this.drawMissingBound = this.drawMissing.bind(this);
		this.updateNowBounded = this.updateNow.bind(this);
	},

	_getAndPrepareGLContext: function(canvas){
		var gl;

		if(gl = canvas.getContext('webgl'));
		else if(gl = canvas.getContext('experimental-webgl'));
		else if(gl = canvas.getContext('webkit-3d'));
		else if(gl = canvas.getContext('moz-webgl'));
		else {
			// webgl is not supported
			return null;
		}

		// проверить, нужно ли вообще эту функцию вызывать
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.clearColor(1, 0.8, 0.9, 1); // maybe 0,0,0,0?
		gl.clear(gl.COLOR_BUFFER_BIT);
		return gl;
	},

	// Methods
	push : function(element){
		element.context = this;
		this.elements.push(element);

		if(element.shadersRequired){
			element.shadersRequired.forEach(function(shaderName){
				this.initShader(shaderName);
			}.bind(this));
		}

		if(element.drawGL){
			this._missing.push(element);
			if(!this._willDrawMissing){
				requestAnimationFrame(this.drawMissingBound);
				this._willDrawMissing = true;
			}
			// надо исполнять в следующем тике, чтобы сгруппировать объекты с одним буфером вместе
			// а в этом тике надо компилировать все нужные для запушенного объекта шейдеры
			// причём там рисуем в обратном порядке => последний скомпиленный шейдер, уже подключенный в gl
			// и используется первым :P
			// element.drawGL(this.gl);
		}

		return element;
	},

	initShader: function(name){
		if(this.shaders[name]){
			return;
		}

		if(!GLContext.shadersFactory[name]){
			throw "The shader \"" + name + "\" is not exist.";
		}

		this.shaders[name] = GLContext.shadersFactory[name](this.gl, this);
	},

	drawMissing: function(){
		this._willDrawMissing = false;

		// Рисовать нужно с depth-буфером и в обратном порядке (чтобы gl-ю приходилось меньше рисовать).
		// Кроме того, подключенный последним шейдер будет заюзан в таком порядке первым.
		// Кроме того, нужно группировать объекты по шейдерам / буферам.
		// Но пока не всё понятно в случае с depthtest с blending mode
		var gl = this.gl;
		this._missing.forEach(function(element){
			element.drawGL(gl);
		});
	}

});

GLContext.shadersFactory = {
	'fragment-common': function(gl){
		return Delta.createShader(gl, gl.FRAGMENT_SHADER, [
			'#ifdef GL_ES',
				'precision highp float;',
			'#endif',

			'varying vec4 vColor;', // а этот шейдер типа не умеет в униформы?
			'void main(void){',
				'gl_FragColor = vec4(vColor[0] / 255.0, vColor[1] / 255.0, vColor[2] / 255.0, vColor[3]);',
			'}'
		].join('\n'));;
	}
};

// GL utilities
Delta.createShader = function(gl, type, source){
	var shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	// {{debug}}
	if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
		var log = gl.getShaderInfoLog(shader);
		gl.deleteShader(shader);
		throw "Shader compilation error: " + log;
	}
	// {{/debug}}
	return shader;
}

Delta.contexts['gl'] = GLContext;

/* From Path.WebGL */
GLContext.shadersFactory['vertex-path'] = function(gl){
	return Delta.createShader(gl, gl.VERTEX_SHADER, [
		'attribute vec2 aVertexPosition;',
		'uniform vec4 rectCoords;',
		'uniform vec4 uColor;',
		'varying vec4 vColor;',
		'float canvasWidth = ' + gl.canvas.width + '.0;',
		'float canvasHeight = ' + gl.canvas.height + '.0;',

		'void main(void){',
			'vColor = uColor;',
			'gl_Position = vec4(',
				'aVertexPosition[0],',
				'aVertexPosition[1],',
				'1.0,',
				'1.0',
			');',
		'}'
	].join('\n'));
};

GLContext.shadersFactory['program-path'] = function(gl, delta){
	var program = gl.createProgram();
	gl.attachShader(program, delta.shaders['vertex-path']);
	gl.attachShader(program, delta.shaders['fragment-common']);
	gl.linkProgram(program);

	// {{debug}}
	if(!gl.getProgramParameter(program, gl.LINK_STATUS)){
		throw "Could not initialize shaders";
	}
	// {{/debug}}

	// if(delta._lastProgram !== delta.shaders['program-rect']) ...
	gl.useProgram(program);
	program.uColor = gl.getUniformLocation(program, 'uColor');
	program.rectCoords = gl.getUniformLocation(program, 'rectCoords');
	program.v_aVertexPosition = gl.getAttribLocation(program, 'aVertexPosition');
	gl.enableVertexAttribArray(program.v_aVertexPosition);
	return program;
}

Path.prototype.shadersRequired = ['fragment-common', 'vertex-path', 'program-path'];

Path.prototype.drawGL = function(gl){
	var delta = this.context;

	if(!delta.buffers['rect']){
		var vertexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
			0.0, 0.0,
			0.5, 0.5,
			0.5, 0.0,
			0.5, -0.5,
			-1.0, 0.0
		]), gl.STATIC_DRAW);

		delta.buffers['rect'] = vertexBuffer;
	}

	var color = Delta.color(this.styles.fillStyle);
	gl.uniform4f(delta.shaders['program-rect'].uColor, color[0], color[1], color[2], color[3]);
	gl.uniform4f(
		delta.shaders['program-rect'].rectCoords,
		10,
		10,
		200,
		200
	);

	gl.vertexAttribPointer(delta.shaders['program-rect'].v_aVertexPosition, 2, gl.FLOAT, false, 0, 0);
	gl.drawArrays(gl.TRIANGLE_FAN, 0, 5);
};

/* From Rect.WebGL */
GLContext.shadersFactory['vertex-rect'] = function(gl){
	return Delta.createShader(gl, gl.VERTEX_SHADER, [
		'attribute vec2 aVertexPosition;',
		'uniform vec4 rectCoords;',
		'uniform vec4 uColor;',
		'varying vec4 vColor;',
		 'float canvasWidth = ' + gl.canvas.width + '.0;',
		 'float canvasHeight = ' + gl.canvas.height + '.0;',

		'void main(void){',
			'vColor = uColor;',
			'gl_Position = vec4(',
				// тут можно поделить на canvasWidth всё сразу
				'(aVertexPosition[0] * rectCoords[2] / canvasWidth) - 1.0 + rectCoords[2] / canvasWidth + (rectCoords[0] * 2.0 / canvasWidth),',
				'(aVertexPosition[1] * rectCoords[3] / canvasHeight) + 1.0 - rectCoords[3] / canvasHeight - (rectCoords[1] * 2.0 / canvasHeight),',
				'1.0,',
				'1.0',
			');',
		'}'
	].join('\n'));
};

GLContext.shadersFactory['program-rect'] = function(gl, delta){
	var program = gl.createProgram();
	gl.attachShader(program, delta.shaders['vertex-rect']);
	gl.attachShader(program, delta.shaders['fragment-common']);
	gl.linkProgram(program);

	// {{debug}}
	if(!gl.getProgramParameter(program, gl.LINK_STATUS)){
		throw "Could not initialize shaders";
	}
	// {{/debug}}

	// if(delta._lastProgram !== delta.shaders['program-rect']) ...
	gl.useProgram(program);
	program.uColor = gl.getUniformLocation(program, 'uColor');
	program.rectCoords = gl.getUniformLocation(program, 'rectCoords');
	program.v_aVertexPosition = gl.getAttribLocation(program, 'aVertexPosition');
	gl.enableVertexAttribArray(program.v_aVertexPosition);
	return program;
}

Rect.prototype.shadersRequired = ['fragment-common', 'vertex-rect', 'program-rect'];

Rect.prototype.drawGL = function(gl){
	var delta = this.context;

	if(!delta.buffers['rect']){
		var vertexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
			-1, -1,
			1, 1,
			1, -1,

			-1, -1,
			1, 1,
			-1, 1
		]), gl.STATIC_DRAW);

		delta.buffers['rect'] = vertexBuffer;
	}

	var color = Delta.color(this.styles.fillStyle);

	gl.uniform4f(
		delta.shaders['program-rect'].uColor,
		color[0],
		color[1],
		color[2],
		color[3]
	);

	gl.uniform4f(
		delta.shaders['program-rect'].rectCoords,
		this.attrs.x,
		this.attrs.y,
		this.attrs.width,
		this.attrs.height
	);

	gl.vertexAttribPointer(delta.shaders['program-rect'].v_aVertexPosition, 2, gl.FLOAT, false, 0, 0);
	gl.drawArrays(gl.TRIANGLES, 0, 6);
};
