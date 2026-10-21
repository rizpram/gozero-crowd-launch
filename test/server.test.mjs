import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {makeApp} from '../server.mjs';
test('HTTP end-to-end: auth, origin, concurrency, SSE recovery, QR, persistence, live isolation',async()=>{
 const data=mkdtempSync(join(tmpdir(),'gozero-test-'));let app=makeApp({dataDir:data,config:{energyFillSeconds:0},password:'test-password-12345678',enableLive:true});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));let base=`http://127.0.0.1:${app.server.address().port}`;
 const get=(path,cookie='')=>fetch(base+path,{headers:{cookie}});
 const post=(path,b={},cookie='',origin=base)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',origin,cookie},body:JSON.stringify(b)});
 try{
  assert.equal((await get('/api/operator')).status,401);
  assert.equal((await post('/api/login',{password:'test-password-12345678'},'','https://evil.test')).status,403);
  assert.equal((await post('/api/login',{password:'wrong'})).status,401);
  let r=await post('/api/login',{password:'test-password-12345678'});assert.equal(r.status,200);const op=r.headers.getSetCookie()[0].split(';')[0];
  let s=await (await get('/api/state/rehearsal')).json();const epoch=s.epoch;
  assert.equal((await post('/api/action/rehearsal',{action:'START',revision:s.revision})).status,401);
  assert.equal((await post('/api/action/rehearsal',{action:'START',revision:s.revision},op)).status,200);
  assert.equal((await post('/api/action/rehearsal',{action:'HOLDING',revision:0},op)).status,409);
  r=await get('/api/state/rehearsal');const device=r.headers.getSetCookie()[0].split(';')[0];
  const duplicates=await Promise.all(Array.from({length:10},()=>post('/api/contribute/rehearsal',{epoch},device)));
  assert.ok(duplicates.every(r=>r.status===200));s=await(await get('/api/state/rehearsal')).json();assert.equal(s.count,1);
  const devices=await Promise.all(Array.from({length:99},async()=>{const r=await get('/api/state/rehearsal');return r.headers.getSetCookie()[0].split(';')[0];}));
  await Promise.all(devices.map(c=>post('/api/contribute/rehearsal',{epoch},c)));
  s=await(await get('/api/state/rehearsal')).json();assert.equal(s.count,50);assert.equal(s.energy,95);assert.equal(s.state,'lock');assert.equal('contributions' in s,false);
  assert.equal((await(await get('/api/state/live')).json()).count,0);
  const controller=new AbortController();r=await fetch(base+'/api/events/rehearsal',{signal:controller.signal});assert.equal(r.headers.get('content-type'),'text/event-stream');const reader=r.body.getReader();const chunk=new TextDecoder().decode((await reader.read()).value);assert.ok(chunk.includes('"count":50'));controller.abort();await reader.cancel().catch(()=>{});
  r=await get('/api/qr/rehearsal');assert.equal(r.status,200);assert.ok((await r.text()).includes('<svg'));
  assert.equal((await post('/api/action/rehearsal',{action:'VIP',confirm:true,revision:s.revision},op)).status,200);
  s=await(await get('/api/state/rehearsal')).json();assert.equal((await post('/api/action/rehearsal',{action:'LAUNCH',confirm:true,revision:s.revision},op)).status,200);
  s=await(await get('/api/state/rehearsal')).json();const launchAt=s.launchAt;
  app.close();await new Promise(r=>app.server.once('close',r));app=makeApp({dataDir:data,config:{energyFillSeconds:0},password:'test-password-12345678',enableLive:true});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${app.server.address().port}`;
  s=await(await get('/api/state/rehearsal',device)).json();assert.equal(s.count,50);assert.equal(s.launchAt,launchAt);assert.equal(s.contributed,true);assert.equal((await get('/api/operator',op)).status,401);
  assert.equal((await get('/../server.mjs')).status,404);assert.equal((await get('/event.config.json')).status,404);assert.equal((await get('/data/secret')).status,404);
  const log=readFileSync(join(data,'audit.ndjson'),'utf8');assert.ok(log.includes('LAUNCH'));assert.ok(!log.includes('gz_device'));
 }finally{app.close();await new Promise(r=>setTimeout(r,30));rmSync(data,{recursive:true,force:true});}
});
test('production refuses unsafe configuration',()=>{const data=mkdtempSync(join(tmpdir(),'gozero-prod-'));try{assert.throws(()=>makeApp({dataDir:data,config:{energyFillSeconds:0},production:true,password:'short'}));assert.throws(()=>makeApp({dataDir:data,config:{energyFillSeconds:0},production:true,password:'a-secure-long-password'}));}finally{rmSync(data,{recursive:true,force:true});}});
