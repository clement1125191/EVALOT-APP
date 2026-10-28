import {beforeAll,afterAll,it,expect} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import request from 'supertest';
import {PDFDocument} from 'pdf-lib';
import {createApp} from '../src/app';
import type {Store} from '../src/db';
import type {GenerationInput} from '../src/preparation';
import {openAIDrafter} from '../src/ai-drafter';
const db=new PGlite();const store:Store={query:(sql,params)=>db.query(sql,params),connect:async()=>({query:(sql,params)=>db.query(sql,params),release(){}})};
const owner='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
let captured:GenerationInput|undefined;let bad=false;
const questions=[1,2].map(position=>({position,type:'SHORT_ANSWER' as const,prompt:'Explain a role of leaves.',maxMarks:5,options:[],expectedAnswer:'Leaves support photosynthesis.',rubric:[]}));
const app=createApp(store,owner,{preparation:{generate:async input=>{captured=input;return {questions:bad?[{...questions[0],maxMarks:11}]:questions,model:'test-model'};}}}),foreign=createApp(store,other);
const base={title:'Plant nutrition',subject:'Biology',className:'S3 A',totalMarks:10};
let id:string,materialId:string;
async function upload(target=id,name='notes.txt',bytes=Buffer.from('Leaves make food through photosynthesis.')){return request(app).post(`/api/assessments/${target}/materials`).attach('file',bytes,name);}
beforeAll(async()=>{for(const file of ['001_initial.sql','002_uploads.sql','003_teacher_auth.sql','004_account_recovery.sql','005_preparation.sql','006_teacher_library.sql','007_correction_hub.sql','008_capture_cleanup.sql','014_ocr_evidence.sql','009_assignment_kind.sql','010_educator_context.sql','011_material_library.sql','012_assignment_departments.sql','013_assessment_guidelines.sql'])await db.exec(await readFile(new URL('../migrations/'+file,import.meta.url),'utf8'));await db.exec(await readFile(new URL('../migrations/016_academic_marking.sql',import.meta.url),'utf8'));await db.exec(await readFile(new URL('../migrations/017_mark_adjustments.sql',import.meta.url),'utf8'));await db.query('INSERT INTO teachers(id,display_name) VALUES($1,$2),($3,$4)',[owner,'Teacher A',other,'Teacher B']);},30000);
afterAll(async()=>{await db.close();});
it('persists Exam, Assessment and CAT with a backwards-compatible default',async()=>{
 for(const kind of ['EXAM','ASSESSMENT','CAT','ASSIGNMENT']){const response=await request(app).post('/api/assessments').send({...base,kind});expect(response.status).toBe(201);expect(response.body.kind).toBe(kind);if(kind==='CAT')id=response.body.id;}
 expect((await request(app).post('/api/assessments').send(base)).body.kind).toBe('ASSESSMENT');expect((await request(app).post('/api/assessments').send({...base,kind:'OTHER'})).status).toBe(422);
});
it('stores and reviews exact source bytes, deduplicates, and audits upload',async()=>{
 const r=await upload();expect(r.status).toBe(201);materialId=r.body.id;expect(r.body.bytes).toBeUndefined();expect((await upload()).status).toBe(409);
 expect((await request(app).get(`/api/assessments/${id}/materials`)).body).toHaveLength(1);
 expect((await request(app).get(`/api/assessments/${id}/materials/${materialId}/original`)).text).toContain('photosynthesis');
 expect((await request(app).get(`/api/assessments/${id}/audit`)).body.some((v:any)=>v.action==='MATERIAL_UPLOADED')).toBe(true);
});
it('isolates all material and generation endpoints to the owner',async()=>{
 for(const suffix of ['/materials',`/materials/${materialId}/original`])expect((await request(foreign).get(`/api/assessments/${id}${suffix}`)).status).toBe(404);
 expect((await request(foreign).post(`/api/assessments/${id}/materials`).attach('file',Buffer.from('hello'),'notes.txt')).status).toBe(404);
 expect((await request(foreign).post(`/api/assessments/${id}/generate`).send({revision:0,prompt:'Cover plant nutrition',count:2,materialIds:[materialId],consent:true})).status).toBe(404);
});
it('validates actual format and accepts safe PDFs',async()=>{
 expect((await upload(id,'bad.txt',Buffer.from([0,255]))).status).toBe(422);expect((await upload(id,'bad.pdf',Buffer.from('not a pdf'))).status).toBe(422);
 const pdf=await PDFDocument.create();pdf.addPage();expect((await upload(id,'lesson.pdf',Buffer.from(await pdf.save()))).status).toBe(201);
});
const generation=()=>({revision:0,prompt:'Cover photosynthesis only. Use two short answers.',count:2,materialIds:[materialId],consent:true});
it('requires materials and consent and sends the prompt and exact sources to AI',async()=>{
 expect((await request(app).post(`/api/assessments/${id}/generate`).send({...generation(),materialIds:[]})).status).toBe(422);
 expect((await request(app).post(`/api/assessments/${id}/generate`).send({...generation(),consent:false})).status).toBe(422);
 const result=await request(app).post(`/api/assessments/${id}/generate`).send(generation());expect(result.status).toBe(200);expect(result.body.questions).toEqual(questions);expect(captured!.materials[0].bytes.toString()).toContain('photosynthesis');expect(captured!.prompt).toBe(generation().prompt);
 expect((await request(app).get(`/api/assessments/${id}`)).body.questions).toEqual([]);expect((await db.query('SELECT * FROM preparation_generations')).rows).toHaveLength(1);
});
it('rejects invalid AI marks and stale requests without changing the saved guide',async()=>{
 bad=true;expect((await request(app).post(`/api/assessments/${id}/generate`).send(generation())).status).toBe(502);bad=false;
 expect((await request(app).post(`/api/assessments/${id}/generate`).send({...generation(),revision:99})).status).toBe(409);
 expect((await request(app).get(`/api/assessments/${id}`)).body.questions).toEqual([]);
});
it('saves the reviewed draft through existing revision checks and locks material uploads',async()=>{
 expect((await request(app).put(`/api/assessments/${id}/questions`).send({revision:0,questions})).status).toBe(200);
 expect((await request(app).post(`/api/assessments/${id}/ready`).send({revision:1})).status).toBe(200);
 expect((await upload(id,'another.txt',Buffer.from('Other notes'))).status).toBe(409);
});
it('encodes material inputs and structured output without retaining Responses',async()=>{
 let body:any;const draft=openAIDrafter('test-key','test-model',async(_url,init)=>{body=JSON.parse(init!.body as string);return new Response(JSON.stringify({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({questions})}]}]}));});
 expect((await draft(captured!)).questions).toEqual(questions);expect(body.store).toBe(false);expect(body.text.format.strict).toBe(true);expect(body.input[0].content.some((v:any)=>v.text?.includes('photosynthesis'))).toBe(true);
});
it('revises an assignment draft from a follow-up prompt without overwriting saved questions',async()=>{
 bad=false;const paper=(await request(app).post('/api/assessments').send({...base,kind:'ASSIGNMENT'})).body;const material=(await upload(paper.id)).body;
 const input={revision:0,prompt:'Make the questions easier while retaining plant nutrition coverage.',count:2,materialIds:[material.id],consent:true,previousQuestions:questions};
 expect((await request(app).post(`/api/assessments/${paper.id}/generate`).send(input)).status).toBe(200);expect(captured?.previousQuestions).toEqual(questions);expect((await request(app).get(`/api/assessments/${paper.id}`)).body.questions).toHaveLength(0);
 expect((await request(app).post(`/api/assessments/${paper.id}/generate`).send({...input,previousQuestions:[{...questions[0],maxMarks:-1}]})).status).toBe(422);
});
it('answers greeting chats without creating papers and keeps saved-paper context teacher-owned',async()=>{
 const plan={reply:'Hello! What would you like to prepare?',ready:false,title:'',subject:'',className:'',kind:'' as const,totalMarks:0,questionCount:0,coverage:''};let context:any;
 const assistant=createApp(store,owner,{preparation:{chat:async input=>{context=input.paperContext;return plan;}}}),otherAssistant=createApp(store,other,{preparation:{chat:async()=>plan}});
 const before=(await db.query('SELECT id FROM assessments')).rows.length;expect((await request(assistant).post('/api/preparation/chat').send({messages:[{role:'user',text:'hi'}],hasMaterials:false})).status).toBe(200);expect((await db.query('SELECT id FROM assessments')).rows.length).toBe(before);
 const paper=(await request(app).post('/api/assessments').send({...base,kind:'CAT'})).body;
 expect((await request(otherAssistant).post('/api/preparation/chat').send({messages:[{role:'user',text:'Hello'}],hasMaterials:false,assessmentId:paper.id})).status).toBe(404);
 expect((await request(assistant).post('/api/preparation/chat').send({messages:[{role:'user',text:'Change my paper'}],hasMaterials:false,assessmentId:paper.id})).status).toBe(200);expect(context.subject).toBe('Biology');
 expect((await request(app).post('/api/preparation/chat').send({messages:[{role:'user',text:'Hi'}],hasMaterials:false})).status).toBe(503);
});
