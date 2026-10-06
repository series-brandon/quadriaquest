import http from 'node:http';import {readFile,stat} from 'node:fs/promises';import path from 'node:path';
const TYPES={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.json':'application/json','.woff2':'font/woff2','.ico':'image/x-icon','.webp':'image/webp','.mp3':'audio/mpeg'};
// Cross-origin isolation gives performance.now() microsecond resolution instead of 100 µs steps.
const ISOLATION={'cross-origin-opener-policy':'same-origin','cross-origin-embedder-policy':'credentialless'};
// Minimal in-process static server for a built playground (no dev server, HMR or reloads during runs).
export async function serve(root){
 const server=http.createServer(async(req,res)=>{
  try{let file=path.join(root,decodeURIComponent(new URL(req.url,'http://x').pathname));if(!file.startsWith(root))throw Error('outside root');
   if(!(await stat(file).catch(()=>null))?.isFile())file=path.join(root,'index.html');
   res.writeHead(200,{'content-type':TYPES[path.extname(file)]||'application/octet-stream','cache-control':'no-store',...ISOLATION});res.end(await readFile(file));}
  catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 return {url:`http://127.0.0.1:${server.address().port}/`,close:()=>new Promise(r=>server.close(r))};
}
