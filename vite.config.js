import {defineConfig} from 'vite';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {cp, readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

// Dev logs (public/dev-logs) are served by `npm run dev` only; they deploy as their own site
// (dist-dev-logs). Vite's SPA fallback otherwise serves the game for their directory URLs.
function devLogDirectories(){
  const install=server=>{server.middlewares.use((req,res,next)=>{
    const url=new URL(req.url,'http://localhost');
    if(url.pathname==='/dev-logs'||url.pathname.startsWith('/dev-logs/')){
      const pathname=url.pathname.replace(/\/$/,'');
      const file=fileURLToPath(new URL(`./public${pathname}/index.html`,import.meta.url));
      if(existsSync(file)){
        req.url=`${pathname}/index.html${url.search}`;
      }
    }
    next();
  });};
  return {name:'dev-log-directories',configureServer:install};
}

// Builds copy public/ except the dev logs: RUN needs public/thumbnail.jpg in dist.
function gamePublicAssets(){
  let config;
  return {
    name:'game-public-assets',
    apply:'build',
    configResolved(value){config=value;},
    async closeBundle(){
      if(!config.publicDir||!existsSync(config.publicDir))return;
      const output=resolve(config.root,config.build.outDir);
      for(const entry of await readdir(config.publicDir)){
        if(entry==='dev-logs')continue;
        await cp(resolve(config.publicDir,entry),resolve(output,entry),{recursive:true});
      }
    }
  };
}

// World editor saving (playground dev server only, docs/CITY.md Authoring): POST /__map-save
// {id, json, kind} writes src/maps/<id>.json (kind 'stamp': src/stamps/<id>.json; kind 'palette', a colour preset: src/palettes/<id>.json). Builds never include it (configureServer runs only in dev).
function mapSave(){
  return {name:'map-save',configureServer(server){server.middlewares.use('/__map-save',(req,res)=>{
    const reply=(code,body)=>{res.statusCode=code;res.setHeader('content-type','application/json');res.end(JSON.stringify(body));};
    if(req.method!=='POST')return reply(405,{error:'POST only'});
    let body='';req.on('data',chunk=>{body+=chunk;if(body.length>8e6)req.destroy();});
    req.on('end',()=>{try{const {id,json,kind}=JSON.parse(body);if(!/^[a-z0-9][a-z0-9-]{0,40}$/.test(id))return reply(400,{error:'bad id'});JSON.parse(json);
      // kind 'stamp' or 'palette': the editor's stamps and colour presets; otherwise a map.
      const folder=kind==='stamp'?'stamps':kind==='palette'?'palettes':'maps',dir=fileURLToPath(new URL(`./src/${folder}/`,import.meta.url));mkdirSync(dir,{recursive:true});writeFileSync(dir+id+'.json',json+'\n');reply(200,{path:`src/${folder}/${id}.json`});}
    catch(error){reply(400,{error:error.message});}});
  });}};
}
export default defineConfig(({mode})=>({
  plugins:[devLogDirectories(),gamePublicAssets(),...(mode==='playground'?[mapSave()]:[])],
  base:'./',
  define:{__PLAYGROUND__:JSON.stringify(mode==='playground')},
  // A stamp or colour preset saved from the editor must not reload the page (and lose the map being edited); the
  // editor keeps it for the session, and the next server start picks it up.
  server:{watch:{ignored:['**/src/stamps/**','**/src/palettes/**']}},
  build:{outDir:mode==='playground'?'dist-playground':'dist',copyPublicDir:false}
}));
