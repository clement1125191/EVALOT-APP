import {Router} from 'express';
import {z} from 'zod';
export interface BillingPolicy {trialDays:number;trialAllowance:number|null;rates:{upTo:number|null;rwf:number}[];checkoutEnabled:false;billingActive:false;}
export function billingPolicy(env:Record<string,string|undefined>=process.env):BillingPolicy{
 const amount=(key:string,fallback:number)=>env[key]===undefined?fallback:z.coerce.number().int().min(0).max(1000000).parse(env[key]);
 return {trialDays:45,trialAllowance:env.BILLING_TRIAL_PAPERS?.trim()?amount('BILLING_TRIAL_PAPERS',0):null,rates:[{upTo:45,rwf:amount('BILLING_RATE_SMALL_RWF',30)},{upTo:100,rwf:amount('BILLING_RATE_MEDIUM_RWF',25)},{upTo:null,rwf:amount('BILLING_RATE_LARGE_RWF',20)}],checkoutEnabled:false,billingActive:false};
}
export function estimateProcessing(policy:BillingPolicy,papers:number,freeRemaining:number){
 z.number().int().min(1).max(500).parse(papers);z.number().int().min(0).max(1000000).parse(freeRemaining);
 const freePapers=Math.min(papers,freeRemaining),paidPapers=papers-freePapers,rate=policy.rates.find(r=>r.upTo===null||papers<=r.upTo)!.rwf;
 return {papers,freePapers,paidPapers,rate,amountRwf:paidPapers*rate,remainingFree:freeRemaining-freePapers,estimateOnly:true};
}
export function billingPolicyRouter(){const router=Router();router.get('/billing/policy',(_req,res)=>res.json(billingPolicy()));router.post('/billing/estimate',(req,res)=>{const v=z.object({papers:z.number().int().min(1).max(500),freeRemaining:z.number().int().min(0).max(1000000)}).strict().parse(req.body);res.json(estimateProcessing(billingPolicy(),v.papers,v.freeRemaining));});return router;}
