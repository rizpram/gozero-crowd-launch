import {writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..','public','audio');mkdirSync(root,{recursive:true});
function wave(name,duration,render){const sr=22050,n=Math.round(sr*duration),b=Buffer.alloc(44+n*2);b.write('RIFF');b.writeUInt32LE(36+n*2,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(sr,24);b.writeUInt32LE(sr*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);for(let i=0;i<n;i++)b.writeInt16LE(Math.round(Math.max(-.92,Math.min(.92,render(i/sr,i)))*32767),44+i*2);writeFileSync(join(root,name),b);}
const tau=Math.PI*2,notes=[73.4167,110,146.8333,184.999,220,293.6667];
wave('ambient.wav',24,t=>{let s=0;for(let k=0;k<notes.length;k++){const f=Math.round(notes[k]*24)/24,mod=.72+.28*Math.sin(tau*t/24+k);s+=Math.sin(tau*f*t)*mod*.047/(1+k*.2);}return s*(.82+.18*Math.cos(tau*t/3));});
let seed=719;wave('reveal.wav',8,t=>{seed=(1664525*seed+1013904223)>>>0;const noise=(seed/4294967296-.5),rise=Math.min(1,t*5),tail=Math.exp(-t*.48);let chord=0;[146.83,185,220,293.66,369.99,440].forEach((f,k)=>chord+=Math.sin(tau*f*t)*.07/(1+k*.13));const impact=Math.sin(tau*(48*t+36*(1-Math.exp(-t*6))))*.28*Math.exp(-t*3);const air=noise*.12*Math.exp(-t*1.2);return (chord*rise+impact+air)*tail;});
console.log('Original ambient loop and launch score rendered locally.');
