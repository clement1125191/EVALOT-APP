"""Real-model smoke test using generated, non-student content."""
import json
from pathlib import Path
import subprocess
import sys
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[2]
folder = root / '.data' / 'ocr-smoke'
folder.mkdir(parents=True, exist_ok=True)
font_path = Path('C:/Windows/Fonts/arial.ttf')
font = ImageFont.truetype(str(font_path), 44) if font_path.exists() else ImageFont.load_default(size=44)
image = Image.new('RGB', (1600, 800), 'white')
draw = ImageDraw.Draw(image)
for index, text in enumerate(['EVALOT OCR TEST', 'Student: Alice Example', 'Registration: REG001', 'Q1. Plants need sunlight and water.']):
    draw.text((80, 90 + index * 140), text, fill='black', font=font)
source = folder / 'printed-page.png'
output = folder / 'result.json'
image.save(source)
subprocess.run([sys.executable, str(root / 'services/ocr/extract.py'), str(source), '--output', str(output)], check=True, cwd=root)
result = json.loads(output.read_text(encoding='utf-8'))
text = ' '.join(line['text'] for line in result['pages'][0]['lines']).lower()
assert 'evalot' in text and 'sunlight' in text and 'reg001' in text, text
assert all(0 <= value <= 1 for line in result['pages'][0]['lines'] for value in line['box'])
print('PASS: real CPU models recognized the generated page, registration and answer; source boxes validated.')
