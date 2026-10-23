import {Router} from 'express';
import {createHash,randomUUID} from 'node:crypto';
import {z} from 'zod';
import {ApiError} from './assessments.js';
import {transaction,type Store} from './db.js';

const institution=z.string().trim().min(2).max(100);
const key=(value:string)=>value.normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
export function sharedLogoRouter(db:Store){
 const router=Router();
 router.get('/library/shared-logos',async(req,res)=>{
  const query=key(institution.parse(req.query.institution));
  // Literal substring search: a school name containing % or _ is not a wildcard.
  res.json((await db.query('SELECT id,institution_name AS "institutionName" FROM shared_institution_logos WHERE strpos(institution_key,$1)>0 ORDER BY institution_name,created_at DESC LIMIT 20',[query])).rows);
 });
 router.get('/library/shared-logos/:id/original',async(req,res)=>{
  const row=(await db.query('SELECT bytes FROM shared_institution_logos WHERE id=$1',[z.string().uuid().parse(req.params.id)])).rows[0];
  if(!row)throw new ApiError(404,'Shared logo not found.');
  res.set('Cache-Control','private, no-store').type('image/png').send(Buffer.from(row.bytes));
 });
 router.post('/library/shared-logos',async(req,res)=>{
  const input=z.object({logoId:z.string().uuid(),institutionName:institution}).strict().parse(req.body),owner=res.locals.teacher.id;
  const row=(await db.query('SELECT bytes FROM library_logos WHERE id=$1 AND teacher_id=$2',[input.logoId,owner])).rows[0];
  if(!row)throw new ApiError(404,'Logo not found in your library.');
  const bytes=Buffer.from(row.bytes),hash=createHash('sha256').update(bytes).digest('hex');
  const result=await db.query('INSERT INTO shared_institution_logos(id,institution_name,institution_key,sha256,bytes,contributed_by) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(institution_key,sha256) DO UPDATE SET institution_key=excluded.institution_key RETURNING id,institution_name AS "institutionName"',[randomUUID(),input.institutionName,key(input.institutionName),hash,bytes,owner]);
  res.status(201).json(result.rows[0]);
 });
 router.post('/library/shared-logos/:id/use',async(req,res)=>{
  const sharedId=z.string().uuid().parse(req.params.id),owner=res.locals.teacher.id;
  const result=await transaction(db,async tx=>{
   await tx.query('SELECT id FROM teachers WHERE id=$1 FOR UPDATE',[owner]);
   const existing=(await tx.query('SELECT id,name FROM library_logos WHERE teacher_id=$1 AND shared_logo_id=$2',[owner,sharedId])).rows[0];
   if(existing)return existing;
   const shared=(await tx.query('SELECT institution_name,bytes FROM shared_institution_logos WHERE id=$1',[sharedId])).rows[0];
   if(!shared)throw new ApiError(404,'Shared logo not found.');
   if((await tx.query('SELECT count(*)::int AS count FROM library_logos WHERE teacher_id=$1',[owner])).rows[0].count>=30)throw new ApiError(422,'Your library can hold up to 30 logos.');
   return (await tx.query('INSERT INTO library_logos(id,teacher_id,name,bytes,shared_logo_id) VALUES($1,$2,$3,$4,$5) RETURNING id,name',[randomUUID(),owner,shared.institution_name,shared.bytes,sharedId])).rows[0];
  });
  res.json(result);
 });
 return router;
}
