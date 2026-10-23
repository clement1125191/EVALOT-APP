import {useEffect,useState} from 'react';
import {api} from './api';
type SharedLogo={id:string;institutionName:string};
export function UploadSharedInstitutionLogo({onSaved}:{onSaved:()=>Promise<void>}){
 const [name,setName]=useState(''),[file,setFile]=useState<File|null>(null),[logoId,setLogoId]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[reset,setReset]=useState(0);
 async function save(){
  if(!file||name.trim().length<2)return;
  setBusy(true);setError('');setNotice('');
  try{
   let id=logoId;
   if(!id){
    const data=new FormData();data.append('file',file);
    const response=await fetch('/api/library/logos',{method:'POST',headers:{'X-Evalot-Request':'1'},body:data});
    const result=await response.json();if(!response.ok)throw new Error(result.error||'Could not upload logo.');
    id=result.id as string;setLogoId(id);
   }
   await api('/library/shared-logos','POST',{logoId:id,institutionName:name.trim()});
   await onSaved();setName('');setFile(null);setLogoId(null);setReset(v=>v+1);setNotice('School logo shared. Other teachers can now find and reuse it.');
  }catch(e){setError(e instanceof Error?e.message:'Could not share school logo.');}finally{setBusy(false);}
 }
 return <details><summary>Upload and share a school logo</summary><p>Add logos for any institution. Shared logos are available to all signed-in Evalot teachers.</p><label>Institution name<input value={name} maxLength={100} disabled={busy} onChange={e=>setName(e.target.value)} placeholder="Full school name"/></label><label>School logo (PNG or JPEG, up to 2 MB)<input key={reset} type="file" accept="image/png,image/jpeg" disabled={busy} onChange={e=>{setFile(e.target.files?.[0]??null);setLogoId(null);setNotice('');}}/></label><button type="button" disabled={busy||!file||name.trim().length<2} onClick={()=>void save()}>{busy?'Sharing…':'Upload and share logo'}</button>{error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}</details>;
}
export function ShareInstitutionLogo({logoId}:{logoId:string}){
 const [name,setName]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 return <details><summary>Share with other teachers</summary><label>Institution name<input value={name} maxLength={100} onChange={e=>setName(e.target.value)} placeholder="Full school name"/></label><button type="button" disabled={busy||name.trim().length<2} onClick={()=>{setBusy(true);void api('/library/shared-logos','POST',{logoId,institutionName:name}).then(()=>setMessage('Logo saved in the shared school directory.')).catch(e=>setMessage(e.message)).finally(()=>setBusy(false));}}>Share school logo</button>{message&&<p role="status">{message}</p>}</details>;
}
export function SharedInstitutionLogos({institutionName,disabled,onUse}:{institutionName:string;disabled:boolean;onUse:(id:string)=>void}){
 const [query,setQuery]=useState(institutionName),[items,setItems]=useState<SharedLogo[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false);
 useEffect(()=>setQuery(institutionName),[institutionName]);
 useEffect(()=>{let active=true;setItems([]);setError('');setLoading(query.trim().length>=2);const timer=setTimeout(()=>{if(query.trim().length<2)return;void api<SharedLogo[]>('/library/shared-logos?institution='+encodeURIComponent(query.trim())).then(rows=>{if(active)setItems(rows);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});},350);return()=>{active=false;clearTimeout(timer);};},[query]);
 return <section aria-label="Shared institution logos"><label>Find a shared school logo<input value={query} maxLength={100} disabled={disabled||busy} onChange={e=>setQuery(e.target.value)} placeholder="School name, for example University of Rwanda"/></label><p>Reuse a logo shared by another teacher. Check the school name and image before choosing.</p>{loading&&<p role="status">Finding logos…</p>}{!loading&&query.trim().length>=2&&!items.length&&!error&&<p>No shared logo found. You can upload one below.</p>}{error&&<p role="alert">{error}</p>}<div className="shared-logo-grid">{items.map(item=><button type="button" className="secondary" key={item.id} disabled={disabled||busy} onClick={()=>{setBusy(true);setError('');void api<{id:string}>('/library/shared-logos/'+item.id+'/use','POST',{}).then(logo=>onUse(logo.id)).catch(e=>setError(e.message)).finally(()=>setBusy(false));}}><img src={'/api/library/shared-logos/'+item.id+'/original'} alt={item.institutionName+' logo'}/><span>{item.institutionName}<small>Use this logo</small></span></button>)}</div></section>;
}
