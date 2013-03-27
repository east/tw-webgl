function fmod(dividend, divisor) {
	var multiplier = 0;
	
	while (divisor * multiplier < dividend) {
		multiplier++;
	}

	multiplier--;
	return dividend - (divisor * multiplier);
}

var scene = new THREE.Scene();
var aspect = window.innerWidth / window.innerHeight;
var orthsize = 1000.0
var camera = new THREE.OrthographicCamera(0, orthsize*aspect, 0, orthsize, 1, 1000 );
camera.position.z = 1;
var renderer = new THREE.WebGLRenderer();
var stats = new Stats();

stats.setMode(1);

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

stats.domElement.style.position = "absolute";
stats.domElement.style.left = "0px";
stats.domElement.style.top = "0px";
document.body.appendChild(stats.domElement);

// TESTING: render some tee's
var curSkin = 0;
skins = []

skins.push(THREE.ImageUtils.loadTexture("cammo.png"));
skins.push(THREE.ImageUtils.loadTexture("default.png"));
skins.push(THREE.ImageUtils.loadTexture("bluekitty.png"));
skins.push(THREE.ImageUtils.loadTexture("bluestripe.png"));
skins.push(THREE.ImageUtils.loadTexture("brownbear.png"));
skins.push(THREE.ImageUtils.loadTexture("saddo.png"));
skins.push(THREE.ImageUtils.loadTexture("twintri.png"));
skins.push(THREE.ImageUtils.loadTexture("redbopp.png"));
skins.push(THREE.ImageUtils.loadTexture("pinky.png"));

tees = []

var numTees = 0
for (var i = 0; i < numTees; i++)
{
	tees.push({
		obj: new tw.TeeObj(skins[curSkin]),
		pos: new THREE.Vector2(Math.random()*orthsize*aspect, Math.random()*orthsize),
		dir: new THREE.Vector2(1.0, 0.0),
		velocity: Math.max(Math.random()*10-5, 1),
		rot_vel: Math.random(),
	});

	curSkin++;
	curSkin %= skins.length;

	// set random direction
	var angle = Math.random()*360;
	tees[i].dir.set(Math.cos(angle*Math.PI/180), Math.sin(angle*Math.PI/180));
}

// add tee's to scene
for (var i = 0; i < numTees; i++)
	tees[i].obj.sceneAdd(scene);

// testing
var layer = new tw.MapLayerGeo(2, 2);
var layer_mat = new THREE.MeshBasicMaterial({ map: THREE.ImageUtils.loadTexture("grass_main.png"), transparent: true });

var layer_mesh = new THREE.Mesh(layer, layer_mat);
layer_mesh.position.set(500, 500, 0);

scene.add(layer_mesh);

function render() {
	stats.begin();

	// tick tees
	for (var i = 0; i < numTees; i++)
	{
		// set walk animation
		var walkTime = fmod(Math.abs(tees[i].pos.x), 100)/100;
		tees[i].obj.anim.set(tw.ANIMSEQ_BASE, 0);
		tees[i].obj.anim.add(tw.ANIMSEQ_WALK, walkTime, 1);


		tees[i].pos.set(tees[i].pos.x+tees[i].dir.x*tees[i].velocity, tees[i].pos.y+tees[i].dir.y*tees[i].velocity);
		tees[i].obj.pos.copy(tees[i].pos);
		tees[i].obj.dir.copy(tees[i].dir);
		tees[i].obj.tick();

		// rotate walk direction
		angle = Math.PI/180*tees[i].rot_vel;
		tees[i].dir.x = tees[i].dir.x*Math.cos(angle) - tees[i].dir.y*Math.sin(angle);
		tees[i].dir.y = tees[i].dir.x*Math.sin(angle) + tees[i].dir.y*Math.cos(angle);
	}

	requestAnimationFrame(render);
	renderer.render(scene, camera)
	stats.end();
}

render();
