import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Readable,Writable} from 'node:stream';
import {makeApp} from '../server.mjs';

test('activation MP3 requires auth, validates type, persists, and is locked during VIP',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'gozero-activation-'));let app;
 const start=()=>{app=makeApp({dataDir:dir,password:'long-test-password-123',enableLive:true,publicUrl:'https://show.test'});};start();
 async function request(path,{method='GET',body,cookie='',type='audio/mpeg',headers={}}={}){
  const bytes=body===undefined?null:Buffer.isBuffer(body)?body:Buffer.from(body);
  const req=Readable.from(bytes?[bytes]:[]);req.method=method;req.url=path;req.headers={host:'show.test',origin:'https://show.test',cookie,'content-type':type,...headers};req.socket={remoteAddress:'127.0.0.1'};
  const parts=[],responseHeaders={};const res=new Writable({write(chunk,encoding,done){parts.push(Buffer.from(chunk));done();}});
  res.headersSent=false;res.statusCode=200;res.setHeader=(key,value)=>{responseHeaders[key.toLowerCase()]=value;};
  res.writeHead=(code,values={})=>{res.statusCode=code;res.headersSent=true;for(const[k,v]of Object.entries(values))res.setHeader(k,v);return res;};
  const finished=new Promise((resolve,reject)=>{res.once('finish',resolve);res.once('error',reject);});
  app.server.emit('request',req,res);await finished;
  const result=Buffer.concat(parts);return {status:res.statusCode,headers:responseHeaders,bytes:result,json:()=>JSON.parse(result.toString())};
 }
 const mp3=Buffer.from([0xff,0xfb,0x90,0x64,...Array(413).fill(0)]);
 const upload=(body,cookie='',type='audio/mpeg')=>request('/api/media/activation',{method:'POST',body,cookie,type});
 try{
 assert.equal((await upload(mp3)).status,401);
 const login=await request('/api/login',{method:'POST',type:'application/json',body:JSON.stringify({password:'long-test-password-123'})});
 const cookie=login.headers['set-cookie'].split(';')[0];
 assert.equal((await upload(mp3,cookie,'text/html')).status,415);
 assert.equal((await upload(Buffer.from('<script>bad</script>'),cookie)).status,415);
 assert.equal((await upload(mp3,cookie)).status,200);
 let state=(await request('/api/state/rehearsal')).json();
 assert.equal(state.config.media.activationReady,true);assert.match(state.config.audio.activated,/^\/media\/activation\?v=/);
 let response=await request(state.config.audio.activated);assert.equal(response.headers['content-type'],'audio/mpeg');assert.deepEqual(response.bytes,mp3);
 assert.equal((await request('/media/activation',{headers:{range:'bytes=0-2'}})).status,206);
 app.sessions.rehearsal.state='vip';assert.equal((await upload(mp3,cookie)).status,409);app.sessions.rehearsal.state='holding';
 app.close();start();state=(await request('/api/state/rehearsal')).json();
 assert.equal(state.config.media.activationReady,true);
 assert.deepEqual((await request(state.config.audio.activated)).bytes,mp3);
 assert.equal((await request('/api/state/live')).json().count,0);
 }finally{app.close();rmSync(dir,{recursive:true,force:true});}
});
