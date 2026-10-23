import {Router} from 'express';
import multer from 'multer';
import sharp from 'sharp';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {paperHeaderInput,defaultPaperHeader,assessmentInput,questionSetInput} from '@evalot/contracts';
import {Assessments,ApiError} from './assessments.js';
import {transaction,type Store,type Database} from './db.js';
import {sharedLogoRouter} from './shared-logos.js';
const name=z.string().trim().min(1).max(100);
export function libraryRouter(db:Store){
 const router=Router(),assessments=new Assessments(db);
 router.use(sharedLogoRouter(db));
 async function logoCheck(tx:Database,owner:string,id:string|null){if(id && !(await tx.query('SELECT id FROM library_logos WHERE teacher_id=$1 AND id=$2',[owner,id])).rows.length)throw new ApiError(404,'Logo not found in your library.');}
 async function audit(tx:Database,owner:string,id:string,action:string,payload:unknown){await tx.query('INSERT INTO audit_events(id,assessment_id,teacher_id,action,payload) VALUES($1,$2,$3,$4,$5)',[randomUUID(),id,owner,action,JSON.stringify(payload)]);}
 router.get('/library/logos',async(_req,res)=>res.json((await db.query('SELECT id,name,created_at AS "createdAt" FROM library_logos WHERE teacher_id=$1 ORDER BY created_at DESC',[res.locals.teacher.id])).rows));
 const parser=multer({storage:multer.memoryStorage(),limits:{fileSize:2*1024*1024,files:1,fields:0,parts:1}}).single('file');
 router.post('/library/logos',(req,res,next)=>parser(req,res,error=>next(error instanceof multer.MulterError && error.code==='LIMIT_FILE_SIZE'?new ApiError(413,'Logos must be 2 MB or smaller.'):error && !(error instanceof multer.MulterError)?new ApiError(400,'Malformed logo upload.'):error)),async(req,res)=>{
  if(!req.file)throw new ApiError(422,'Choose a PNG or JPEG logo.');const bytes=req.file.buffer;
  const png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),jpeg=bytes[0]===255 && bytes[1]===216 && bytes[2]===255;
  if(!png&&!jpeg)throw new ApiError(422,'Use a PNG or JPEG logo of up to 2 MB.');
  let normalized:Buffer;try{const image=sharp(bytes,{limitInputPixels:4_000_000,failOn:'warning'});const meta=await image.metadata();if((meta.pages??1)!==1)throw new Error();normalized=await image.resize({width:800,height:800,fit:'inside',withoutEnlargement:true}).png().toBuffer();}catch{throw new ApiError(422,'Use a valid still image of up to 4 million pixels.');}
  const id=randomUUID(),label=req.file.originalname.replaceAll('\\','/').split('/').pop()!.replace(/[\x00-\x1f\x7f]/g,'').slice(0,100)||'School logo';
  await transaction(db,async tx=>{await tx.query('SELECT id FROM teachers WHERE id=$1 FOR UPDATE',[res.locals.teacher.id]);if((await tx.query('SELECT count(*)::int AS count FROM library_logos WHERE teacher_id=$1',[res.locals.teacher.id])).rows[0].count>=30)throw new ApiError(422,'Your library can hold up to 30 logos.');await tx.query('INSERT INTO library_logos(id,teacher_id,name,bytes) VALUES($1,$2,$3,$4)',[id,res.locals.teacher.id,label,normalized]);});res.status(201).json({id,name:label});
 });
 router.get('/library/logos/:id/original',async(req,res)=>{const row=(await db.query('SELECT bytes FROM library_logos WHERE teacher_id=$1 AND id=$2',[res.locals.teacher.id,z.string().uuid().parse(req.params.id)])).rows[0];if(!row)throw new ApiError(404,'Logo not found.');res.type('image/png').send(Buffer.from(row.bytes));});
 router.get('/assessments/:id/header',async(req,res)=>{const a=await assessments.detail(res.locals.teacher.id,z.string().uuid().parse(req.params.id));const saved=(await db.query('SELECT header,revision FROM paper_headers WHERE assessment_id=$1',[a.id])).rows[0];res.json({header:saved?paperHeaderInput.parse(saved.header):defaultPaperHeader(a),revision:saved?.revision??0});});
 router.put('/assessments/:id/header',async(req,res)=>{
  const input=z.object({header:paperHeaderInput,revision:z.number().int().min(0)}).strict().parse(req.body),owner=res.locals.teacher.id;
  const result=await transaction(db,async tx=>{const a=await assessments.detail(owner,z.string().uuid().parse(req.params.id),tx,true);if(a.status!=='DRAFT')throw new ApiError(409,'The paper header is locked after setup.');await logoCheck(tx,owner,input.header.logoId);
   const previous=(await tx.query('SELECT header,revision FROM paper_headers WHERE assessment_id=$1',[a.id])).rows[0];if((previous?.revision??0)!==input.revision)throw new ApiError(409,'The header changed. Reload this assessment before saving.');
   await tx.query('INSERT INTO paper_headers(assessment_id,header,revision) VALUES($1,$2,$3) ON CONFLICT(assessment_id) DO UPDATE SET header=excluded.header,revision=excluded.revision,updated_at=now()',[a.id,JSON.stringify(input.header),input.revision+1]);await audit(tx,owner,a.id,'PAPER_HEADER_SAVED',{before:previous?.header??defaultPaperHeader(a),after:input.header,revision:input.revision+1});return {header:input.header,revision:input.revision+1};});res.json(result);
 });
 router.get('/library/default-header',async(_req,res)=>{const item=(await db.query("SELECT id,snapshot FROM library_items WHERE teacher_id=$1 AND kind='HEADER' AND snapshot->>'preferred'='true' ORDER BY created_at DESC LIMIT 1",[res.locals.teacher.id])).rows[0];res.json(item?{itemId:item.id,header:paperHeaderInput.parse(item.snapshot.header)}:null);});
 router.put('/library/default-header',async(req,res)=>{const input=z.object({itemId:z.string().uuid()}).strict().parse(req.body);await transaction(db,async tx=>{await tx.query('SELECT id FROM teachers WHERE id=$1 FOR UPDATE',[res.locals.teacher.id]);const item=(await tx.query("SELECT id FROM library_items WHERE id=$1 AND teacher_id=$2 AND kind='HEADER'",[input.itemId,res.locals.teacher.id])).rows[0];if(!item)throw new ApiError(404,'School header not found.');await tx.query("UPDATE library_items SET snapshot=jsonb_set(snapshot,'{preferred}','false') WHERE teacher_id=$1 AND kind='HEADER'",[res.locals.teacher.id]);await tx.query("UPDATE library_items SET snapshot=jsonb_set(snapshot,'{preferred}','true') WHERE id=$1",[input.itemId]);});res.json({itemId:input.itemId});});
 router.post('/assessments/:id/apply-default-header',async(req,res)=>{await transaction(db,async tx=>{const owner=res.locals.teacher.id,a=await assessments.detail(owner,z.string().uuid().parse(req.params.id),tx,true);if(a.status!=='DRAFT')return;if((await tx.query('SELECT assessment_id FROM paper_headers WHERE assessment_id=$1',[a.id])).rows.length)return;const item=(await tx.query("SELECT id,snapshot FROM library_items WHERE teacher_id=$1 AND kind='HEADER' AND snapshot->>'preferred'='true' ORDER BY created_at DESC LIMIT 1",[owner])).rows[0];if(!item)return;const header=paperHeaderInput.parse(item.snapshot.header);header.title.text=a.title;header.module.text=a.subject;header.className.text=a.className;header.totalMarks.text=String(a.totalMarks);await logoCheck(tx,owner,header.logoId);await tx.query('INSERT INTO paper_headers(assessment_id,header) VALUES($1,$2)',[a.id,JSON.stringify(header)]);await audit(tx,owner,a.id,'DEFAULT_HEADER_APPLIED',{libraryId:item.id});});res.json({applied:true});});
 router.get('/library/items',async(_req,res)=>res.json((await db.query('SELECT id,name,kind,created_at AS "createdAt" FROM library_items WHERE teacher_id=$1 ORDER BY created_at DESC',[res.locals.teacher.id])).rows));
 router.get('/library/items/:id',async(req,res)=>{const row=(await db.query('SELECT id,name,kind,snapshot FROM library_items WHERE teacher_id=$1 AND id=$2',[res.locals.teacher.id,z.string().uuid().parse(req.params.id)])).rows[0];if(!row)throw new ApiError(404,'Saved item not found.');res.json(row);});
 router.post('/library/items',async(req,res)=>{
  const input=z.object({name,kind:z.enum(['HEADER','PAPER']),assessmentId:z.string().uuid()}).strict().parse(req.body),owner=res.locals.teacher.id,id=randomUUID();
  await transaction(db,async tx=>{await tx.query('SELECT id FROM teachers WHERE id=$1 FOR UPDATE',[owner]);if((await tx.query('SELECT count(*)::int AS count FROM library_items WHERE teacher_id=$1',[owner])).rows[0].count>=100)throw new ApiError(422,'Your library can hold up to 100 saved items.');
   const a=await assessments.detail(owner,input.assessmentId,tx,true),header=(await tx.query('SELECT header FROM paper_headers WHERE assessment_id=$1',[a.id])).rows[0]?.header??defaultPaperHeader(a);
   const snapshot=input.kind==='HEADER'?{header}:{header,assessment:{title:a.title,subject:a.subject,className:a.className,totalMarks:a.totalMarks,kind:a.kind??'ASSESSMENT'},questions:a.questions.map(({id,...q})=>q)};
   await tx.query('INSERT INTO library_items(id,teacher_id,name,kind,snapshot) VALUES($1,$2,$3,$4,$5)',[id,owner,input.name,input.kind,JSON.stringify(snapshot)]);await audit(tx,owner,a.id,'LIBRARY_ITEM_SAVED',{id,kind:input.kind,name:input.name});});res.status(201).json({id,...input});
 });
 router.post('/library/items/:id/copy',async(req,res)=>{
  const input=z.object({assessment:assessmentInput.optional()}).strict().parse(req.body??{});const owner=res.locals.teacher.id;
  const copy=await transaction(db,async tx=>{const item=(await tx.query('SELECT snapshot,kind FROM library_items WHERE teacher_id=$1 AND id=$2',[owner,z.string().uuid().parse(req.params.id)])).rows[0];if(!item)throw new ApiError(404,'Saved paper not found.');if(item.kind!=='PAPER')throw new ApiError(422,'Choose a saved paper to create a copy.');
   const a=input.assessment??assessmentInput.parse(item.snapshot.assessment),questions=questionSetInput.parse({revision:0,questions:item.snapshot.questions}).questions,header=paperHeaderInput.parse(item.snapshot.header);await logoCheck(tx,owner,header.logoId);const id=randomUUID(),title=(input.assessment?a.title:a.title+' (copy)').slice(0,160);if(input.assessment){header.title.text=a.title;header.module.text=a.subject;header.className.text=a.className;header.totalMarks.text=String(a.totalMarks);}if(questions.reduce((s,q)=>s+q.maxMarks,0)>a.totalMarks)throw new ApiError(422,'Saved paper marks are invalid.');
   await tx.query('INSERT INTO assessments(id,teacher_id,title,subject,class_name,total_marks,kind) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,owner,title,a.subject,a.className,a.totalMarks,a.kind??'ASSESSMENT']);
   for(const q of questions)await tx.query('INSERT INTO questions(id,assessment_id,position,type,prompt,max_marks,options,expected_answer,rubric) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[randomUUID(),id,q.position,q.type,q.prompt,q.maxMarks,JSON.stringify(q.options),q.expectedAnswer,JSON.stringify(q.rubric)]);
   await tx.query('INSERT INTO paper_headers(assessment_id,header) VALUES($1,$2)',[id,JSON.stringify(header)]);await audit(tx,owner,id,'PAPER_COPIED_FROM_LIBRARY',{libraryId:req.params.id});return assessments.detail(owner,id,tx);});res.status(201).json(copy);
 });return router;
}
