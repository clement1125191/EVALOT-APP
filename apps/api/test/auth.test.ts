import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import request from 'supertest';
import {createApp} from '../src/app';
import type {Store} from '../src/db';
const db=new PGlite();
const store:Store={query:(sql,params)=>db.query(sql,params),connect:async()=>({query:(sql,params)=>db.query(sql,params),release(){}})};
const app=createApp(store);
const samplePassword='a sufficiently long test passphrase';
const writeHeader={'X-Evalot-Request':'1'};
let counter=0;
function account(){return {displayName:'Teacher Example',email:`teacher${++counter}@example.test`,password:samplePassword,remember:false};}
async function register(input=account()){
  const agent=request.agent(app);const response=await agent.post('/api/auth/register').set(writeHeader).send(input);expect(response.status).toBe(201);return {agent,input,response};
}
beforeAll(async()=>{for(const file of ['001_initial.sql','002_uploads.sql','003_teacher_auth.sql','004_account_recovery.sql','005_preparation.sql'])await db.exec(await readFile(new URL(`../migrations/${file}`,import.meta.url),'utf8'));},30000);
afterAll(async()=>{await db.close();});
describe('Teacher authentication',()=>{
  it('protects assessments and originals without a valid session',async()=>{
    for(const path of ['/api/assessments','/api/auth/me','/api/assessments/11111111-1111-4111-8111-111111111111/document/original'])expect((await request(app).get(path)).status).toBe(401);
    expect((await request(app).get('/api/assessments').set('Cookie','evalot_session=forged')).status).toBe(401);
    expect((await request(app).get('/api/assessments').set('X-Teacher-ID','11111111-1111-4111-8111-111111111111')).status).toBe(401);
  });
  it('registers and restores a session while keeping password and token hashes private',async()=>{
    const {agent,input,response}=await register();expect(response.body.teacher).toMatchObject({displayName:input.displayName,email:input.email});expect(response.body.teacher.password_hash).toBeUndefined();
    const cookie=response.headers['set-cookie'][0] as string;expect(cookie).toContain('HttpOnly');expect(cookie).toContain('SameSite=Lax');expect(cookie).not.toContain('Max-Age');
    expect((await agent.get('/api/auth/me')).body.teacher.id).toBe(response.body.teacher.id);
    const row=(await db.query('SELECT password_hash FROM teachers WHERE id=$1',[response.body.teacher.id])).rows[0] as {password_hash:string};expect(row.password_hash).toMatch(/^scrypt-v1\$/);expect(row.password_hash).not.toContain(samplePassword);
    const token=cookie.split(';')[0].split('=')[1];const session=(await db.query('SELECT token_hash FROM teacher_sessions WHERE teacher_id=$1',[response.body.teacher.id])).rows[0] as {token_hash:string};expect(session.token_hash).not.toBe(token);
  });
  it('normalizes email, rejects duplicate registration and enforces password length',async()=>{
    const input=account();await register({...input,email:` ${input.email.toUpperCase()} `});
    expect((await request(app).post('/api/auth/register').set(writeHeader).send(input)).status).toBe(409);
    expect((await request(app).post('/api/auth/register').set(writeHeader).send({...account(),password:'short'})).status).toBe(422);
    expect((await request(app).post('/api/auth/register').set(writeHeader).send({...account(),password:'six123'})).status).toBe(201);
  });
  it('uses the same invalid-credentials message for wrong password and unknown email',async()=>{
    const {input}=await register();
    const bad=await request(app).post('/api/auth/login').set(writeHeader).send({email:input.email,password:'incorrect password'});
    const missing=await request(app).post('/api/auth/login').set(writeHeader).send({email:'missing@example.test',password:samplePassword});
    expect(bad.status).toBe(401);expect(missing.status).toBe(401);expect(bad.body).toEqual(missing.body);
  });
  it('signs in, replaces a previous cookie and persists only when requested',async()=>{
    const {agent,input,response}=await register();const oldCookie=response.headers['set-cookie'][0].split(';')[0];
    const login=await agent.post('/api/auth/login').set(writeHeader).send({email:input.email,password:samplePassword,remember:true});expect(login.status).toBe(200);expect(login.headers['set-cookie'][0]).toContain('Max-Age=2592000');
    expect(login.headers['set-cookie'][0].split(';')[0]).not.toBe(oldCookie);expect((await request(app).get('/api/auth/me').set('Cookie',oldCookie)).status).toBe(401);
    expect((await agent.get('/api/assessments')).status).toBe(200);
  });
  it('signs out and rejects the revoked cookie',async()=>{
    const {agent,response}=await register();const cookie=response.headers['set-cookie'][0].split(';')[0];
    expect((await agent.post('/api/auth/logout').set(writeHeader)).status).toBe(204);
    expect((await request(app).get('/api/auth/me').set('Cookie',cookie)).status).toBe(401);
    expect((await agent.get('/api/assessments')).status).toBe(401);
  });
  it('rejects expired sessions',async()=>{
    const {agent,response}=await register();await db.query("UPDATE teacher_sessions SET expires_at=now()-interval '1 minute' WHERE teacher_id=$1",[response.body.teacher.id]);expect((await agent.get('/api/auth/me')).status).toBe(401);
  });
  it('isolates actual signed-in teachers across reads, writes, history and files',async()=>{
    const first=await register();const second=await register();
    const assessment=await first.agent.post('/api/assessments').set(writeHeader).send({title:'Private exam',subject:'English',className:'S3',totalMarks:10});expect(assessment.status).toBe(201);const id=assessment.body.id;
    expect((await first.agent.get('/api/assessments')).body.map((value:any)=>value.id)).toContain(id);
    expect((await second.agent.get('/api/assessments')).body).toEqual([]);
    for(const suffix of ['', '/audit','/document/original','/scripts'])expect((await second.agent.get(`/api/assessments/${id}${suffix}`)).status).toBe(404);
    expect((await second.agent.put(`/api/assessments/${id}/questions`).set(writeHeader).send({revision:0,questions:[]})).status).toBe(404);
  });
  it('rejects unverified browser writes, cross-site requests and forged body identities',async()=>{
    expect((await request(app).post('/api/auth/login').send({email:'x@example.test',password:samplePassword})).status).toBe(403);
    expect((await request(app).post('/api/auth/register').set(writeHeader).set('Origin','https://other-site.test').send(account())).status).toBe(403);
    expect((await request(app).post('/api/auth/register').set(writeHeader).set('Sec-Fetch-Site','cross-site').send(account())).status).toBe(403);
    expect((await request(app).post('/api/auth/register').set(writeHeader).send({...account(),teacherId:'11111111-1111-4111-8111-111111111111'})).status).toBe(422);
  });
  it('throttles repeated login failures and preserves immutable authentication events',async()=>{
    await db.query('DELETE FROM auth_rate_limits');const {input,response}=await register();
    for(let i=0;i<8;i++)expect((await request(app).post('/api/auth/login').set(writeHeader).send({email:input.email,password:'wrong'})).status).toBe(401);
    expect((await request(app).post('/api/auth/login').set(writeHeader).send({email:input.email,password:samplePassword})).status).toBe(429);
    await expect(db.query('DELETE FROM auth_events WHERE teacher_id=$1',[response.body.teacher.id])).rejects.toThrow('History is append-only');
  },30000);
  it('clears failed-login counters after a successful sign-in and accepts the configured origin',async()=>{
    await db.query('DELETE FROM auth_rate_limits');const {input}=await register();
    await request(app).post('/api/auth/login').set(writeHeader).send({email:input.email,password:'wrong'});
    const signedIn=await request(app).post('/api/auth/login').set(writeHeader).set('Origin','http://127.0.0.1:5174').send({email:input.email,password:samplePassword});expect(signedIn.status).toBe(200);
    expect((await db.query('SELECT attempts FROM auth_rate_limits WHERE bucket=$1',[(await import('node:crypto')).createHash('sha256').update(`login-email:${input.email}`).digest('hex')])).rows).toEqual([]);
  },30000);
});
