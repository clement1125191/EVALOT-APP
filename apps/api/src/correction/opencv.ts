import {spawn} from 'node:child_process';
import {z} from 'zod';
import type {ScanProcessor} from './scan.js';
const quality=z.object({paperDetected:z.boolean(),corners:z.array(z.tuple([z.number().min(0).max(1),z.number().min(0).max(1)])).max(4),sharpness:z.number().min(0),brightness:z.number().min(0).max(255),warnings:z.array(z.string().max(300)).max(8),width:z.number().int().min(1).max(2400),height:z.number().int().min(1).max(2400),engine:z.string().max(100)}).strict();
export function localOpenCV(python:string,script:string,moduleDirectory:string):ScanProcessor{
 let running=false;
 return async bytes=>{
  if(running)throw new Error('Scan processor is busy. Try again shortly.');running=true;
  try{return await new Promise((resolve,reject)=>{
   const child=spawn(python,[script],{windowsHide:true,stdio:['pipe','pipe','pipe'],env:{...process.env,PYTHONPATH:moduleDirectory,PYTHONNOUSERSITE:'1'}});
   let size=0;const chunks:Buffer[]=[];let finished=false;
   const done=(error?:Error)=>{if(finished)return;finished=true;clearTimeout(timer);if(error){child.kill();reject(error);return;}try{const output=z.object({image:z.string().max(14_000_000),quality}).strict().parse(JSON.parse(Buffer.concat(chunks).toString()));const image=Buffer.from(output.image,'base64');if(!image.length||image.length>10*1024*1024)throw new Error('Invalid processed page');resolve({bytes:image,quality:output.quality});}catch{reject(new Error('OpenCV returned an invalid page.'));}};
   const timer=setTimeout(()=>done(new Error('Page processing timed out. Try a smaller photo.')),20000);
   child.stdout.on('data',(chunk:Buffer)=>{size+=chunk.length;if(size>15_000_000)done(new Error('Processed page is too large.'));else chunks.push(chunk);});child.stderr.on('data',()=>{});
   child.on('error',()=>done(new Error('OpenCV is unavailable. Check the local Python setup.')));child.on('close',code=>done(code===0?undefined:new Error('OpenCV could not process this photo.')));child.stdin.on('error',()=>done(new Error('OpenCV could not read this photo.')));child.stdin.end(JSON.stringify({image:bytes.toString('base64')}));
  });}finally{running=false;}
 };
}
