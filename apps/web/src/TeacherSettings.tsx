import {useEffect,useState} from 'react';
import type {CSSProperties} from 'react';
const presets=[['Sky blue','#2479ac'],['Ocean blue','#20587b'],['Clear blue','#276d9f']] as const;
export function useWorkspaceColour(teacherId:string){
 const key=`evalot:appearance:${teacherId}`;
 const [colour,setColour]=useState(()=>{try{const saved=localStorage.getItem(key);return presets.some(p=>p[1]===saved)?saved!:'#2479ac';}catch{return '#2479ac';}});
 useEffect(()=>{try{localStorage.setItem(key,colour);}catch{}},[key,colour]);
 return {colour,setColour,style:{'--workspace-accent':colour} as CSSProperties};
}
export function TeacherSettings({colour,onColour}:{colour:string;onColour:(c:string)=>void}){
 return <section className="panel appearance-settings"><h2>Workspace appearance</h2><p>Blue navigation, white pages and black text.</p><div className="colour-presets">{presets.map(([name,value])=><button type="button" key={name} aria-pressed={colour===value} onClick={()=>onColour(value)}><span style={{background:value}}/>{name}</button>)}</div><p role="status">Saved automatically in this browser.</p></section>;
}
