import test from 'node:test';
import assert from 'node:assert/strict';
import {createSession,action,energy} from '../engine.mjs';
import {ceremonyEnergy,vipReady,launchPhase} from '../public/show-flow.js';
import {makeApp} from '../server.mjs';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
test('ceremony reaches 100 before VIP launch; contribution count and actual energy stay unchanged',()=>{
 const config={target:50,energyFillSeconds:4,countdownSeconds:3,activatedHoldSeconds:2},s=createSession('rehearsal','rehearsal',config);s.contributions=['one'];
 action(s,'VIP',{confirm:true,early:true,reason:'Show caller cue'},config,1000);
 const state=()=>({...s,energy:energy(s),config});
 assert.ok(Math.abs(ceremonyEnergy(state(),1000)-1.9)<1e-9);assert.ok(ceremonyEnergy(state(),3000)>1.9);assert.equal(ceremonyEnergy(state(),5000),100);
 assert.equal(vipReady(state(),4999),false);assert.throws(()=>action(s,'LAUNCH',{confirm:true},config,4999));
 action(s,'LAUNCH',{confirm:true},config,5000);assert.equal(s.contributions.length,1);assert.ok(Math.abs(energy(s)-1.9)<1e-9);
 assert.equal(launchPhase(state(),5000),'countdown');assert.equal(launchPhase(state(),7999),'countdown');assert.equal(launchPhase(state(),8000),'activated');assert.equal(launchPhase(state(),9999),'activated');assert.equal(launchPhase(state(),10000),'video');
});
test('production media uploads require operator, validate contents, support ranges, persist and lock during activation',async()=>{
 const dir=mkdtempSync(tmpdir()+'/gozero-media-test-');let app=makeApp({dataDir:dir});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));let base='http://127.0.0.1:'+app.server.address().port;
 const upload=(body,cookie='',type='image/png',kind='brand')=>fetch(base+'/api/media/'+kind,{method:'POST',headers:{origin:base,cookie,'content-type':type},body});
 try{
  assert.equal((await upload('bad')).status,401);
  let r=await fetch(base+'/api/login',{method:'POST',headers:{origin:base,'content-type':'application/json'},body:JSON.stringify({password:'gozero-rehearsal'})});const cookie=r.headers.getSetCookie()[0].split(';')[0];
  assert.equal((await upload('bad',cookie)).status,415);assert.equal((await upload('bad',cookie,'text/html')).status,415);
  const bytes=readFileSync(new URL('../public/logo.png',import.meta.url));assert.equal((await upload(bytes,cookie)).status,200);
  r=await fetch(base+'/media/brand',{headers:{Range:'bytes=0-7'}});assert.equal(r.status,206);assert.deepEqual(Buffer.from(await r.arrayBuffer()),bytes.subarray(0,8));
  assert.equal((await fetch(base+'/media/brand',{headers:{Range:'bytes=999999999-'}})).status,416);
  const media=(await(await fetch(base+'/api/state/rehearsal')).json()).config.media;assert.equal(media.brandReady,true);assert.equal(media.videoReady,false);
  app.sessions.rehearsal.state='vip';assert.equal((await upload(bytes,cookie)).status,409);
  app.close();await new Promise(r=>setTimeout(r,30));app=makeApp({dataDir:dir});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+app.server.address().port;
  assert.equal((await(await fetch(base+'/api/state/rehearsal')).json()).config.media.brandReady,true);
 }finally{app.close();await new Promise(r=>setTimeout(r,30));rmSync(dir,{recursive:true,force:true});}
});
