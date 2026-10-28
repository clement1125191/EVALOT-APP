import {useEffect,useRef} from 'react';

export function PaperReadyReminder(){
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{
  const show=()=>{if(dialog.current&&!dialog.current.open)dialog.current.showModal();};
  window.addEventListener('evalot:paper-prepared',show);
  return()=>window.removeEventListener('evalot:paper-prepared',show);
 },[]);
 return <dialog ref={dialog} className="paper-ready-reminder" aria-labelledby="paper-ready-title" aria-describedby="paper-ready-description">
  <span className="eyebrow">PAPER SAVED</span>
  <h2 id="paper-ready-title">Prepare for fair marking</h2>
  <p id="paper-ready-description">Before marking your students, review the question paper and marking guide. As the teacher or lecturer, you approve the final marks.</p>
  <ul><li>Check that answers, section totals and rubric marks match the paper.</li><li>Use the same marking criteria consistently for every student.</li><li>Review unclear handwriting and AI suggestions before publishing marks.</li></ul>
  <p className="hint">Saving keeps your paper editable. This reminder does not start marking or publish results.</p>
  <form method="dialog"><button autoFocus>Got it</button></form>
 </dialog>;
}
