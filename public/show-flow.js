// Shared timeline: display-only ceremony never changes real contribution metrics.
export function ceremonyEnergy(s, now=s.serverTime||Date.now()) {
  if(!s.ceremonyAt)return s.energy||0;
  const duration=(s.config?.energyFillSeconds||0)*1000;
  const p=duration?Math.max(0,Math.min(1,(now-s.ceremonyAt)/duration)):1;
  return (s.ceremonyFrom??s.energy??0)+(100-(s.ceremonyFrom??s.energy??0))*(1-(1-p)**3);
}
export function vipReady(s, now=s.serverTime||Date.now()) {
  return s.state==='vip'&&now>=(s.ceremonyAt||0)+(s.config?.energyFillSeconds||0)*1000;
}
export function launchPhase(s, now=s.serverTime||Date.now()) {
  if(s.state!=='launch')return s.state==='hero'?'video':'standby';
  const elapsed=(now-s.launchAt)/1000,cd=s.config.countdownSeconds;
  return elapsed<cd?'countdown':elapsed<cd+(s.config.activatedHoldSeconds??2)?'activated':'video';
}
