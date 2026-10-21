import {readFileSync,writeFileSync,existsSync,mkdirSync,copyFileSync,rmSync,cpSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
const root=resolve(import.meta.dirname,'..'),pub=join(root,'public');
for(const f of ['server.mjs','engine.mjs','media.mjs','public/show-flow.js','public/app.js','public/led.js','public/vip.js','public/sound.js']){const r=spawnSync(process.execPath,['--check',join(root,f)],{stdio:'inherit'});if(r.status)process.exit(r.status);}
const audioRender=spawnSync(process.execPath,[join(root,'scripts/render-audio.mjs')],{stdio:'inherit'});if(audioRender.status)process.exit(audioRender.status);
const c=JSON.parse(readFileSync(join(root,'event.config.json')));
for(const field of ['title','titleLines','venue','logo','target','cta','copy','launchDuration','countdownSeconds'])if(!c[field])throw Error(`Missing event config: ${field}`);
if(!['cinematic','reduced'].includes(c.animationMode))throw Error('Invalid animationMode');
if(!Number.isInteger(c.countdownSeconds)||c.countdownSeconds<1||c.countdownSeconds>30||c.launchDuration<1||c.launchDuration>60)throw Error('Invalid cue duration');
if(!existsSync(join(pub,c.logo.slice(1))))throw Error('Official logo is required');
for(let i=0;i<=Math.min(10,c.countdownSeconds);i++)if(!existsSync(join(pub,`audio/count-${i}.wav`)))throw Error('Missing countdown voice asset');
if(!existsSync(join(pub,c.audio.ambient.slice(1))))throw Error('Missing background audio asset');
// Original synthesized rehearsal cue, 4 seconds. Replace only with production-approved WAV.
const rate=44100,seconds=4,n=rate*seconds,buf=Buffer.alloc(44+n*2);
buf.write('RIFF',0);buf.writeUInt32LE(36+n*2,4);buf.write('WAVEfmt ',8);buf.writeUInt32LE(16,16);buf.writeUInt16LE(1,20);buf.writeUInt16LE(1,22);buf.writeUInt32LE(rate,24);buf.writeUInt32LE(rate*2,28);buf.writeUInt16LE(2,32);buf.writeUInt16LE(16,34);buf.write('data',36);buf.writeUInt32LE(n*2,40);
for(let i=0;i<n;i++){const t=i/rate,env=Math.min(1,t*18)*Math.exp(-t*1.25),fade=Math.min(1,(seconds-t)*10);let sample=(Math.sin(t*2*Math.PI*130.81)*.19+Math.sin(t*2*Math.PI*261.63)*.12+Math.sin(t*2*Math.PI*392)*.09+Math.sin(t*2*Math.PI*523.25)*.07)*env*fade;buf.writeInt16LE(Math.round(Math.max(-1,Math.min(1,sample))*32767),44+i*2);}
if(!existsSync(join(pub,'launch.wav')))writeFileSync(join(pub,'launch.wav'),buf);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const backup=join(root,'backup');mkdirSync(backup,{recursive:true});
writeFileSync(join(backup,'hero.html'),`<!doctype html><html lang="id"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GoZero% — Offline Hero</title><style>*{box-sizing:border-box}body{margin:0;background:#000;font-family:Arial,sans-serif;color:white;display:grid;place-items:center;height:100vh;overflow:hidden}.stage{width:1920px;height:1080px;position:relative;flex:none;background:radial-gradient(ellipse at 85% 80%,#fff3b5,transparent 55%),#fff;color:#004781}.brand{position:absolute;left:96px;top:72px;padding:0;background:transparent;border-radius:0}.brand img{width:1728px;display:block}.venue{position:absolute;right:96px;top:130px;font-size:14px;letter-spacing:.21em;color:#516b80}.copy{position:absolute;left:80px;right:80px;top:355px;text-align:center}.eyebrow{font-size:16px;letter-spacing:.25em;color:#516b80;margin-bottom:36px}h1{font-size:96px;letter-spacing:-.05em;line-height:1.1;margin:0}h1 span{color:#004781}.copy p{font-size:24px;letter-spacing:.3em;color:#516b80;margin-top:40px}footer{position:absolute;bottom:65px;left:122px;right:122px;display:flex;justify-content:space-between;font-size:13px;letter-spacing:.18em;color:#516b80}</style><div class="stage" id="stage"><div class="brand"><img src="../public${escape(c.logo)}" alt="GoZero% — ${escape(c.descriptor)}"></div><div class="venue">${escape(c.venue)}</div><div class="copy"><div class="eyebrow">${escape(c.tagline)}</div><h1>System Activated</h1></div></div><script>function scale(){document.getElementById('stage').style.transform='scale('+Math.min(innerWidth/1920,innerHeight/1080)+')'}scale();addEventListener('resize',scale);</script></html>`);
const dist=join(root,'dist');rmSync(dist,{recursive:true,force:true});mkdirSync(dist,{recursive:true});
for(const f of ['index.html','app.js','led.js','vip.js','sound.js','show-flow.js','style.css','revision.css','logo.png','brand-kv.png','logo-reverse.png','launch.wav'])copyFileSync(join(pub,f),join(dist,f));
cpSync(join(pub,'audio'),join(dist,'audio'),{recursive:true});
console.log('BUILD PASS: browser syntax, event config, official logo, WAV cue, and static assets validated.');
console.log('Run node server.mjs for the realtime app. dist/ is assets only, not a standalone backend.');

