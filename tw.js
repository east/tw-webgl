var tw = {
	// Sprites
	//[xgrid, ygrid, wgrid, hgrid, numgrids_w, numgrids_h]
	// Skin
	SPRITE_TEE_BODY: [0, 0, 3, 3, 8, 4],
	SPRITE_TEE_BODY_OUTLINE: [3, 0, 3, 3, 8, 4],
	SPRITE_TEE_HAND: [6, 0, 1, 1, 8, 4],
	SPRITE_TEE_FOOT: [6, 1, 2, 1, 8, 4],
	SPRITE_TEE_EYE_NORMAL: [2, 3, 1, 1, 8, 4],
	SPRITE_TEE_EYE_SURPRISE: [7, 3, 1, 1, 8, 4],
	SPRITE_TEE_EYE_PAIN: [4, 3, 1, 1, 8, 4],
	SPRITE_TEE_FOOT: [6, 1, 2, 1, 8, 4],
	SPRITE_TEE_FOOT_OUTLINE: [6, 2, 2, 1, 8, 4],
	// Game
	SPRITE_WEAPON_GUN_BODY: [2, 4, 4, 2, 32, 16],
	SPRITE_WEAPON_SHOTGUN_BODY: [2, 6, 8, 2, 32, 16],
	SPRITE_WEAPON_GRENADE_BODY: [2, 8, 7, 2, 32, 16],
	SPRITE_WEAPON_HAMMER_BODY: [2, 1, 4, 3, 32, 16],
	SPRITE_WEAPON_NINJA_BODY: [2, 10, 8, 2, 32, 16],
	SPRITE_WEAPON_RIFLE_BODY: [2, 12, 7, 3, 32, 16],

	//
	WEAPON_HAMMER: 0,
	WEAPON_GUN: 1,
	WEAPON_SHOTGUN: 2,
	WEAPON_GRENADE: 3,
	WEAPON_RIFLE: 4,
	WEAPON_NINJA: 5,

	// animation sequences
	// [time, x, y, angle]
	ANIMSEQ_BASE: {
		body: [
			[0, 0, -4, 0],
		],
		back_foot: [
			[0, 0, 10, 0],
		],
		front_foot: [
			[0, 0, 10, 0],	
		],
		attach: [],
	},

	ANIMSEQ_IDLE: {
		body: [],
		back_foot: [
			[0,-7, 0, 0],
		],
		front_foot: [
			[0, 7, 0, 0],	
		],
		attach: [],
	},

	ANIMSEQ_INAIR: {
		body: [],
		back_foot: [
			[0,-3, 0, -0.1],
		],
		front_foot: [
			[0, 3, 0, -0.1],	
		],
		attach: [],
	},

	ANIMSEQ_WALK: {
		body: [
			[0, 0, 0, 0],
			[0.2, 0, -1, 0],
			[0.4, 0, 0, 0],
			[0.6, 0, 0, 0],
			[0.8, 0, -1, 0],
			[1, 0, 0, 0],
		],

		back_foot: [
			[0, 8, 0, 0],
			[0.2, -8, 0, 0],
			[0.4, -10, -4, 0.2],
			[0.6, -8, -8, 0.3],
			[0.8, 4, -4, -0.2],
			[1, 8, 0, 0],
		],

		front_foot: [
			[0.0,-10,-4, 0.2],
			[0.2, -8,-8, 0.3],
			[0.4, 4,-4,-0.2],
			[0.6, 8, 0, 0],
			[0.8, 8, 0, 0],
			[1,-10,-4, 0.2],
		],
		
		attach: [],
	},
}

tw.SpriteGeo = function(width, height, uvs, yflip) {
	THREE.Geometry.call(this);

	this.width = width;
	this.height = height;

	var x = width / 2;
	var y = height / 2;

	// add plane vertices
	this.vertices.push(new THREE.Vector3(-x, y));
	this.vertices.push(new THREE.Vector3(x, y));
	this.vertices.push(new THREE.Vector3(x, -y));
	this.vertices.push(new THREE.Vector3(-x, -y));

	var a = 0;
	var b = 1;
	var c = 2;
	var d = 3;

	var face = new THREE.Face4(a, b, c, d);
	var normal = new THREE.Vector3(0, 0, 1);
	face.vertexNormals.push(normal.clone(), normal.clone(), normal.clone(), normal.clone());
	this.faces.push(face);

	// set texture coordinates
	var vx1;
	var vx2;
	if (yflip)
	{
		vx2 = uvs[0]*1/uvs[4];
		vx1 = uvs[0]*1/uvs[4] + uvs[2]*1/uvs[4];
	}
	else
	{
		vx1 = uvs[0]*1/uvs[4];
		vx2 = uvs[0]*1/uvs[4] + uvs[2]*1/uvs[4];
	}

	var vy1 = ((uvs[5]-(uvs[1]+uvs[3]))*1/uvs[5]);
	var vy2 = 1 - uvs[1]/uvs[5];

	this.faceVertexUvs[0].push([
		new THREE.Vector2(vx1, vy1),
		new THREE.Vector2(vx2, vy1),
		new THREE.Vector2(vx2, vy2),
		new THREE.Vector2(vx1, vy2)
	]);
}

tw.mix = function(a, b, amount) {
	return a + (b-a)*amount;
}

tw.animSeqEval = function(animSeq, time, dstFrame) {
	if (animSeq.length == 0)
	{
		dstFrame.time = 0;
		dstFrame.pos.set(0, 0);
		dstFrame.angle = 0;
	}
	else if(animSeq.length == 1)
		dstFrame.set(animSeq[0][0], animSeq[0][1], animSeq[0][2], animSeq[0][3]);
	else
	{
		var frame1 = undefined;
		var frame2 = undefined;
		var blend;

		for (var i = 1; i < animSeq.length; i++) {
			if (animSeq[i-1][0] <= time && animSeq[i][0] >= time)
			{
				frame1 = animSeq[i-1];
				frame2 = animSeq[i];
				blend = (time - frame1[0]) / (frame2[0] - frame1[0]);
				break;
			}
		}

		if (frame1 && frame2)
		{
			dstFrame.set(
				time,
				tw.mix(frame1[1], frame2[1], blend),
				tw.mix(frame1[2], frame2[2], blend),
				tw.mix(frame1[3], frame2[3], blend)
			);
		}
	}
}

tw.animAddKeyframe = function(fDst, fAdded, Amount) {
	fDst.pos.set(fDst.pos.x+fAdded.pos.x*Amount, fDst.pos.y+fAdded.pos.y*Amount);
	fDst.angle += fAdded.angle * Amount;
}

tw.AnimKeyframe = function() {
	this.time = 0;
	this.pos = new THREE.Vector2(0.0, 0.0);
	this.angle = 0;
}

tw.AnimKeyframe.prototype.set = function(time, x, y, angle) {
	this.time = time;
	this.pos.set(x, y);
	this.angle = angle;
}

tw.AnimState = function() {
	this.body = new tw.AnimKeyframe();
	this.backFoot = new tw.AnimKeyframe();
	this.frontFoot = new tw.AnimKeyframe();
	this.attach = new tw.AnimKeyframe();
}

tw.AnimState.prototype.set = function(anim, time) {
	tw.animSeqEval(anim.body, time, this.body);
	tw.animSeqEval(anim.back_foot, time, this.backFoot);
	tw.animSeqEval(anim.front_foot, time, this.frontFoot);
	tw.animSeqEval(anim.attach, time, this.attach);
}

tw.AnimState.prototype.add = function(anim, time, amount) {
	tw.tmpAnim.set(anim, time);

	tw.animAddKeyframe(this.body, tw.tmpAnim.body, amount);
	tw.animAddKeyframe(this.backFoot, tw.tmpAnim.backFoot, amount);
	tw.animAddKeyframe(this.frontFoot, tw.tmpAnim.frontFoot, amount);
	tw.animAddKeyframe(this.attach, tw.tmpAnim.attach, amount);
}

// temporary animation state for preventing creating objects locally
tw.tmpAnim = new tw.AnimState();

tw.TeeObj = function(skinTexture, gameTexture) {
	this.dir = new THREE.Vector2(0, 1);
	this.pos = new THREE.Vector2(0, 0);
	this.skinTexture = skinTexture;
	this.gameTexture = gameTexture;
	this.objs = []
	this.size = 64
	this.weapon = tw.WEAPON_GUN;

	var material = new THREE.MeshBasicMaterial({ map: this.skinTexture, transparent: true });
	var gameMat = new THREE.MeshBasicMaterial({ map: this.gameTexture, transparent: true });
	var sprite;

	this.bodyPos = new THREE.Vector2(0, 0);
	this.grounded = true;

	// animation state
	this.anim = new tw.AnimState();

	// The mesh objects have to be created in a specific order for correct overlapping	
	// front foot
	sprite = new tw.SpriteGeo(1, 0.5, tw.SPRITE_TEE_FOOT, true);
	this.mesh_frontFoot = new THREE.Mesh(sprite, material);
	this.objs.push(this.mesh_frontFoot);

	// eyes
	sprite = new tw.SpriteGeo(1, 1, tw.SPRITE_TEE_EYE_NORMAL);
	this.mesh_eye1 = new THREE.Mesh(sprite, material);
	sprite = new tw.SpriteGeo(1, 1, tw.SPRITE_TEE_EYE_NORMAL, true);
	this.mesh_eye2 = new THREE.Mesh(sprite, material);
	this.objs.push(this.mesh_eye1);
	this.objs.push(this.mesh_eye2);

	// body
	sprite = new tw.SpriteGeo(1, 1, tw.SPRITE_TEE_BODY);
	this.mesh_body = new THREE.Mesh(sprite, material);
	this.objs.push(this.mesh_body);

	// back foot
	sprite = new tw.SpriteGeo(1, 0.5, tw.SPRITE_TEE_FOOT);
	this.mesh_backFoot = new THREE.Mesh(sprite, material);
	this.objs.push(this.mesh_backFoot);

	// body outline
	sprite = new tw.SpriteGeo(1, 1, tw.SPRITE_TEE_BODY_OUTLINE);
	this.mesh_body_outline = new THREE.Mesh(sprite, material);
	this.objs.push(this.mesh_body_outline);

	// back foot outline
	sprite = new tw.SpriteGeo(1, 0.5, tw.SPRITE_TEE_FOOT_OUTLINE);
	this.mesh_backFootOutline = new THREE.Mesh(sprite, material);
	this.objs.push(this.mesh_backFootOutline);

	// front foot outline
	sprite = new tw.SpriteGeo(1, 0.5, tw.SPRITE_TEE_FOOT_OUTLINE, true);
	this.mesh_frontFootOutline = new THREE.Mesh(sprite, material);
	this.objs.push(this.mesh_frontFootOutline);
}

tw.TeeObj.prototype.tick = function() {
	// scale all meshes
	for (var i = 0; i < this.objs.length; i++)
		this.objs[i].scale.set(this.size, this.size, 1);

	// position/rotate/scale meshes
	this.bodyPos.set(this.anim.body.pos.x, this.anim.body.pos.y);
	// body
	this.mesh_body.rotation.set(0.0, 0.0, this.anim.body.angle*Math.PI*2);
	this.mesh_body_outline.rotation.set(0.0, 0.0, this.anim.body.angle*Math.PI*2);
	this.mesh_body.position.set(this.pos.x+this.bodyPos.x, this.pos.y+this.bodyPos.y, 0);
	this.mesh_body_outline.position.set(this.pos.x+this.bodyPos.x, this.pos.y+this.bodyPos.y, 0);

	// eyes
	eyeScale = 0.4
	eyeSeperation = (0.075 - 0.01*Math.abs(this.dir.x))*this.size;
	offset = new THREE.Vector2(this.dir.x*0.125, -0.05+this.dir.y*0.1).multiplyScalar(this.size);

	
	//TODO: find a better solution for re scaling
	this.mesh_eye1.scale.multiplyScalar(eyeScale);
	this.mesh_eye2.scale.multiplyScalar(eyeScale);
	// I don't want to scale z in an orthographic projecion
	this.mesh_eye1.scale.z = 1
	this.mesh_eye2.scale.z = 1
	this.mesh_eye1.position.set(this.pos.x+this.bodyPos.x-eyeSeperation+offset.x, this.pos.y+this.bodyPos.y+offset.y, 0);	
	this.mesh_eye2.position.set(this.pos.x+this.bodyPos.x+eyeSeperation+offset.x, this.pos.y+this.bodyPos.y+offset.y, 0);	

	// feet's
	this.mesh_backFoot.position.set(this.pos.x+this.anim.backFoot.pos.x, this.pos.y+this.anim.backFoot.pos.y, 0);
	this.mesh_backFootOutline.position.set(this.pos.x+this.anim.backFoot.pos.x, this.pos.y+this.anim.backFoot.pos.y, 0);

	this.mesh_frontFoot.position.set(this.pos.x+this.anim.frontFoot.pos.x, this.pos.y+this.anim.frontFoot.pos.y, 0);
	this.mesh_frontFootOutline.position.set(this.pos.x+this.anim.frontFoot.pos.x, this.pos.y+this.anim.frontFoot.pos.y, 0);

	var bAngle = this.anim.backFoot.angle*Math.PI*2;
	var fAngle = this.anim.frontFoot.angle*Math.PI*2;
	this.mesh_backFoot.rotation.set(0, 0, bAngle);
	this.mesh_backFootOutline.rotation.set(0, 0, bAngle);
	this.mesh_frontFoot.rotation.set(0, 0, fAngle);
	this.mesh_frontFootOutline.rotation.set(0, 0, fAngle);
}

//tw.TeeObj.prototype.animAdd = function()

tw.TeeObj.prototype.sceneAdd = function(scene) {
	for (var i = 0; i < this.objs.length; i++)
		scene.add(this.objs[i]);
}

tw.TeeObj.prototype.sceneRem = function(scene) {
	for (var i = 0; i < this.objs.length; i++)
		scene.remove(this.objs[i]);
}

tw.SpriteGeo.prototype = Object.create(THREE.Geometry.prototype);
