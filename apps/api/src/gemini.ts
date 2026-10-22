import {openAIDrafter} from './ai-drafter.js';
import {openAIVision,openAIGuideExtractor} from './correction/vision.js';

export class GeminiRequestError extends Error {}

// Reuse the reviewed prompts and output contracts; translate only the transport.
export function geminiTransport(key:string,network:typeof fetch=fetch):typeof fetch {
 return async (_url,init)=>{
  const request=JSON.parse(String(init?.body));
  if(!/^gemini-[a-zA-Z0-9._-]+$/.test(request.model))throw new GeminiRequestError('Invalid Gemini model name.');
  const parts=request.input.flatMap((message:any)=>message.content.map((part:any)=>{
   if(part.type==='input_text')return {text:part.text};
   const data=part.type==='input_file'?part.file_data:part.image_url;
   const match=/^data:(application\/pdf|image\/png|image\/jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(data??'');
   if(!match)throw new GeminiRequestError('Unsupported Gemini attachment.');
   return {inlineData:{mimeType:match[1],data:match[2]}};
  }));
  const body={systemInstruction:{parts:[{text:request.instructions}]},contents:[{role:'user',parts}],generationConfig:{responseMimeType:'application/json',responseJsonSchema:request.text.format.schema,maxOutputTokens:request.max_output_tokens}};
  // Inline requests must remain below Google's 20 MB request limit.
  const serialized=JSON.stringify(body);
  if(Buffer.byteLength(serialized)>19*1024*1024)throw new GeminiRequestError('Use smaller scans: Gemini requests must be below 19 MB.');
  const response=await network(`https://generativelanguage.googleapis.com/v1beta/models/${request.model}:generateContent`,{method:'POST',headers:{'x-goog-api-key':key,'Content-Type':'application/json'},body:serialized,signal:init?.signal??AbortSignal.timeout(120000)});
  if(!response.ok){
   const message=response.status===429?'Gemini quota reached. Try later or check your Google AI Studio limits.':response.status===400||response.status===401||response.status===403?'Gemini rejected the request. Check the API key, model access and restrictions.':response.status===404?'Gemini model unavailable. Check GEMINI_MODEL.':'Gemini request failed. Try again later.';
   throw new GeminiRequestError(message);
  }
  const result=await response.json() as any;
  const candidate=result.candidates?.[0];
  if(result.promptFeedback?.blockReason||candidate?.finishReason!=='STOP')throw new GeminiRequestError('Gemini response blocked or incomplete. Try a smaller bundle or review manually.');
  const text=(candidate.content?.parts??[]).filter((p:any)=>typeof p.text==='string'&&!p.thought).map((p:any)=>p.text).join('');
  try{JSON.parse(text);}catch{throw new GeminiRequestError('Gemini returned an invalid draft. Try again or review manually.');}
  return new Response(JSON.stringify({status:'completed',output:[{content:[{type:'output_text',text}]}]}),{headers:{'Content-Type':'application/json'}});
 };
}
export function geminiServices(key:string,model:string,network:typeof fetch=fetch){
 const transport=geminiTransport(key,network);
 return {generate:openAIDrafter(key,model,transport),evaluate:openAIVision(key,model,transport),extractGuide:openAIGuideExtractor(key,model,transport)};
}
