import { randomUUID } from 'node:crypto';
import {vipReady} from './public/show-flow.js';
export class ShowError extends Error { constructor(message, status=409) { super(message); this.status=status; } }
export function createSession(id, mode, config) {
  return {id, mode, epoch:randomUUID(), state:'holding', accepting:false, target:config.target,
    contributions:[], ceremonyAt:null, ceremonyFrom:0, launchAt:null, early:false, vip:null, revision:0, updatedAt:Date.now()};
}
export const energy = s => Math.min(95, s.contributions.length / s.target * 95);
export function contribute(s, identity, config={}, now=Date.now()) {
  if (s.contributions.includes(identity)) return false;
  if (!s.accepting || s.state!=='live') throw new ShowError('Partisipasi belum dibuka atau sedang dijeda.');
  s.contributions.push(identity);
  if (energy(s)>=95) { s.state='lock'; s.accepting=false; s.ceremonyAt=now; s.ceremonyFrom=energy(s); }
  return true;
}
export function action(s, name, payload={}, config, now=Date.now()) {
  const critical = ['LOCK','VIP','LAUNCH','HERO','EMERGENCY','RESET'];
  if (critical.includes(name) && payload.confirm !== true) throw new ShowError('Konfirmasi cue diperlukan.',400);
  const requireState = (...states) => { if(!states.includes(s.state)) throw new ShowError('Cue tidak tersedia pada state ini.'); };
  switch(name) {
    case 'HOLDING': requireState('holding','qr','live','lock','vip'); s.state='holding'; s.accepting=false; s.ceremonyAt=null; break;
    case 'QR': requireState('holding','qr','live'); s.state='qr'; s.accepting=false; s.ceremonyAt=null; break;
    case 'START': requireState('holding','qr','live'); if(energy(s)>=95)throw new ShowError('Target sudah tercapai. Gunakan VIP READY.'); s.state='live'; s.accepting=true; break;
    case 'PAUSE': requireState('live'); s.accepting=false; break;
    case 'RESUME': requireState('live'); s.accepting=true; break;
    case 'LOCK': requireState('live','lock'); if(energy(s)<95)throw new ShowError('95% belum tercapai. Gunakan VIP READY dengan alasan aktivasi lebih awal.'); s.state='lock'; s.accepting=false; break;
    case 'VIP': requireState('holding','qr','live','lock');
      if(energy(s)<95 && !(payload.early===true && String(payload.reason||'').trim().length>=8)) throw new ShowError('Aktivasi lebih awal memerlukan alasan minimal 8 karakter.');
      s.early=energy(s)<95; if(!s.ceremonyAt){s.ceremonyAt=now;s.ceremonyFrom=energy(s);} s.state='vip'; s.accepting=false; break;
    case 'LAUNCH': requireState('vip'); if(!vipReady({...s,energy:energy(s),config},now))throw new ShowError('Tunggu animasi energi mencapai 100%.'); s.state='launch'; s.launchAt=now; s.accepting=false; break;
    case 'HERO': requireState('launch','hero'); s.state='hero'; s.accepting=false; break;
    case 'EMERGENCY': if(String(payload.reason||'').trim().length<8)throw new ShowError('Tuliskan alasan emergency minimal 8 karakter.'); s.state='hero'; s.accepting=false; s.early=energy(s)<95; s.launchAt=null; break;
    case 'RESET': {if(s.mode!=='rehearsal')throw new ShowError('Reset hanya tersedia di rehearsal.');const revision=s.revision;Object.assign(s,createSession(s.id,s.mode,{...config,target:s.target}));s.revision=revision;break;}
    case 'TARGET': requireState('holding'); if(s.contributions.length)throw new ShowError('Target dikunci setelah kontribusi pertama.'); if(!Number.isInteger(payload.target)||payload.target<30||payload.target>100)throw new ShowError('Target harus 30–100.',400); s.target=payload.target; break;
    default: throw new ShowError('Cue tidak dikenal.',400);
  }
}
