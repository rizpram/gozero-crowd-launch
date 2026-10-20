export class ShowAudio {
  constructor(config,notify=()=>{}){this.config=config;this.notify=notify;this.buffers=new Map();this.sources=[];this.armed=false;this.muted=false;this.volume=config.audio?.volume??.65;this.lastLaunch=null;this.generation=0;}
  async preload(){const a=this.config.audio;const files=[a.ambient,a.launch,...Array.from({length:Math.min(10,this.config.countdownSeconds)+1},(_,i)=>a.voiceBase+i+'.wav')];await Promise.all(files.map(async file=>{const r=await fetch(file);if(!r.ok)throw Error('Audio asset gagal dimuat: '+file);this.buffers.set(file,await r.arrayBuffer());}));this.loaded=true;}
  async arm(state){if(!this.loaded)await this.preload();if(!this.ctx){this.ctx=new AudioContext();this.master=this.ctx.createGain();this.master.gain.value=this.volume;this.master.connect(this.ctx.destination);this.bed=this.ctx.createGain();this.bed.gain.value=0;this.bed.connect(this.master);this.decoded=new Map();await Promise.all([...this.buffers].map(async([f,b])=>this.decoded.set(f,await this.ctx.decodeAudioData(b.slice(0)))));this.loop=this.ctx.createBufferSource();this.loop.buffer=this.decoded.get(this.config.audio.ambient);this.loop.loop=true;this.loop.connect(this.bed);this.loop.start();}
    await this.ctx.resume();this.armed=true;this.muted=false;this.master.gain.setTargetAtTime(this.volume,this.ctx.currentTime,.08);this.apply(state);}
  setVolume(v){this.volume=Math.max(0,Math.min(1,v));if(this.ctx)this.master.gain.setTargetAtTime(this.muted?0:this.volume,this.ctx.currentTime,.06);}
  toggleMute(){this.muted=!this.muted;if(this.ctx)this.master.gain.setTargetAtTime(this.muted?0:this.volume,this.ctx.currentTime,.08);return this.muted;}
  stopCues(){for(const source of this.sources){try{source.stop();}catch{}}this.sources=[];}
  play(file,when,offset=0,gain=1){const buffer=this.decoded.get(file);if(!buffer||offset>=buffer.duration)return;const source=this.ctx.createBufferSource(),level=this.ctx.createGain();source.buffer=buffer;level.gain.value=gain;source.connect(level);level.connect(this.master);source.start(when,offset);source.onended=()=>{source.disconnect();level.disconnect();this.sources=this.sources.filter(x=>x!==source);};this.sources.push(source);}
  apply(state){this.state=state;if(!this.armed)return;const now=this.ctx.currentTime;this.bed.gain.setTargetAtTime(state.state==='launch'?.10:state.state==='hero'?.24:.46,now,.35);
    if(state.state==='launch'&&this.lastLaunch!==state.launchAt){this.stopCues();this.lastLaunch=state.launchAt;const elapsed=(Date.now()+(state.serverTime-Date.now())-state.launchAt)/1000,cd=state.config.countdownSeconds;
      for(let second=0;second<cd;second++){const remaining=cd-second,delay=second-elapsed;if(delay<-.4||remaining>10)continue;this.play(this.config.audio.voiceBase+remaining+'.wav',now+Math.max(0,delay),0,1);}
      const delay=cd-elapsed;if(delay>=-.4){this.play(this.config.audio.voiceBase+'0.wav',now+Math.max(0,delay),0,.85);this.play(this.config.audio.launch,now+Math.max(0,delay),Math.max(0,-delay),.9);}
      else if(elapsed<cd+2)this.play(this.config.audio.launch,now,elapsed-cd,.9);
    }else if(state.state!=='launch'&&this.lastState==='launch'){this.stopCues();}
    if(state.state==='holding')this.lastLaunch=null;this.lastState=state.state;
  }
}
