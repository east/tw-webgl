from tml.tml import *
from tml.items import *
import json
import sys

def build_json(path):
	t = Teemap(path);
	groups = []

	for curGroup in t.groups:
		grp = { 'layers': [],
				'parallaxX': curGroup.parallax_x,
				'parallaxY': curGroup.parallax_y,
				'offsX': curGroup.offset_x,
				'offsY': curGroup.offset_y,
			}
		
		for curLayer in curGroup.layers:
			if curLayer.__class__ == TileLayer:

				l = { 'type': "tilelayer", 'size': [0, 0], 'tiles': [], 'tileFlags': [], 'tex': "",
						'color': curLayer.color}

				# size
				l['size'][0] = curLayer._width
				l['size'][1] = curLayer._height

				# texture png
				if curLayer.image_id != -1:
					l['tex'] = t.images[curLayer.image_id].name + ".png"	

				for curTile in curLayer.tiles:
					l['tiles'] += [curTile.index]
					l['tileFlags']+= [curTile._flags]
			elif curLayer.__class__ == QuadLayer:
				l = { 'type': "quadlayer", 'tex': "", 'quads': []}

				if curLayer.image_id != -1:
					l['tex'] = t.images[curLayer.image_id].name + ".png"	
				
				for q in curLayer.quads:
					l['quads'] += [{
						'pos_env': q.pos_env,
						'pos_env_offs': q.pos_env_offset,
						'color_env': q.color_env,
						'color_env_offs': q.color_env_offset,
						'points': q.points,
						'colors': q.colors,
						'texcoords': q.texcoords,
					}]			

			else:
				continue;

			grp['layers'] += [l]
		
		groups += [grp]

				
	return json.dumps({'groups': groups}, separators=(',', ': '), sort_keys=True)

if len(sys.argv) < 2:
	print("Usage: %s map1 [map2]" % (sys.argv[0]))
	sys.exit(1)

for curMap in sys.argv[1:]:
	f = open(curMap+".json", "w")
	f.write(build_json(curMap));
	f.close();
	print(curMap+".json")
	
sys.exit(0)
