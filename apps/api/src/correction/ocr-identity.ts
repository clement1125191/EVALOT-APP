import type {OcrEvidence} from '@evalot/contracts';
// Read only explicitly labelled identity fields from the first page. Never infer names from answer text.
export function identityFromFirstPage(evidence:OcrEvidence){
 const page=evidence.pages.find(p=>p.page===1);if(!page)return {name:null,registration:null,confidence:0};
 const names:{value:string;confidence:number}[]=[],numbers:{value:string;confidence:number}[]=[];
 for(const line of page.lines){
  if(line.confidence<.85)continue;
  const name=line.text.match(/^\s*(?:student\s+name|full\s+name|name)\s*[:=]\s*([^:]{2,160}?)\s*$/iu);
  if(name&&/^[\p{L}\p{M}][\p{L}\p{M} .'-]+$/u.test(name[1]))names.push({value:name[1].trim(),confidence:line.confidence});
  const reg=line.text.match(/^\s*(?:reg(?:istration)?\s*(?:number|no\.?|#)?|student\s*(?:number|no\.?|id))\s*[:=]\s*([\p{L}\p{N}][\p{L}\p{N} /_-]{0,79})\s*$/iu);
  if(reg)numbers.push({value:reg[1].trim(),confidence:line.confidence});
 }
 const unique=(values:{value:string;confidence:number}[])=>new Set(values.map(v=>v.value.toLowerCase())).size===1?values[0]:null;
 const name=unique(names),registration=unique(numbers);return {name:name?.value??null,registration:registration?.value??null,confidence:name&&registration?Math.min(name.confidence,registration.confidence):0};
}
