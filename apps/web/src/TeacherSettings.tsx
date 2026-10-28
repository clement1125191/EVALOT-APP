import {markingSettingsInput} from '@evalot/contracts';
import {MarkingSettingsFields} from './MarkingSettingsFields';
import {api} from './api';
import {useEffect,useState} from 'react';
import type {CSSProperties} from 'react';
const presets=[['Sky blue','#2479ac'],['Ocean blue','#20587b'],['Clear blue','#276d9f']] as const;
export function useWorkspaceColour(teacherId:string){
 const key=`evalot:appearance:${teacherId}`;
 const [colour,setColour]=useState(()=>{try{const saved=localStorage.getItem(key);return presets.some(p=>p[1]===saved)?saved!:'#2479ac';}catch{return '#2479ac';}});
 useEffect(()=>{try{localStorage.setItem(key,colour);}catch{}},[key,colour]);
 return {colour,setColour,style:{'--workspace-accent':colour} as CSSProperties};
}
export function TeacherSettings({colour,onColour,onMarkingSessions}:{colour:string;onColour:(c:string)=>void;onMarkingSessions?:()=>void}){
 const [settings,setSettings]=useState(()=>markingSettingsInput.parse({})),[revision,setRevision]=useState(0),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 async function load(){setLoading(true);setError('');try{const v=await api<{markingSettings:typeof settings;revision:number}>('/settings/marking');setSettings(v.markingSettings);setRevision(v.revision);}catch(e){setError((e as Error).message);}finally{setLoading(false);}}
 useEffect(()=>{void load();},[]);
 async function save(){setSaving(true);setError('');setNotice('');try{const v=await api<{markingSettings:typeof settings;revision:number}>('/settings/marking','PUT',{revision,markingSettings:settings});setRevision(v.revision);setNotice('Saved. New marking sessions will use these rules. Existing sessions keep their original rules.');}catch(e){setError((e as Error).message);}finally{setSaving(false);}}

 return <><section className="panel marking-default-settings"><span className="eyebrow">MARKING</span><h2>Marking settings and optional student list</h2><p>New marking sessions use Evalot Fair Marking unless you save custom rules here. Add an optional student list alongside the paper and guide when opening the camera.</p>{loading?<p role="status">Loading marking settings?</p>:<><MarkingSettingsFields value={settings} onChange={v=>{setSettings(v);setNotice('');}} roster={[]} onRoster={()=>{}} hideRoster disabled={saving||!!error}/><button type="button" disabled={saving||!!error} onClick={()=>void save()}>{saving?'Saving?':'Save marking defaults'}</button>{error&&<><p role="alert">{error}</p><button type="button" onClick={()=>void load()}>Reload settings</button></>}{notice&&<p role="status">{notice}</p>}</>}{onMarkingSessions&&<button type="button" className="text-button" onClick={onMarkingSessions}>Review settings for an existing marking session ?</button>}</section><section className="panel appearance-settings"><h2>Workspace appearance</h2><p>Blue navigation, white pages and black text.</p><div className="colour-presets">{presets.map(([name,value])=><button type="button" key={name} aria-pressed={colour===value} onClick={()=>onColour(value)}><span style={{background:value}}/>{name}</button>)}</div><p role="status">Saved automatically in this browser.</p></section></>;
}
