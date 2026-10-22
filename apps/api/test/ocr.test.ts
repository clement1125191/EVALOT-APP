import {it,expect} from 'vitest';
import {validateOcrEvidence} from '../src/correction/ocr';
const id='11111111-1111-4111-8111-111111111111';
const files=[{id,mimeType:'image/png',bytes:Buffer.from('test'),pageCount:1,useCleaned:false}];
const raw=()=>({engine:'PaddleOCR',models:['test'],pages:[{page:1,fileId:id,filePage:1,variant:'original',warnings:[],lines:[{text:'Q1: water',confidence:.6,box:[.1,.2,.5,.1]}]}]});
it('validates exact file, page and variant evidence mapping',()=>{expect(validateOcrEvidence(raw(),files).pages[0].lines[0].text).toBe('Q1: water');const wrong=raw();wrong.pages[0].filePage=2;expect(()=>validateOcrEvidence(wrong,files)).toThrow('mapping');});
it('rejects missing pages, invalid scores and boxes outside the image',()=>{const missing=raw();missing.pages=[];expect(()=>validateOcrEvidence(missing,files)).toThrow();const invalid=raw();invalid.pages[0].lines[0].confidence=5;expect(()=>validateOcrEvidence(invalid,files)).toThrow();const outside=raw();outside.pages[0].lines[0].box=[.8,0,.5,.2];expect(()=>validateOcrEvidence(outside,files)).toThrow('mapping');});
