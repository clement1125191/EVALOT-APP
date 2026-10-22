import {it,expect} from 'vitest';
import {geminiServices,geminiTransport} from '../src/gemini';
const model='gemini-3.5-flash-lite';
const response=(value:unknown,finishReason='STOP')=>new Response(JSON.stringify({candidates:[{finishReason,content:{parts:[{text:JSON.stringify(value)}]}}]}));
const assessment={subject:'English',className:'S3',totalMarks:1,questions:[{position:1,type:'TRUE_FALSE',prompt:'True?',maxMarks:1,expectedAnswer:'True'}]} as any;
it('sends images/PDF and authoritative rules to Gemini with private header credentials',async()=>{
 let body:any,url='',headers:any;const output={name:'Example',registration:'TEST1',identityConfidence:.8,answers:[]};
 const network:typeof fetch=async(u,i)=>{url=String(u);body=JSON.parse(String(i?.body));headers=i?.headers;expect(i?.signal).toBeDefined();return response(output);};
 const result=await geminiServices('secret',model,network).evaluate({guide:assessment,references:[{name:'guide.pdf',mimeType:'application/pdf',bytes:Buffer.from('pdf'),position:1,pageCount:1}],pages:[{name:'front.jpg',mimeType:'image/jpeg',bytes:Buffer.from('photo'),position:1,pageCount:1}]});
 expect(url).toContain('generativelanguage.googleapis.com');expect(url).not.toContain('secret');expect(headers['x-goog-api-key']).toBe('secret');expect(headers.Authorization).toBeUndefined();expect(body.contents[0].parts.filter((p:any)=>p.inlineData).map((p:any)=>p.inlineData.mimeType)).toEqual(['application/pdf','image/jpeg']);expect(body.systemInstruction.parts[0].text).toContain('teacher approval');expect(body.generationConfig.responseJsonSchema.required).toContain('answers');expect(body.tools).toBeUndefined();expect(result.result).toEqual(output);expect(result.model).toBe(model);
});
it('uses materials and coverage for generation and preserves guide question-count checks',async()=>{
 let body:any;const questions=[{position:1,type:'TRUE_FALSE',prompt:'Water is wet.',maxMarks:1,options:[],expectedAnswer:'True',rubric:[]}];const network:typeof fetch=async(_u,i)=>{body=JSON.parse(String(i?.body));return response({questions});};
 const api=geminiServices('secret',model,network);expect((await api.generate({assessment,count:1,prompt:'Cover water',materials:[{originalName:'lesson.txt',mimeType:'text/plain',bytes:Buffer.from('Water is wet.')}]} as any)).questions).toEqual(questions);expect(JSON.stringify(body)).toContain('Water is wet.');expect(JSON.stringify(body)).toContain('Cover water');expect((await api.extractGuide(assessment,[],1)).questions).toEqual(questions);await expect(api.extractGuide(assessment,[],2)).rejects.toThrow('Question count differs');
});
it('rejects quota/auth/model failures without returning provider bodies or keys',async()=>{
 for(const status of [429,403,404,500]){const api=geminiServices('secret',model,async()=>new Response('secret private diagnostic',{status}));await expect(api.evaluate({guide:assessment,references:[],pages:[]})).rejects.toThrow('Gemini');}
});
it('rejects blocked, incomplete and malformed responses',async()=>{
 for(const r of [response({},'MAX_TOKENS'),new Response(JSON.stringify({promptFeedback:{blockReason:'SAFETY'}})),new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:'not json'}]}}]}))]){await expect(geminiServices('secret',model,async()=>r).evaluate({guide:assessment,references:[],pages:[]})).rejects.toThrow('Gemini');}
});
it('rejects oversized inline scans before any network call',async()=>{
 let called=false;const transport=geminiTransport('secret',async()=>{called=true;return response({});});await expect(transport('unused',{body:JSON.stringify({model,instructions:'rules',max_output_tokens:100,input:[{content:[{type:'input_text',text:'a'.repeat(20*1024*1024)}]}],text:{format:{schema:{type:'object'}}}})})).rejects.toThrow('smaller scans');expect(called).toBe(false);
});
