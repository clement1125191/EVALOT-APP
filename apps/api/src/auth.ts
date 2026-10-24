import {createHash,randomBytes,randomUUID,scrypt,timingSafeEqual} from 'node:crypto';
import {Router,type Request,type Response} from 'express';
import {z} from 'zod';
import type {Store,Database} from './db.js';
import {transaction} from './db.js';
import {ApiError} from './assessments.js';
import {accountAccessRouter,type AccessOptions} from './account-access.js';

export interface Teacher {id:string;displayName:string;email:string;}
const email=z.string().trim().toLowerCase().email().max(254);
const password=z.string().min(6,'Use at least 6 characters for your password.').max(128);
const credentials=z.object({email,password:z.string().min(1).max(128),remember:z.boolean().default(false)}).strict();
const registration=z.object({displayName:z.string().trim().min(2).max(100),email,password,remember:z.boolean().default(false)}).strict();
const cookieName='evalot_session';
const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
let hashing=0;
async function derive(value:string,salt:string):Promise<Buffer>{
  if(hashing>=2)throw new ApiError(429,'Sign-in is busy. Please try again shortly.');
  hashing++;
  try{return await new Promise((resolve,reject)=>scrypt(value,salt,64,{N:32768,r:8,p:3,maxmem:64*1024*1024},(error,key)=>error ? reject(error):resolve(key)));}
  finally{hashing--;}
}
export async function hashPassword(value:string){const salt=randomBytes(16).toString('hex');return `scrypt-v1$${salt}$${(await derive(value,salt)).toString('hex')}`;}
async function verifyPassword(value:string,encoded:string){
  const [version,salt,key]=encoded.split('$');
  if(version!=='scrypt-v1' || !/^[a-f0-9]{32}$/.test(salt??'') || !/^[a-f0-9]{128}$/.test(key??''))throw new ApiError(500,'Account credentials need to be reset.');
  return timingSafeEqual(await derive(value,salt),Buffer.from(key,'hex'));
}
const missingHash=`scrypt-v1$${'0'.repeat(32)}$${'0'.repeat(128)}`;
export function sessionToken(req:Request):string|null{
  const cookies=(req.headers.cookie??'').split(';').map(v=>v.trim());
  const value=cookies.find(v=>v.startsWith(`${cookieName}=`))?.slice(cookieName.length+1);
  return value && /^[a-f0-9]{64}$/.test(value) ? value:null;
}
export class Authentication {
  constructor(private db:Store,private secureCookies=false,private options:AccessOptions={}){}
  async teacher(req:Request):Promise<Teacher|null>{
    const token=sessionToken(req);if(!token)return null;
    return (await this.db.query(`SELECT t.id,t.display_name AS "displayName",t.email FROM teacher_sessions s JOIN teachers t ON t.id=s.teacher_id WHERE s.token_hash=$1 AND s.expires_at>now()`,[digest(token)])).rows[0]??null;
  }
  async limit(bucket:string,max:number){
    await this.db.query('DELETE FROM auth_rate_limits WHERE expires_at<=now()');
    const result=await this.db.query(`INSERT INTO auth_rate_limits(bucket,attempts,expires_at) VALUES($1,1,now()+interval '15 minutes') ON CONFLICT(bucket) DO UPDATE SET attempts=CASE WHEN auth_rate_limits.expires_at<=now() THEN 1 ELSE auth_rate_limits.attempts+1 END,expires_at=CASE WHEN auth_rate_limits.expires_at<=now() THEN now()+interval '15 minutes' ELSE auth_rate_limits.expires_at END RETURNING attempts`,[digest(bucket)]);
    if(result.rows[0].attempts>max)throw new ApiError(429,'Too many attempts. Try again in 15 minutes.');
  }
  async event(db:Database,id:string,action:string){await db.query('INSERT INTO auth_events(id,teacher_id,action) VALUES($1,$2,$3)',[randomUUID(),id,action]);}
  async session(db:Database,id:string,remember:boolean,previous:string|null){
    if(previous)await db.query('DELETE FROM teacher_sessions WHERE token_hash=$1',[digest(previous)]);
    await db.query('DELETE FROM teacher_sessions WHERE expires_at<=now()');
    const token=randomBytes(32).toString('hex');
    await db.query("INSERT INTO teacher_sessions(token_hash,teacher_id,expires_at) VALUES($1,$2,now()+($3 * interval '1 second'))",[digest(token),id,remember ? 30*86400:12*3600]);
    return token;
  }
  setCookie(res:Response,token:string,remember:boolean){res.cookie(cookieName,token,{httpOnly:true,secure:this.secureCookies,sameSite:'lax',path:'/',...(remember ? {maxAge:30*86400*1000}:{})});}
  router(){
    const router=Router();router.use((_req,res,next)=>{res.set('Cache-Control','no-store');next();});
    router.use(accountAccessRouter(this.db,this,this.options,this.secureCookies));
    router.get('/me',async(req,res)=>{const teacher=await this.teacher(req);if(!teacher)throw new ApiError(401,'Please sign in to your teacher account.');res.json({teacher});});
    router.post('/register',async(req,res)=>{
      const input=registration.parse(req.body);await this.limit(`register-ip:${req.ip}`,10);
      const encoded=await hashPassword(input.password);const id=randomUUID();
      let result;
      try{result=await transaction(this.db,async db=>{
        const teacher=(await db.query(`INSERT INTO teachers(id,display_name,email,password_hash) VALUES($1,$2,$3,$4) RETURNING id,display_name AS "displayName",email`,[id,input.displayName,input.email,encoded])).rows[0] as Teacher;
        await this.event(db,id,'ACCOUNT_CREATED');const token=await this.session(db,id,input.remember,sessionToken(req));return {teacher,token};
      });}catch(error:any){if(error.code==='23505')throw new ApiError(409,'Unable to create this account. Try signing in or use another email.');throw error;}
      this.setCookie(res,result.token,input.remember);res.status(201).json({teacher:result.teacher});
    });
    router.post('/login',async(req,res)=>{
      const input=credentials.parse(req.body);await this.limit(`login-ip:${req.ip}`,30);await this.limit(`login-email:${input.email}`,8);
      const row=(await this.db.query(`SELECT id,display_name AS "displayName",email,password_hash FROM teachers WHERE lower(email)=$1`,[input.email])).rows[0];
      const valid=await verifyPassword(input.password,row?.password_hash??missingHash);
      if(!row || !valid)throw new ApiError(401,'Email or password is incorrect.');
      const token=await transaction(this.db,async db=>{await this.event(db,row.id,'SIGNED_IN');await db.query('DELETE FROM auth_rate_limits WHERE bucket=$1',[digest(`login-email:${input.email}`)]);return this.session(db,row.id,input.remember,sessionToken(req));});
      this.setCookie(res,token,input.remember);res.json({teacher:{id:row.id,displayName:row.displayName,email:row.email}});
    });
    router.post('/logout',async(req,res)=>{
      const teacher=await this.teacher(req);const token=sessionToken(req);
      if(token)await transaction(this.db,async db=>{await db.query('DELETE FROM teacher_sessions WHERE token_hash=$1',[digest(token)]);if(teacher)await this.event(db,teacher.id,'SIGNED_OUT');});
      res.clearCookie(cookieName,{httpOnly:true,secure:this.secureCookies,sameSite:'lax',path:'/'});res.status(204).end();
    });
    return router;
  }
}
