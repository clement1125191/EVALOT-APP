import unittest
import cv2
import numpy as np
from process import process

class PaperScanTests(unittest.TestCase):
    def page(self):
        page = np.full((900, 650, 3), 245, np.uint8)
        cv2.putText(page, 'STUDENT NAME  REG 001', (35, 60), cv2.FONT_HERSHEY_SIMPLEX, .7, (35, 35, 35), 2)
        for i in range(12):
            cv2.putText(page, 'Answer: clear readable writing', (35, 130+i*50), cv2.FONT_HERSHEY_SIMPLEX, .65, (45, 45, 45), 2)
        background = np.full((1150, 1000, 3), 35, np.uint8)
        target = np.float32([[160, 120], [850, 70], [910, 1030], [110, 1050]])
        matrix = cv2.getPerspectiveTransform(np.float32([[0, 0], [649, 0], [649, 899], [0, 899]]), target)
        warped = cv2.warpPerspective(page, matrix, (1000, 1150))
        mask = cv2.warpPerspective(np.full((900, 650), 255, np.uint8), matrix, (1000, 1150))
        background[mask>0] = warped[mask>0]
        return background

    def test_detects_perspective_page_and_produces_valid_jpeg(self):
        result = process(self.page())
        self.assertTrue(result['quality']['paperDetected'])
        self.assertEqual(len(result['quality']['corners']), 4)
        self.assertLess(result['quality']['width'], 1000)
        self.assertGreater(result['quality']['height'], result['quality']['width'])
        self.assertGreater(result['quality']['sharpness'], 65)
        self.assertFalse(result['quality']['warnings'])

    def test_blur_is_flagged(self):
        result = process(cv2.GaussianBlur(self.page(), (31, 31), 12))
        self.assertTrue(any('blurry' in w for w in result['quality']['warnings']))

    def test_dark_and_borderless_image_is_not_cropped(self):
        result = process(np.full((900, 650, 3), 30, np.uint8))
        self.assertFalse(result['quality']['paperDetected'])
        self.assertEqual(result['quality']['width'], 650)
        self.assertTrue(any('dark' in w for w in result['quality']['warnings']))

    def test_small_image_is_flagged(self):
        result = process(np.full((300, 250, 3), 220, np.uint8))
        self.assertTrue(any('small' in w for w in result['quality']['warnings']))

if __name__ == '__main__':
    unittest.main()
