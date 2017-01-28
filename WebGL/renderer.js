(function(window, $, undefined){

	$.renderers.webgl = {

		init: function(){
			var canvas = this.canvas,
				context;

			if(context = canvas.getContext('webgl'));
			else if(context = canvas.getContext('experimental-webgl'));
			else if(context = canvas.getContext('webkit-3d'));
			else if(context = canvas.getContext('moz-webgl'));
			else {
				// webgl is not supported
				$.extend(this, $.Context.prototype);
				this.context = canvas.getContext('2d');
				return this;
			}

			this.context = context;

			context.clearColor(1, 1, 1, 1); // maybe 0,0,0,0?
			context.viewport(0, 0, canvas.width, canvas.height);
			context.clear(context.COLOR_BUFFER_BIT);
		},

		_update : function(){
			var gl = this.context;
			gl.clearColor(1, 1, 1, 1);
			gl.clear(gl.COLOR_BUFFER_BIT);
			this.elements.forEach(function(object){
				object.drawGL(gl);
			});
			this.fire('update');
		}

	};


	$.extend($.Shape.prototype, {

		drawGL: function(gl){

			// Fragment Shader

			var fshader = gl.createShader(gl.FRAGMENT_SHADER);
			gl.shaderSource(fshader, [
				'void main(void){',
					'gl_FragColor = vec4(1.0, 0.0, 0.0, 0.0);',
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
				'attribute vec3 aVertexPosition;',

				'void main(void){',
					'gl_Position = vec4(aVertexPosition, 1.0);',
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


			var program = gl.createProgram();
			gl.attachShader(program, vshader);
			gl.attachShader(program, fshader);
			gl.linkProgram(program);

			if(!gl.getProgramParameter(program, gl.LINK_STATUS)){
				// Linking error
				console.log('Linking error');
			}

			gl.useProgram(program);
			var vpa = gl.getAttribLocation(program, 'aVertexPosition');
			gl.enableVertexAttribArray(vpa);


			var vertices = [
				-0.5, -0.5, 0.0,
				0.5, -0.5, 0.0,
				0.5, 0.5, 0.0,
				-0.5, 0.5, 0.0
			];
			var vertexBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
			var itemSize = 3,
				numberOfItems = 4;

			gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
			gl.vertexAttribPointer(vpa, itemSize, gl.FLOAT, false, 0, 0);
			gl.drawArrays(gl.TRIANGLE_FAN, 0, numberOfItems);
		}

	});

})(typeof window === 'undefined' ? this : window, Graphics2D);