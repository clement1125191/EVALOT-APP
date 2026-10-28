import {cacheRead,cachedRead,vaultUnlocked} from './offline-vault';
export async function api<T>(path:string,method='GET',body?:unknown):Promise<T>{
 let res:Response;
 try{if(!navigator.onLine)throw new TypeError('Offline');res=await fetch(`/api${path}`,{method,headers:body===undefined?{'X-Evalot-Request':'1'}:{'Content-Type':'application/json','X-Evalot-Request':'1'},body:body===undefined?undefined:JSON.stringify(body)});}
 catch(e){if(method==='GET'&&vaultUnlocked()){const saved=await cachedRead<T>(path);if(saved!==undefined)return saved;}throw new Error(method==='GET'?'This view is not saved for offline use. Connect once to load it.':'You are offline. Captured pages stay in the device queue; other changes need a connection.');}
 if(res.status===204)return undefined as T;const data=await res.json();if(res.status===401&&!path.startsWith('/auth'))window.dispatchEvent(new Event('evalot:session-expired'));if(!res.ok)throw new Error(data.error??'Unable to complete request.');if(method==='GET'&&!path.startsWith('/auth'))await cacheRead(path,data).catch(()=>{});return data;
}
