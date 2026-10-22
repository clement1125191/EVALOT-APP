// End-to-end local API check with invented papers. Run after create-demo-scans.mjs.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const origin='http://127.0.0.1:4000/api';
async function json(path,method='GET',body){
  const response=await fetch(origin+path,{method,headers:body ? {'Content-Type':'application/json'} : {},body:body ? JSON.stringify(body):undefined});
  const result=await response.json();if(!response.ok)throw new Error(result.error);return result;
}
async function upload(path,bytes,name,reference){
  const form=new FormData();if(reference)form.append('studentReference',reference);form.append('file',new Blob([bytes]),name);
  const response=await fetch(origin+path,{method:'POST',body:form});const result=await response.json();if(response.status!==201)throw new Error(result.error);return result;
}
const assessment=await json('/assessments','POST',{title:'Demo · Upload workflow',subject:'English',className:'S3 Demo',totalMarks:10});
const root=`/assessments/${assessment.id}`;
await upload(root+'/document',await readFile(new URL('../.data/demo/demo-assessment.pdf',import.meta.url)),'demo-assessment.pdf');
await json(root+'/questions','PUT',{revision:0,questions:[{position:1,type:'SHORT_ANSWER',prompt:'Define a noun and give an example.',maxMarks:10,options:[],expectedAnswer:'A noun names a person, place, thing or idea. Accept a correct example.',rubric:[]}]});
await json(root+'/ready','POST',{revision:1});
const bytes=await readFile(new URL('../.data/demo/demo-student-paper.png',import.meta.url));
const script=await upload(root+'/scripts',bytes,'demo-student-paper.png','DEMO-001');
const original=await fetch(origin+root+`/scripts/${script.id}/original`);
if(!original.ok || !Buffer.from(await original.arrayBuffer()).equals(bytes))throw new Error('Original file did not match');
if(script.sha256!==createHash('sha256').update(bytes).digest('hex'))throw new Error('Checksum mismatch');
const audit=await json(root+'/audit');
if(!audit.some(event=>event.action==='SCRIPT_UPLOADED') || !audit.some(event=>event.action==='ASSESSMENT_DOCUMENT_UPLOADED'))throw new Error('Missing audit event');
console.log(JSON.stringify({assessmentId:assessment.id,originalVerified:true,auditVerified:true,scriptCount:(await json(root+'/scripts')).length}));
