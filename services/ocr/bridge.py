"""Private stdin/stdout bridge; no network API or student-file paths."""
import base64
import contextlib
import json
import sys
from pathlib import Path
from tempfile import TemporaryDirectory
from extract import ROOT, create_engine, extract


def run(bundle):
    files = bundle['files']
    if not files or sum(f['pageCount'] for f in files) > 50:
        raise ValueError('Use 1 to 50 source pages.')
    engine = create_engine()
    pages = []
    temp_root = ROOT / '.data' / 'ocr-temp'
    temp_root.mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory(dir=temp_root) as folder:
        for item in files:
            data = base64.b64decode(item['data'], validate=True)
            if len(data) > 10 * 1024 * 1024:
                raise ValueError('Each source file must be at most 10 MB.')
            if item['mimeType'] == 'application/pdf':
                import pypdfium2 as pdfium
                document = pdfium.PdfDocument(data)
                try:
                    if len(document) != item['pageCount']:
                        raise ValueError('PDF page count changed.')
                    for index in range(len(document)):
                        page = document[index]
                        try:
                            w, h = page.get_size()
                            bitmap = page.render(scale=min(2., 2400 / max(w, h)))
                            try:
                                image = bitmap.to_pil()
                                path = Path(folder) / 'page.png'
                                image.save(path)
                                image.close()
                            finally:
                                bitmap.close()
                        finally:
                            page.close()
                        result = extract(path, engine)['pages'][0]
                        result.update(page=len(pages)+1, fileId=item['id'], filePage=index+1, variant=item['variant'])
                        pages.append(result)
                finally:
                    document.close()
            else:
                if item['mimeType'] not in ('image/jpeg', 'image/png') or item['pageCount'] != 1:
                    raise ValueError('Unsupported source file.')
                path = Path(folder) / 'page.png'
                path.write_bytes(data)
                result = extract(path, engine)['pages'][0]
                result.update(page=len(pages)+1, fileId=item['id'], filePage=1, variant=item['variant'])
                pages.append(result)
    return {'engine': 'PaddleOCR', 'models': ['PP-OCRv5_mobile_det', 'en_PP-OCRv5_mobile_rec'], 'pages': pages}


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
    payload = json.loads(sys.stdin.buffer.read(65 * 1024 * 1024))
    with contextlib.redirect_stdout(sys.stderr):
        result = run(payload)
    print(json.dumps(result, ensure_ascii=False))
