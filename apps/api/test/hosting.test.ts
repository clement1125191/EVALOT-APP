import {it,expect} from 'vitest';
import {hostingConfig} from '../src/hosting';
const env={AUTH_MODE:'password',DATABASE_URL:'postgres://example',NODE_ENV:'production',APP_PUBLIC_URL:'https://evalot.example',APP_ORIGINS:'https://evalot.example',UPLOAD_STORAGE_ROOT:'/var/data/uploads'};
it('uses secure cookies and a public listener in production',()=>{expect(hostingConfig(env)).toMatchObject({production:true,host:'0.0.0.0',origins:['https://evalot.example']});});
it('rejects insecure origins, missing persistent storage and mismatched OAuth callbacks',()=>{expect(()=>hostingConfig({...env,APP_ORIGINS:'http://evalot.example'})).toThrow('HTTPS');expect(()=>hostingConfig({...env,UPLOAD_STORAGE_ROOT:''})).toThrow('persistent');expect(()=>hostingConfig({...env,GOOGLE_REDIRECT_URI:'https://api.other.example/callback'})).toThrow('callback');});
it('keeps local development defaults and does not disable authentication',()=>{expect(hostingConfig({AUTH_MODE:'password',DATABASE_URL:'postgres://example'})).toMatchObject({production:false,host:'127.0.0.1'});expect(()=>hostingConfig({...env,AUTH_MODE:'test'})).toThrow('password');});
