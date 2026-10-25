"""Executable pixel contracts: catches changed chassis, missing poses and destructive regeneration."""
import hashlib
import json
import unittest
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / 'tools/art/vehicles/out'
PREFIXES = ['player', 'player_yellow', 'player_green', 'player_blue', 'player_silver', 'player_azure']
STATES = ['', '_roof1', '_roof2', '_roof3', '_roof4', '_roof5', '_roof6', '_closed']

def pixels(path):
    with Image.open(path) as image:
        return np.array(image.convert('RGBA'))

class GarageSprites(unittest.TestCase):
    def test_eight_folding_poses_are_visually_distinct(self):
        for car in PREFIXES:
            for view in ['straight','left','right']:
                poses=[pixels(ART / f'{car}{state}_{view}_0.png').tobytes() for state in STATES]
                self.assertEqual(len(set(poses)),8,f'{car}/{view}: repeated folding pose')

    def test_closed_cars_do_not_keep_colored_windshield_header(self):
        # These original header pixels sit above the new canvas crown. They must be sky.
        for car in ['player_silver', 'player_azure']:
            for view, shift in [('straight',0),('left',-5),('right',5)]:
                for pose in ['0','1']:
                    a = pixels(ART / f'{car}_closed_{view}_{pose}.png')
                    for x in [25+shift,26+shift,61+shift,62+shift]:
                        self.assertEqual(int(a[1,x,3]),0,f'{car}/{view}: old colored windshield header remains at {x},1')

    def test_folding_cars_do_not_leave_old_interior_mirror_floating_above_roof(self):
        for car in ['player','player_blue']:
            for view, center in [('straight',43),('left',41),('right',45)]:
                a = pixels(ART / f'{car}_roof4_{view}_0.png')
                self.assertEqual(int(a[3,center,3]),0,f'{car}/{view}: floating interior mirror above folded roof')

    def test_closed_reference_cars_have_no_windblown_hair_beyond_window(self):
        for car in ['player', 'player_blue']:
            for view in ['straight', 'left', 'right']:
                for pose in ['0', '1']:
                    a = pixels(ART / f'{car}_closed_{view}_{pose}.png')
                    for color in [[238,188,42,255],[255,228,104,255],[255,248,196,255]]:
                        self.assertFalse(np.all(a[:15] == color, axis=2).any(), f'{car}/{view}: windblown hair outside closed roof')

    def test_body_mirrors_and_cockpit_rim_use_independent_protection_fixture(self):
        fixtures = json.loads((ROOT / 'tools/qa/fixtures/garage-roof-protected.json').read_text())['cars']
        for car, views in fixtures.items():
            for view, rectangles in views.items():
                protected = np.zeros((48, 88), bool)
                for x0, y0, x1, y1 in rectangles:
                    protected[y0:y1+1, x0:x1+1] = True
                for pose in ['0', '1']:
                    base = pixels(ART / f'{car}_{view}_{pose}.png')
                    for state in STATES[1:]:
                        path = ART / f'{car}{state}_{view}_{pose}.png'
                        if not path.exists():
                            continue  # completeness has its own assertion
                        other = pixels(path)
                        mismatch = protected & np.any(base != other, axis=2)
                        self.assertFalse(mismatch.any(), f'{path.name}: erased/changed protected pixels {np.argwhere(mismatch).tolist()[:8]}')

    def test_all_six_open_inputs_remain_immutable(self):
        fixtures = json.loads((ROOT / 'tools/qa/fixtures/garage-open-sha256.json').read_text())
        self.assertEqual(len(fixtures), 60)
        for name, expected in fixtures.items():
            self.assertEqual(hashlib.sha256((ART / name).read_bytes()).hexdigest(), expected, name)

    def test_every_car_has_animated_weather_and_steering_frames(self):
        for car in PREFIXES:
            for state in STATES:
                for view in ['straight', 'left', 'right']:
                    for pose in ['0', '1']:
                        p = ART / f'{car}{state}_{view}_{pose}.png'
                        self.assertTrue(p.exists(), f'Missing production frame: {p.name}')
                        a = np.array(Image.open(p).convert('RGBA'))
                        self.assertEqual(a.shape, (48, 88, 4), p.name)
                        self.assertLessEqual(set(np.unique(a[:, :, 3])), {0, 255}, p.name)
                        self.assertTrue(a[-1, :, 3].any(), p.name)
                    brake_path = ART / f'{car}{state}_brake_{view}.png'
                    self.assertTrue(brake_path.exists())
                    with Image.open(brake_path) as brake_image:
                        self.assertEqual(brake_image.size, (88, 48))
                empty_path = ART / f'{car}{state}_empty.png'
                self.assertTrue(empty_path.exists())
                with Image.open(empty_path) as empty_image:
                    self.assertEqual(empty_image.size, (88, 48))

    def test_roof_animation_cannot_move_body_or_lamps(self):
        for car in PREFIXES:
            for view in ['straight', 'left', 'right']:
                mask_path = ART / f'{car}_roof_mask_{view}.png'
                self.assertTrue(mask_path.exists(), mask_path.name)
                mask = np.array(Image.open(mask_path).convert('RGBA'))[:, :, 3] > 0
                self.assertFalse(mask[16:].any(), 'Roof must not own deck, chassis or tyres')
                for pose in ['0', '1']:
                    base = np.array(Image.open(ART / f'{car}_{view}_{pose}.png').convert('RGBA'))
                    for state in STATES[1:]:
                        other = np.array(Image.open(ART / f'{car}{state}_{view}_{pose}.png').convert('RGBA'))
                        self.assertTrue(np.array_equal(base[~mask], other[~mask]), f'Body jump: {car}{state}/{view}/{pose}')
                        self.assertGreater(np.count_nonzero(base != other), 0)
                brake = Image.open(ART / f'{car}_brake_{view}.png').tobytes()
                for state in STATES[1:]:
                    self.assertEqual(brake, Image.open(ART / f'{car}{state}_brake_{view}.png').tobytes())
            mask = np.array(Image.open(ART / f'{car}_roof_mask_straight.png').convert('RGBA'))[:, :, 3] > 0
            base = np.array(Image.open(ART / f'{car}_empty.png').convert('RGBA'))
            for state in STATES[1:]:
                empty = np.array(Image.open(ART / f'{car}{state}_empty.png').convert('RGBA'))
                self.assertTrue(np.array_equal(base[~mask], empty[~mask]), f'Empty-car body jump: {car}{state}')

    def test_existing_open_art_is_retained_byte_for_byte(self):
        fixture = json.loads((ROOT / 'tools/qa/fixtures/garage-legacy-sha256.json').read_text())
        for name, expected in fixture.items():
            self.assertEqual(hashlib.sha256((ART / name).read_bytes()).hexdigest(), expected, name)

    def test_occupant_animation_exists_without_moving_the_chassis(self):
        for car in PREFIXES:
            for state in ['', '_closed']:
                a = np.array(Image.open(ART / f'{car}{state}_straight_0.png').convert('RGBA'))
                b = np.array(Image.open(ART / f'{car}{state}_straight_1.png').convert('RGBA'))
                self.assertFalse(np.array_equal(a, b), car + state)
                self.assertTrue(np.array_equal(a[16:], b[16:]), car + state)

if __name__ == '__main__':
    unittest.main()
