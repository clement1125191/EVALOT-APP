// Serve only compiled frontend assets; proxy authenticated API calls to localhost.
import express from 'express';
import http from 'node:http';
import {resolve,extname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {existsSync} from 'node:fs';
const defaultAssets=fileURLToPath(new URL('../apps/web/dist/',import.meta.url));
export function createPhonePreview({assets=defaultAssets,apiPort=4001}={}){
 const app=express();
 app.disable('x-powered-by');
 app.use((_req,res,next)=>{res.set('Cache-Control','no-store');res.set('Permissions-Policy','camera=(self), microphone=()');res.set('Referrer-Policy','same-origin');next();});
 app.use('/api',(req,res)=>{
  const upstream=http.request({hostname:'127.0.0.1',port:apiPort,path:req.originalUrl,method:req.method,headers:{...req.headers,host:'127.0.0.1:'+apiPort}},reply=>{res.writeHead(reply.statusCode??502,reply.headers);reply.pipe(res);reply.on('error',()=>res.destroy());});
  upstream.setTimeout(130000,()=>upstream.destroy());
  upstream.on('error',()=>{if(!res.headersSent)res.status(502).json({error:'Phone preview API is not available.'});else res.destroy();});
  req.on('aborted',()=>upstream.destroy());req.pipe(upstream);
 });
 app.use(express.static(assets,{dotfiles:'deny',index:'index.html'}));
 app.use((req,res)=>{
  let path;try{path=decodeURIComponent(req.path);}catch{res.status(400).end();return;}
  if(!['GET','HEAD'].includes(req.method)||!req.accepts('html')||extname(path)||path.split('/').some(part=>part.startsWith('.'))){res.status(404).end();return;}
  // Use an explicit public root: absolute paths contain the parent's hidden .codex directory.
  res.sendFile('index.html',{root:assets,dotfiles:'deny'},error=>{
   if(!error)return;
   if(res.headersSent){res.destroy();return;}
   res.status(503).type('text/plain').send('Phone preview is rebuilding. Refresh in a moment.');
  });
 });
 // Do not expose filesystem paths or Express stack traces through the public tunnel.
 app.use((_error,_req,res,_next)=>{if(res.headersSent)res.destroy();else res.status(500).type('text/plain').send('Phone preview could not load this page.');});
 return app;
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 if(!existsSync(resolve(defaultAssets,'index.html')))throw new Error('Run npm run build before starting phone preview.');
 const server=createPhonePreview({apiPort:Number(process.env.PHONE_API_PORT??4001)}).listen(Number(process.env.PHONE_PREVIEW_PORT??5180),'127.0.0.1',()=>console.log('Evalot phone preview: http://127.0.0.1:'+(process.env.PHONE_PREVIEW_PORT??5180)));
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close());
}
