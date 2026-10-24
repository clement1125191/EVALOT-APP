import {beforeAll,afterAll,it,expect} from 'vitest';
import request from 'supertest';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createPhonePreview} from '../phone-preview.mjs';
let directory,assets,app;
beforeAll(async()=>{
 directory=await mkdtemp(join(tmpdir(),'evalot-preview-'));assets=join(directory,'.codex','project','dist');await mkdir(assets,{recursive:true});
 await writeFile(join(assets,'index.html'),'<html>Evalot test workspace</html>');await writeFile(join(assets,'.env'),'PRIVATE SENTINEL');app=createPhonePreview({assets});
});
afterAll(async()=>{await rm(directory,{recursive:true,force:true});});
it('serves homepage and direct SPA links from a hidden parent directory',async()=>{
 for(const path of ['/','/dashboard','/setup','/preparation']){const r=await request(app).get(path).set('Accept','text/html');expect(r.status).toBe(200);expect(r.text).toContain('Evalot test workspace');expect(r.headers['permissions-policy']).toContain('camera=(self)');}
});
it('returns 404 for missing assets instead of HTML or a filesystem stack trace',async()=>{
 for(const path of ['/assets/missing.js','/missing.png','/.env','/%2eenv']){const r=await request(app).get(path).set('Accept','text/html');expect(r.status).toBe(404);expect(r.text).not.toContain('PRIVATE SENTINEL');expect(r.text).not.toContain('NotFoundError');}
});
it('handles a missing build gracefully during rebuilds',async()=>{
 const r=await request(createPhonePreview({assets:join(directory,'missing-build')})).get('/dashboard').set('Accept','text/html');expect(r.status).toBe(503);expect(r.text).toContain('rebuilding');expect(r.text).not.toContain(directory);
});
