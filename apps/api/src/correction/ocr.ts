import {spawn} from 'node:child_process';
import {ocrEvidenceSchema,type OcrEvidence} from '@evalot/contracts';
export interface OcrSource {id:string;mimeType:string;bytes:Buffer;pageCount:number;useCleaned:boolean;}
export type OcrExtractor=(files:OcrSource[])=>Promise<OcrEvidence>;
export function validateOcrEvidence(raw:unknown,files:OcrSource[]){
 const evidence=ocrEvidenceSchema.parse(raw);let page=0;
 const expected=files.flatMap(f=>Array.from({length:f.pageCount},(_,i)=>({id:f.id,filePage:i+1,variant:f.useCleaned?'cleaned':'original'})));
 if(evidence.pages.length!==expected.length)throw new Error('OCR page coverage differs from the saved bundle.');
 for(const p of evidence.pages){const f=expected[page++];if(p.page!==page||p.fileId!==f.id||p.filePage!==f.filePage||p.variant!==f.variant||p.lines.some(l=>l.box[0]+l.box[2]>1.001||l.box[1]+l.box[3]>1.001))throw new Error('OCR source mapping is invalid.');}
 return evidence;
}
export function localPaddleOCR(python:string,script:string):OcrExtractor{return files=>new Promise((resolve,reject)=>{
 if(!files.length||files.reduce((n,f)=>n+f.pageCount,0)>50||files.reduce((n,f)=>n+f.bytes.length,0)>45*1024*1024){reject(new Error('OCR bundle is too large.'));return;}
 const child=spawn(python,[script],{windowsHide:true,stdio:['pipe','pipe','pipe'],env:{...process.env,PYTHONIOENCODING:'utf-8',PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK:'True'}});
 let ended=false,size=0;const chunks:Buffer[]=[];
 const finish=(error?:Error)=>{if(ended)return;ended=true;clearTimeout(timer);if(error){child.kill();reject(error);return;}try{resolve(validateOcrEvidence(JSON.parse(Buffer.concat(chunks).toString('utf8')),files));}catch{reject(new Error('OCR returned invalid evidence.'));}};
 const timer=setTimeout(()=>finish(new Error('Local OCR timed out. Try fewer pages.')),180000);
 child.stdout.on('data',(chunk:Buffer)=>{size+=chunk.length;if(size>8*1024*1024)finish(new Error('OCR result is too large.'));else chunks.push(chunk);});
 // Diagnostics may include document content. Do not log or persist stderr.
 child.stderr.on('data',()=>{});child.on('error',()=>finish(new Error('Local OCR could not start. Check OCR_PYTHON.')));child.on('close',code=>finish(code===0?undefined:new Error('Local OCR failed. Check the Python installation and model cache.')));child.stdin.on('error',()=>finish(new Error('Local OCR input failed.')));
 child.stdin.end(JSON.stringify({files:files.map(f=>({id:f.id,mimeType:f.mimeType,pageCount:f.pageCount,variant:f.useCleaned?'cleaned':'original',data:f.bytes.toString('base64')}))}));
 });}
