import {useEffect,useState} from 'react';
import type {AssessmentDetail,PaperHeader} from '@evalot/contracts';
import {api} from './api';
import {PaperPreview} from './PaperLibrary';
export function headerLayout(header:PaperHeader,layout:'saved'|'centered'|'left',saved:PaperHeader):PaperHeader{
 if(layout==='saved')return structuredClone(saved);
 const next=structuredClone(header);for(const key of ['school','faculty','department','title','module'] as const)next[key].align=layout==='centered'?'center':'left';
 next.school.bold=true;next.title.bold=true;next.logoAlign=layout==='centered'?'center':'left';return next;
}
export function PaperHeaderStart({assessment,onStart,onBusy,onDirty}:{assessment:AssessmentDetail;onStart:()=>void;onBusy:(v:boolean)=>void;onDirty:(v:boolean)=>void}){
 const [value,setValue]=useState<{header:PaperHeader;revision:number}|null>(null),[saved,setSaved]=useState<PaperHeader|null>(null),[layout,setLayout]=useState<'saved'|'centered'|'left'>('saved'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let active=true;void api<{header:PaperHeader;revision:number}>(`/assessments/${assessment.id}/header`).then(v=>{if(active){setValue(v);setSaved(v.header);}}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[assessment.id]);
 async function start(){if(!value)return;setBusy(true);onBusy(true);setError('');try{await api(`/assessments/${assessment.id}/header`,'PUT',value);onDirty(false);onStart();}catch(e){setError((e as Error).message);}finally{setBusy(false);onBusy(false);}}
 return <section className="panel"><h2>Preview your paper header</h2><p>{assessment.subject} · {assessment.className}. This uses the school header selected in your profile. Choose a layout, then start preparing your questions.</p>{error&&<p role="alert">{error}</p>}{!value?<p role="status">Loading your school header…</p>:<><div className="header-start-layouts" aria-label="Paper header layout">{([['saved','Saved school header'],['centered','Centered'],['left','Left aligned']] as const).map(([key,label])=><button type="button" className="secondary" key={key} disabled={busy} aria-pressed={layout===key} onClick={()=>{setLayout(key);setValue({...value,header:headerLayout(value.header,key,saved!)});onDirty(true);}}>{label}</button>)}</div><div className="header-start-preview"><PaperPreview header={value.header}/></div><div className="header-start-actions"><p>School, logo, date and term stay on your paper.</p><button disabled={busy} onClick={()=>void start()}>{busy?'Saving header…':'Start preparing'}</button></div></>}</section>;
}
