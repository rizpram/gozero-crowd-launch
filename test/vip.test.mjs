import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {makeApp} from '../server.mjs';
async function fixture(){const dir=mkdtempSync(join(tmpdir(),'gozero-vip-'));const app=makeApp({dataDir:dir,password:'test-vip-password-123',enableLive:true});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${app.server.address().port}`;const get=(url,cookie='')=>fetch(base+url,{headers:{cookie}});const post=(url,b={},cookie='')=>fetch(base+url,{method:'POST',headers:{origin:base,'content-type':'application/json',cookie},body:JSON.stringify(b)});const login=await post('/api/login',{password:'test-vip-password-123'});const operator=login.headers.getSetCookie()[0].split(';')[0];return {app,dir,base,get,post,operator,close:async()=>{app.close();await new Promise(r=>setTimeout(r,25));rmSync(dir,{recursive:true,force:true});}};}
test('VIP links are operator-only, single-device, private, and inactive before VIP READY',async()=>{const f=await fixture();try{
  assert.equal((await f.post('/api/vip-pair/rehearsal')).status,401);
  assert.equal((await f.post('/api/vip-launch/rehearsal',{gesture:'slide-complete'})).status,401);
  const pair=await(await f.post('/api/vip-pair/rehearsal',{},f.operator)).json();const token=new URLSearchParams(new URL(pair.url).hash.slice(1)).get('token');assert.ok(pair.qr.startsWith('data:image/png;base64,'));
  const publicState=await(await f.get('/api/state/rehearsal')).json();assert.equal('vip' in publicState,false);assert.ok(!JSON.stringify(publicState).includes(token));
  const paired=await f.post('/api/vip-access/rehearsal',{token});assert.equal(paired.status,200);const cookie=paired.headers.getSetCookie()[0].split(';')[0];
  assert.equal((await f.post('/api/vip-access/rehearsal',{token})).status,403);
  assert.equal((await f.post('/api/vip-launch/rehearsal',{epoch:publicState.epoch,gesture:'slide-complete'},cookie)).status,409);
  assert.equal((await f.post('/api/vip-launch/rehearsal',{epoch:publicState.epoch,gesture:'click'},cookie)).status,400);
  const op=await(await f.get('/api/operator',f.operator)).json();assert.equal(op.vipStatus,'paired');
  const log=readFileSync(join(f.dir,'audit.ndjson'),'utf8');assert.ok(log.includes('VIP_DEVICE_PAIRED'));assert.ok(!log.includes(token));
}finally{await f.close();}});
test('paired VIP slide launches exactly once and preserves audience contribution metrics',async()=>{const f=await fixture();try{
  let s=await(await f.get('/api/state/rehearsal')).json();await f.post('/api/action/rehearsal',{action:'START',revision:s.revision},f.operator);
  s=await(await f.get('/api/state/rehearsal')).json();await f.post('/api/contribute/rehearsal',{epoch:s.epoch});
  const pair=await(await f.post('/api/vip-pair/rehearsal',{},f.operator)).json();const token=new URLSearchParams(new URL(pair.url).hash.slice(1)).get('token');
  const r=await f.post('/api/vip-access/rehearsal',{token}),cookie=r.headers.getSetCookie()[0].split(';')[0];s=await(await f.get('/api/state/rehearsal')).json();
  await f.post('/api/action/rehearsal',{action:'VIP',confirm:true,early:true,reason:'VIP stage timing rehearsal',revision:s.revision},f.operator);
  const results=await Promise.all(Array.from({length:8},()=>f.post('/api/vip-launch/rehearsal',{epoch:s.epoch,gesture:'slide-complete'},cookie)));
  assert.ok(results.every(r=>r.status===200));s=await(await f.get('/api/state/rehearsal')).json();assert.equal(s.state,'launch');assert.equal(s.count,1);assert.ok(Math.abs(s.energy-1.9)<1e-9);assert.ok(s.launchAt);
  assert.equal(readFileSync(join(f.dir,'audit.ndjson'),'utf8').split('VIP_SLIDE_LAUNCH').length-1,1);
  assert.equal((await(await f.get('/api/state/live')).json()).count,0);
}finally{await f.close();}});
test('reissuing, revoking and resetting invalidate old VIP access',async()=>{const f=await fixture();try{
  const pair=async()=>{const p=await(await f.post('/api/vip-pair/rehearsal',{},f.operator)).json();return new URLSearchParams(new URL(p.url).hash.slice(1)).get('token');};
  const old=await pair();let r=await f.post('/api/vip-access/rehearsal',{token:old}),cookie=r.headers.getSetCookie()[0].split(';')[0];
  const next=await pair();assert.equal((await f.get('/api/vip-status/rehearsal',cookie)).status,401);assert.equal((await f.post('/api/vip-access/rehearsal',{token:old})).status,401);
  r=await f.post('/api/vip-access/rehearsal',{token:next});cookie=r.headers.getSetCookie()[0].split(';')[0];await f.post('/api/vip-revoke/rehearsal',{},f.operator);assert.equal((await f.get('/api/vip-status/rehearsal',cookie)).status,401);
  const final=await pair();r=await f.post('/api/vip-access/rehearsal',{token:final});cookie=r.headers.getSetCookie()[0].split(';')[0];const s=await(await f.get('/api/state/rehearsal')).json();await f.post('/api/action/rehearsal',{action:'RESET',confirm:true,revision:s.revision},f.operator);assert.equal((await f.get('/api/vip-status/rehearsal',cookie)).status,401);
}finally{await f.close();}});
