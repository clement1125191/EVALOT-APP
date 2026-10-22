import {isAbsolute} from 'node:path';
export function hostingConfig(env:NodeJS.ProcessEnv){
 const production=env.NODE_ENV==='production';
 if(env.AUTH_MODE!=='password')throw new Error('Set AUTH_MODE=password.');
 if(!env.DATABASE_URL)throw new Error('DATABASE_URL is required.');
 if(production&&(!env.APP_PUBLIC_URL||!env.APP_ORIGINS))throw new Error('Production requires APP_PUBLIC_URL and APP_ORIGINS.');
 const publicUrl=env.APP_PUBLIC_URL??'http://127.0.0.1:5174';
 const origins=(env.APP_ORIGINS??'http://127.0.0.1:5174,http://localhost:5174,http://127.0.0.1:5173,http://localhost:5173').split(',').map(v=>v.trim());
 for(const origin of origins){const url=new URL(origin);if(url.origin!==origin||(production&&url.protocol!=='https:'))throw new Error('APP_ORIGINS must contain exact origins; use HTTPS in production.');}
 if(!origins.includes(new URL(publicUrl).origin))throw new Error('APP_PUBLIC_URL must match an allowed app origin.');
 if(production&&(new URL(publicUrl).protocol!=='https:'||!env.UPLOAD_STORAGE_ROOT||!isAbsolute(env.UPLOAD_STORAGE_ROOT)))throw new Error('Production requires HTTPS and an absolute UPLOAD_STORAGE_ROOT on persistent storage.');
 if(production&&env.GOOGLE_REDIRECT_URI&&new URL(env.GOOGLE_REDIRECT_URI).origin!==new URL(publicUrl).origin)throw new Error('Use the public app origin for the Google callback through the API proxy.');
 return {production,origins,publicUrl,host:env.HOST??(production?'0.0.0.0':'127.0.0.1'),storageRoot:env.UPLOAD_STORAGE_ROOT};
}
