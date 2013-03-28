var tw = {}

tw.init = function() {
	tw.canvas = document.getElementById("cnvs");
	
	try {
		tw.gl = tw.canvas.getContext("experimental-webgl"); 
	} catch(e) {
		alert("Failed to initialise webgl: '" + e + "'");
		return; // Failed to initialize webgl :/
	}

	// Init shaders
	tw.stdShader = tw.gl.createProgram();
	
	var fShader = tw.buildShader(tw.fragmentShader, tw.gl.FRAGMENT_SHADER);
	var vShader = tw.buildShader(tw.vertexShader, tw.gl.VERTEX_SHADER);

	if (!fShader || !vShader) {
		alert("Compiling shaders failed");
		return;
	}

	tw.gl.attachShader(tw.stdShader, fShader);
	tw.gl.attachShader(tw.stdShader, vShader);
	tw.gl.linkProgram(tw.stdShader);

	if (!tw.gl.getProgramParameter(tw.stdShader, tw.gl.LINK_STATUS)) {
		alert(tw.gl.getProgramInfoLog(tw.stdShader));
		return;
	}

	tw.gl.useProgram(tw.gl.stdShader);

	// Attribute / uniform references
	// Vertex position attribute
	tw.stdShader.vPosAttr = tw.gl.getAttribLocation(tw.stdShader, "aPosition");
	tw.gl.enableVertexAttribArray(tw.stdShader.vPosAttr);
	// Move / projection matrix
	tw.stdShader.pMatUni = tw.gl.getUniformLocation(tw.stdShader, "uPMMatrix");
	tw.stdShader.mvMatUni = tw.gl.getUniformLocation(tw.stdShader, "uMVMatrix");

	tw.gl.clearColor(0.0, 0.0, 0.0, 1.0);

	tw.mainLoop();
}

tw.buildShader = function(str, type) {
	var shader = tw.gl.createShader(type);
	tw.gl.shaderSource(shader, str);
	tw.gl.compileShader(shader);

	if (!tw.gl.getShaderParameter(shader, tw.gl.COMPILE_STATUS)) {
		console.log(tw.gl.getShaderInfoLog(shader));
		return null;
	}

	return shader;
}

tw.mainLoop = function() {
	var gl = tw.gl;

	// resize
	tw.canvas.width = window.innerWidth;
	tw.canvas.height = window.innerHeight;

	// Set viewport
	tw.gl.viewportWidth = tw.canvas.width;
	tw.gl.viewportHeight = tw.canvas.height;

	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

tw.vertexShader = " \
	attribute vec3 aPosition; \
	\
	uniform mat4 uMVMatrix; \
	uniform mat4 uPMMatrix; \
	\
	void main(void) \
	{ \
		gl_Position = uPMMatrix * uMVMatrix * vec4(aPosition, 1.0); \
	} \
";

tw.fragmentShader = " \
	void main(void) \
	{ \
		gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0); \
	} \
";
