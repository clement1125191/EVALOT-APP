import {Router} from 'express';
import {markingSettingsInput} from '@evalot/contracts';
import {z} from 'zod';
import {transaction,type Database,type Store} from './db.js';
import {ApiError} from './assessments.js';
export async function markingDefaults(db:Database,owner:string){
 const row=(await db.query('SELECT settings,revision FROM educator_marking_preferences WHERE teacher_id=$1',[owner])).rows[0];
 return row?{markingSettings:markingSettingsInput.parse(row.settings),revision:row.revision}:{markingSettings:markingSettingsInput.parse({}),revision:0};
}
export function educatorSettingsRouter(db:Store){const router=Router();
 router.get('/settings/marking',async(_req,res)=>res.json(await markingDefaults(db,res.locals.teacher.id)));
 router.put('/settings/marking',async(req,res)=>{const input=z.object({revision:z.number().int().min(0),markingSettings:markingSettingsInput}).strict().parse(req.body),owner=res.locals.teacher.id;
 await transaction(db,async tx=>{await tx.query('SELECT id FROM teachers WHERE id=$1 FOR UPDATE',[owner]);const current=await markingDefaults(tx,owner);if(current.revision!==input.revision)throw new ApiError(409,'Settings changed. Reload before saving.');await tx.query('INSERT INTO educator_marking_preferences(teacher_id,settings,revision) VALUES($1,$2,$3) ON CONFLICT(teacher_id) DO UPDATE SET settings=excluded.settings,revision=excluded.revision,updated_at=now()',[owner,JSON.stringify(input.markingSettings),input.revision+1]);});res.json(await markingDefaults(db,owner));});return router;
}
