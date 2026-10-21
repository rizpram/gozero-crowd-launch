import test from 'node:test';
import assert from 'node:assert/strict';
import {ShowAudio} from '../public/sound.js';

const config={audio:{ambient:'ambient',launch:'fallback',activated:'uploaded',voiceBase:'voice-'},countdownSeconds:3};
function rig(){
 const played=[];
 const ctx={currentTime:10,createGain:()=>({gain:{value:0,setTargetAtTime(){}},connect(){},disconnect(){}}),createBufferSource(){
   const source={connect(){},disconnect(){},start(when,offset){this.when=when;this.offset=offset;played.push(this);},stop(){this.stopped=true;}};return source;
 }};
 const audio=new ShowAudio(config);audio.ctx=ctx;audio.master={};audio.bed={gain:{setTargetAtTime(){}}};audio.armed=true;
 audio.decoded=new Map(['ambient','fallback','uploaded',...Array.from({length:4},(_,i)=>'voice-'+i+'.wav')].map(file=>[file,{file,duration:8}]));
 return {audio,played};
}
function state(elapsed=0,kind='launch',epoch='a'){
 return {state:kind,epoch,launchAt:100000,serverTime:100000+elapsed*1000,config};
}
test('uploaded cue starts at System Activated, without overlapping GO voice, and survives hero',()=>{
 const {audio,played}=rig();audio.apply(state());
 const finale=played.filter(s=>s.activationCue);assert.equal(finale.length,1);
 assert.equal(finale[0].buffer.file,'uploaded');assert.equal(finale[0].when,13);assert.equal(finale[0].offset,0);
 assert.equal(played.some(s=>s.buffer.file==='voice-0.wav'),false);
 audio.setFinaleMode(true);assert.equal(finale[0].stopped,undefined);
 audio.apply(state(5,'hero'));audio.apply(state(6,'hero'));
 assert.equal(finale[0].stopped,undefined);assert.equal(played.filter(s=>s.activationCue).length,1);
 audio.apply(state(7,'holding'));assert.equal(finale[0].stopped,true);
});
test('late LED joins resume the remaining cue instead of replaying its beginning',()=>{
 const {audio,played}=rig();audio.apply(state(6));
 const finale=played.find(s=>s.activationCue);assert.ok(finale);assert.equal(finale.offset,3);
 audio.apply(state(7));assert.equal(played.filter(s=>s.activationCue).length,1);
 const expired=rig();expired.audio.apply(state(12));assert.equal(expired.played.length,0);
});
test('a new epoch can trigger a new cue even when timestamps match',()=>{
 const {audio,played}=rig();audio.apply(state());audio.apply(state(0,'launch','b'));
 assert.equal(played.filter(s=>s.activationCue).length,2);assert.equal(played.find(s=>s.activationCue).stopped,true);
});
test('bundled reveal and GO remain available until an MP3 is uploaded',()=>{
 const {audio,played}=rig();audio.config={...config,audio:{...config.audio,activated:null}};
 audio.apply(state());assert.ok(played.some(s=>s.buffer.file==='fallback'));
 assert.ok(played.some(s=>s.buffer.file==='voice-0.wav'));
});
test('uploaded configuration can be loaded and decoded while the LED is already armed',async()=>{
 const {audio}=rig();const original=globalThis.fetch;
 audio.loaded=true;audio.audioKey=JSON.stringify(config.audio);audio.ctx.decodeAudioData=async bytes=>({duration:8,bytes});
 audio.buffers.set('ambient',new ArrayBuffer(1));audio.buffers.set('fallback',new ArrayBuffer(1));
 for(let i=0;i<=3;i++)audio.buffers.set('voice-'+i+'.wav',new ArrayBuffer(1));
 globalThis.fetch=async file=>({ok:true,arrayBuffer:async()=>new Uint8Array([1,2,3]).buffer});
 try{await audio.updateConfig({...config,audio:{...config.audio,activated:'new-upload'}});
 assert.ok(audio.decoded.has('new-upload'));assert.equal(audio.config.audio.activated,'new-upload');
 }finally{globalThis.fetch=original;}
});
