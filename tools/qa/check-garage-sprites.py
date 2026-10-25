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
STATES = ['', '_roof1', '_roof2', '_closed']

class GarageSprites(unittest.TestCase):
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
