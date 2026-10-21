export class ShowAudio {
  constructor(config,notify=()=>{}){this.config=config;this.notify=notify;this.buffers=new Map();this.sources=[];this.armed=false;this.muted=false;this.volume=config.audio?.volume??.65;this.lastLaunch=null;this.generation=0;this.audioKey=JSON.stringify(config.audio);}
  async preload(){const a=this.config.audio;const files=[a.ambient,a.launch,...(a.activated?[a.activated]:[]),...Array.from({length:Math.min(10,this.config.countdownSeconds)+1},(_,i)=>a.voiceBase+i+'.wav')];await Promise.all([...new Set(files)].filter(file=>!this.buffers.has(file)).map(async file=>{const r=await fetch(file);if(!r.ok)throw Error('Audio asset gagal dimuat: '+file);this.buffers.set(file,await r.arrayBuffer());}));this.loaded=true;}
  async updateConfig(config){const key=JSON.stringify(config.audio);if(key===this.audioKey)return;this.audioKey=key;this.config=config;this.loaded=false;try{await this.preload();if(this.ctx){this.decoded??=new Map();await Promise.all([...this.buffers].filter(([file])=>!this.decoded.has(file)).map(async([file,bytes])=>this.decoded.set(file,await this.ctx.decodeAudioData(bytes.slice(0)))));}}catch(e){this.audioKey='';throw e;}}
  async arm(state){if(!this.ctx){const Context=window.AudioContext||window.webkitAudioContext;if(!Context)throw Error('Web Audio tidak tersedia.');this.ctx=new Context();this.master=this.ctx.createGain();this.master.gain.value=this.volume;this.master.connect(this.ctx.destination);this.bed=this.ctx.createGain();this.bed.gain.value=0;this.bed.connect(this.master);}
    // Unlock synchronously in the click gesture, before network/decode awaits.
    const unlocked=Promise.race([this.ctx.resume().then(()=>true,()=>false),new Promise(resolve=>setTimeout(()=>resolve(false),4000))]);
    if(!this.loaded)await this.preload();if(!this.loop){this.decoded=new Map();await Promise.all([...this.buffers].map(async([f,b])=>this.decoded.set(f,await this.ctx.decodeAudioData(b.slice(0)))));this.loop=this.ctx.createBufferSource();this.loop.buffer=this.decoded.get(this.config.audio.ambient);this.loop.loop=true;this.loop.connect(this.bed);this.loop.start();}
    if(!await unlocked||this.ctx.state!=='running')throw Error('Tekan aktifkan audio sekali lagi.');this.armed=true;this.muted=false;this.master.gain.setTargetAtTime(this.volume,this.ctx.currentTime,.08);this.apply(state);}
  setFinaleMode(on){if(this.finaleMode===on)return;this.finaleMode=on;if(this.ctx){this.apply(this.state);if(on)this.stopCues(true);}}
  setSlideMode(on){if(this.slideMode===on)return;this.slideMode=on;if(this.armed)this.apply(this.state);}
  setVolume(v){this.volume=Math.max(0,Math.min(1,v));if(this.ctx)this.master.gain.setTargetAtTime(this.muted?0:this.volume,this.ctx.currentTime,.06);}
  toggleMute(){this.muted=!this.muted;if(this.ctx)this.master.gain.setTargetAtTime(this.muted?0:this.volume,this.ctx.currentTime,.08);return this.muted;}
  stopCues(preserveActivation=false){const keep=[];for(const source of this.sources){if(preserveActivation&&source.activationCue){keep.push(source);continue;}try{source.stop();}catch{}}this.sources=keep;}
  play(file,when,offset=0,gain=1,activationCue=false){const buffer=this.decoded.get(file);if(!buffer||offset>=buffer.duration)return;const source=this.ctx.createBufferSource(),level=this.ctx.createGain();source.buffer=buffer;source.activationCue=activationCue;level.gain.value=gain;source.connect(level);level.connect(this.master);source.start(when,offset);source.onended=()=>{source.disconnect();level.disconnect();this.sources=this.sources.filter(x=>x!==source);};this.sources.push(source);}
  apply(state){this.state=state;if(!this.armed)return;const now=this.ctx.currentTime;this.bed.gain.setTargetAtTime(this.finaleMode||this.slideMode||['launch','hero'].includes(state.state)?0:.75,now,.35);
    const launchKey=state.epoch+':'+state.launchAt;
    if(state.state==='launch'&&state.launchAt!=null&&this.lastLaunch!==launchKey){this.stopCues();this.lastLaunch=launchKey;const elapsed=(Date.now()+(state.serverTime-Date.now())-state.launchAt)/1000,cd=state.config.countdownSeconds;
      for(let second=0;second<cd;second++){const remaining=cd-second,delay=second-elapsed;if(delay<-.4||remaining>10)continue;this.play(this.config.audio.voiceBase+remaining+'.wav',now+Math.max(0,delay),0,1);}
      const activationFile=this.config.audio.activated||this.config.audio.launch;
      const delay=cd-elapsed;if(delay>=-.4){if(!this.config.audio.activated)this.play(this.config.audio.voiceBase+'0.wav',now+Math.max(0,delay),0,.85);this.play(activationFile,now+Math.max(0,delay),Math.max(0,-delay),.9,true);}
      else this.play(activationFile,now,elapsed-cd,.9,true);
    }else if(state.state!=='launch'&&this.lastState==='launch'){this.stopCues(state.state==='hero');}
    if(!['launch','hero'].includes(state.state)){this.stopCues();this.lastLaunch=null;}
    if(state.state==='holding')this.lastLaunch=null;this.lastState=state.state;
  }
}
