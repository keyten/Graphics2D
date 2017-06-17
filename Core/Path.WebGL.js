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

