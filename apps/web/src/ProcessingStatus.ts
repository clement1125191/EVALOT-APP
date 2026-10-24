import {useEffect,useRef,useState} from 'react';
import type {CorrectionSession,CorrectionStudent} from '@evalot/contracts';
export function studentProcessingLabel(student:CorrectionStudent){
 if(student.status==='QUEUED')return 'Waiting to process';
 if(student.status==='PROCESSING')return !student.ocrEvidence?'Reading student pages':student.ocrOnly?'Extracting text':'Preparing draft marks';
 if(student.status==='ERROR')return 'Needs attention';
 if(student.status==='REVIEWED')return 'Teacher reviewed';
 if(student.status==='REVIEW')return 'Ready for review';
 return student.pagesComplete?'Pages saved':'Capturing pages';
}
export function processingSummary(session:CorrectionSession){
 const pending=session.students.filter(s=>s.status==='QUEUED'||s.status==='PROCESSING').length;
 const done=session.students.filter(s=>['REVIEW','REVIEWED','ERROR'].includes(s.status)).length;
 const errors=session.students.filter(s=>s.status==='ERROR').length;
 return {pending,done,errors};
}
export function useProcessingNotice(session:CorrectionSession|null){
 const previous=useRef({id:'',pending:0}),[notice,setNotice]=useState(''),[permission,setPermission]=useState(typeof Notification==='undefined'?'unavailable':Notification.permission);
 const id=session?.id??'',pending=session?processingSummary(session).pending:0,done=session?processingSummary(session).done:0,errors=session?processingSummary(session).errors:0;
 useEffect(()=>{
  if(previous.current.id!==id){previous.current={id,pending};setNotice('');return;}
  if(pending)setNotice('');
  if(previous.current.pending>0&&pending===0&&done>0){const text=errors?`Processing finished. ${errors} student ${errors===1?'paper needs':'papers need'} attention. Open Review to check the saved pages.`:`${done} student ${done===1?'paper is':'papers are'} ready for review. Final marks still need your approval.`;setNotice(text);if(typeof Notification!=='undefined'&&Notification.permission==='granted'){try{new Notification('Evalot: processing complete',{body:text,tag:'evalot-'+id});}catch{}}}
  previous.current={id,pending};
 },[id,pending,done,errors]);
 async function enable(){if(typeof Notification==='undefined')return;try{setPermission(await Notification.requestPermission());}catch{setPermission('denied');}}
 return {notice,permission,enable};
}
