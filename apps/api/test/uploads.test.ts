import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {PDFDocument,PDFName,PDFString} from 'pdf-lib';
import sharp from 'sharp';
import {mkdtemp,readFile,readdir,unlink,rmdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import request from 'supertest';
import {createApp} from '../src/app';
import type {Store} from '../src/db';
import {MAX_FILE_BYTES,validateFile} from '../src/uploads/validation';
import {PrivateStorage} from '../src/uploads/storage';

const db=new PGlite();
const store:Store={query:(sql,params)=>db.query(sql,params),connect:async()=>({query:(sql,params)=>db.query(sql,params),release(){}})};
const owner='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
let directory:string;let app:ReturnType<typeof createApp>;let foreignApp:ReturnType<typeof createApp>;
let pdf:Buffer;let png:Buffer;let jpeg:Buffer;
const guide={position:1,type:'SHORT_ANSWER',prompt:'Define a noun.',maxMarks:10,options:[],expectedAnswer:'A naming word.',rubric:[]};
beforeAll(async()=>{
  directory=await mkdtemp(join(tmpdir(),'evalot-uploads-'));
  app=createApp(store,owner,{storageRoot:directory});foreignApp=createApp(store,other,{storageRoot:directory});
  for(const file of ['001_initial.sql','002_uploads.sql','005_preparation.sql'])await db.exec(await readFile(new URL(`../migrations/${file}`,import.meta.url),'utf8'));await db.exec(await readFile(new URL('../migrations/016_academic_marking.sql',import.meta.url),'utf8'));
  await db.query('INSERT INTO teachers(id,display_name) VALUES($1,$2),($3,$4)',[owner,'Teacher A',other,'Teacher B']);
  const document=await PDFDocument.create();document.addPage([300,400]);pdf=Buffer.from(await document.save());
  png=await sharp({create:{width:40,height:40,channels:3,background:'#ffffff'}}).png().toBuffer();
  jpeg=await sharp({create:{width:40,height:40,channels:3,background:'#dddddd'}}).jpeg().toBuffer();
},30000);
afterAll(async()=>{
  await db.close();
  if(directory){for(const file of await readdir(directory))await unlink(join(directory,file));await rmdir(directory);}
});
async function assessment(ready=true){
  const created=await request(app).post('/api/assessments').send({title:'Upload test',subject:'English',className:'S3',totalMarks:10});
  expect(created.status).toBe(201);const id=created.body.id;
  if(ready){expect((await request(app).put(`/api/assessments/${id}/questions`).send({revision:0,questions:[guide]})).status).toBe(200);expect((await request(app).post(`/api/assessments/${id}/ready`).send({revision:1})).status).toBe(200);}
  return id;
}
function send(id:string,reference='S3-001',bytes=pdf,name='paper.pdf',target=app){return request(target).post(`/api/assessments/${id}/scripts`).field('studentReference',reference).attach('file',bytes,{filename:name,contentType:'application/pdf'});}
describe('Scanned-paper uploads',()=>{
  it('stores an original PDF, metadata and audit, and downloads identical bytes',async()=>{
    const id=await assessment();const uploaded=await send(id);expect(uploaded.status).toBe(201);
    expect(uploaded.body).toMatchObject({assessmentId:id,studentReference:'S3-001',status:'UPLOADED',pageCount:1,mimeType:'application/pdf',byteSize:pdf.length});
    expect(uploaded.body.sha256).toMatch(/^[a-f0-9]{64}$/);expect(uploaded.body.storage_key).toBeUndefined();
    const list=await request(app).get(`/api/assessments/${id}/scripts`);expect(list.body).toHaveLength(1);
    const downloaded=await request(app).get(`/api/assessments/${id}/scripts/${uploaded.body.id}/original`);
    expect(downloaded.status).toBe(200);expect(downloaded.body).toEqual(pdf);expect(downloaded.headers['content-disposition']).toContain('attachment');expect(downloaded.headers['cache-control']).toBe('private, no-store');
    const history=await request(app).get(`/api/assessments/${id}/audit`);expect(history.body.at(-1).action).toBe('SCRIPT_UPLOADED');
  });
  it('requires a READY guide and blocks uploads after processing/finalization',async()=>{
    const id=await assessment(false);expect((await send(id)).status).toBe(409);
    const readyId=await assessment();for(const status of ['PROCESSING','REVIEW','FINALIZED']){
      await db.query('UPDATE assessments SET status=$1 WHERE id=$2',[status,readyId]);expect((await send(readyId)).status).toBe(409);
    }
  });
  it('rejects duplicate references case-insensitively and repeated scans without orphan files',async()=>{
    const id=await assessment();expect((await send(id)).status).toBe(201);const before=(await readdir(directory)).length;
    expect((await send(id,'s3-001',png,'paper.png')).status).toBe(409);
    expect((await send(id,'S3-002')).status).toBe(409);
    expect((await readdir(directory)).length).toBe(before);expect((await request(app).get(`/api/assessments/${id}/scripts`)).body).toHaveLength(1);
  });
  it('accepts JPEG and PNG by content and preserves their bytes for image preview',async()=>{
    const id=await assessment();
    for(const [reference,bytes,mime] of [['S3-001',png,'image/png'],['S3-002',jpeg,'image/jpeg']] as const){
      const uploaded=await send(id,reference,bytes,'untrusted-name.pdf');expect(uploaded.status).toBe(201);expect(uploaded.body.mimeType).toBe(mime);
      expect(uploaded.body.originalName).toBe(mime==='image/png' ? 'untrusted-name.png' : 'untrusted-name.jpg');
      const original=await request(app).get(`/api/assessments/${id}/scripts/${uploaded.body.id}/original`);expect(original.headers['content-type']).toContain(mime);expect(original.body).toEqual(bytes);
      const download=await request(app).get(`/api/assessments/${id}/scripts/${uploaded.body.id}/original?download=1`);expect(download.headers['content-disposition']).toContain('attachment');
    }
  });
  it('rejects empty, spoofed, damaged, encrypted and oversized uploads',async()=>{
    const id=await assessment();
    for(const bytes of [Buffer.from('<html>not a scan</html>'),Buffer.from('%PDF-broken'),Buffer.from([137,80,78,71,13,10,26,10]),Buffer.from([255,216,255,0])])expect((await send(id,'S3-001',bytes)).status).toBe(422);
    expect((await request(app).post(`/api/assessments/${id}/scripts`).field('studentReference','S3-001')).status).toBe(422);
    expect((await send(id,'S3-001',Buffer.alloc(MAX_FILE_BYTES+1))).status).toBe(413);
    expect((await request(app).get(`/api/assessments/${id}/scripts`)).body).toEqual([]);
  });
  it('validates student references and unexpected multipart fields',async()=>{
    const id=await assessment();expect((await send(id,'=SUM(1,2)')).status).toBe(422);expect((await send(id,'   ')).status).toBe(422);
    expect((await request(app).post(`/api/assessments/${id}/scripts`).field('studentReference','S3-001').field('extra','bad').attach('file',pdf,'paper.pdf')).status).toBe(422);
  });
  it('isolates list, upload and original-file access by teacher and assessment',async()=>{
    const id=await assessment();const uploaded=await send(id);const second=await assessment();
    expect((await request(foreignApp).get(`/api/assessments/${id}/scripts`)).status).toBe(404);
    expect((await send(id,'S3-001',pdf,'paper.pdf',foreignApp)).status).toBe(404);
    expect((await request(foreignApp).get(`/api/assessments/${id}/scripts/${uploaded.body.id}/original`)).status).toBe(404);
    expect((await request(app).get(`/api/assessments/${second}/scripts/${uploaded.body.id}/original`)).status).toBe(404);
  });
  it('supports one assessment reference in draft and preserves it after guide locking',async()=>{
    const id=await assessment(false);expect((await request(app).get(`/api/assessments/${id}/document`)).body).toBeNull();
    const uploaded=await request(app).post(`/api/assessments/${id}/document`).attach('file',pdf,'assessment.pdf');expect(uploaded.status).toBe(201);
    expect((await request(app).get(`/api/assessments/${id}/document`)).body.id).toBe(uploaded.body.id);
    expect((await request(app).post(`/api/assessments/${id}/document`).attach('file',png,'other.png')).status).toBe(409);
    expect((await request(foreignApp).get(`/api/assessments/${id}/document/original`)).status).toBe(404);
    expect((await request(app).get(`/api/assessments/${id}/document/original`)).body).toEqual(pdf);
    expect((await request(app).get(`/api/assessments/${id}/audit`)).body.at(-1).action).toBe('ASSESSMENT_DOCUMENT_UPLOADED');
    await request(app).put(`/api/assessments/${id}/questions`).send({revision:0,questions:[guide]});await request(app).post(`/api/assessments/${id}/ready`).send({revision:1});
    expect((await request(app).post(`/api/assessments/${id}/document`).attach('file',jpeg,'other.jpg')).status).toBe(409);
    expect((await request(app).get(`/api/assessments/${id}/document/original`)).status).toBe(200);
  });
  it('rolls back file and row when recording the upload audit fails',async()=>{
    const id=await assessment();const before=(await readdir(directory)).length;
    await db.exec(`CREATE FUNCTION reject_upload_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='SCRIPT_UPLOADED' THEN RAISE EXCEPTION 'rollback'; END IF; RETURN NEW; END $$; CREATE TRIGGER reject_upload BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION reject_upload_audit();`);
    try{expect((await send(id)).status).toBe(500);expect((await readdir(directory)).length).toBe(before);expect((await request(app).get(`/api/assessments/${id}/scripts`)).body).toEqual([]);}
    finally{await db.exec('DROP TRIGGER reject_upload ON audit_events; DROP FUNCTION reject_upload_audit();');}
  });
  it('detects changed or missing originals and blocks traversal keys',async()=>{
    const id=await assessment();const uploaded=await send(id);const row=(await db.query('SELECT storage_key FROM scripts WHERE id=$1',[uploaded.body.id])).rows[0] as {storage_key:string};
    await writeFile(join(directory,row.storage_key),'changed');expect((await request(app).get(`/api/assessments/${id}/scripts/${uploaded.body.id}/original`)).status).toBe(409);
    await unlink(join(directory,row.storage_key));expect((await request(app).get(`/api/assessments/${id}/scripts/${uploaded.body.id}/original`)).status).toBe(410);
    await expect(new PrivateStorage(directory).get('../outside.pdf','any')).rejects.toThrow('Invalid stored file reference');
  });
});
describe('File validation limits',()=>{
  it('rejects zero-page and over-50-page PDFs',async()=>{
    const empty=await PDFDocument.create();await expect(validateFile(Buffer.from(await empty.save({addDefaultPage:false})))).rejects.toThrow('1–50 pages');
    const large=await PDFDocument.create();for(let i=0;i<51;i++)large.addPage();await expect(validateFile(Buffer.from(await large.save()))).rejects.toThrow('1–50 pages');
  });
  it('rejects PDF actions even when nested in a direct dictionary',async()=>{
    const active=await PDFDocument.create();active.addPage();active.catalog.set(PDFName.of('OpenAction'),active.context.obj({S:PDFName.of('JavaScript'),JS:PDFString.of('alert(1)')}));
    await expect(validateFile(Buffer.from(await active.save()))).rejects.toThrow('plain scanned PDF');
  });
  it('rejects attached files and PDFs marked encrypted',async()=>{
    const attached=await PDFDocument.create();attached.addPage();await attached.attach(Buffer.from('untrusted'),'file.txt');
    await expect(validateFile(Buffer.from(await attached.save()))).rejects.toThrow(/plain scanned PDF|attachments/);
    const encrypted=await PDFDocument.create();encrypted.addPage();encrypted.context.trailerInfo.Encrypt=encrypted.context.register(encrypted.context.obj({Filter:PDFName.of('Standard')}));
    await expect(validateFile(Buffer.from(await encrypted.save()))).rejects.toThrow('password-protected');
  });
});
