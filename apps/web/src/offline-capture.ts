import type {CorrectionSession} from '@evalot/contracts';
import {api} from './api';
import {getPrivate,putPrivate,privateKeys,removePrivate,vaultUnlocked,vaultOwner,cacheRead} from './offline-vault';
export interface LocalPage{id:string;name:string;mime:string;size:number;uploaded:boolean}
export interface CaptureBundle{owner:string;id:string;sessionId:string;number:number;pages:LocalPage[];complete:boolean;consent:boolean;status:'CAPTURING'|'PENDING'|'UPLOADING'|'WAITING'|'DONE'|'ERROR';error:string;createdAt:string}
let mutations=Promise.resolve(),syncing:Promise<void>|null=null;
function serial<T>(fn:()=>Promise<T>):Promise<T>{const next=mutations.then(fn);mutations=next.then(()=>{},()=>{});return next;}
function changed(){window.dispatchEvent(new Event('evalot:offline-captures'));}
export async function bundles(sessionId?:string){const records=await Promise.all((await privateKeys('bundle:')).map(k=>getPrivate<CaptureBundle>(k)));return records.filter((v):v is CaptureBundle=>!!v&&(!sessionId||v.sessionId===sessionId)).sort((a,b)=>a.createdAt.localeCompare(b.createdAt));}
export async function addCapturedPage(session:CorrectionSession,bundleId:string|undefined,number:number,file:Blob,name:string){return serial(async()=>{
 if(!vaultUnlocked())throw new Error('Enable and unlock the offline workspace in Settings before offline capture.');if(file.size>10*1024*1024)throw new Error('Use a page smaller than 10 MB.');
 const bundle=bundleId?await getPrivate<CaptureBundle>('bundle:'+bundleId):undefined;
 const value:CaptureBundle=bundle??{owner:vaultOwner(),id:crypto.randomUUID(),sessionId:session.id,number,pages:[],complete:false,consent:false,status:'CAPTURING',error:'',createdAt:new Date().toISOString()};
 if(value.complete)throw new Error('This student is already saved. Start the next student.');if(value.pages.length>=50||value.pages.reduce((n,p)=>n+p.size,0)+file.size>20*1024*1024)throw new Error('Use at most 50 pages and 20 MB per student.');
 const id=crypto.randomUUID(),bytes=new Uint8Array(await file.arrayBuffer());let encoded='';for(let i=0;i<bytes.length;i+=8192)encoded+=String.fromCharCode(...bytes.subarray(i,i+8192));
 await putPrivate('page:'+id,btoa(encoded));value.pages.push({id,name,mime:file.type,size:file.size,uploaded:false});await putPrivate('bundle:'+value.id,value);await cacheRead('/correction/sessions/'+session.id,session);changed();return value;
 });}
export async function completeCapturedBundle(id:string,consent:boolean){return serial(async()=>{const value=await getPrivate<CaptureBundle>('bundle:'+id);if(!value?.pages.length)throw new Error('Capture the front page first.');value.complete=true;value.consent=consent;value.status='PENDING';await putPrivate('bundle:'+id,value);changed();return value;});}
async function update(bundle:CaptureBundle){if(bundle.owner!==vaultOwner())throw new Error('Unlock the original capture account before syncing.');await putPrivate('bundle:'+bundle.id,bundle);changed();}
async function sendBundle(bundle:CaptureBundle){const root='/correction/sessions/'+bundle.sessionId;bundle.status='UPLOADING';await update(bundle);
 let session=await api<CorrectionSession>(root);if(session.status!=='OPEN')throw new Error('This marking sheet is published. Pending captures remain on this device.');
 let student=session.students.find(s=>s.id===bundle.id);
 if(!student){await api(root+'/students','POST',{captureOnly:true,clientId:bundle.id});}
 if(!student||student.status==='CAPTURING'){
  for(const page of bundle.pages){if(page.uploaded)continue;const encoded=await getPrivate<string>('page:'+page.id);if(!encoded)throw new Error('A saved page is missing. Retake it before processing.');const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)),form=new FormData();form.append('file',new Blob([bytes],{type:page.mime}),page.name);const response=await fetch('/api'+root+'/students/'+bundle.id+'/pages',{method:'POST',headers:{'X-Evalot-Request':'1','X-Evalot-Upload-ID':page.id},body:form});const result=await response.json();if(!response.ok)throw new Error(result.error??'Page upload failed.');page.uploaded=true;await update(bundle);}
  session=await api<CorrectionSession>(root);student=session.students.find(s=>s.id===bundle.id);if(!student?.pagesComplete)await api(root+'/students/'+bundle.id+'/complete','POST',{});
 }
 session=await api<CorrectionSession>(root);student=session.students.find(s=>s.id===bundle.id);
 if(session.guide.status!=='READY'){
  if(!bundle.consent){bundle.status='WAITING';bundle.error='Pages uploaded. The marking guide needs preparation in Marking settings.';await update(bundle);return;}
  try{session=await api<CorrectionSession>(root+'/prepare-guide','POST',{consent:true});}catch(e){bundle.status='WAITING';bundle.error=(e as Error).message;await update(bundle);return;}
 }
 if(student&&['CAPTURING','ERROR'].includes(student.status))await api(root+'/students/'+bundle.id+'/mark','POST',{consent:bundle.consent});
 await api<CorrectionSession>(root);bundle.status='DONE';bundle.error='';await update(bundle);
 // Delete page payloads only after the server has acknowledged the entire student bundle and marking request.
 for(const page of bundle.pages)await removePrivate('page:'+page.id);changed();
}
export function syncCaptures(){if(syncing)return syncing;if(!navigator.onLine||!vaultUnlocked())return Promise.resolve();syncing=(async()=>{for(const bundle of await bundles()){if(bundle.status==='DONE'){for(const page of bundle.pages)await removePrivate('page:'+page.id);continue;}if(!bundle.complete)continue;try{await sendBundle(bundle);}catch(e){bundle.status='ERROR';bundle.error=(e as Error).message;await update(bundle);if(!navigator.onLine)break;}}})().finally(()=>{syncing=null;});return syncing;}
