import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import request from 'supertest';
import { createApp } from '../src/app';
import type { Store } from '../src/db';
import { questionInput } from '@evalot/contracts';

const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const db = new PGlite();
// PGlite uses a real PostgreSQL engine, one serialized connection.
const store: Store = {query: (sql, params) => db.query(sql, params), connect: async () => ({query: (sql, params) => db.query(sql, params), release() {}})};
const app = createApp(store, owner);
const foreignApp = createApp(store, other);
const base = {title:'S3 English',subject:'English',className:'S3 A',totalMarks:10};
const question = {position:1,type:'SHORT_ANSWER',prompt:'Define a noun.',maxMarks:10,options:[],expectedAnswer:'A naming word.',rubric:[]};
async function create() { const r = await request(app).post('/api/assessments').send(base); expect(r.status).toBe(201); return r.body; }
beforeAll(async () => {
  await db.exec(await readFile(new URL('../migrations/001_initial.sql', import.meta.url),'utf8'));await db.exec(await readFile(new URL('../migrations/016_academic_marking.sql',import.meta.url),'utf8'));await db.exec(await readFile(new URL('../migrations/005_preparation.sql', import.meta.url),'utf8'));
  await db.query('INSERT INTO teachers(id,display_name) VALUES($1,$2),($3,$4)', [owner,'Teacher A',other,'Teacher B']);
}, 30000);
afterAll(async () => { await db.close(); });
describe('Phase 1 API with PostgreSQL', () => {
  it('checks health and creates, lists and retrieves owned assessments', async () => {
    expect((await request(app).get('/api/health')).status).toBe(200);
    const a = await create(); expect(a.status).toBe('DRAFT'); expect(a.revision).toBe(0);
    const list = await request(app).get('/api/assessments'); expect(list.body.some((v:any) => v.id===a.id)).toBe(true);
    expect((await request(app).get(`/api/assessments/${a.id}`)).body.questions).toEqual([]);
  });
  it('validates create input and malformed requests', async () => {
    for (const totalMarks of [0,-1,1.5,1001]) expect((await request(app).post('/api/assessments').send({...base,totalMarks})).status).toBe(422);
    expect((await request(app).post('/api/assessments').send({...base,title:' '})).status).toBe(422);
    expect((await request(app).post('/api/assessments').send({...base,teacherId:other})).status).toBe(422);
    expect((await request(app).post('/api/assessments').set('Content-Type','application/json').send('{bad')).status).toBe(400);
    expect((await request(app).get('/api/assessments/not-uuid')).status).toBe(422);
    expect((await request(app).get('/api/missing')).status).toBe(404);
  });
  it('isolates teacher access across detail, edits, readiness and history', async () => {
    const a = await create();
    expect((await request(foreignApp).get('/api/assessments')).body).toEqual([]);
    for (const suffix of ['', '/audit']) expect((await request(foreignApp).get(`/api/assessments/${a.id}${suffix}`)).status).toBe(404);
    expect((await request(foreignApp).put(`/api/assessments/${a.id}/questions`).send({revision:0,questions:[question]})).status).toBe(404);
    expect((await request(foreignApp).post(`/api/assessments/${a.id}/ready`).send({revision:0})).status).toBe(404);
  });
  it('saves guides atomically, prevents over-allocation and rejects stale revisions', async () => {
    const a = await create(); const path = `/api/assessments/${a.id}/questions`;
    expect((await request(app).put(path).send({revision:0,questions:[{...question,maxMarks:11}]})).status).toBe(422);
    const saved = await request(app).put(path).send({revision:0,questions:[question]});
    expect(saved.status).toBe(200); expect(saved.body.revision).toBe(1); expect(saved.body.questions[0].expectedAnswer).toBe(question.expectedAnswer);
    expect((await request(app).put(path).send({revision:0,questions:[]})).status).toBe(409);
    const detail = await request(app).get(`/api/assessments/${a.id}`); expect(detail.body.questions).toHaveLength(1);
    const audit = await request(app).get(`/api/assessments/${a.id}/audit`); expect(audit.body.map((e:any) => e.action)).toEqual(['ASSESSMENT_CREATED','QUESTIONS_REPLACED']);
  });
  it('rolls back a failed write together with its audit event', async () => {
    const a = await create();
    await db.exec(`CREATE FUNCTION reject_test_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='QUESTIONS_REPLACED' THEN RAISE EXCEPTION 'test rollback'; END IF; RETURN NEW; END $$; CREATE TRIGGER reject_test BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION reject_test_audit();`);
    try {
      expect((await request(app).put(`/api/assessments/${a.id}/questions`).send({revision:0,questions:[question]})).status).toBe(500);
      const detail = await request(app).get(`/api/assessments/${a.id}`); expect(detail.body.revision).toBe(0); expect(detail.body.questions).toEqual([]);
    } finally { await db.exec('DROP TRIGGER reject_test ON audit_events; DROP FUNCTION reject_test_audit();'); }
  });
  it('requires full marks, guide coverage and essay rubric before locking setup', async () => {
    const a = await create(); const path = `/api/assessments/${a.id}`;
    expect((await request(app).post(`${path}/ready`).send({revision:0})).status).toBe(422);
    await request(app).put(`${path}/questions`).send({revision:0,questions:[{...question,type:'ESSAY'}]});
    expect((await request(app).post(`${path}/ready`).send({revision:1})).status).toBe(422);
    await request(app).put(`${path}/questions`).send({revision:1,questions:[{...question,type:'ESSAY',rubric:[{label:'Accuracy',maxMarks:6},{label:'Reasoning',maxMarks:4}]}]});
    const ready = await request(app).post(`${path}/ready`).send({revision:2}); expect(ready.status).toBe(200); expect(ready.body.status).toBe('READY');
    expect((await request(app).put(`${path}/questions`).send({revision:3,questions:[]})).status).toBe(409);
    expect((await request(app).post(`${path}/ready`).send({revision:3})).status).toBe(409);
  });
  it('keeps audit records immutable at database level', async () => {
    const a = await create();
    await expect(db.query('DELETE FROM audit_events WHERE assessment_id=$1',[a.id])).rejects.toThrow('History is append-only');
    await expect(db.query("UPDATE audit_events SET action='FORGED' WHERE assessment_id=$1",[a.id])).rejects.toThrow('History is append-only');
  });
  it('persists all four supported question guides and completes a mixed assessment', async () => {
    const a = await create();
    const questions = [
      {...question,position:1,type:'MCQ',maxMarks:2,options:['A','B'],expectedAnswer:'B'},
      {...question,position:2,type:'TRUE_FALSE',maxMarks:2,expectedAnswer:'True'},
      {...question,position:3,maxMarks:2},
      {...question,position:4,type:'ESSAY',maxMarks:4,rubric:[{label:'Accuracy',maxMarks:2},{label:'Explanation',maxMarks:2}]},
    ];
    const saved = await request(app).put(`/api/assessments/${a.id}/questions`).send({revision:0,questions});
    expect(saved.status).toBe(200);
    expect(saved.body.questions.map(({id,...q}:any) => q)).toEqual(questions.map(q=>({...q,section:'Section A'})));
    expect((await request(app).post(`/api/assessments/${a.id}/ready`).send({revision:1})).body.status).toBe('READY');
  });
});
describe('Marking guide validation', () => {
  it('checks MCQ keys, distinct options, True/False keys and rubric totals', () => {
    expect(questionInput.safeParse({...question,type:'MCQ',options:['A','B'],expectedAnswer:'C'}).success).toBe(false);
    expect(questionInput.safeParse({...question,type:'MCQ',options:['A','A'],expectedAnswer:'A'}).success).toBe(false);
    expect(questionInput.safeParse({...question,type:'TRUE_FALSE',expectedAnswer:'yes'}).success).toBe(false);
    expect(questionInput.safeParse({...question,rubric:[{label:'Accuracy',maxMarks:9}]}).success).toBe(false);
    expect(questionInput.safeParse({...question,type:'MCQ',options:['A','B'],expectedAnswer:'B'}).success).toBe(true);
    expect(questionInput.safeParse({...question,type:'TRUE_FALSE',expectedAnswer:'True'}).success).toBe(true);
  });
  it('requires consecutive positions and answer coverage', async () => {
    const a = await create(); const path = `/api/assessments/${a.id}`;
    expect((await request(app).put(`${path}/questions`).send({revision:0,questions:[{...question,position:2}]})).status).toBe(422);
    await request(app).put(`${path}/questions`).send({revision:0,questions:[{...question,expectedAnswer:''}]});
    expect((await request(app).post(`${path}/ready`).send({revision:1})).status).toBe(422);
    await request(app).put(`${path}/questions`).send({revision:1,questions:[{...question,maxMarks:9}]});
    expect((await request(app).post(`${path}/ready`).send({revision:2})).status).toBe(422);
  });
});
