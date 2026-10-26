import type {CorrectionSession} from '@evalot/contracts';
export type CaptureAction='NEXT'|'CORRECT_STUDENT'|'CORRECT_CLASS'|'MARK_STUDENT';
export interface CaptureRequest {<T>(path:string,method?:string,body?:unknown):Promise<T>;}
export async function finishDirectCapture(request:CaptureRequest,session:CorrectionSession,studentId:string,action:CaptureAction,consent:boolean,localOnly=false){
 const root='/correction/sessions/'+session.id;
 if(action!=='NEXT'&&action!=='MARK_STUDENT'&&!localOnly&&!consent)throw new Error('Approve AI sharing before starting correction.');
 if((action==='CORRECT_STUDENT'||action==='MARK_STUDENT')&&!studentId)throw new Error('Capture the student’s pages first.');
 if(studentId){const st=session.students.find(s=>s.id===studentId);if(!st)throw new Error('Student bundle not found.');if(!session.files.some(f=>f.kind==='PAGE'&&f.studentId===studentId))throw new Error('Capture at least the front page first.');if(!st.pagesComplete)await request(root+'/students/'+studentId+'/complete','POST',{});}
 let saved=await request<CorrectionSession>(root);
 if(action==='NEXT')return {session:saved,needsGuide:false,queued:false};
 if(saved.guide.status!=='READY')return {session:saved,needsGuide:true,queued:false};
 if(action==='MARK_STUDENT')await request(root+'/students/'+studentId+'/mark','POST',{consent});else await request(root+(action==='CORRECT_CLASS'?(localOnly?'/extract-all':'/correct-all'):'/students/'+studentId+(localOnly?'/extract':'/correct')),'POST',localOnly?{}:{consent:true});
 saved=await request<CorrectionSession>(root);return {session:saved,needsGuide:false,queued:action!=='MARK_STUDENT'||saved.students.some(s=>s.id===studentId&&['QUEUED','PROCESSING'].includes(s.status))};
}
export async function openCaptureStream(getUserMedia:(constraints:MediaStreamConstraints)=>Promise<MediaStream>,isCancelled:()=>boolean){const stream=await getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}},audio:false});if(isCancelled()){stream.getTracks().forEach(t=>t.stop());return null;}return stream;}
