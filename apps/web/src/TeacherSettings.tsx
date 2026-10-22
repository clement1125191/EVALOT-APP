import {useEffect,useState} from 'react';
import type {CSSProperties} from 'react';
const presets=[['Apricot','#ef8c4d'],['Ocean','#78baf2'],['Lavender','#b5a0ef'],['Mint','#87c9a4']] as const;
export function useWorkspaceColour(teacherId:string){
 const key=`evalot:appearance:${teacherId}`;
 const [colour,setColour]=useState(()=>{try{const saved=localStorage.getItem(key);return saved&&/^#[0-9a-f]{6}$/i.test(saved)?saved:'#ef8c4d';}catch{return '#ef8c4d';}});
 useEffect(()=>{try{localStorage.setItem(key,colour);}catch{}},[key,colour]);
 return {colour,setColour,style:{'--workspace-accent':colour} as CSSProperties};
}
export function TeacherSettings({colour,onColour}:{colour:string;onColour:(c:string)=>void}){
 return <section className="panel appearance-settings"><span className="eyebrow">MAKE IT YOURS</span><h2>Workspace appearance</h2><p>The charcoal workspace uses the same palette as setup. Choose your accent colour.</p><div className="colour-presets">{presets.map(([name,value])=><button type="button" key={name} aria-pressed={colour===value} onClick={()=>onColour(value)}><span style={{background:value}}/>{name}{colour===value?' ✓':''}</button>)}</div><label>Custom accent colour<input type="color" value={colour} onChange={e=>onColour(e.target.value)}/></label><button className="secondary" onClick={()=>onColour('#ef8c4d')}>Restore setup colour</button><p className="hint" role="status">Saved automatically for your account in this browser. Printed papers keep their own colours.</p></section>;
}
