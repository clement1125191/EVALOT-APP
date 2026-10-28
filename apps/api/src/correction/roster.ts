export function checkRosterIdentity(identity:{name:string|null;registration:string|null;confidence:number},roster:{name:string;registration:string}[]){
 if(!roster.length)return {...identity,issue:''};const clean=(s:string)=>s.trim().toLowerCase().replace(/\s+/g,' ');
 const byNumber=identity.registration?roster.filter(r=>clean(r.registration)===clean(identity.registration!)):[];
 if(byNumber.length===1){const row=byNumber[0];if(identity.name&&clean(identity.name)!==clean(row.name))return {...identity,confidence:0,issue:'Detected name differs from the roster for this registration. Confirm the original front page.'};return {name:row.name,registration:row.registration,confidence:identity.confidence,issue:''};}
 if(!identity.registration&&identity.name){const matches=roster.filter(r=>clean(r.name)===clean(identity.name!));if(matches.length===1)return {...identity,registration:matches[0].registration,issue:'Registration suggested from a unique roster name. Confirm the original front page.'};}
 return {...identity,confidence:0,issue:'Student identity could not be matched confidently to the supplied roster. Review the front page.'};
}
