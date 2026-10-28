import {CameraIcon} from './CaptureGuide';
export type FeatureDestination='preparation'|'correction'|'publishing'|'teaching'|'materials'|'papers'|'headers'|'logos'|'guidelines'|'claims'|'settings';
const features:[FeatureDestination,string,string,string][]=[
 ['preparation','Prepare a paper','Questions and marking scheme','M5 3h10l4 4v14H5zM14 3v5h5M8 12h8M8 16h5'],
 ['correction','Mark with camera','Take photos, extract text, review',''],
 ['publishing','Publish marks','Final review and Excel / CSV','M5 3h14v18H5zM8 8h8M8 12h8M8 16h3M14 16l2 2 4-4'],
 ['teaching','My classes','Schools, subjects and trades','M3 9l9-6 9 6-9 6zM6 12v6l6 3 6-3v-6'],
 ['materials','Teaching materials','Notes organised by class','M3 5h7l2 3h9v12H3z'],
 ['papers','Saved papers','Reuse and edit your papers','M7 3h13v15H7zM4 7v14h12M10 8h7M10 12h5'],
 ['headers','Paper headers','Reusable school layouts','M4 3h16v18H4zM4 9h16M8 6h8M8 14h8M8 17h5'],
 ['logos','School logos','Your saved school images','M3 3h18v18H3zM3 17l6-6 4 4 3-3 5 5M15 7h2'],
 ['guidelines','Assessment guidelines','Reference formats and standards','M4 4h7v16H4zM11 4h9v16h-9M6 8h3M14 8h4M14 12h4'],
 ['claims','Claims & review','Recheck answers and marks','M4 3h13v18H4zM8 8h5M8 12h4M15 15l3 3 4-4'],
 ['settings','Educator settings','Personalise your workspace','M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6'],
];
export function TeacherFeatureGrid({busy,onSelect}:{busy:boolean;onSelect:(feature:FeatureDestination)=>void}){return <section className="teacher-features" aria-label="Evalot features"><div className="feature-grid-heading"><h2>Your workspace</h2><p>Choose what you want to do.</p></div><div className="teacher-feature-grid">{features.map(([key,title,description,path],i)=><button type="button" key={key} disabled={busy} onClick={()=>onSelect(key)} className={'teacher-feature-card'+(i<3?' primary-feature':'')}><span className="teacher-feature-icon" aria-hidden="true">{key==='correction'?<CameraIcon/>:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round"><path d={path}/></svg>}</span><strong>{title}</strong><small>{description}</small><span className="teacher-feature-arrow" aria-hidden="true">↗</span></button>)}</div></section>;}
