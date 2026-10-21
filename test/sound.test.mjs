import test from 'node:test';
import assert from 'node:assert/strict';
import {ShowAudio} from '../public/sound.js';
test('background music fades out on VIP movement and countdown, resumes after cancellation, remains silent at finale',()=>{
 const audio=new ShowAudio({audio:{volume:.65}});let level;
 audio.armed=true;audio.ctx={currentTime:0};audio.bed={gain:{setTargetAtTime(v){level=v;}}};
 const vip={state:'vip'};audio.apply(vip);assert.equal(level,.75);
 audio.setSlideMode(true);assert.equal(level,0);
 audio.apply(vip);assert.equal(level,0);
 audio.setSlideMode(false);assert.equal(level,.75);
 audio.apply({state:'launch',launchAt:null});assert.equal(level,0);
 audio.apply({state:'hero'});audio.setFinaleMode(true);assert.equal(level,0);
 audio.setFinaleMode(false);audio.apply({state:'holding'});assert.equal(level,.75);
});
