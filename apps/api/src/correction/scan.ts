import {Router} from 'express';
import multer from 'multer';
import sharp from 'sharp';
import {randomUUID} from 'node:crypto';
import {basename} from 'node:path';
import {z} from 'zod';
import {ApiError} from '../assessments.js';
import {transaction,type Store} from '../db.js';
import {validateFile} from '../uploads/validation.js';
import {CorrectionService} from './service.js';
export interface CaptureQuality {paperDetected:boolean;corners:[number,number][];sharpness:number;brightness:number;warnings:string[];width:number;height:number;engine:string;}
export type ScanProcessor=(bytes:Buffer)=>Promise<{bytes:Buffer;quality:CaptureQuality}>;
export function scanRouter(db:Store,process?:ScanProcessor){
 const router=Router(),service=new CorrectionService(db);const uuid=(v:unknown)=>z.string().uuid().parse(v);
 const parser=multer({storage:multer.memoryStorage(),limits:{files:1,fileSize:10*1024*1024,fields:0,parts:1}}).single('file');
 router.post('/correction/sessions/:sid/students/:stid/capture-preview',async(req,res,next)=>{const s=await service.session(res.locals.teacher.id,uuid(req.params.sid));service.assertOpen(s);const st=await service.student(db,s.id,uuid(req.params.stid));if(!['CAPTURING','ERROR','REVIEW'].includes(st.status))throw new ApiError(409,'This student is queued or reviewed.');if(!process)throw new ApiError(503,'OpenCV needs its local Python setup. You can still upload original pages.');next();},(req,res,next)=>parser(req,res,e=>next(e)),async(req,res)=>{
  const file=req.file;if(!file)throw new ApiError(422,'Capture or choose a photo.');const original=await validateFile(file.buffer);if(original.mimeType==='application/pdf')throw new ApiError(422,'Use a JPEG or PNG photo for cleanup. Upload PDFs through Upload pages.');
  const sid=uuid(req.params.sid),stid=uuid(req.params.stid),owner=res.locals.teacher.id;
  const student=await service.student(db,sid,stid);
  const normalized=await sharp(file.buffer,{limitInputPixels:25_000_000}).rotate().resize({width:1900,height:1900,fit:'inside',withoutEnlargement:true}).jpeg({quality:95}).toBuffer();
  let result;try{result=await process!(normalized);}catch(e){throw new ApiError(503,e instanceof Error?e.message:'Photo cleanup is unavailable.');}
  const output=await validateFile(result.bytes);if(output.mimeType!=='image/jpeg')throw new ApiError(502,'Cleanup did not return a valid JPEG.');
  const previewId=randomUUID(),name=basename(file.originalname.replaceAll('\\','/')).replace(/[\x00-\x1f\x7f]/g,'').slice(0,180)||'Capture.jpg';
  await transaction(db,async tx=>{const s=await service.session(owner,sid,tx,true);service.assertOpen(s);const current=await service.student(tx,sid,stid);if(current.revision!==student.revision||!['CAPTURING','ERROR','REVIEW'].includes(current.status))throw new ApiError(409,'The student bundle changed. Retake or reload before saving.');await tx.query('DELETE FROM capture_previews WHERE expires_at<now()');const count=(await tx.query('SELECT count(*)::int AS n FROM capture_previews WHERE teacher_id=$1',[owner])).rows[0].n;if(count>=8)throw new ApiError(429,'Save or discard another preview before capturing again.');await tx.query('INSERT INTO capture_previews(id,session_id,student_id,teacher_id,student_revision,name,original_mime,original_bytes,cleaned_bytes,quality) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[previewId,sid,stid,owner,student.revision,name,original.mimeType,file.buffer,result.bytes,JSON.stringify(result.quality)]);});
  res.status(201).json({id:previewId,originalUrl:'data:image/jpeg;base64,'+normalized.toString('base64'),cleanedUrl:'data:image/jpeg;base64,'+result.bytes.toString('base64'),quality:result.quality});
 });
 router.delete('/correction/sessions/:sid/students/:stid/capture-preview/:pid',async(req,res)=>{await service.session(res.locals.teacher.id,uuid(req.params.sid));await db.query('DELETE FROM capture_previews WHERE id=$1 AND session_id=$2 AND student_id=$3 AND teacher_id=$4',[uuid(req.params.pid),req.params.sid,uuid(req.params.stid),res.locals.teacher.id]);res.status(204).end();});
 router.post('/correction/sessions/:sid/students/:stid/capture-preview/:pid/save',async(req,res)=>{
  const v=z.object({useCleaned:z.boolean(),acknowledgeWarnings:z.boolean()}).strict().parse(req.body),owner=res.locals.teacher.id,sid=uuid(req.params.sid),stid=uuid(req.params.stid),fid=randomUUID();
  await transaction(db,async tx=>{const s=await service.session(owner,sid,tx,true);service.assertOpen(s);const st=await service.student(tx,sid,stid);const p=(await tx.query('SELECT * FROM capture_previews WHERE id=$1 AND session_id=$2 AND student_id=$3 AND teacher_id=$4 AND expires_at>now() FOR UPDATE',[uuid(req.params.pid),sid,stid,owner])).rows[0];if(!p)throw new ApiError(404,'This preview expired or was already saved. Retake the photo.');if(st.revision!==p.student_revision||!['CAPTURING','ERROR','REVIEW'].includes(st.status))throw new ApiError(409,'The student bundle changed. Take a new preview before saving.');if(p.quality.warnings.length&&!v.acknowledgeWarnings)throw new ApiError(422,'Check the quality warnings before saving or retake this page.');const size=p.original_bytes.length+p.cleaned_bytes.length;const total=Number((await tx.query('SELECT coalesce(sum(byte_size),0) AS size FROM correction_files WHERE session_id=$1',[sid])).rows[0].size);if(total+size>500*1024*1024)throw new ApiError(422,'Session uploads cannot exceed 500 MB.');const pages=(await tx.query('SELECT coalesce(sum(page_count),0)::int AS pages,count(*)::int AS files FROM correction_files WHERE student_id=$1',[stid])).rows[0];if(pages.pages>=50)throw new ApiError(422,'Use up to 50 pages per student.');
  await tx.query("INSERT INTO correction_files(id,session_id,student_id,kind,position,name,mime_type,page_count,byte_size,bytes,cleaned_bytes,cleaned_quality,use_cleaned) VALUES($1,$2,$3,'PAGE',$4,$5,$6,1,$7,$8,$9,$10,$11)",[fid,sid,stid,pages.files+1,p.name,p.original_mime,size,p.original_bytes,p.cleaned_bytes,JSON.stringify(p.quality),v.useCleaned]);if(st.status!=='CAPTURING')await service.event(tx,s,owner,'STUDENT_RECAPTURED',{studentId:stid,previousDraft:st.answers});await tx.query("UPDATE correction_students SET status='CAPTURING',pages_complete=false,identity_confirmed=false,ocr_evidence=NULL,answers='[]',error='',revision=revision+1 WHERE id=$1",[stid]);await service.event(tx,s,owner,'CAPTURE_PREVIEW_SAVED',{studentId:stid,fileId:fid,position:pages.files+1,useCleaned:v.useCleaned,quality:p.quality,acknowledgeWarnings:v.acknowledgeWarnings});await tx.query('DELETE FROM capture_previews WHERE id=$1',[p.id]);});res.status(201).json({id:fid});
 });return router;
}

