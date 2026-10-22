import {Router} from 'express';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {z} from 'zod';
import {transaction,type Store} from './db.js';
import {ApiError} from './assessments.js';
import {hashPassword,sessionToken,type Authentication} from './auth.js';
export interface AccessOptions {
  publicUrl?:string;
  sendReset?:(email:string,url:string)=>Promise<void>;
  google?:{clientId:string;clientSecret:string;redirectUri:string};
  fetch?:typeof fetch;
}
const hash=(v:string)=>createHash('sha256').update(v).digest('hex');
const email=z.string().trim().toLowerCase().email().max(254);
export function accountAccessRouter(db:Store,auth:Authentication,options:AccessOptions,secure:boolean){
  const router=Router();
  router.get('/options',(_req,res)=>res.json({google:Boolean(options.google),recovery:Boolean(options.sendReset)}));
  router.post('/forgot-password',async(req,res)=>{
    const input=z.object({email}).strict().parse(req.body);
    if(!options.sendReset)throw new ApiError(503,'Email recovery is awaiting provider setup.');
    await auth.limit(`recovery-ip:${req.ip}`,10);await auth.limit(`recovery-email:${input.email}`,3);
    const row=(await db.query('SELECT id FROM teachers WHERE lower(email)=$1',[input.email])).rows[0];
    if(row){
      const token=randomBytes(32).toString('hex');
      await transaction(db,async tx=>{await tx.query('DELETE FROM password_resets WHERE teacher_id=$1 OR expires_at<=now()',[row.id]);await tx.query("INSERT INTO password_resets VALUES($1,$2,now()+interval '20 minutes')",[hash(token),row.id]);});
      const url=new URL(options.publicUrl??'http://127.0.0.1:5174');url.searchParams.set('reset',token);
      try{await options.sendReset(input.email,url.toString());}catch{await db.query('DELETE FROM password_resets WHERE token_hash=$1',[hash(token)]);console.error('Password recovery email delivery failed.');}
    }
    res.json({message:'If an account exists for that email, a reset link will arrive shortly. Check your spam folder too.'});
  });
  router.post('/reset-password',async(req,res)=>{
    const input=z.object({token:z.string().regex(/^[a-f0-9]{64}$/),password:z.string().min(15).max(128)}).strict().parse(req.body);
    await auth.limit(`reset-ip:${req.ip}`,10);const encoded=await hashPassword(input.password);
    await transaction(db,async tx=>{
      const row=(await tx.query('SELECT teacher_id FROM password_resets WHERE token_hash=$1 AND expires_at>now() FOR UPDATE',[hash(input.token)])).rows[0];
      if(!row)throw new ApiError(400,'This reset link has expired or already been used. Request a new one.');
      await tx.query('UPDATE teachers SET password_hash=$1 WHERE id=$2',[encoded,row.teacher_id]);
      await tx.query('DELETE FROM password_resets WHERE teacher_id=$1',[row.teacher_id]);
      await tx.query('DELETE FROM teacher_sessions WHERE teacher_id=$1',[row.teacher_id]);
      const account=(await tx.query('SELECT email FROM teachers WHERE id=$1',[row.teacher_id])).rows[0];
      await tx.query('DELETE FROM auth_rate_limits WHERE bucket=$1',[hash('login-email:'+account.email)]);
      await auth.event(tx,row.teacher_id,'PASSWORD_RESET');
    });res.json({message:'Password updated. Sign in with your new password.'});
  });
  router.get('/google',async(req,res)=>{
    const config=options.google;if(!config)throw new ApiError(503,'Google sign-in is awaiting provider setup.');
    await auth.limit(`google-ip:${req.ip}`,30);
    const state=randomBytes(32).toString('hex'),browser=randomBytes(32).toString('hex'),verifier=randomBytes(32).toString('base64url');
    await db.query('DELETE FROM google_flows WHERE expires_at<=now()');
    await db.query("INSERT INTO google_flows VALUES($1,$2,$3,now()+interval '10 minutes')",[hash(state),hash(browser),verifier]);
    res.cookie('evalot_google',browser,{httpOnly:true,secure,sameSite:'lax',path:'/api/auth',maxAge:600000});
    const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');url.search=new URLSearchParams({client_id:config.clientId,redirect_uri:config.redirectUri,response_type:'code',scope:'openid email profile',state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256',prompt:'select_account'}).toString();res.redirect(url.toString());
  });
  router.get('/google/callback',async(req,res)=>{
    const home=new URL(options.publicUrl??'http://127.0.0.1:5174');
    try{
      const config=options.google;if(!config)throw new Error('Not configured');
      const state=z.string().regex(/^[a-f0-9]{64}$/).parse(req.query.state);
      const browser=(req.headers.cookie??'').split(';').map(v=>v.trim()).find(v=>v.startsWith('evalot_google='))?.slice('evalot_google='.length);
      if(!browser)throw new Error('Missing browser binding');
      const flow=(await db.query('DELETE FROM google_flows WHERE state_hash=$1 AND browser_hash=$2 AND expires_at>now() RETURNING verifier',[hash(state),hash(browser)])).rows[0];
      if(!flow)throw new Error('Invalid state');
      const code=z.string().min(1).max(4096).parse(req.query.code);const provider=options.fetch??fetch;
      const exchange=await provider('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code,client_id:config.clientId,client_secret:config.clientSecret,redirect_uri:config.redirectUri,grant_type:'authorization_code',code_verifier:flow.verifier}),signal:AbortSignal.timeout(10000)});
      if(!exchange.ok)throw new Error('Exchange failed');
      const access=z.object({access_token:z.string().min(1)}).parse(await exchange.json());
      const profile=await provider('https://openidconnect.googleapis.com/v1/userinfo',{headers:{Authorization:`Bearer ${access.access_token}`},signal:AbortSignal.timeout(10000)});
      if(!profile.ok)throw new Error('Profile failed');
      const identity=z.object({sub:z.string().min(1).max(255),email,email_verified:z.literal(true),name:z.string().max(100).optional()}).parse(await profile.json());
      const token=await transaction(db,async tx=>{
        let row=(await tx.query('SELECT teacher_id AS id FROM google_identities WHERE subject=$1',[identity.sub])).rows[0];
        if(!row){
          if((await tx.query('SELECT id FROM teachers WHERE lower(email)=$1',[identity.email])).rows.length){home.searchParams.set('authError','existing-account');throw new Error('No automatic account merge');}
          row={id:randomUUID()};await tx.query('INSERT INTO teachers(id,display_name,email) VALUES($1,$2,$3)',[row.id,identity.name?.trim()||identity.email.split('@')[0],identity.email]);
          await tx.query('INSERT INTO google_identities VALUES($1,$2)',[identity.sub,row.id]);await auth.event(tx,row.id,'ACCOUNT_CREATED');
        }
        await auth.event(tx,row.id,'SIGNED_IN');return auth.session(tx,row.id,false,sessionToken(req));
      });auth.setCookie(res,token,false);
    }catch{if(!home.searchParams.has('authError'))home.searchParams.set('authError','google');}
    res.clearCookie('evalot_google',{httpOnly:true,secure,sameSite:'lax',path:'/api/auth'});res.redirect(home.toString());
  });return router;
}
