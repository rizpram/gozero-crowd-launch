import http from 'node:http';
import {readFileSync,writeFileSync,existsSync,mkdirSync,renameSync,appendFileSync} from 'node:fs';
import {join,resolve,extname,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes,createHmac,timingSafeEqual,scryptSync} from 'node:crypto';
import QRCode from 'qrcode';
import {mediaStore} from './media.mjs';
import {createSession,energy,contribute,action,ShowError} from './engine.mjs';
const ROOT=dirname(fileURLToPath(import.meta.url));
export function makeApp(options={}) {
  const config={...JSON.parse(readFileSync(join(ROOT,'event.config.json'))),...options.config};
  if(!Number.isInteger(config.target)||config.target<30||config.target>100) throw Error('Invalid target');
  if(process.env.RAILWAY_ENVIRONMENT_ID && !process.env.RAILWAY_VOLUME_MOUNT_PATH && !options.dataDir)throw Error('Attach a persistent Railway volume before starting the show.');
  const data=resolve(options.dataDir||process.env.RAILWAY_VOLUME_MOUNT_PATH||process.env.DATA_DIR||join(ROOT,'data'));
  mkdirSync(data,{recursive:true});
  const media=mediaStore(data);let mediaUploading=false;
  const showConfig=()=>({...config,media:{...media.config(),brandReady:true},logo:media.config().brandUrl||config.logo});
  const production=options.production??process.env.NODE_ENV==='production';
  const password=options.password||process.env.OPERATOR_PASSWORD||(production?'':'gozero-rehearsal');
  if(!password || (production && (password.length<16||password==='gozero-rehearsal')))throw Error('Production requires OPERATOR_PASSWORD of at least 16 characters.');
  const publicUrl=options.publicUrl||process.env.PUBLIC_URL||(process.env.RAILWAY_PUBLIC_DOMAIN?`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`:'');
  if(production && !/^https:\/\//.test(publicUrl))throw Error('Production requires PUBLIC_URL=https://your-host');
  const enableLive=options.enableLive??process.env.ENABLE_LIVE==='1';
  const keyFile=join(data,'secret');
  const key=existsSync(keyFile)?readFileSync(keyFile):randomBytes(32);
  if(!existsSync(keyFile))writeFileSync(keyFile,key,{mode:0o600});
  const hmac=x=>createHmac('sha256',key).update(x).digest('hex');
  const snapshot=join(data,'sessions.json');
  const sessions=existsSync(snapshot)?JSON.parse(readFileSync(snapshot)):{};
  for(const [id,mode] of [['rehearsal','rehearsal'],...(enableLive?[['live','live']]:[])]) if(!sessions[id])sessions[id]=createSession(id,mode,config);
  if(!enableLive)delete sessions.live;
  const persist=()=>{ const tmp=snapshot+'.tmp'; writeFileSync(tmp,JSON.stringify(sessions),{mode:0o600});renameSync(tmp,snapshot); };
  persist();
  const clients=new Set(), operators=new Map(), rates=new Map(), leds=new Map();
  const salt=randomBytes(16), expected=scryptSync(password,salt,32);
  const cookies=req=>Object.fromEntries((req.headers.cookie||'').split(';').map(x=>x.trim().split('=')));
  const signed=v=>v+'.'+hmac(v);
  const verify=v=>{ if(!v||v.length>300)return null;const i=v.lastIndexOf('.');if(i<1)return null;const val=v.slice(0,i),sig=v.slice(i+1);return /^[a-f0-9]{64}$/.test(sig)&&timingSafeEqual(Buffer.from(sig),Buffer.from(hmac(val)))?val:null; };
  const authorized=req=>{const id=verify(cookies(req).gz_operator);return !!(id&&operators.get(id)>Date.now());};
  const vipAuthorized=(req,s)=>{const value=verify(cookies(req)['gz_vip_'+s.id]);return !!(s.vip && s.vip.epoch===s.epoch && s.vip.expiresAt>Date.now() && value===s.vip.browser);};
  const identity=(req,res)=>{let id=verify(cookies(req).gz_device);if(!id){id=randomBytes(24).toString('hex');res.setHeader('Set-Cookie',`gz_device=${signed(id)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${production?'; Secure':''}`);}return hmac(id);};
  const audit=(s,event,detail={})=>appendFileSync(join(data,'audit.ndjson'),JSON.stringify({at:new Date().toISOString(),session:s.id,mode:s.mode,epoch:s.epoch,event,revision:s.revision,...detail})+'\n',{mode:0o600});
  const publicState=s=>({id:s.id,mode:s.mode,epoch:s.epoch,state:s.state,accepting:s.accepting,target:s.target,count:s.contributions.length,energy:energy(s),early:s.early,launchAt:s.launchAt,ceremonyAt:s.ceremonyAt||null,ceremonyFrom:s.ceremonyFrom??energy(s),revision:s.revision,updatedAt:s.updatedAt,serverTime:Date.now(),config:showConfig()});
  const stats=s=>({connectedParticipants:new Set([...clients].filter(c=>c.id===s.id&&c.role==='participant').map(c=>c.identity)).size,leds:[...leds.values()].filter(l=>l.session===s.id&&Date.now()-l.at<12000)});
  const broadcast=s=>{for(const c of clients)if(c.id===s.id)c.res.write(`data: ${JSON.stringify(publicState(s))}\n\n`);};
  const finish=s=>{s.revision++;s.updatedAt=Date.now();persist();broadcast(s);};
  const rate=(req,tag,max)=>{const k=req.socket.remoteAddress+':'+tag,t=Date.now(),r=rates.get(k)||{n:0,until:t+60000};if(t>r.until){r.n=0;r.until=t+60000;}r.n++;rates.set(k,r);if(r.n>max)throw new ShowError('Terlalu banyak permintaan. Coba lagi sebentar.',429);};
  const body=async req=>{let str='';for await(const chunk of req){str+=chunk;if(str.length>4096)throw new ShowError('Request too large',413);}try{return JSON.parse(str||'{}');}catch{throw new ShowError('Invalid JSON',400);}};
  const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
  const server=http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','SAMEORIGIN');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self'; connect-src 'self'; frame-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'");
    try{
      const url=new URL(req.url,'http://localhost');
      if(req.method==='POST'){
        const expectedOrigin=publicUrl?new URL(publicUrl).origin:`http://${req.headers.host}`;
        if(req.headers.origin!==expectedOrigin)throw new ShowError('Origin tidak diizinkan.',403);
        if(!/^\/api\/media\/(brand|video)$/.test(url.pathname)&&!String(req.headers['content-type']).startsWith('application/json'))throw new ShowError('JSON required',415);
      }
      const asset=url.pathname.match(/^\/media\/(brand|video)$/);
      if(asset&&['GET','HEAD'].includes(req.method))return media.serve(req,res,asset[1]);
      const upload=url.pathname.match(/^\/api\/media\/(brand|video)$/);
      if(upload&&req.method==='POST'){
        if(!authorized(req))throw new ShowError('Login operator diperlukan.',401);
        if(Object.values(sessions).some(s=>['vip','launch','lock'].includes(s.state)))throw new ShowError('Ubah aset sebelum cue VIP atau aktivasi.');
        if(mediaUploading)throw new ShowError('Unggahan lain sedang berlangsung.');rate(req,'media-upload',12);mediaUploading=true;try{const result=await media.upload(req,upload[1]);for(const s of Object.values(sessions)){audit(s,'MEDIA_UPDATED',{kind:upload[1]});broadcast(s);}return json(res,200,result);}finally{mediaUploading=false;}
      }
      if(url.pathname==='/health')return json(res,200,{ok:true});
      if(url.pathname==='/api/login'&&req.method==='POST'){
        rate(req,'login',10);const b=await body(req);const candidate=scryptSync(String(b.password||'').slice(0,256),salt,32);
        if(!timingSafeEqual(candidate,expected))throw new ShowError('Password operator tidak sesuai.',401);
        const token=randomBytes(24).toString('hex');operators.set(token,Date.now()+8*3600000);
        res.setHeader('Set-Cookie',`gz_operator=${signed(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${production?'; Secure':''}`);return json(res,200,{ok:true});
      }
      if(url.pathname==='/api/logout'&&req.method==='POST'){
        operators.delete(verify(cookies(req).gz_operator));res.setHeader('Set-Cookie','gz_operator=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return json(res,200,{ok:true});
      }
      if(url.pathname==='/api/operator'){
        if(!authorized(req))throw new ShowError('Login operator diperlukan.',401);
        const s=sessions[url.searchParams.get('session')||'rehearsal'];if(!s)throw new ShowError('Sesi tidak tersedia.',404);
        const log=existsSync(join(data,'audit.ndjson'))?readFileSync(join(data,'audit.ndjson'),'utf8').trim().split('\n').slice(-300).filter(Boolean).map(JSON.parse).filter(x=>x.session===s.id).slice(-50).reverse():[];
        return json(res,200,{...publicState(s),...stats(s),vipStatus:!s.vip||s.vip.expiresAt<Date.now()?'unpaired':s.vip.browser?'paired':'link-created',log,sessions:Object.keys(sessions),publicUrl:publicUrl||`http://${req.headers.host}`});
      }
      const m=url.pathname.match(/^\/api\/(state|events|contribute|action|qr|led|vip-pair|vip-access|vip-status|vip-launch|vip-revoke)\/([a-z0-9-]+)$/);
      if(m){
        const [,type,id]=m,s=sessions[id];if(!s)throw new ShowError('Sesi tidak tersedia.',404);
        if(type==='vip-pair'&&req.method==='POST'){
          if(!authorized(req))throw new ShowError('Login operator diperlukan.',401);
          if(['launch','hero'].includes(s.state))throw new ShowError('Launching telah berlangsung.');
          await body(req);const token=randomBytes(32).toString('base64url');
          s.vip={tokenHash:hmac(token),epoch:s.epoch,expiresAt:Date.now()+8*3600000,browser:null};
          audit(s,'VIP_LINK_CREATED');persist();broadcast(s);
          const link=(publicUrl||`http://${req.headers.host}`)+`/vip/${s.id}#token=${token}`;
          const qr=await QRCode.toDataURL(link,{width:360,margin:3,errorCorrectionLevel:'M'});
          return json(res,200,{url:link,qr,expiresAt:s.vip.expiresAt});
        }
        if(type==='vip-revoke'&&req.method==='POST'){
          if(!authorized(req))throw new ShowError('Login operator diperlukan.',401);
          await body(req);s.vip=null;audit(s,'VIP_ACCESS_REVOKED');persist();broadcast(s);return json(res,200,{ok:true});
        }
        if(type==='vip-access'&&req.method==='POST'){
          rate(req,'vip-access',20);const b=await body(req);
          if(!s.vip||s.vip.epoch!==s.epoch||s.vip.expiresAt<Date.now()||typeof b.token!=='string'||b.token.length>128||hmac(b.token)!==s.vip.tokenHash)throw new ShowError('Link VIP tidak valid atau kedaluwarsa. Minta link baru dari operator.',401);
          if(s.vip.browser&&!vipAuthorized(req,s))throw new ShowError('Link ini sudah dipasangkan ke satu perangkat VIP.',403);
          if(!s.vip.browser){s.vip.browser=randomBytes(24).toString('hex');audit(s,'VIP_DEVICE_PAIRED');persist();broadcast(s);}
          res.setHeader('Set-Cookie',`gz_vip_${s.id}=${signed(s.vip.browser)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${production?'; Secure':''}`);
          return json(res,200,{ok:true,...publicState(s)});
        }
        if(type==='vip-status'&&req.method==='GET'){
          if(!vipAuthorized(req,s))throw new ShowError('Akses VIP belum dipasangkan. Minta QR khusus dari operator.',401);
          return json(res,200,publicState(s));
        }
        if(type==='vip-launch'&&req.method==='POST'){
          if(!vipAuthorized(req,s))throw new ShowError('Akses VIP tidak valid. Hubungi operator.',401);
          rate(req,'vip-launch',30);const b=await body(req);
          if(b.epoch!==s.epoch)throw new ShowError('Sesi telah diperbarui.');
          if(b.gesture!=='slide-complete')throw new ShowError('Selesaikan gerakan geser.',400);
          if(['launch','hero'].includes(s.state))return json(res,200,{...publicState(s),duplicate:true});
          action(s,'LAUNCH',{confirm:true},config);audit(s,'VIP_SLIDE_LAUNCH',{actor:'paired-vip',early:s.early,count:s.contributions.length,energy:energy(s)});finish(s);
          return json(res,200,publicState(s));
        }
        if(type==='state'&&req.method==='GET'){const who=identity(req,res);return json(res,200,{...publicState(s),contributed:s.contributions.includes(hmac(s.epoch+who))});}
        if(type==='events'&&req.method==='GET'){
          const who=identity(req,res);if(clients.size>=500)throw new ShowError('Kapasitas koneksi penuh.',503);
          res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});
          const c={id,res,identity:who,role:url.searchParams.get('role')==='participant'?'participant':'screen'};clients.add(c);
          res.write(`retry: 1500\ndata: ${JSON.stringify(publicState(s))}\n\n`);req.on('close',()=>clients.delete(c));return;
        }
        if(type==='qr'&&req.method==='GET'){
          const base=publicUrl||`http://${req.headers.host}`;
          const svg=await QRCode.toString(`${base}/join/${s.id}`,{type:'svg',errorCorrectionLevel:'M',margin:4,width:480,color:{dark:'#082C46',light:'#ffffff'}});
          res.writeHead(200,{'Content-Type':'image/svg+xml','Cache-Control':'no-store'});return res.end(svg);
        }
        if(type==='contribute'&&req.method==='POST'){
          rate(req,'contribute',240);const b=await body(req);if(b.epoch!==s.epoch)throw new ShowError('Sesi diperbarui. Muat ulang halaman.');
          const who=hmac(s.epoch+identity(req,res)),accepted=contribute(s,who,config);
          if(accepted){audit(s,'CONTRIBUTION',{count:s.contributions.length});finish(s);}return json(res,200,{...publicState(s),contributed:true,duplicate:!accepted});
        }
        if(type==='action'&&req.method==='POST'){
          if(!authorized(req))throw new ShowError('Login operator diperlukan.',401);
          if(mediaUploading)throw new ShowError('Tunggu unggahan aset selesai.');const b=await body(req);if(b.revision!==s.revision)throw new ShowError('State telah berubah. Periksa cue dan ulangi.');
          const before=s.state;action(s,b.action,b,config);audit(s,b.action,{before,after:s.state,reason:String(b.reason||'').slice(0,300),early:s.early,count:s.contributions.length,energy:energy(s)});finish(s);return json(res,200,publicState(s));
        }
        if(type==='led'&&req.method==='POST'){
          rate(req,'led',240);const b=await body(req);if(!/^[a-f0-9-]{36}$/.test(b.id))throw new ShowError('Invalid screen ID',400);
          if(leds.size>500)leds.clear();leds.set(b.id,{id:b.id,session:s.id,at:Date.now(),state:s.state,audio:b.audio===true,assets:b.assets===true,videoReady:b.videoReady===true,visible:b.visible===true});return json(res,200,{ok:true});
        }
        throw new ShowError('Method not allowed',405);
      }
      if(req.method!=='GET')throw new ShowError('Not found',404);
      let file=url.pathname==='/'||/^\/(operator|join\/[a-z0-9-]+|led\/[a-z0-9-]+|vip\/[a-z0-9-]+)$/.test(url.pathname)?'index.html':decodeURIComponent(url.pathname).slice(1);
      if(!['index.html','app.js','led.js','vip.js','sound.js','show-flow.js','style.css','revision.css','logo.png','brand-kv.png','logo-reverse.png','launch.wav','audio/ambient.wav','audio/reveal.wav',...Array.from({length:11},(_,i)=>`audio/count-${i}.wav`)].includes(file))throw new ShowError('Not found',404);
      const bytes=readFileSync(join(ROOT,'public',file));
      const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.wav':'audio/wav'};
      res.writeHead(200,{'Content-Type':mime[extname(file)],'Cache-Control':'no-cache'});res.end(bytes);
    }catch(e){if(!res.headersSent)json(res,e.status||500,{error:e.status?e.message:'Kesalahan server. Periksa log lokal.'});else res.end();if(!e.status)console.error(e.message);}
  });
  const timer=setInterval(()=>{const now=Date.now();for(const s of Object.values(sessions))if(s.state==='launch'&&now>=s.launchAt+(config.countdownSeconds+config.launchDuration)*1000){s.state='hero';audit(s,'AUTO_HERO');finish(s);}for(const c of clients)c.res.write(': heartbeat\n\n');for(const [k,v]of operators)if(v<now)operators.delete(k);for(const[k,v]of rates)if(v.until<now)rates.delete(k);for(const[k,v]of leds)if(now-v.at>60000)leds.delete(k);},1000);
  timer.unref();
  server.on('close',()=>clearInterval(timer));
  return {server,sessions,close:()=>{for(const c of clients)c.res.end();server.close();clearInterval(timer);}};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const app=makeApp(),{server}=app;const host=process.env.HOST||'127.0.0.1',port=Number(process.env.PORT||3100);
  server.listen(port,host,()=>console.log(`GoZero launch running: http://${host}:${port}\nOperator: /operator · LED: /led/rehearsal · Participants: /join/rehearsal`));
  const shutdown=()=>{app.close();setTimeout(()=>process.exit(0),5000).unref();};
  process.once('SIGTERM',shutdown);process.once('SIGINT',shutdown);
}
