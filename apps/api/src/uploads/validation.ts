import sharp from 'sharp';
import { PDFDocument, PDFDict, PDFName, PDFArray, PDFRawStream, type PDFObject } from 'pdf-lib';
import { ApiError } from '../assessments.js';

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_PAGES = 50;
export interface ValidatedFile {mimeType: 'application/pdf' | 'image/jpeg' | 'image/png'; extension: 'pdf' | 'jpg' | 'png'; pageCount: number;}

/** Validate actual bytes rather than trusting the browser's MIME type or filename. */
export async function validateFile(bytes: Buffer): Promise<ValidatedFile> {
  if (!bytes.length) throw new ApiError(422, 'The file is empty.');
  if (bytes.length > MAX_FILE_BYTES) throw new ApiError(413, 'Each file must be 10 MB or smaller.');
  if (bytes.subarray(0, 5).toString() === '%PDF-') {
    let pdf: PDFDocument;
    try { pdf = await PDFDocument.load(bytes, {throwOnInvalidObject: true, updateMetadata: false}); }
    catch { throw new ApiError(422, 'This PDF is damaged or password-protected. Upload an unencrypted scan.'); }
    const pageCount = pdf.getPageCount();
    if (pageCount < 1 || pageCount > MAX_PAGES) throw new ApiError(422, 'PDFs must contain 1–50 pages.');
    // Scanned papers do not need executable actions, attachments or interactive forms.
    const prohibited = new Set(['JS','JavaScript','Launch','OpenAction','AA','EmbeddedFiles','RichMedia','XFA','AcroForm','A']);
    let inspected = 0;
    function inspect(object: PDFObject, depth=0) {
      if (++inspected>100000 || depth>40) throw new ApiError(422,'The PDF structure is too complex. Upload a plain scan.');
      if (object instanceof PDFDict) {
        if (object.keys().some(key => prohibited.has(key.decodeText()))) throw new ApiError(422,'Upload a plain scanned PDF without actions, attachments or interactive forms.');
        if (object.get(PDFName.of('Type'))?.toString()==='/EmbeddedFile') throw new ApiError(422,'PDF attachments are not supported.');
        for(const [,value] of object.entries())inspect(value,depth+1);
      } else if (object instanceof PDFArray) {
        for(const value of object.asArray())inspect(value,depth+1);
      } else if (object instanceof PDFRawStream) {
        inspect(object.dict,depth+1);
      }
    }
    for (const [, object] of pdf.context.enumerateIndirectObjects()) inspect(object);
    return {mimeType:'application/pdf',extension:'pdf',pageCount};
  }
  const png = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (!png && !jpeg) throw new ApiError(422, 'Upload a scanned PDF, JPEG or PNG file.');
  try {
    const image = sharp(bytes, {limitInputPixels: 25_000_000, failOn: 'warning'});
    const meta = await image.metadata();
    if (meta.format !== (png ? 'png' : 'jpeg') || (meta.pages ?? 1) !== 1) throw new Error('Unsupported image');
    // Decode the entire bounded image to detect truncated/corrupt scans.
    await image.raw().toBuffer();
  } catch { throw new ApiError(422, 'This image is damaged, animated or exceeds 25 million pixels.'); }
  return {mimeType:png ? 'image/png' : 'image/jpeg',extension:png ? 'png' : 'jpg',pageCount:1};
}
