import {useEffect,useState} from 'react';
export function useAppContent(){const [content,setContent]=useState<Record<string,string>>({});useEffect(()=>{void fetch('/api/public/content').then(r=>r.ok?r.json():{}).then(setContent).catch(()=>{});},[]);return content;}
