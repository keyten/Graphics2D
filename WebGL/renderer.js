(function(window, $, undefined){

$.renderers.webgl = {

	init: function(delta, canvas){
		var canvas = delta.canvas,
			gl;

		if(gl = canvas.getContext('webgl'));
		else if(gl = canvas.getContext('experimental-webgl'));
		else if(gl = canvas.getContext('webkit-3d'));
		else if(gl = canvas.getContext('moz-webgl'));
		else {
			// webgl is not supported
			delta.renderer = $.renderers['2d'];
			delta.renderer.init(delta, canvas);
			return;
		}

		delta.context = gl;

		gl.clearColor(0, 0, 0, 1); // maybe 0,0,0,0?
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.clear(gl.COLOR_BUFFER_BIT);
	},

	preRedraw: function(gl, delta){
		gl.clearColor(1, 1, 1, 1);
		gl.clear(gl.COLOR_BUFFER_BIT);
	},

	preDraw: function(ctx, delta){},

	postDraw: function(ctx){},

	// params = [cx, cy, radius]
	drawCircle: function(params, ctx, style, matrix, object){},

	// drawRect
		// todo: передавать delta в аргументы
		/* var delta = object.context;
		if(!delta._rectBuffers){
			var posBuf = gl.createBuffer(),
				colBuf = gl.createBuffer();

			gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
				0,0, 0,0,
				0,1, 0,1,
				1,1, 1,1,
				1,0, 1,0
			]), gl.STATIC_DRAW);

			delta._rectBuffers = [posBuf, colBuf];
		} else {
			gl.bindBuffer(gl.ARRAY_BUFFER, delta._rectBuffers[0]);
		}

		gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 4, gl.FLOAT, false, 0, 0); */

	// todo: move into pre
	checkProgram: function(delta, gl){
		if(delta._glProgram){
			gl.useProgram(delta._glProgram);
			return delta._glProgram;
		}

		// Fragment Shader
		var fshader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(fshader, [
			'void main(void){',
				'gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);',
			'}'
		].join('\n'));
		gl.compileShader(fshader);

		if(!gl.getShaderParameter(fshader, gl.COMPILE_STATUS)){
			// Compiling shader error
			gl.deleteShader(fshader);
		}

		// Vertex shader
		var vshader = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vshader, [
			// incoming coordinate
			'attribute vec3 aVertexPosition;',
			// transformations (canvas, object, rectTransform)
			'uniform mat3 uTransforms[3];',
			// coord system transform
			'const mat4 coordTransform = mat4(' + (1 / delta.canvas.width) + ',0,0,0, 0,' + (-1 / delta.canvas.height) + ',0,0, 0,0,1,1, -1,1,0,1);',

			// multiplying matrices
			'mat3 transform = /* (uTransforms[0] * uTransforms[1]) */ uTransforms[2];',

			'void main(void){',
				'gl_Position = coordTransform * vec4(' +
					'transform[0][0] * aVertexPosition[0] + transform[0][1] * aVertexPosition[1] + transform[0][2],' +
					'transform[1][0] * aVertexPosition[0] + transform[1][1] * aVertexPosition[1] + transform[1][2],' +
					'aVertexPosition[2], 1.0);',
			'}'
		].join('\n'));
		gl.compileShader(vshader);

		if(!gl.getShaderParameter(vshader, gl.COMPILE_STATUS)){
			// Compiling shader error
			console.log('Compiling shader error');
			// todo: throw internal g2d error (that switches to other renderer)
			// $.rendererError('Compiling shader error', this.context);
			gl.deleteShader(vshader);
		}

		// Making a program
		var program = gl.createProgram();
		gl.attachShader(program, vshader);
		gl.attachShader(program, fshader);
		gl.linkProgram(program);

		if(!gl.getProgramParameter(program, gl.LINK_STATUS)){
			// Linking error
			console.log('Linking error');
		}

		gl.useProgram(program);
		delta._glProgram = program;

		return program;
	},

	// params = [x, y, width, height]
	drawRect: function(params, gl, style, matrix, object){
		// вопрос: сохраняются ли attribLocation, или же меняются после каждого / некоторых useProgram?
		// можно ли закэшировать в program.vertexPosition?

		// вообще стоит предположить, что никто больше на канвасе не рисует, и не вызывать каждый раз useProgram

		var delta = object.context;
		var program = this.checkProgram(delta, gl);

		// standart initialize
		 if(!program.vertexBuffer){
			var vertices = [
				-1, -1, 0,
				+1, -1, 0,
				+1, +1, 0,
				-1, +1, 0
			];
			var vertexBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

			var vpa = gl.getAttribLocation(program, 'aVertexPosition');
			var itemSize = 3;
			gl.enableVertexAttribArray(vpa);
			gl.vertexAttribPointer(vpa, itemSize, gl.FLOAT, false, 0, 0);
			program.vertexBuffer = vertexBuffer;
		 }

		var canvasMatrix = (delta.matrix || [1, 0, 0, 1, 0, 0]),
			objectMatrix = (matrix || [1, 0, 0, 1, 0, 0]);

		gl.uniformMatrix3fv(
			gl.getUniformLocation(program, 'uTransforms[0]'),
			false, // может, нужно транспонировать, и не придётся так извращаться
			[
				canvasMatrix[0], canvasMatrix[2], canvasMatrix[4],
				canvasMatrix[1], canvasMatrix[3], canvasMatrix[5],
				0, 0, 1
			]
		);

		gl.uniformMatrix3fv(
			gl.getUniformLocation(program, 'uTransforms[1]'),
			false,
			[
				objectMatrix[0], objectMatrix[2], objectMatrix[4],
				objectMatrix[1], objectMatrix[3], objectMatrix[5],
				0, 0, 1
			]
		);

		gl.uniformMatrix3fv(
			gl.getUniformLocation(program, 'uTransforms[2]'),
			false,
			[
				params[2], 0, params[0] * 2 + params[2],
				0, params[3], params[1] * 2 + params[3],
				0, 0, 1
			]
		);

		if(style.fillStyle){
			gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
		}

		if(style.strokeStyle){
			gl.drawArrays(gl.LINE_LOOP, 0, 4);
		}
	},

	drawCircle: function(params, ctx, style, matrix, object){},

	// params is an array of curves
	drawPath: function(params, ctx, style, matrix, object){},

	// params = [image, x, y]
	// params = [image, x, y, w, h]
	// params = [image, x, y, w, h, cx, cy, cw, ch]
	drawImage: function(params, ctx, style, matrix, object){},

	drawData: function(params, ctx, style, matrix, object){},

	// params = [text, x, y]
	drawTextLines: function(params, ctx, style, matrix, object){},

	makeGradient: function(delta, type, from, to, colors){},

	pre: function(ctx, style, matrix, object){},

	post: function(ctx, style){},

	// text
	_currentMeasureContext: null,
	preMeasure: function(font){},
	measure: function(text){},
	postMeasure: function(){}

};

})(typeof window === 'undefined' ? this : window, Graphics2D);