var tw = {}

tw.init = function() {
	tw.canvas = document.getElementById("cnvs");
	
	try {
		tw.gl = tw.canvas.getContext("experimental-webgl"); 
	} catch(e) {
		alert("Failed to initialise webgl: '" + e + "'");
		return; // Failed to initialize webgl :/
	}

	if (!tw.gl)
	{
		alert("Failed to initialise webgl");
		return;
	}
	
	// Enable GL_BLEND for transparent textures
	tw.gl.enable(tw.gl.BLEND);
	tw.gl.blendFunc(tw.gl.SRC_ALPHA, tw.gl.ONE_MINUS_SRC_ALPHA);

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

	tw.gl.useProgram(tw.stdShader);

	// Attribute / uniform references
	// Vertex position attribute
	tw.stdShader.vPosAttr = tw.gl.getAttribLocation(tw.stdShader, "aPosition");
	tw.gl.enableVertexAttribArray(tw.stdShader.vPosAttr);
	// Tex coord attribute
	tw.stdShader.vTexCoordAttr = tw.gl.getAttribLocation(tw.stdShader, "aTexCoord");
	tw.gl.enableVertexAttribArray(tw.stdShader.vTexCoordAttr);
	// Move / projection matrix
	tw.stdShader.pMatUni = tw.gl.getUniformLocation(tw.stdShader, "uPMatrix");
	tw.stdShader.mvMatUni = tw.gl.getUniformLocation(tw.stdShader, "uMVMatrix");
	
	// Texture sampler
	tw.stdShader.uSampler = tw.gl.getUniformLocation(tw.stdShader, "uSampler");

	tw.gl.clearColor(0.0, 0.1, 1.0, 1.0);

	// Mapscreen
	tw.screenSize = [1000, 1000];
	tw.curScreenSize = [1000, 1000] // Affected by camera zoom

	// Camera
	tw.cameraPos = [0.0, 0.0]
	tw.cameraZoom = 1.0

	tw.mousePressed = false
	tw.mouseDownPos = [0.0, 0.0]
	tw.mouseLastPos = [0.0, 0.0]
	tw.mouseDownInc = [0.0, 0.0]

	// Mouse events
	$("#cnvs").mousedown(function(e) {
		tw.mousePressed = true;
		tw.mouseDownPos[0] = e.clientX;
		tw.mouseDownPos[1] = e.clientY;
		
		tw.mouseDownInc[0] = 0;
		tw.mouseDownInc[1] = 0;
	});

	$("#cnvs").mouseup(function(e) {
		tw.mousePressed = false;
	});

	$("#cnvs").mousemove(function(e) {
		if (tw.mousePressed)
		{
			tw.mouseDownInc[0] += tw.mouseLastPos[0]-e.clientX;
			tw.mouseDownInc[1] += tw.mouseLastPos[1]-e.clientY;
		}

		tw.mouseLastPos[0] = e.clientX;
		tw.mouseLastPos[1] = e.clientY;
	});

	$("#cnvs").mousewheel(function(event, delta, deltaX, deltaY) {
		// Change camera zoom on mosewheel
		tw.cameraZoom += deltaY*(tw.cameraZoom/10);
		tw.zoomed = true;
	});

	tw.zoomed = false

	// LOAD TEXTURE
	tw.tex = tw.gl.createTexture();
	tw.tex.image = new Image();
	tw.tex.image.onload = function() {
		var gl = tw.gl;

		gl.bindTexture(gl.TEXTURE_2D, tw.tex);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tw.tex.image);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

		gl.bindTexture(gl.TEXTURE_2D, null);
	}

	tw.tex.image.src = "grass_main.png";

	// Test load map json
	data = tw.getJSON("dm1.json");

	// Test layer
	tw.mLayer = new tw.MapLayer(60, 50);

	// load map
	for (var i = 0; i < 60*50; i++)
		tw.mLayer.setTile(i, data.tiles[i], 0);

	tw.mainLoop();
}

tw.getJSON = function(url) {
	var json = null;

	$.ajax(
		{
			'async': false,
			'global': false,
			'url': url,
			'dataType': "json",
			'success': function(data) {
				json = data;
			}
		}
	);

	return json;
}

window.requestAnimFrame = (function() {
	if	(window.requestAnimationFrame)
		return window.requestAnimationFrame;
	if (window.webkit && window.webkit.RequestAnimationFrame)
		return window.webkit.RequestAnimationFrame;
	if (window.mozRequestAnimationFrame)
		return window.mozRequestAnimationFrame;
	
	return function(cb) {
				window.setTimeout(cb, 1000/60);
			};
})();

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
	requestAnimFrame(tw.mainLoop);

	// Set mapscreen
	tw.curScreenSize[0] = tw.screenSize[0] / tw.cameraZoom;
	tw.curScreenSize[1] = tw.screenSize[1] / tw.cameraZoom;
	// Move camera
	tw.cameraPos[0] += tw.mouseDownInc[0]*(tw.curScreenSize[0]/tw.canvas.width);
	tw.cameraPos[1] += tw.mouseDownInc[1]*(tw.curScreenSize[0]/tw.canvas.height);
	
	tw.mouseDownInc[0] = 0;
	tw.mouseDownInc[1] = 0;

	tw.render();

	// Reset zoomed state
	tw.zoomed = false;
}

tw.render = function() {
	var gl = tw.gl;

	// resize
	tw.canvas.width = window.innerWidth;
	tw.canvas.height = window.innerHeight;

	// Set viewport
	tw.gl.viewportWidth = tw.canvas.width;
	tw.gl.viewportHeight = tw.canvas.height;

	var aspect = tw.gl.viewportWidth / tw.gl.viewportHeight;
	tw.screenSize[0] = tw.screenSize[1]*aspect;

	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	gl.clear(gl.COLOR_BUFFER_BIT);

	var prjMat = mat4.create();
	mat4.ortho(prjMat, 0, tw.screenSize[0], tw.screenSize[1], 0, 1, -1);
	var mvMat = mat4.create();
	
	// Camera zoom
	mat4.scale(mvMat, mvMat, [tw.cameraZoom, tw.cameraZoom, 0.0]);

	// camera move
	mat4.translate(mvMat, mvMat, [tw.curScreenSize[0]/2-tw.cameraPos[0], tw.curScreenSize[1]/2-tw.cameraPos[1], 0.0]);
	// resize for map
	mat4.scale(mvMat, mvMat, [tw.mLayer.tileSize, tw.mLayer.tileSize, 0.0]);

	gl.uniformMatrix4fv(tw.stdShader.pMatUni, false, prjMat);
	gl.uniformMatrix4fv(tw.stdShader.mvMatUni, false, mvMat);

	// enable texture
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, tw.tex);
	gl.uniform1i(tw.stdShader.uSampler, 0);
	
	this.mLayer.tick();
	this.mLayer.render();
}

tw.MapTile = function(index, flags) {
	this.index = index;
	this.flags = flags;
}

tw.MapLayer = function(width, height) {
	this.width = width;
	this.height = height;
	this.tiles = [];
	this.vertices = new Array(width*height*8);
	this.vertexFloatArray = new Float32Array(this.vertices.length);
	this.texCoords = new Array(width*height*8);
	this.texCoordFloatArray = new Float32Array(this.texCoords.length);
	this.indices = new Array(width*height*6);
	this.indexIntArray = new Uint16Array(this.indices.length)
	this.vertexBuf = undefined;
	this.texCoordBuf = undefined;
	this.indexBuf = undefined;
	this.tileSize = 32;
	this.needInit = true;

	for(var i = 0; i < width*height; i++)
		this.tiles.push(new tw.MapTile(0, 0));
}

tw.MapLayer.prototype.tick = function() {
	if (this.needInit || tw.zoomed)
	{
		this.needInit = false;
		// Re / initialise buffers
		this.initBuffers();
	}
}

tw.MapLayer.prototype.setTileXY = function(x, y, index, flags) {
	var t = this.tiles[y*this.width+x];

	t.index = index;
	t.flags = flags;
}

tw.MapLayer.prototype.setTile = function(i, index, flags) {
	var t = this.tiles[i];

	t.index = index;
	t.flags = flags;
}

tw.MapLayer.prototype.addTile = function(index, flags) {
	this.tiles.push(new MapTile(index, flags));
}

tw.setArray = function(dstArray, offset, newArray) {
	for (var i = 0; i < newArray.length; i++) {
		dstArray[offset+i] = newArray[i];
	}
}

// Build vertices and init gl buffers
tw.MapLayer.prototype.initBuffers = function() {
	var x, y, t;

	// mipmap border correction
	var tilePixelSize = 1024/32;
	var finalTileSize = this.tileSize / (tw.curScreenSize[0]) * tw.canvas.width;
	var finalTilesetScale = finalTileSize / tilePixelSize 

	var texSize = 1024.0
	var frac = (1.25/texSize)*(1/finalTilesetScale)
	var nudge = (0.5/texSize)*(1/finalTilesetScale)

	// 
	var vertices;
	var indices;
	var texCoords;

	t = 0;
	// Vertices and texture coordinates
	for (y = 0; y < this.height; y++)
	{
		for (x = 0; x < this.width; x++)
		{
			vertices = [
				x, y,
				x, y+1.0,
				x+1.0, y+1.0,
				x+1.0, y
			];

			tw.setArray(this.vertices, t*8, vertices);

			var index = this.tiles[t].index;
			
			var tx = index%16;
			var ty = Math.round(index/16);
			
			var x0 = tx * (1024/16);
			var y0 = ty * (1024/16);
			var x1 = x0 + (1024/16)-1;
			var y1 = y0 + (1024/16)-1;

			x0 = nudge + x0/1024 + frac;
			x1 = nudge + x1/1024 - frac;
			y0 = nudge + y0/1024 + frac;
			y1 = nudge + y1/1024 - frac;

			texCoords = [
				x0, y0,
				x0, y1,
				x1, y1,
				x1, y0
			]

			tw.setArray(this.texCoords, t*8, texCoords);

			t++;
		}
	}

	var numQuads = this.width*this.height;
	t = 0;
	for (var i = 0; i < numQuads*4; i+=4)
	{
		indices = [
			i, i+1, i+2,
			i, i+2, i+3
		];

		tw.setArray(this.indices, t*6, indices);
		t++;
	}

	// Init gl buffers
	if (this.vertexBuf == undefined)
	{
		this.vertexBuf = tw.gl.createBuffer();
		this.indexBuf = tw.gl.createBuffer();
		this.texCoordBuf = tw.gl.createBuffer();
	}

	tw.gl.bindBuffer(tw.gl.ARRAY_BUFFER, this.vertexBuf);
	this.vertexFloatArray.set(this.vertices);
	tw.gl.bufferData(tw.gl.ARRAY_BUFFER, this.vertexFloatArray, tw.gl.STATIC_DRAW);
	
	tw.gl.bindBuffer(tw.gl.ARRAY_BUFFER, this.texCoordBuf);
	this.texCoordFloatArray.set(this.texCoords);
	tw.gl.bufferData(tw.gl.ARRAY_BUFFER, this.texCoordFloatArray, tw.gl.STATIC_DRAW);

	tw.gl.bindBuffer(tw.gl.ELEMENT_ARRAY_BUFFER, this.indexBuf);
	this.indexIntArray.set(this.indices);
	tw.gl.bufferData(tw.gl.ELEMENT_ARRAY_BUFFER, this.indexIntArray, tw.gl.STATIC_DRAW);
}

tw.MapLayer.prototype.render = function() {
	// Vertex attribute
	tw.gl.bindBuffer(tw.gl.ARRAY_BUFFER, this.vertexBuf);
	tw.gl.vertexAttribPointer(tw.stdShader.vPosAttr, 2, tw.gl.FLOAT, false, 0, 0);
	// Texture coord attribute
	tw.gl.bindBuffer(tw.gl.ARRAY_BUFFER, this.texCoordBuf);
	tw.gl.vertexAttribPointer(tw.stdShader.vTexCoordAttr, 2, tw.gl.FLOAT, false, 0, 0);

	tw.gl.bindBuffer(tw.gl.ELEMENT_ARRAY_BUFFER, this.indexBuf);
	tw.gl.drawElements(tw.gl.TRIANGLES, this.indices.length, tw.gl.UNSIGNED_SHORT, 0);
}

tw.vertexShader = " \
	attribute vec2 aPosition; \
	attribute vec2 aTexCoord; \
	uniform mat4 uPMatrix; \
	uniform mat4 uMVMatrix; \
	\
	varying vec2 vTexCoord; \
	\
	void main(void) \
	{ \
		gl_Position = uPMatrix * uMVMatrix * vec4(aPosition.x, aPosition.y, 0.0, 1.0); \
		vTexCoord = aTexCoord; \
	} \
";

tw.fragmentShader = " \
	precision mediump float; \
	\
	varying vec2 vTexCoord; \
	uniform sampler2D uSampler; \
	\
	void main(void) \
	{ \
		gl_FragColor = texture2D(uSampler, vec2(vTexCoord.s, vTexCoord.t)); \
	} \
";

