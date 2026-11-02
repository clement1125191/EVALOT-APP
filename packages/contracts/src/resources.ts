import {z} from 'zod';
import {paperHeaderInput} from './paper.js';
import {assessmentInput,questionInput} from './index.js';
export const resourceKind=z.enum(['LOGO','HEADER','MODEL','MOCK']);
export const resourceEdit=z.object({title:z.string().trim().min(2).max(160),description:z.string().max(2000),institution:z.string().trim().max(100),subject:z.string().trim().max(100),level:z.string().trim().max(100),header:paperHeaderInput,assessment:z.lazy(()=>assessmentInput).nullable(),questions:z.array(z.lazy(()=>questionInput)).max(200)});
export type ResourceEdit=z.infer<typeof resourceEdit>;
export interface ResourceSnapshot extends ResourceEdit{sourceId?:string;refinedId?:string;guideId?:string;notes?:string[];sharedLogoId?:string;revision?:number;}
export interface PlatformResource{id:string;kind:z.infer<typeof resourceKind>;title:string;description:string;institution:string;subject:string;level:string;draft:ResourceSnapshot;published:ResourceSnapshot|null;archived:boolean;revision:number;}
export const supportCategory=z.enum(['TECHNICAL','ACCOUNT','MARKING','BILLING','OTHER']);
export const supportStatus=z.enum(['OPEN','IN_PROGRESS','RESOLVED']);
export interface SupportMessage{id:string;senderRole:'EDUCATOR'|'ADMIN';message:string;createdAt:string;}
export interface SupportTicket{id:string;title:string;category:z.infer<typeof supportCategory>;status:z.infer<typeof supportStatus>;revision:number;updatedAt:string;educator?:string;email?:string;messages?:SupportMessage[];}
