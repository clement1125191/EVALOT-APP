import {z} from 'zod';
const label=z.string().trim().min(1).max(160);
export const guidelineMetadataInput=z.object({title:label,authority:label,version:label,sourceUrl:z.string().url().max(2000).refine(v=>/^https?:\/\//i.test(v)).or(z.literal('')).default(''),subjectName:label,levelName:label,departmentName:z.string().trim().max(100).default(''),tradeName:z.string().trim().max(100).default(''),assessmentKind:z.enum(['ALL','EXAM','ASSESSMENT','CAT','ASSIGNMENT','HOMEWORK','QUIZ','TEST','PRACTICE']).default('EXAM')}).strict();
export type GuidelineMetadata=z.infer<typeof guidelineMetadataInput>;
export type Guideline=GuidelineMetadata&{id:string;originalName:string;status:'DRAFT'|'ACTIVE'|'ARCHIVED';sha256:string;pageCount:number;chunkCount:number;createdAt:string};
export interface GuidelineSource {documentId:string;chunkId:string;title:string;authority:string;version:string;sourceUrl:string;sha256:string;page:number;part:number;text:string;}
export interface GuidelineRetrieval {sources:GuidelineSource[];warning:string|null;method:'context-keyword-v1';}
