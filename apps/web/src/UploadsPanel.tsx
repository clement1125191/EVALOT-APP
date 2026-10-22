import { useEffect, useState, type FormEvent } from 'react';
import type { AssessmentDetail, UploadedDocument, StudentScript } from '@evalot/contracts';
import { api } from './api';
import './uploads.css';

async function upload(path: string, data: FormData) {
  const response = await fetch(`/api${path}`,{method:'POST',body:data,headers:{'X-Evalot-Request':'1'}});
  if(response.status===401)window.dispatchEvent(new Event('evalot:session-expired'));
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? 'The upload could not be completed.');
  return result;
}
function sizeLabel(bytes: number) { return `${(bytes/1024/1024).toFixed(2)} MB`; }

export function UploadsPanel({assessment,onUploaded}: {assessment:AssessmentDetail;onUploaded:()=>void}) {
  const [document,setDocument] = useState<UploadedDocument|null>(null);
  const [scripts,setScripts] = useState<StudentScript[]>([]);
  const [busy,setBusy] = useState(false); const [loading,setLoading] = useState(true);
  const [error,setError] = useState(''); const [notice,setNotice] = useState('');
  const [preview,setPreview] = useState<StudentScript|null>(null);
  const root = `/assessments/${assessment.id}`;
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    Promise.all([api<UploadedDocument|null>(`${root}/document`),api<StudentScript[]>(`${root}/scripts`)])
      .then(([doc,list]) => {if(active){setDocument(doc);setScripts(list);}})
      .catch(e => {if(active)setError(e.message);})
      .finally(() => {if(active)setLoading(false);});
    return () => {active=false;};
  },[root]);
  async function submit(event:FormEvent<HTMLFormElement>, kind:'document'|'scripts') {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
    const file = data.get('file');
    if (!(file instanceof File) || !file.size) {setError('Choose a nonempty scanned PDF, JPEG or PNG.');return;}
    if (file.size>10*1024*1024) {setError('Each file must be 10 MB or smaller.');return;}
    setBusy(true);setError('');setNotice('');
    try {
      const saved = await upload(`${root}/${kind}`,data);
      if(kind==='document')setDocument(saved);else setScripts(await api<StudentScript[]>(`${root}/scripts`));
      form.reset();setNotice(kind==='document' ? 'Assessment reference saved.' : 'Student script uploaded. The original is preserved.');onUploaded();
    } catch(e) {setError(e instanceof Error ? e.message : 'Upload failed.');}
    finally {setBusy(false);}
  }
  const scriptAllowed = assessment.status==='READY';
  return <>
    {error && <div className="message error" role="alert">{error}</div>}{notice && <div className="message" role="status">{notice}</div>}
    <section className="panel upload-panel"><div className="section-title"><div><h2>Assessment reference</h2><p>Keep a copy of the exam alongside your questions and marking guide.</p></div></div>
      {loading ? <p role="status">Loading uploaded papers…</p> : document ? <div className="file-row"><div><strong>{document.originalName}</strong><small>{document.pageCount} {document.pageCount===1 ? 'page':'pages'} · {sizeLabel(document.byteSize)}</small></div><a href={`/api${root}/document/original?download=1`}>Download original</a></div> : assessment.status==='DRAFT' ? <form onSubmit={e=>void submit(e,'document')}><label>Assessment scan<input type="file" name="file" accept="application/pdf,image/jpeg,image/png" required disabled={busy}/></label><button disabled={busy}>{busy ? 'Uploading…':'Upload assessment reference'}</button></form> : <p>No assessment reference was attached during setup.</p>}
    </section>
    <section className="panel upload-panel"><div className="section-title"><div><h2>Student scripts</h2><p>Upload one student’s completed paper per file.</p></div><span className="count">{scripts.length} uploaded</span></div>
      <p className="upload-guidance">PDF, JPEG or PNG · up to 10 MB · PDFs up to 50 pages. Use a student reference such as S3-001.</p>
      {!scriptAllowed ? <div className="message">Complete assessment setup to upload student scripts.</div> : <form onSubmit={e=>void submit(e,'scripts')}><fieldset disabled={busy || loading} className="question-fieldset"><div className="form-grid"><label>Student reference<input name="studentReference" required maxLength={80} pattern="[A-Za-z0-9][A-Za-z0-9 ._-]*" placeholder="e.g. S3-001"/></label><label>Scanned student paper<input type="file" name="file" required accept="application/pdf,image/jpeg,image/png"/></label></div><button disabled={busy || loading}>{busy ? 'Uploading…':'Upload student script'}</button></fieldset></form>}
      {scripts.length>0 && <div className="scripts-list">{scripts.map(script=><div className="file-row" key={script.id}><div><strong>{script.studentReference}</strong><small>{script.originalName} · {script.pageCount} {script.pageCount===1?'page':'pages'} · {sizeLabel(script.byteSize)}</small></div><span className="badge">Uploaded</span><div className="file-actions">{script.mimeType!=='application/pdf' && <button className="text-button" onClick={()=>setPreview(script)}>Preview</button>}<a href={`/api${root}/scripts/${script.id}/original?download=1`}>Download original</a></div></div>)}</div>}
      <div className="footer-note upload-footer">Papers are stored locally. Answer extraction and correction will be added next; uploaded papers have no suggested or final marks yet.</div>
      {preview && <div className="script-preview"><div className="question-top"><h3>Original paper · {preview.studentReference}</h3><button className="text-button" onClick={()=>setPreview(null)}>Close preview</button></div><img src={`/api${root}/scripts/${preview.id}/original`} alt={`Original scanned paper for ${preview.studentReference}`}/></div>}
    </section>
  </>;
}
