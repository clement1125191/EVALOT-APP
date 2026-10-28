import { z } from 'zod';

const text = z.string().trim().min(1).max(10000);
export const assessmentInput = z.object({
  kind: z.enum(['EXAM','ASSESSMENT','CAT','ASSIGNMENT','HOMEWORK','QUIZ','TEST','PRACTICE']).optional(),
  title: text.max(160), subject: text.max(100), className: text.max(100),
  totalMarks: z.number().int().min(1).max(1000),
}).strict();
export const criterion = z.object({label: text.max(300), maxMarks: z.number().int().min(1).max(1000)}).strict();
export const questionInput = z.object({
  position: z.number().int().min(1).max(200),
  section: z.string().trim().min(1).max(80).optional(),
  type: z.enum(['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY']),
  prompt: text, maxMarks: z.number().int().min(1).max(1000),
  options: z.array(text.max(1000)).max(8).default([]),
  expectedAnswer: z.string().trim().max(10000).default(''),
  rubric: z.array(criterion).max(20).default([]),
}).strict().superRefine((q, ctx) => {
  const fail = (message: string) => ctx.addIssue({code: z.ZodIssueCode.custom, message});
  if (q.type === 'MCQ' && (q.options.length < 2 || new Set(q.options).size !== q.options.length)) fail('MCQ needs at least two distinct options.');
  if (q.type !== 'MCQ' && q.options.length) fail('Options apply only to MCQ.');
  if (q.type === 'MCQ' && q.expectedAnswer && !q.options.includes(q.expectedAnswer)) fail('Expected answer must match an option.');
  if (q.type === 'TRUE_FALSE' && q.expectedAnswer && !['True', 'False'].includes(q.expectedAnswer)) fail('Expected answer must be True or False.');
  if (q.rubric.length && q.rubric.reduce((sum, c) => sum + c.maxMarks, 0) !== q.maxMarks) fail('Rubric marks must equal question marks.');
  if (['MCQ', 'TRUE_FALSE'].includes(q.type) && q.rubric.length) fail('Objective questions use an answer key, not a rubric.');
});
export const questionSetInput = z.object({revision: z.number().int().min(0), questions: z.array(questionInput).max(200)}).strict().superRefine((v, ctx) => {
  if (v.questions.some((q, i) => q.position !== i + 1)) ctx.addIssue({code: 'custom', message: 'Question positions must be consecutive from 1.'});
});
export type AssessmentInput = z.infer<typeof assessmentInput>;
export type QuestionInput = z.infer<typeof questionInput>;
export type Assessment = AssessmentInput & {questionCount?:number;id: string; status: 'DRAFT' | 'READY' | 'PROCESSING' | 'REVIEW' | 'FINALIZED'; revision: number; createdAt: string};
export type Question = QuestionInput & {id: string};
export type AssessmentDetail = Assessment & {questions: Question[]};
export const studentReferenceInput = z.string().trim().min(1).max(80).regex(/^[A-Za-z0-9][A-Za-z0-9 ._-]*$/, 'Use a student reference with letters, numbers, spaces, dots, hyphens or underscores.');
export interface UploadedDocument {
  id: string; assessmentId: string; originalName: string; mimeType: 'application/pdf' | 'image/jpeg' | 'image/png';
  byteSize: number; pageCount: number; sha256: string; createdAt: string;
}
export interface StudentScript extends UploadedDocument {studentReference: string; status: 'UPLOADED';}
export function readinessProblems(a: AssessmentInput, questions: QuestionInput[]): string[] {
  const errors: string[] = [];
  if (!questions.length) errors.push('Add at least one question.');
  if (questions.reduce((sum, q) => sum + q.maxMarks, 0) !== a.totalMarks) errors.push('Question marks must equal assessment total.');
  for (const q of questions) {
    if (!q.expectedAnswer && !q.rubric.length) errors.push(`Question ${q.position} needs an answer key or rubric.`);
    if (q.type === 'ESSAY' && !q.rubric.length) errors.push(`Essay ${q.position} needs a rubric.`);
  }
  return errors;
}

export * from './paper.js';
export * from './correction.js';

export * from './teaching.js';

export * from './material-library.js';

export * from './guidelines.js';

export * from './ocr.js';

export * from './academic.js';
export * from './marking-policy.js';
