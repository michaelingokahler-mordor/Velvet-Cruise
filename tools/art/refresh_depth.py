"""Regenerate only the revised redwood and Gold Rush panorama.

Keep every other atlas frame and background byte-for-byte intact.
"""
import json
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools/art/scenery'))
sys.path.insert(0, str(ROOT / 'tools/art/backdrops'))
import make_routes_a as scenery
import make_snow_lake_backdrops as backdrops

tree = scenery.redwood()
scenery.save(tree, 'redwood')
source = Image.open(ROOT / 'tools/art/scenery/out/redwood.png').convert('RGBA')
atlas_path = ROOT / 'assets/sprites/atlas.png'
atlas = Image.open(atlas_path).convert('RGBA')
frame = json.loads((ROOT / 'assets/sprites/atlas.json').read_text())['frames']['redwood']
assert source.size == (frame['w'], frame['h'])
atlas.paste(source, (frame['x'], frame['y']))
atlas.save(atlas_path, optimize=True)
far = Image.fromarray(backdrops.far_13(), 'RGBA')
for path in ['assets/bg/far_s13.png', 'tools/art/backdrops/out/far_s13.png']:
    far.save(ROOT / path, optimize=True)
print('Updated redwood canopy and Gold Rush sandstone buttes; atlas geometry retained.')
