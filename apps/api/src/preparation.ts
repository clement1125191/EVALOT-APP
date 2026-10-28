import {retrieveGuidelines} from './guidelines.js';
import {ownedAssignment} from './teaching.js';
import {chatInput,validatePlan,type ChatInput,type ChatPlan} from './preparation-chat.js';
import {GeminiRequestError} from './gemini.js';
import {Router} from 'express';
import multer from 'multer';
import {randomUUID,createHash} from 'node:crypto';
import {basename} from 'node:path';
import {z} from 'zod';
import {questionInput,questionSetInput,readinessProblems,type QuestionInput,type AssessmentDetail,type GuidelineSource} from '@evalot/contracts';
import {Assessments,ApiError} from './assessments.js';
import {transaction,type Store} from './db.js';
import {validateFile} from './uploads/validation.js';
export interface Material {id:string;originalName:string;mimeType:string;byteSize:number;createdAt:string;}
export interface GenerationInput {academicContext?:Record<string,unknown>;assessment:AssessmentDetail;prompt:string;count:number;previousQuestions?:QuestionInput[];materials:(Material & {bytes:Buffer})[];guidelines?:GuidelineSource[];}
export interface PreparationOptions {chat?:(input:ChatInput)=>Promise<ChatPlan>;generate?:(input:GenerationInput)=>Promise<{questions:QuestionInput[];model:string}>;}
const cols='id,original_name AS "originalName",mime_type AS "mimeType",byte_size AS "byteSize",created_at AS "createdAt"';
async function academicContext(db:Store,owner:string,assessmentId:string){if(!(await db.query("SELECT to_regclass('assessment_contexts') AS name")).rows[0]?.name)return undefined;const row=(await db.query('SELECT specification FROM assessment_contexts WHERE assessment_id=$1 AND teacher_id=$2',[assessmentId,owner])).rows[0];if(!row)return undefined;const s=row.specification;return {educationLevel:s.educationLevel,institutionName:s.institutionName,departmentName:s.departmentName,tradeName:s.tradeName,level:s.level};}
export function preparationRouter(db:Store,options:PreparationOptions={}){
  const router=Router(),assessments=new Assessments(db);
  const parser=multer({storage:multer.memoryStorage(),limits:{fileSize:10*1024*1024,files:1,fields:0,parts:1}}).single('file');
  router.get('/preparation/options',(_req,res)=>res.json({ai:Boolean(options.generate),chat:Boolean(options.chat)}));
  router.post('/preparation/chat',async(req,res)=>{
    const input=chatInput.parse(req.body);if(!options.chat)throw new ApiError(503,'The preparation chat is not configured. Manual preparation is available.');
    const existing=input.assessmentId?await assessments.detail(res.locals.teacher.id,input.assessmentId):null;
    const teaching=input.teachingAssignmentId?await ownedAssignment(db,res.locals.teacher.id,input.teachingAssignmentId):null;
    const academic=existing?await academicContext(db,res.locals.teacher.id,existing.id):undefined;
    const context=existing?{educationLevel:academic?.educationLevel as string|undefined,title:existing.title,subject:existing.subject,className:existing.className,kind:existing.kind??'ASSESSMENT',totalMarks:existing.totalMarks,questionCount:existing.questions.length}:teaching?{educationLevel:teaching.educationLevel as string|undefined,title:'',subject:teaching.subjectName,className:teaching.levelName,kind:'',totalMarks:0,questionCount:0}:undefined;
    const bucket='preparation-chat:'+res.locals.teacher.id;
    const limit=(await db.query("INSERT INTO auth_rate_limits(bucket,attempts,expires_at) VALUES($1,1,now()+interval '15 minutes') ON CONFLICT(bucket) DO UPDATE SET attempts=CASE WHEN auth_rate_limits.expires_at<=now() THEN 1 ELSE auth_rate_limits.attempts+1 END,expires_at=CASE WHEN auth_rate_limits.expires_at<=now() THEN now()+interval '15 minutes' ELSE auth_rate_limits.expires_at END RETURNING attempts",[bucket])).rows[0];
    if(limit.attempts>40)throw new ApiError(429,'Please wait before sending more preparation messages.');
    try{const reply=await options.chat({...input,paperContext:context});const checked=validatePlan({...reply,subject:reply.subject||context?.subject||'',className:reply.className||context?.className||''},input.hasMaterials);res.json({...checked,reply:checked.ready===reply.ready?reply.reply:checked.reply});}catch(error){throw new ApiError(502,error instanceof GeminiRequestError?error.message:'The assistant could not reply. Please try again.');}
  });
  router.get('/assessments/:id/materials',async(req,res)=>{await assessments.detail(res.locals.teacher.id,z.string().uuid().parse(req.params.id));res.json((await db.query(`SELECT ${cols} FROM preparation_materials WHERE assessment_id=$1 ORDER BY created_at,id`,[req.params.id])).rows);});
  router.post('/assessments/:id/materials',async(req,res,next)=>{const a=await assessments.detail(res.locals.teacher.id,z.string().uuid().parse(req.params.id));if(a.status!=='DRAFT')throw new ApiError(409,'Preparation materials are locked after setup.');next();},(req,res,next)=>parser(req,res,error=>next(error && !(error instanceof multer.MulterError)?new ApiError(400,'Malformed upload.'):error)),async(req,res)=>{
    if(!req.file)throw new ApiError(422,'Choose a material to upload.');const bytes=req.file.buffer;
    let mime:string;
    if(req.file.originalname.toLowerCase().endsWith('.txt')){
      if(!bytes.length || bytes.length>200000 || bytes.includes(0))throw new ApiError(422,'Use a plain UTF-8 text file of up to 200 KB.');
      try{new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{throw new ApiError(422,'Text files must use UTF-8.');}mime='text/plain';
    }else mime=(await validateFile(bytes)).mimeType;
    const id=randomUUID(),name=basename(req.file.originalname.replaceAll('\\','/')).replace(/[\x00-\x1f\x7f]/g,'').slice(0,180)||'Material';
    try{await transaction(db,async tx=>{
      const a=await assessments.detail(res.locals.teacher.id,req.params.id as string,tx,true);if(a.status!=='DRAFT')throw new ApiError(409,'Preparation is locked.');
      const existing=(await tx.query('SELECT count(*)::int AS count,coalesce(sum(byte_size),0)::int AS size FROM preparation_materials WHERE assessment_id=$1',[a.id])).rows[0];
      if(existing.count>=5 || existing.size+bytes.length>30*1024*1024)throw new ApiError(422,'Use up to 5 materials and 30 MB in total.');
      await tx.query('INSERT INTO preparation_materials(id,assessment_id,original_name,mime_type,bytes,sha256,byte_size) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,a.id,name,mime,bytes,createHash('sha256').update(bytes).digest('hex'),bytes.length]);
      await tx.query('INSERT INTO audit_events(id,assessment_id,teacher_id,action,payload) VALUES($1,$2,$3,$4,$5)',[randomUUID(),a.id,res.locals.teacher.id,'MATERIAL_UPLOADED',JSON.stringify({id,name,mime,byteSize:bytes.length})]);
    });}catch(e:any){if(e.code==='23505')throw new ApiError(409,'This material is already uploaded.');throw e;}
    res.status(201).json((await db.query(`SELECT ${cols} FROM preparation_materials WHERE id=$1`,[id])).rows[0]);
  });
  router.get('/assessments/:id/materials/:materialId/original',async(req,res)=>{
    await assessments.detail(res.locals.teacher.id,z.string().uuid().parse(req.params.id));
    const row=(await db.query('SELECT original_name,mime_type,bytes FROM preparation_materials WHERE assessment_id=$1 AND id=$2',[req.params.id,z.string().uuid().parse(req.params.materialId)])).rows[0];if(!row)throw new ApiError(404,'Material not found.');
    res.set('Content-Security-Policy',"default-src 'none'; sandbox");res.attachment(row.original_name).type(row.mime_type).send(Buffer.from(row.bytes));
  });
  router.post('/assessments/:id/generate',async(req,res)=>{
    const input=z.object({revision:z.number().int().min(0),prompt:z.string().trim().min(10).max(3000),count:z.number().int().min(1).max(30),materialIds:z.array(z.string().uuid()).min(1).max(5).refine(v=>new Set(v).size===v.length),consent:z.literal(true),previousQuestions:z.array(questionInput).max(30).optional()}).strict().parse(req.body);
    const owner=res.locals.teacher.id,a=await assessments.detail(owner,z.string().uuid().parse(req.params.id));
    if(a.status!=='DRAFT' || a.revision!==input.revision)throw new ApiError(409,'Reload this draft before generating.');
    if(input.count>a.totalMarks)throw new ApiError(422,'Each question needs at least one mark.');
    const materials=(await db.query(`SELECT ${cols},bytes FROM preparation_materials WHERE assessment_id=$1 AND id=ANY($2::uuid[]) ORDER BY created_at,id`,[a.id,input.materialIds])).rows.map(row=>({...row,bytes:Buffer.from(row.bytes)}));
    if(materials.length!==input.materialIds.length)throw new ApiError(404,'Selected material not found.');
    if(!options.generate)throw new ApiError(503,'AI drafting is awaiting its API configuration. You can prepare questions manually.');
    const bucket='generation:'+owner;
    const limit=(await db.query("INSERT INTO auth_rate_limits(bucket,attempts,expires_at) VALUES($1,1,now()+interval '15 minutes') ON CONFLICT(bucket) DO UPDATE SET attempts=CASE WHEN auth_rate_limits.expires_at<=now() THEN 1 ELSE auth_rate_limits.attempts+1 END,expires_at=CASE WHEN auth_rate_limits.expires_at<=now() THEN now()+interval '15 minutes' ELSE auth_rate_limits.expires_at END RETURNING attempts",[bucket])).rows[0];if(limit.attempts>5)throw new ApiError(429,'You can generate 5 drafts every 15 minutes.');
    const retrieval=await retrieveGuidelines(db,owner,a,input.prompt);
    let output;try{output=await options.generate({academicContext:await academicContext(db,owner,a.id),assessment:a,prompt:input.prompt,count:input.count,previousQuestions:input.previousQuestions,materials,guidelines:retrieval.sources});}catch(error){throw new ApiError(502,error instanceof GeminiRequestError?error.message:'AI could not prepare this draft. Your saved questions are unchanged. Try again.');}
    let questions:QuestionInput[];try{questions=questionSetInput.parse({revision:input.revision,questions:output.questions}).questions;}catch{throw new ApiError(502,'The AI draft did not meet the marking rules. Try again.');}
    if(questions.length!==input.count || readinessProblems(a,questions).length)throw new ApiError(502,'The AI draft had incomplete answers, incorrect marks or an incompatible guideline format. Review the request and applicable guidelines, then try again.');
    const generationId=randomUUID();await transaction(db,async tx=>{
      const current=await assessments.detail(owner,a.id,tx,true);if(current.status!=='DRAFT'||current.revision!==input.revision)throw new ApiError(409,'This assessment changed while generating. Reload before continuing.');
      await tx.query('INSERT INTO preparation_generations(id,assessment_id,teacher_id,prompt,material_ids,model,questions,guideline_sources,guideline_warning) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[generationId,a.id,owner,input.prompt,JSON.stringify(input.materialIds),output.model,JSON.stringify(questions),JSON.stringify(retrieval.sources),retrieval.warning]);
      await tx.query('INSERT INTO audit_events(id,assessment_id,teacher_id,action,payload) VALUES($1,$2,$3,$4,$5)',[randomUUID(),a.id,owner,'AI_DRAFT_CREATED',JSON.stringify({generationId,materialIds:input.materialIds,model:output.model,retrievalMethod:retrieval.method,guidelineChunks:retrieval.sources.map(s=>({chunkId:s.chunkId,sha256:s.sha256}))})]);
    });res.json({questions,generationId,guidelineSources:retrieval.sources,guidelineWarning:retrieval.warning});
  });return router;
}
