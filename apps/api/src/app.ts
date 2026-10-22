import express from 'express';
import helmet from 'helmet';
import { z } from 'zod';
import { assessmentInput, questionSetInput } from '@evalot/contracts';
import { Assessments, ApiError } from './assessments.js';
import type { Store } from './db.js';
import multer from 'multer';
import { fileURLToPath } from 'node:url';
import { Uploads } from './uploads/service.js';
import { PrivateStorage } from './uploads/storage.js';
import { MAX_FILE_BYTES } from './uploads/validation.js';
import { studentReferenceInput } from '@evalot/contracts';
import {preparationRouter,type PreparationOptions} from './preparation.js';
import {correctionRouter,type CorrectionOptions} from './correction/service.js';
import {teachingRouter} from './teaching.js';
import {materialLibraryRouter} from './material-library.js';
import {guidelinesRouter} from './guidelines.js';
import {libraryRouter} from './library.js';
import { Authentication } from './auth.js';
import type {AccessOptions} from './account-access.js';
export function createApp(db: Store, teacherId: string | null = null, options: {storageRoot?: string;allowedOrigins?:string[];secureCookies?:boolean;auth?:AccessOptions;preparation?:PreparationOptions;correction?:CorrectionOptions} = {}) {
  if (teacherId) z.string().uuid().parse(teacherId);
  const app = express(); const service = new Assessments(db);
  const uploads = new Uploads(db, new PrivateStorage(options.storageRoot ?? fileURLToPath(new URL('../../../.data/uploads/', import.meta.url))));
  const parser = multer({storage:multer.memoryStorage(),limits:{fileSize:MAX_FILE_BYTES,files:1,fields:1,parts:2,fieldSize:200}}).single('file');
  const receiveFile: express.RequestHandler = (req,res,next) => parser(req,res,error => {
    if(error && !(error instanceof multer.MulterError)) next(new ApiError(400,'Malformed upload request.'));
    else next(error);
  });
  app.disable('x-powered-by'); app.use(helmet()); app.use(express.json({limit: '1mb'}));
  app.get('/api/health', async (_req, res) => { await db.query('SELECT 1'); res.json({status:'ok',authMode:teacherId ? 'test':'password'}); });
  const authentication=new Authentication(db,options.secureCookies??false,options.auth);
  const origins=options.allowedOrigins??['http://127.0.0.1:5173','http://localhost:5173','http://127.0.0.1:5174','http://localhost:5174'];
  app.use('/api',(req,res,next)=>{
    res.set('Cache-Control','private, no-store');
    if(!teacherId && !['GET','HEAD','OPTIONS'].includes(req.method)){
      if(req.get('X-Evalot-Request')!=='1' || (req.get('Origin') && !origins.includes(req.get('Origin')!)) || req.get('Sec-Fetch-Site')==='cross-site')throw new ApiError(403,'Request origin could not be verified.');
    }
    next();
  });
  app.use('/api/auth',authentication.router());
  app.use('/api',async(req,res,next)=>{
    // Explicit dependency injection for existing service tests only. Server startup never supplies a fixed identity.
    const teacher=teacherId ? {id:teacherId,displayName:'Test teacher',email:'test@example.test'}:await authentication.teacher(req);
    if(!teacher)throw new ApiError(401,'Please sign in to your teacher account.');
    res.locals.teacher=teacher;next();
  });
  app.use('/api',guidelinesRouter(db));
  app.use('/api',libraryRouter(db));
  app.use('/api',materialLibraryRouter(db));
  app.use('/api',teachingRouter(db));
  app.use('/api',correctionRouter(db,options.correction));
  app.use('/api',preparationRouter(db,options.preparation));
  app.get('/api/assessments', async (_req, res) => { res.json(await service.list(res.locals.teacher.id)); });
  app.post('/api/assessments', async (req, res) => { res.status(201).json(await service.create(res.locals.teacher.id, assessmentInput.parse(req.body))); });
  app.get('/api/assessments/:id', async (req, res) => { res.json(await service.detail(res.locals.teacher.id, z.string().uuid().parse(req.params.id))); });
  app.put('/api/assessments/:id/questions', async (req, res) => {
    // Loaded question IDs are read-only metadata; validate then discard them before replacing the guide.
    const body=z.object({revision:z.unknown(),questions:z.array(z.record(z.unknown()))}).strict().parse(req.body);
    const v = questionSetInput.parse({...body,questions:body.questions.map(q=>{const {id,...fields}=q;if(id!==undefined)z.string().uuid().parse(id);return fields;})}); res.json(await service.saveQuestions(res.locals.teacher.id, z.string().uuid().parse(req.params.id), v.revision, v.questions));
  });
  app.post('/api/assessments/:id/ready', async (req, res) => {
    const v = z.object({revision: z.number().int().min(0)}).strict().parse(req.body);
    res.json(await service.ready(res.locals.teacher.id, z.string().uuid().parse(req.params.id), v.revision));
  });
  app.get('/api/assessments/:id/audit', async (req, res) => { res.json(await service.history(res.locals.teacher.id, z.string().uuid().parse(req.params.id))); });
  const authorizeUpload = (kind: 'script' | 'document'): express.RequestHandler => async (req, res, next) => {
    await uploads.authorize(res.locals.teacher.id, z.string().uuid().parse(req.params.id), kind); next();
  };
  app.get('/api/assessments/:id/scripts', async (req, res) => { res.json(await uploads.scripts(res.locals.teacher.id,z.string().uuid().parse(req.params.id))); });
  app.get('/api/assessments/:id/document', async (req, res) => { res.json(await uploads.document(res.locals.teacher.id,z.string().uuid().parse(req.params.id))); });
  app.post('/api/assessments/:id/scripts', authorizeUpload('script'), receiveFile, async (req, res) => {
    if (!req.file) throw new ApiError(422,'Choose a scanned student script.');
    const {studentReference} = z.object({studentReference:studentReferenceInput}).strict().parse(req.body);
    res.status(201).json(await uploads.upload(res.locals.teacher.id,z.string().uuid().parse(req.params.id),'script',req.file,studentReference));
  });
  app.post('/api/assessments/:id/document', authorizeUpload('document'), receiveFile, async (req, res) => {
    z.object({}).strict().parse(req.body ?? {});
    if (!req.file) throw new ApiError(422,'Choose an assessment reference file.');
    res.status(201).json(await uploads.upload(res.locals.teacher.id,z.string().uuid().parse(req.params.id),'document',req.file));
  });
  const sendOriginal = (kind: 'script' | 'document'): express.RequestHandler => async (req, res) => {
    const original = await uploads.original(res.locals.teacher.id,z.string().uuid().parse(req.params.id),kind,kind==='script' ? z.string().uuid().parse(req.params.scriptId) : undefined);
    res.set('Cache-Control','private, no-store');
    res.set('Content-Security-Policy',"default-src 'none'; sandbox");
    // Keep PDFs as downloads. Images can be safely displayed through <img>.
    if (original.mimeType === 'application/pdf' || req.query.download === '1') res.attachment(original.originalName);
    res.type(original.mimeType).send(original.bytes);
  };
  app.get('/api/assessments/:id/scripts/:scriptId/original',sendOriginal('script'));
  app.get('/api/assessments/:id/document/original',sendOriginal('document'));
  app.use((_req, res) => res.status(404).json({error: 'Endpoint not found.'}));
  app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof z.ZodError) { res.status(422).json({error: error.issues.map(i => i.message).join(' '), issues: error.issues}); return; }
    if (error instanceof ApiError) { res.status(error.status).json({error: error.message}); return; }
    if (error instanceof multer.MulterError) { res.status(error.code==='LIMIT_FILE_SIZE' ? 413 : 422).json({error:error.code==='LIMIT_FILE_SIZE' ? 'Each file must be 10 MB or smaller.' : 'Upload one file with only the required form fields.'}); return; }
    if (error.type === 'entity.parse.failed') { res.status(400).json({error: 'Invalid JSON.'}); return; }
    if (error.type === 'entity.too.large') { res.status(413).json({error: 'Request exceeds 1 MB.'}); return; }
    console.error('API request failed', {code: error.code ?? 'INTERNAL_ERROR'}); res.status(500).json({error: 'The request could not be completed.'});
  });
  return app;
}
