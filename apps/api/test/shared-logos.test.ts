import {beforeAll,afterAll,it,expect} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import request from 'supertest';
import sharp from 'sharp';
import {createApp} from '../src/app';
import type {Store} from '../src/db';
const db=new PGlite();
const store:Store={query:(sql,params)=>db.query(sql,params),connect:async()=>({query:(sql,params)=>db.query(sql,params),release(){}})};
const owner='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const app=createApp(store,owner),foreign=createApp(store,other);
let privateId:string,sharedId:string;
beforeAll(async()=>{
 for(const file of ['001_initial.sql','002_uploads.sql','003_teacher_auth.sql','004_account_recovery.sql','005_preparation.sql','006_teacher_library.sql','015_shared_institution_logos.sql'])await db.exec(await readFile(new URL('../migrations/'+file,import.meta.url),'utf8'));
 await db.query('INSERT INTO teachers(id,display_name) VALUES($1,$2),($3,$4)',[owner,'Teacher A',other,'Teacher B']);
 const png=await sharp({create:{width:30,height:30,channels:4,background:'#225544'}}).png().toBuffer();
 privateId=(await request(app).post('/api/library/logos').attach('file',png,'school.png')).body.id;
},30000);
afterAll(async()=>{await db.close();});
it('shares only an owned logo and deduplicates repeated contributions',async()=>{
 expect((await request(foreign).post('/api/library/shared-logos').send({logoId:privateId,institutionName:'University of Rwanda'})).status).toBe(404);
 const r=await request(app).post('/api/library/shared-logos').send({logoId:privateId,institutionName:'University of Rwanda'});
 expect(r.status).toBe(201);sharedId=r.body.id;
 const duplicate=await request(app).post('/api/library/shared-logos').send({logoId:privateId,institutionName:' UNIVERSITY   OF RWANDA '});
 expect(duplicate.body.id).toBe(sharedId);
});
it('finds shared logos across teachers without exposing private originals',async()=>{
 expect((await request(foreign).get('/api/library/shared-logos?institution=rwanda')).body).toEqual([{id:sharedId,institutionName:'University of Rwanda'}]);
 expect((await request(foreign).get('/api/library/shared-logos?institution=Other%20School')).body).toEqual([]);
 expect((await request(foreign).get('/api/library/shared-logos?institution=%25%25')).body).toEqual([]);
 expect((await request(foreign).get(`/api/library/logos/${privateId}/original`)).status).toBe(404);
 expect((await request(foreign).get(`/api/library/shared-logos/${sharedId}/original`)).headers['content-type']).toContain('image/png');
});
it('reuses a shared logo once in the teacher library and saves it on a paper',async()=>{
 const r=await request(foreign).post(`/api/library/shared-logos/${sharedId}/use`).send({});
 expect(r.status).toBe(200);expect(r.body.id).not.toBe(privateId);
 expect((await request(foreign).post(`/api/library/shared-logos/${sharedId}/use`).send({})).body.id).toBe(r.body.id);
 expect((await request(foreign).get('/api/library/logos')).body).toHaveLength(1);
 const paper=(await request(foreign).post('/api/assessments').send({title:'Test',subject:'Science',className:'S1',totalMarks:10})).body;
 const saved=(await request(foreign).get(`/api/assessments/${paper.id}/header`)).body;
 expect((await request(foreign).put(`/api/assessments/${paper.id}/header`).send({...saved,header:{...saved.header,logoId:r.body.id}})).status).toBe(200);
 expect((await request(foreign).get(`/api/library/logos/${r.body.id}/original`)).status).toBe(200);
});
