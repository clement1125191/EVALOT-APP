import {z} from 'zod';
export const educationLevels=['MASTERS','UNIVERSITY','TVET','SECONDARY','PRIMARY','PRE_PRIMARY','NURSERY'] as const;
export type EducationLevel=typeof educationLevels[number];
export const educationLabels:Record<EducationLevel,string>={MASTERS:'Masters / postgraduate',UNIVERSITY:'University',TVET:'TVET',SECONDARY:'Secondary',PRIMARY:'Primary',PRE_PRIMARY:'Pre-primary',NURSERY:'Nursery'};
export function academicOptions(level:EducationLevel){const count=level==='PRIMARY'?6:level==='SECONDARY'?6:level==='TVET'?8:level==='UNIVERSITY'?6:3;const prefix=level==='PRIMARY'?'Primary ':level==='SECONDARY'?'S':level==='TVET'?'Level ':level==='NURSERY'?'Nursery ':level==='PRE_PRIMARY'?'Pre-primary ':'Year ';return {label:level==='TVET'?'Level':level==='UNIVERSITY'||level==='MASTERS'?'Year':'Class',levels:Array.from({length:count},(_,i)=>prefix+(i+1)),terms:level==='TVET'||level==='UNIVERSITY'||level==='MASTERS'?['Semester 1','Semester 2','Term 1','Term 2','Term 3']:['Term 1','Term 2','Term 3']};}
export const educationLevelInput=z.enum(educationLevels);
