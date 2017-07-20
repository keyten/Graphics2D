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
			// а в этом тике надо компилировать все нужные для запушленного объекта шейдеры
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