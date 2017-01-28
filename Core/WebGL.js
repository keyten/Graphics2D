// https://www.khronos.org/registry/webgl/specs/1.0/#5.2
$.renderers['gl'] = {

	init: function(delta, canvas){
		delta.gl = canvas.getContext('webgl')
		        || canvas.getContext('experimental-webgl');

		delta.gl.viewport(0, 0, canvas.width, canvas.height);
		// это делает канвас непрозрачным
		// попробовать от этого избавиться
		// todo
//		delta.gl.clearColor(1, 1, 1, 1);
//		delta.gl.clear(delta.gl.COLOR_BUFFER_BIT);
//		работает и без этого, но как его потом очищать??

	// можно очищать канвас изменением его размеров!
		delta.context = delta.gl;
	},

	createShader: function(gl, type, source){
		var shader = gl.createShader(type);
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
		if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
			var log = gl.getShaderInfoLog(shader);
			gl.deleteShader(shader);
			throw "Shader compilation error: " + log;
		}
		return shader;
	},

	initShaders: function(gl, style){
		var fs = this.createShader(gl, gl.FRAGMENT_SHADER, [
			'#ifdef GL_ES',
				'precision highp float;',
			'#endif',

			'varying vec4 vColor;',
			'void main(void){',
				'gl_FragColor = vec4(vColor[0] / 255.0, vColor[1] / 255.0, vColor[2] / 255.0, vColor[3]);',
			'}'
		].join('\n'));

		var vs = this.createShader(gl, gl.VERTEX_SHADER, [
			'attribute vec2 aVertexPosition;',
			'uniform vec4 rectCoords;',
			'uniform vec4 uColor;',
			'varying vec4 vColor;',
			'float canvasWidth = ' + gl.canvas.width + '.0;',
			'float canvasHeight = ' + gl.canvas.height + '.0;',

			'void main(void){',
				'vColor = uColor;',
				'gl_Position = vec4(',
					'(aVertexPosition[0] * rectCoords[2] / canvasWidth) - 1.0 + rectCoords[2] / canvasWidth + (rectCoords[0] * 2.0 / canvasWidth),',
					'(aVertexPosition[1] * rectCoords[3] / canvasHeight) + 1.0 - rectCoords[3] / canvasHeight - (rectCoords[1] * 2.0 / canvasHeight),',
					'1.0,',
					'1.0',
//					'(aVertexPosition[0] + rectCoords[0] - (canvasWidth / 2.0)) / (canvasWidth / 2.0),',
//					'(-aVertexPosition[1] - rectCoords[1] + (canvasHeight / 2.0)) / (canvasHeight / 2.0),',
//					'1.0,',
//					'1.0',
				');',
			'}'
		].join('\n'));

		var program = gl.createProgram();
		gl.attachShader(program, vs);
		gl.attachShader(program, fs);
		gl.linkProgram(program);

		if(!gl.getProgramParameter(program, gl.LINK_STATUS)){
			throw "Could not initialize shaders";
		}

		gl.useProgram(program);

		program.v_aVertexPosition = gl.getAttribLocation(program, 'aVertexPosition');
		gl.enableVertexAttribArray(program.v_aVertexPosition);
		program.uColor = gl.getUniformLocation(program, 'uColor');
		program.rectCoords = gl.getUniformLocation(program, 'rectCoords')

		return program;
	},

	initBuffers: function(gl, vertices){
		var vertexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

		return vertexBuffer;
	},

	drawRect: function(params, gl, style, matrix, object){
		var x1 = params[0],
			y1 = params[1],
			x2 = x1 + params[2],
			y2 = y1 + params[3],
			program = this.shader || (this.shader = this.initShaders(gl)),
			buffer = this.buffer || (this.buffer = this.initBuffers(gl, [
				-1, -1,
				1, 1,
				1, -1,

				-1, -1,
				1, 1,
				-1, 1
				/* x1, y1,
				x2, y2,
				x2, y1,

				x1, y1,
				x2, y2,
				x1, y2 */
			]));

		var color = $.color(style.fillStyle);
		gl.uniform4f(program.uColor, color[0], color[1], color[2], color[3]);
		gl.uniform4f(program.rectCoords, x1, y1, x2, y2);

		gl.vertexAttribPointer(program.v_aVertexPosition, 2, gl.FLOAT, false, 0, 0);
		gl.drawArrays(gl.TRIANGLES, 0, 6);
	},

	preRedraw: function(){},
	postRedraw: function(){}

};