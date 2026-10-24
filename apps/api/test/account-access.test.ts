import {beforeAll,afterAll,it,expect} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import request from 'supertest';
import {createApp} from '../src/app';
import type {Store} from '../src/db';
const db=new PGlite();
const store:Store={query:(sql,params)=>db.query(sql,params),connect:async()=>({query:(sql,params)=>db.query(sql,params),release(){}})};
const mails:{email:string;url:string}[]=[];let exchanges=0;let verified=true;let profileEmail='google@example.test';
const app=createApp(store,null,{auth:{publicUrl:'http://127.0.0.1:5174',sendReset:async(email,url)=>{mails.push({email,url});},google:{clientId:'test-client',clientSecret:'test-secret',redirectUri:'http://127.0.0.1:4000/api/auth/google/callback'},fetch:async(url)=>{
  if(String(url).endsWith('/token')){exchanges++;return new Response(JSON.stringify({access_token:'fixture-token'}));}
  return new Response(JSON.stringify({sub:'google-subject',email:profileEmail,email_verified:verified,name:'Google Teacher'}));
}}});
const headers={'X-Evalot-Request':'1'},password='a sufficiently long test passphrase';
beforeAll(async()=>{for(const file of ['001_initial.sql','002_uploads.sql','003_teacher_auth.sql','004_account_recovery.sql','005_preparation.sql'])await db.exec(await readFile(new URL('../migrations/'+file,import.meta.url),'utf8'));},30000);
afterAll(async()=>{await db.close();});
it('keeps recovery responses private and resets once while revoking sessions',async()=>{
  const agent=request.agent(app);await agent.post('/api/auth/register').set(headers).send({email:'reset@example.test',displayName:'Reset Teacher',password});
  const known=await request(app).post('/api/auth/forgot-password').set(headers).send({email:'reset@example.test'});
  const unknown=await request(app).post('/api/auth/forgot-password').set(headers).send({email:'unknown@example.test'});
  expect(known.status).toBe(200);expect(unknown.body).toEqual(known.body);expect(mails).toHaveLength(1);expect(known.body).not.toHaveProperty('token');
  const token=new URL(mails[0].url).searchParams.get('reset');expect((await db.query<{token_hash:string}>('SELECT token_hash FROM password_resets')).rows[0].token_hash).not.toBe(token);
  expect((await request(app).post('/api/auth/reset-password').set(headers).send({token,password:'short'})).status).toBe(422);
  expect((await request(app).post('/api/auth/reset-password').set(headers).send({token,password:'six123'})).status).toBe(200);
  expect((await agent.get('/api/auth/me')).status).toBe(401);
  expect((await request(app).post('/api/auth/reset-password').set(headers).send({token,password})).status).toBe(400);
  expect((await request(app).post('/api/auth/login').set(headers).send({email:'reset@example.test',password})).status).toBe(401);
  expect((await request(app).post('/api/auth/login').set(headers).send({email:'reset@example.test',password:'six123'})).status).toBe(200);
  expect((await db.query("SELECT action FROM auth_events WHERE action='PASSWORD_RESET'")).rows).toHaveLength(1);
},30000);
it('rejects expired reset links',async()=>{
  await request(app).post('/api/auth/forgot-password').set(headers).send({email:'reset@example.test'});
  await db.exec("UPDATE password_resets SET expires_at=now()-interval '1 second'");
  const token=new URL(mails.at(-1)!.url).searchParams.get('reset');
  expect((await request(app).post('/api/auth/reset-password').set(headers).send({token,password})).status).toBe(400);
});
it('binds Google state to the browser, exchanges a code, and rejects replay',async()=>{
  const agent=request.agent(app);const start=await agent.get('/api/auth/google');const url=new URL(start.headers.location);expect(url.origin).toBe('https://accounts.google.com');expect(url.searchParams.get('code_challenge_method')).toBe('S256');
  const callback='/api/auth/google/callback?code=fixture&state='+url.searchParams.get('state');
  expect((await request(app).get(callback)).headers.location).toContain('authError=google');expect(exchanges).toBe(0);
  expect((await agent.get(callback)).headers.location).toBe('http://127.0.0.1:5174/');expect((await agent.get('/api/auth/me')).body.teacher.email).toBe(profileEmail);expect(exchanges).toBe(1);
  expect((await agent.get(callback)).headers.location).toContain('authError=google');expect(exchanges).toBe(1);
});
it('requires verified Google email',async()=>{
  verified=false;const agent=request.agent(app);const start=await agent.get('/api/auth/google');const state=new URL(start.headers.location).searchParams.get('state');
  expect((await agent.get('/api/auth/google/callback?code=fixture&state='+state)).headers.location).toContain('authError=google');expect((await agent.get('/api/auth/me')).status).toBe(401);verified=true;
});
it('does not automatically merge an existing password account by email',async()=>{
  await db.exec('DELETE FROM google_identities');profileEmail='reset@example.test';const agent=request.agent(app);const start=await agent.get('/api/auth/google');const state=new URL(start.headers.location).searchParams.get('state');
  expect((await agent.get('/api/auth/google/callback?code=fixture&state='+state)).headers.location).toContain('authError=existing-account');expect((await agent.get('/api/auth/me')).status).toBe(401);
});
it('reports absent providers without pretending to send mail or sign in',async()=>{
  const plain=createApp(store);expect((await request(plain).get('/api/auth/options')).body).toEqual({google:false,recovery:false});expect((await request(plain).get('/api/auth/google')).status).toBe(503);expect((await request(plain).post('/api/auth/forgot-password').set(headers).send({email:'reset@example.test'})).status).toBe(503);
});
