import pg from 'pg';
import {grantAdministrator} from './lib/grant-admin.mjs';
const args=process.argv.slice(2),email=args[args.indexOf('--email')+1];
if(!args.includes('--email')||!email||!/^\S+@\S+\.\S+$/.test(email))throw Error('Usage: node --env-file=.env scripts/grant-admin.mjs --email existing@example.com [--grant]');
if(!process.env.DATABASE_URL)throw Error('DATABASE_URL is required in the trusted operator environment.');
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:5000});
let client;
try{
 client=await pool.connect();
 const result=await grantAdministrator(client,email,args.includes('--grant'));
 console.log('Account:',result.teacher.display_name,result.teacher.email);
 console.log(result.status==='granted'?'Administrator access granted. Sign in through the normal Evalot sign-in page.':result.status==='existing'?'Administrator access is already active.':'Dry run only. Add --grant to assign access.');
}catch(error){
 // Show the diagnostic code, without connection strings, SQL values or credentials.
 console.error(error.code?'Administrator setup failed (database code '+String(error.code)+'). Verify migrations and database access.':error.message);
 process.exitCode=1;
}finally{client?.release();await pool.end();}
