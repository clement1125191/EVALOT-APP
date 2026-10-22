import {z} from 'zod';
import {defaultPaperHeader,paperHeaderInput,type PaperHeader} from './paper.js';
const name=z.string().trim().min(1).max(100);
export const teachingAssignmentInput=z.object({id:z.string().uuid(),subjectName:name,levelName:name,departmentName:z.string().trim().max(100).optional(),tradeName:z.string().trim().max(100).optional()}).strict();
export const institutionInput=z.object({id:z.string().uuid(),name:name,logoId:z.string().uuid().nullable().default(null),faculty:z.string().trim().max(100).default(''),department:z.string().trim().max(100).default(''),assignments:z.array(teachingAssignmentInput).max(100),templateType:z.enum(['FORMAL','CLEAN','COMPACT']).default('CLEAN'),header:paperHeaderInput.nullable().default(null)}).strict();
export const educatorProfileInput=z.object({revision:z.number().int().min(0),onboardingCompleted:z.boolean(),setupStep:z.number().int().min(0).max(5),defaultInstitutionId:z.string().uuid().nullable(),institutions:z.array(institutionInput).max(20)}).strict();
export type Institution=z.infer<typeof institutionInput>;
export type EducatorProfile=z.infer<typeof educatorProfileInput>;
export function teachingHeader(institution:Pick<Institution,'name'|'logoId'|'faculty'|'department'|'templateType'>,assignment?:{subjectName:string;levelName:string;departmentName?:string;tradeName?:string}):PaperHeader{
 const h=defaultPaperHeader();h.school.text=institution.name;h.logoId=institution.logoId;h.faculty.text=institution.faculty;h.department.text=assignment?.departmentName||institution.department;h.module.text=assignment?.subjectName??'';h.className.text=assignment?.levelName??'';h.title.text='Assessment: __________________';h.totalMarks.text='________';h.date.text='________';h.duration.text='________';h.term.text='________';
 if(institution.templateType==='FORMAL'){h.school.bold=true;h.module.bold=true;h.academicYear.text='________';}
 if(institution.templateType==='COMPACT'){for(const field of ['school','faculty','department','title','module'] as const)h[field].align='left';h.logoAlign='left';h.studentNumber=false;}
 return h;
}
export function resolveTeachingContext(institutions:Institution[],selection:{institutionId?:string;subjectName?:string;levelName?:string;assignmentId?:string}){
 const candidates=institutions.flatMap(i=>i.assignments.map(a=>({institutionId:i.id,institutionName:i.name,...a}))).filter(a=>(!selection.institutionId||a.institutionId===selection.institutionId)&&(!selection.assignmentId||a.id===selection.assignmentId)&&(!selection.subjectName||a.subjectName.toLowerCase()===selection.subjectName.toLowerCase())&&(!selection.levelName||a.levelName.toLowerCase()===selection.levelName.toLowerCase()));
 return {candidates,resolved:candidates.length===1?candidates[0]:null};
}
