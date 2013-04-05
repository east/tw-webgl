var tw = {
	// Constants
	// Tile flags
	TILEFLAG_VFLIP: 1,
	TILEFLAG_HFLIP: 2,
	TILEFLAG_OPAQUE: 4,
	TILEFLAG_ROTATE: 8,
}

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

	tw.aspect = 1;

	// Matrices
	tw.prjMat = mat4.create();
	tw.mvMat = mat4.create();

	//
	tw.tmpMat = mat4.create();

	// Camera
	tw.cameraPos = [0.0, 0.0]
	tw.cameraZoom = 1.0

	// Mapscreen
	tw.mapScreen = vec4.create();

	tw.screenResize();

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

	// Test load map json
	data = tw.getJSON(tw.getParams().map || "dm1.json");

	if (!data)
	{
		alert("Map not found");
		return;
	}

	this.map = new tw.Map(data);

	tw.mainLoop();
}

tw.setMapScreen = function(topLeftX, topLeftY, bottomRightX, bottomRightY) {
	tw.mapScreen[0] = topLeftX;
	tw.mapScreen[1] = topLeftY;
	tw.mapScreen[2] = bottomRightX;
	tw.mapScreen[3] = bottomRightY;
}

tw.getParams = function() {
	if (location.search === "") return {};
	var o = {}, nvPairs = location.search.substr(1).replace(/\+/g, " ").split("&");
	nvPairs.forEach( function (pair) {
		var e = pair.indexOf('=');
		var n = decodeURIComponent(e < 0 ? pair : pair.substr(0,e)),
			v = (e < 0 || e + 1 == pair.length)
				? null :
				decodeURIComponent(pair.substr(e + 1,pair.length - e));
		if (!(n in o))
			o[n] = v;
		else if (o[n] instanceof Array)
			o[n].push(v);
		else
			o[n] = [o[n] , v];
	});

	return o;
}

// Build tiles from json
tw.buildTiles = function(data, layerNum) {
	var tiles = []
	for (var i = 0; i < data.tiles.length; i++)
		tiles.push(new tw.MapTile(data.tiles[i], data.tileFlags[i]));
	
	return tiles;
}

tw.Map = function(data) {
	this.textures = []; // loaded textures
	this.groups = [];

	var grp;

	for (var g = 0; g < data.groups.length; g++)
	{
		grp = new tw.Map.Group(this,
					data.groups[g].parallaxX,
					data.groups[g].parallaxY,
					data.groups[g].offsX,
					data.groups[g].offsY);
		
		for (var l = 0; l < data.groups[g].layers.length; l++)
		{
			var dLayer = data.groups[g].layers[l];
			
			if (dLayer.tex == "")
				continue;

			grp.addLayer(dLayer.size[0], dLayer.size[1], dLayer, dLayer.tex);
		}

		this.groups.push(grp);
	}
}

tw.Map.Group = function(map, paraX, paraY, offsX, offsY) {
	this.paraX = paraX;
	this.paraY = paraY;
	this.offsX = offsX;
	this.offsY = offsY;
	this.map = map;
	this.layers = [];
}

tw.Map.Group.prototype.addLayer = function(width, height, tiles, texture) {
	var tex;
	// Check wheter the texture is loaded
	for (var i = 0; i < this.map.textures.length; i++)
	{
		if (this.map.textures[i].fileName == texture)
			tex = this.map.textures[i].texId;
	}

	if (!tex)
	{
		// Texture not found, load it
		tex = tw.loadTexture(texture);
		this.map.textures.push({ fileName: texture, texId: tex });
	}

	var newLayer = new tw.MapLayer(width, height, tw.buildTiles(tiles), this);
	newLayer.texId = tex;
	this.layers.push(newLayer);
}

tw.Map.Group.prototype.tick = function() {
	for (var i = 0; i < this.layers.length; i++)
		this.layers[i].tick();
}

tw.Map.Group.prototype.initMapScreen = function() {
	var width = 1000*tw.aspect;
	var height = 1000;

	var cx = tw.cameraPos[0]*(this.paraX/100);
	var cy = tw.cameraPos[1]*(this.paraY/100);

	width *= 1/tw.cameraZoom;
	height *= 1/tw.cameraZoom;

	var p1 = this.offsX+cx-width/2;
	var p2 = this.offsY+cy-height/2;
	var p3 = p1 + width;
	var p4 = p2 + height;

	tw.setMapScreen(p1, p2, p3, p4);
}

tw.initPrjMat = function() {
	// Init projection matrix
	mat4.ortho(tw.prjMat, tw.mapScreen[0], tw.mapScreen[2], tw.mapScreen[3], tw.mapScreen[1], 1, -1);
	tw.setMatUniforms();
}

tw.Map.Group.prototype.render = function() {

	this.initMapScreen();
	tw.initPrjMat();
	
	for (var i = 0; i < this.layers.length; i++)
	{
		var layer = this.layers[i];

		// bind texture of layer
		tw.gl.bindTexture(tw.gl.TEXTURE_2D, layer.texId);
		layer.render();
	}
}

tw.Map.prototype.tick = function() {
	for (var i = 0; i < this.groups.length; i++)
		this.groups[i].tick();
}

tw.Map.prototype.render = function() {
	// Render all groups
	for (var i = 0; i < this.groups.length; i++)
	{
		this.groups[i].render();
	}

	// Unbind texture
	tw.gl.bindTexture(tw.gl.TEXTURE_2D, null);
}

tw.loadTexture = function(imgUrl) {
	// LOAD TEXTURE
	var tex = tw.gl.createTexture();
	
	tex.image = new Image();
	tex.image.src = imgUrl;

	tex.image.onload = function() {
		var gl = tw.gl;

		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tex.image);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
		gl.generateMipmap(gl.TEXTURE_2D);
		gl.bindTexture(gl.TEXTURE_2D, null);
	}

	return tex;
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

	// Move camera
	tw.cameraPos[0] += tw.mouseDownInc[0];
	tw.cameraPos[1] += tw.mouseDownInc[1];
	
	tw.mouseDownInc[0] = 0;
	tw.mouseDownInc[1] = 0;

	tw.render();

	// Reset zoomed state
	tw.zoomed = false;
}

tw.setMatUniforms = function() {
	tw.gl.uniformMatrix4fv(tw.stdShader.pMatUni, false, tw.prjMat);
	tw.gl.uniformMatrix4fv(tw.stdShader.mvMatUni, false, tw.mvMat);
}

tw.screenResize = function() {
	tw.canvas.width = window.innerWidth;
	tw.canvas.height = window.innerHeight;

	tw.aspect = tw.canvas.width / tw.canvas.height;
}

tw.render = function() {
	var gl = tw.gl;

	tw.screenResize();	
	
	// Set viewport
	tw.gl.viewportWidth = tw.canvas.width;
	tw.gl.viewportHeight = tw.canvas.height;

	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// reset matrices
	mat4.identity(tw.mvMat);
	mat4.identity(tw.prjMat);
	
	// enable texture 0
	gl.activeTexture(gl.TEXTURE0);
	gl.uniform1i(tw.stdShader.uSampler, 0);		

	this.map.tick();
	this.map.render();
}

tw.MapTile = function(index, flags) {
	this.index = index;
	this.flags = flags;
}

tw.MapLayer = function(width, height, tiles, group) {
	this.width = width;
	this.height = height;
	this.tiles = tiles;
	this.numTiles = this.renderTileNum();

	this.vertices = new Array(this.numTiles*8);
	this.vertexFloatArray = new Float32Array(this.vertices.length);
	this.texCoords = new Array(this.numTiles*8);
	this.texCoordFloatArray = new Float32Array(this.texCoords.length);
	this.indexIntArray = new Uint16Array(this.numTiles*6)
	this.indices = new Array(this.numTiles*6);
	this.vertexBuf = undefined;
	this.texCoordBuf = undefined;
	this.indexBuf = undefined;
	this.tileSize = 32;
	this.needInit = true;
	this.group = group;
}

// get the number of tiles that will be rendered
tw.MapLayer.prototype.renderTileNum = function() {
	var num = 0;
	for (var i = 0; i < this.tiles.length; i++) {
		if (this.tiles[i].index != 0)
			num++;
	}

	return num;
}

tw.MapLayer.prototype.tick = function() {
	if (this.needInit || tw.zoomed)
	{
		this.needInit = false;
		// Re / initialise buffers
		this.group.initMapScreen();
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
	var finalTileSize = 32/(tw.mapScreen[2]-tw.mapScreen[0]) * tw.canvas.width;
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
			var curTile = this.tiles[y*this.width+x];
			var index = curTile.index;

			// skip tiles with index 0
			if (index == 0)
				continue;

			vertices = [
				x, y,
				x, y+1.0,
				x+1.0, y+1.0,
				x+1.0, y
			];

			tw.setArray(this.vertices, t*8, vertices);
		
			// Get subset offsets
			//TODO: fix border artefacts
			var tx = index%16;
			var ty = Math.floor(index/16);
			
			var px0 = tx * (1024/16);
			var py0 = ty * (1024/16);
			var px1 = px0 + (1024/16)-1;
			var py1 = py0 + (1024/16)-1;

			var tmp;
			var x0, x1, x2, x3;
			var y0, y1, y2, y3;
			
			x0 = nudge + px0/1024 + frac;
			x1 = nudge + px1/1024 - frac;
			x2 = x1
			x3 = x0

			y0 = nudge + py0/1024 + frac;
			y1 = nudge + py1/1024 - frac;
			y2 = y1;
			y3 = y0;

			// Handle tile flags
			if (curTile.flags & tw.TILEFLAG_HFLIP)
			{
				y0 = y2;
				y2 = y3;
				y3 = y0;
				y1 = y2;

			}

			if (curTile.flags & tw.TILEFLAG_VFLIP)
			{
				x0 = x1;
				x2 = x3;
				x3 = x0;
				x1 = x2;					
			}

			if (curTile.flags & tw.TILEFLAG_ROTATE)
			{
				tmp = y0;
				y0 = y1;
				y1 = y2;
				y2 = y3;
				y3 = tmp;

				tmp = x0;
				x0 = x3;
				x3 = x1;
				x1 = x2;
				x2 = tmp;
			}

			texCoords = [
				x0, y0,
				x3, y1,
				x1, y2,
				x2, y3
			]

			tw.setArray(this.texCoords, t*8, texCoords);

			t++;
		}
	}

	t = 0;
	for (var i = 0; i < this.numTiles*4; i+=4)
	{
		tw.setArray(this.indices, t*6, [
			i, i+1, i+2,
			i, i+2, i+3
		]);

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
	// MapTile resize
	mat4.copy(tw.tmpMat, tw.mvMat);
	mat4.scale(tw.mvMat, tw.mvMat, [32, 32, 0.0]);
	tw.setMatUniforms();
	
	// Vertex attribute
	tw.gl.bindBuffer(tw.gl.ARRAY_BUFFER, this.vertexBuf);
	tw.gl.vertexAttribPointer(tw.stdShader.vPosAttr, 2, tw.gl.FLOAT, false, 0, 0);
	// Texture coord attribute
	tw.gl.bindBuffer(tw.gl.ARRAY_BUFFER, this.texCoordBuf);
	tw.gl.vertexAttribPointer(tw.stdShader.vTexCoordAttr, 2, tw.gl.FLOAT, false, 0, 0);

	tw.gl.bindBuffer(tw.gl.ELEMENT_ARRAY_BUFFER, this.indexBuf);
	tw.gl.drawElements(tw.gl.TRIANGLES, this.indices.length, tw.gl.UNSIGNED_SHORT, 0);

	// Get old mvMat
	mat4.copy(tw.mvMat, tw.tmpMat);
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

