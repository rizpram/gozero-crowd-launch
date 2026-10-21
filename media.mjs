import {existsSync,readFileSync,writeFileSync,mkdirSync,renameSync,statSync,createReadStream} from 'node:fs';
import {open,unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {ShowError} from './engine.mjs';
export function mediaStore(data){
 const dir=join(data,'media');mkdirSync(dir,{recursive:true});const index=join(dir,'index.json');
 let metadata=existsSync(index)?JSON.parse(readFileSync(index,'utf8')):{};
 const config=()=>({brandReady:!!metadata.brand,version:metadata.brand?.file||'',brandUrl:metadata.brand?'/media/brand?v='+metadata.brand.file:null});
 async function upload(req,kind){
  const type=String(req.headers['content-type']||'').split(';')[0],allowed=['image/png','image/jpeg','image/webp'];
  if(!allowed.includes(type))throw new ShowError('Format file tidak didukung.',415);
  const limit=10*1024*1024;
  if(Number(req.headers['content-length'])>limit)throw new ShowError('Ukuran file melebihi batas.',413);
  const file=randomUUID(),tmp=join(dir,file+'.tmp');let size=0,head=Buffer.alloc(0);const fd=await open(tmp,'wx');
  try{for await(const chunk of req){size+=chunk.length;if(size>limit)throw new ShowError('Ukuran file melebihi batas.',413);if(head.length<32)head=Buffer.concat([head,chunk]).subarray(0,32);let written=0;while(written<chunk.length){const result=await fd.write(chunk,written,chunk.length-written);if(!result.bytesWritten)throw Error('Write failed');written+=result.bytesWritten;}}await fd.close();
   const valid=type==='image/png'?head.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')):type==='image/jpeg'?head[0]===255&&head[1]===216&&head[2]===255:type==='image/webp'?head.toString('ascii',0,4)==='RIFF'&&head.toString('ascii',8,12)==='WEBP':false;
   if(!valid||!size)throw new ShowError('Isi file tidak cocok dengan formatnya.',415);
   renameSync(tmp,join(dir,file));const previous=metadata[kind]?.file;const next={...metadata,[kind]:{file,type,size}};writeFileSync(index+'.tmp',JSON.stringify(next));renameSync(index+'.tmp',index);metadata=next;if(previous)await unlink(join(dir,previous)).catch(()=>{});return config();
  }catch(e){await fd.close().catch(()=>{});await unlink(tmp).catch(()=>{});throw e;}
 }
 function serve(req,res,kind){const m=metadata[kind];if(!m)throw new ShowError('Aset belum diunggah.',404);const path=join(dir,m.file),size=statSync(path).size;let start=0,end=size-1,status=200;
  if(req.headers.range){const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);if(!match||(!match[1]&&!match[2])){res.writeHead(416,{'Content-Range':`bytes */${size}`});return res.end();}
   if(!match[1])start=Math.max(0,size-Number(match[2]));else{start=Number(match[1]);if(match[2])end=Math.min(end,Number(match[2]));}
   if(start>end||start>=size){res.writeHead(416,{'Content-Range':`bytes */${size}`});return res.end();}status=206;
  }
  res.writeHead(status,{'Content-Type':m.type,'Content-Length':end-start+1,'Accept-Ranges':'bytes','Cache-Control':'no-cache',...(status===206?{'Content-Range':`bytes ${start}-${end}/${size}`}:{})});
  if(req.method==='HEAD')return res.end();createReadStream(path,{start,end}).on('error',()=>res.destroy()).pipe(res);
 }
 return {config,upload,serve};
}
