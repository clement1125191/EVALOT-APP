import {PDFDocument,StandardFonts} from 'pdf-lib';
import {questionSection,type AssessmentDetail} from '@evalot/contracts';
import {ApiError} from '../assessments.js';
export async function preparedReference(guide:AssessmentDetail,scheme:boolean){
 const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica);let page=pdf.addPage([595,842]),y=790;
 function line(text:string,size=11){try{font.encodeText(text);}catch{throw new ApiError(422,'This paper uses symbols that need an uploaded PDF reference. Choose Upload paper and scheme.');}if(y<55){page=pdf.addPage([595,842]);y=790;}page.drawText(text,{x:45,y,font,size});y-=size+7;}
 function text(value:string){for(const paragraph of value.split(/\r?\n/)){let current='';for(const word of paragraph.split(/\s+/)){const candidate=current?current+' '+word:word;let width:number;try{width=font.widthOfTextAtSize(candidate,11);}catch{throw new ApiError(422,'Upload a PDF for papers containing unsupported symbols.');}if(width>500&&current){line(current);current=word;}else current=candidate;}line(current);}}
 text(guide.title);text(`${guide.subject} | ${guide.className} | ${guide.totalMarks} marks`);line(scheme?'MARKING SCHEME - TEACHER COPY':'QUESTION PAPER');y-=12;
 let section='';for(const q of guide.questions){if(questionSection(q)!==section){section=questionSection(q);line(section,13);}text(`${q.position}. ${q.prompt} (${q.maxMarks} marks)`);if(q.type==='MCQ')q.options.forEach((o,i)=>text(`${String.fromCharCode(65+i)}. ${o}`));if(scheme){text('Expected answer: '+q.expectedAnswer);q.rubric.forEach(r=>text(`${r.label}: ${r.maxMarks} marks`));}y-=14;}
 if(pdf.getPageCount()>50)throw new ApiError(422,'This reference is too long. Upload the printed PDF instead.');return {bytes:Buffer.from(await pdf.save()),pageCount:pdf.getPageCount()};
}
export function workbookCommand(prompt:string):{name?:string;mode?:'BATCH'|'INDIVIDUAL';student?:{name:string;registration:string}}{
 const student=/^add student\s+(.+?),?\s+(?:registration|reg)\s*[:=]?\s*([a-zA-Z0-9][a-zA-Z0-9._-]{0,79})$/i.exec(prompt.trim());if(student){const name=student[1].replace(/,$/,'').trim();if(name.length&&name.length<=160)return {student:{name,registration:student[2]}};}
 const rename=/^(?:rename(?:\s+(?:this\s+)?(?:workbook|marking|sheet))?|change\s+(?:the\s+)?(?:workbook\s+)?name)\s+to\s+(.+)$/i.exec(prompt.trim());
 if(rename){const name=rename[1].replace(/^["']|["']$/g,'').trim();if(name.length&&name.length<=160)return {name};}
 if(/^(?:switch|change)(?:\s+(?:the\s+)?mode)?\s+to\s+(?:whole class|batch)$/i.test(prompt.trim()))return {mode:'BATCH'};
 if(/^(?:switch|change)(?:\s+(?:the\s+)?mode)?\s+to\s+(?:one student at a time|individual)$/i.test(prompt.trim()))return {mode:'INDIVIDUAL'};
 throw new ApiError(422,'Try: Rename workbook to S3 English marks, Switch to whole class, Switch to one student at a time, or Add student Jane Doe reg S3-001. Edit student marks through teacher review.');
}
