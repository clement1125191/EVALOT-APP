import {it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {addSubjectClasses,SubjectClassesEditor} from '../src/SubjectClassesEditor';
import {DashboardHome} from '../src/DashboardHome';
it('adds one subject for several classes without merging class identities',()=>{
 let n=0;const result=addSubjectClasses([],{subject:' English ',classes:'S1 A, S1 B\nS2 A',department:'',trade:'',editing:null},()=>String(++n));
 expect(result.map(a=>[a.subjectName,a.levelName])).toEqual([['English','S1 A'],['English','S1 B'],['English','S2 A']]);expect(new Set(result.map(a=>a.id)).size).toBe(3);
 expect(()=>addSubjectClasses(result,{subject:'english',classes:'s1 a',department:'',trade:'',editing:null})).toThrow('already saved');
 const edited=addSubjectClasses(result,{subject:'English language',classes:'S1 A',department:'',trade:'',editing:'1'});expect(edited.find(a=>a.id==='1')?.subjectName).toBe('English language');expect(edited).toHaveLength(3);
});
it('separates department and trade while rejecting empty classes and excessive entries',()=>{
 const a=addSubjectClasses([],{subject:'Law',classes:'Year 1',department:'Business',trade:'BIT',editing:null});
 expect(addSubjectClasses(a,{subject:'Law',classes:'Year 1',department:'Business',trade:'Law',editing:null})).toHaveLength(2);
 expect(()=>addSubjectClasses([],{subject:'English',classes:' , ',department:'',trade:'',editing:null})).toThrow('at least one class');
 expect(()=>addSubjectClasses([],{subject:'English',classes:Array.from({length:101},(_,i)=>'S'+i).join(','),department:'',trade:'',editing:null})).toThrow('100');
});
it('uses familiar labels and examples during school setup',()=>{
 const html=renderToStaticMarkup(createElement(SubjectClassesEditor,{institution:{id:'s',name:'School',logoId:null,faculty:'',department:'',assignments:[],header:null,templateType:'CLEAN'},busy:false,onChange:()=>{},onBack:()=>{},onContinue:()=>{}}));
 expect(html).toContain('Your subjects and classes');expect(html).toContain('S1 A, S1 B, S2 A');expect(html).not.toContain('teaching pair');
});
it('summarizes real paper activity without a homepage feature grid',()=>{
 const html=renderToStaticMarkup(createElement(DashboardHome,{items:[{id:'a',title:'English CAT',subject:'English',className:'S1 A',status:'DRAFT',createdAt:'2026-10-24'}] as any,loading:false,busy:false,onCreate:()=>{},onOpen:()=>{},onLibrary:()=>{},onUsePaper:()=>{},onFeature:()=>{}}));
 expect(html).toContain('Activity overview');expect(html).toContain('Drafts to finish');expect(html).toContain('English CAT');expect(html).not.toContain('teacher-feature-grid');
});
