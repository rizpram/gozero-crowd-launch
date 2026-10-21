import {ShowAudio} from './sound.js';
import {vipReady,launchPhase} from './show-flow.js';
export async function mountLed({id,app,request,connect,theme,logo,escape,stageCopy,orb,toast}){
 const embedded=new URLSearchParams(location.search).has('embedded');let s,offset=0,lastKey='',phaseKey='',lastCount=-1,assets=false,mediaVersion='',videoError=false;
 try{s=await request(`/api/state/${id}`);}catch(e){app.textContent=e.message;return;}
 theme(s.config);document.body.classList.add('led-view');const sound=new ShowAudio(s.config,toast);
 app.innerHTML=`<div class="led-shell"><div class="stage" id="stage"><div class="stage-atmosphere" aria-hidden="true"><i></i><i></i><i></i></div><header class="stage-header"><div class="brand-plate" id="led-brand">${logo(s.config)}</div></header><canvas class="stage-orb orb" id="stage-orb" aria-hidden="true"></canvas><section class="stage-copy" id="stage-copy"></section><div id="stage-qr"></div><div id="launch-overlay"></div><div id="video-layer" hidden><div id="video-fallback"><span class="eyebrow">Zero Waste to Landfill</span><h1>System Activated</h1><div id="video-brand">${logo(s.config)}</div></div><video id="show-video" playsinline preload="auto" muted></video><button id="video-resume" hidden>PUTAR VIDEO</button></div></div>${embedded?'':`<div class="sound-gate" id="sound-gate"><span>OUTPUT AUDIO & VIDEO</span><button id="arm-audio">AKTIFKAN AUDIO</button><small>Aktifkan pada satu workstation LED sebelum acara.</small></div><div class="led-tools"><button id="mute-audio" disabled>MUTE</button><label>VOLUME <input type="range" id="led-volume" aria-label="Volume output LED" min="0" max="100" value="65"></label><button id="fullscreen">FULL SCREEN</button><span id="sound-indicator">AUDIO OFF</span></div>`}<div class="led-connection" id="led-connection" hidden>KONEKSI TERPUTUS</div></div>`;
 const video=document.querySelector('#show-video');const fresh=()=>({...s,serverTime:Date.now()+offset});
 function size(){document.querySelector('#stage').style.transform=`scale(${Math.min(innerWidth/1920,innerHeight/1080)})`;}
 addEventListener('resize',size);size();orb(document.querySelector('#stage-orb'),()=>fresh());
 function syncMedia(){const m=s.config.media||{},version=m.version||'';if(mediaVersion===version&&video.dataset.synced)return;mediaVersion=version;video.dataset.synced='1';videoError=false;document.querySelector('#led-brand').innerHTML=logo(s.config);document.querySelector('#video-brand').innerHTML=logo(s.config);video.pause();if(m.videoUrl){video.src=m.videoUrl;video.load();}else{video.removeAttribute('src');video.load();}}
 video.oncanplay=()=>heartbeat();video.onerror=()=>{if(!s.config.media?.videoReady)return;videoError=true;video.hidden=true;document.querySelector('#video-fallback').hidden=false;heartbeat();if(!embedded)toast('Video gagal dimuat. System Activated tetap tampil.');};
 video.onended=()=>{video.hidden=true;document.querySelector('#video-fallback').hidden=false;sound.setVideoMode(false);};
 document.querySelector('#video-resume').onclick=()=>{video.play().then(()=>{document.querySelector('#video-resume').hidden=true;document.querySelector('#video-fallback').hidden=true;}).catch(()=>toast('Periksa file dan output video.'));};
 if(!embedded){sound.preload().then(()=>{assets=true;heartbeat();}).catch(e=>toast(e.message));
  document.querySelector('#arm-audio').onclick=async()=>{const b=document.querySelector('#arm-audio');b.disabled=true;try{if(video.getAttribute('src')){video.muted=true;video.play().then(()=>{video.pause();video.currentTime=0;}).catch(()=>{});}await sound.arm(fresh());document.querySelector('#sound-gate').hidden=true;document.querySelector('#mute-audio').disabled=false;document.querySelector('#sound-indicator').textContent='AUDIO ON';heartbeat();}catch(e){b.disabled=false;toast(e.message);}};
  document.querySelector('#mute-audio').onclick=()=>{sound.toggleMute();video.muted=sound.muted;document.querySelector('#mute-audio').textContent=sound.muted?'UNMUTE':'MUTE';};
  document.querySelector('#led-volume').oninput=e=>{sound.setVolume(Number(e.target.value)/100);video.volume=sound.volume;};
  document.querySelector('#fullscreen').onclick=()=>document.documentElement.requestFullscreen().catch(()=>toast('Gunakan F11.'));
 }
 function draw(next){s=next;offset=next.serverTime-Date.now();theme(s.config);syncMedia();const key=s.epoch+s.state+s.accepting+mediaVersion;const stage=document.querySelector('#stage');if(key!==lastKey){lastKey=key;stage.classList.remove('stage-enter');void stage.offsetWidth;stage.classList.add('stage-enter');document.querySelector('#stage-qr').innerHTML=s.state==='qr'?`<div class="qr-block"><img src="/api/qr/${id}" alt="Scan QR untuk berpartisipasi"><p>scan. activate. make an impact.</p></div>`:'';phaseKey='';}if(!embedded)sound.apply(fresh());}
 function rings(){return '<div class="cg-vortex"><i class="cg-ring ring-a"></i><i class="cg-ring ring-b"></i><i class="cg-ring ring-c"></i><div class="cg-core"></div></div>';}
 function animate(){const f=fresh(),stage=document.querySelector('#stage'),overlay=document.querySelector('#launch-overlay'),layer=document.querySelector('#video-layer');const filling=s.state==='vip'&&!vipReady(f),state=filling?'lock':s.state;stage.dataset.state=state;const phase=launchPhase(f),key=state+phase;stage.dataset.phase=phase;
  if(phaseKey!==key){phaseKey=key;document.querySelector('#stage-copy').innerHTML=stageCopy({...s,state});
   if(phase!=='video'){video.pause();video.hidden=false;layer.hidden=true;document.querySelector('#video-resume').hidden=true;}
   if(phase==='countdown'){overlay.innerHTML=`<div class="cinematic counting">${rings()}<div class="count-face"><div class="countdown" id="count-number"></div><span>ONE FINAL ACTION</span></div></div>`;lastCount=-1;}
   else if(phase==='activated'){overlay.innerHTML=`<div class="cinematic activation-reveal">${rings()}<div class="activated-copy"><span>Zero Waste to Landfill</span><h1>System Activated</h1></div></div>`;}
   else overlay.innerHTML='';
   if(phase==='video'){layer.hidden=false;document.querySelector('#video-fallback').hidden=false;if(s.config.media?.videoReady&&!videoError){video.hidden=false;video.muted=embedded||!sound.armed||sound.muted;video.volume=sound.volume;const expected=s.launchAt?Math.max(0,(f.serverTime-s.launchAt)/1000-s.config.countdownSeconds-(s.config.activatedHoldSeconds??2)):0;
     if(Number.isFinite(video.duration)&&expected<video.duration)video.currentTime=expected;
     if(!Number.isFinite(video.duration)||expected<video.duration)video.play().then(()=>{document.querySelector('#video-fallback').hidden=true;}).catch(()=>{document.querySelector('#video-resume').hidden=false;});else video.hidden=true;
    }else video.hidden=true;}
  }
  if(phase==='countdown'){const n=Math.max(1,Math.ceil(s.config.countdownSeconds-(f.serverTime-s.launchAt)/1000));if(n!==lastCount){lastCount=n;const el=document.querySelector('#count-number');el.textContent=n;el.classList.remove('number-enter');void el.offsetWidth;el.classList.add('number-enter');}}
  if(!embedded)sound.setVideoMode(phase==='video'&&!!s.config.media?.videoReady&&!videoError&&!video.ended);
  requestAnimationFrame(animate);
 }
 const screenId=crypto.randomUUID();async function heartbeat(){if(embedded)return;try{await request(`/api/led/${id}`,{id:screenId,audio:sound.armed&&!sound.muted&&sound.volume>0,assets,videoReady:!!s.config.media?.videoReady&&video.readyState>=3&&!videoError,visible:!document.hidden});}catch{}}
 draw(s);animate();heartbeat();setInterval(heartbeat,4000);connect(id,'led',draw,ok=>{document.querySelector('#led-connection').hidden=ok;});
}
