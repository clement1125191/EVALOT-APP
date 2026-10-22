import {writeFile} from 'node:fs/promises';
const backend=new URL(process.argv[2]??'');
if(backend.protocol!=='https:'||backend.pathname!=='/'||backend.search||backend.hash||backend.username||backend.password)throw new Error('Provide only your HTTPS backend origin, such as https://your-api.onrender.com');
const config={$schema:'https://openapi.vercel.sh/vercel.json',framework:null,installCommand:'npm ci',buildCommand:'npm run build -w @evalot/web',outputDirectory:'apps/web/dist',headers:[{source:'/api/:path*',headers:[{key:'x-vercel-enable-rewrite-caching',value:'0'},{key:'Cache-Control',value:'private, no-store'}]}],rewrites:[{source:'/api/:path*',destination:backend.origin+'/api/:path*'},{source:'/:path*',destination:'/index.html'}]};
await writeFile(new URL('../vercel.json',import.meta.url),JSON.stringify(config,null,2)+'\n');
console.log('Configured Vercel API proxy for '+backend.origin);
