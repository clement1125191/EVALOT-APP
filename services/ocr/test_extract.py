import unittest
from extract import normalize_result

class EvidenceTests(unittest.TestCase):
    def test_normalized_source_boxes_and_scores(self):
        page = normalize_result({'rec_texts': ['Q1. Photosynthesis'], 'rec_scores': [.82], 'rec_polys': [[[10, 20], [90, 20], [90, 40], [10, 40]]]}, 100, 200)
        self.assertEqual(page['lines'][0]['box'], [.1, .1, .8, .1])
        self.assertEqual(page['lines'][0]['confidence'], .82)
        self.assertNotIn('mark', page['lines'][0])
    def test_mismatched_evidence_is_rejected(self):
        with self.assertRaises(ValueError):
            normalize_result({'rec_texts': ['Missing coordinates']}, 100, 200)
    def test_empty_text_is_flagged(self):
        self.assertIn('No readable text detected.', normalize_result({}, 100, 200)['warnings'])

if __name__ == '__main__':
    unittest.main()
