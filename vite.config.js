import {defineConfig} from 'vite';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
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
// City editor saving (playground dev server only, docs/CITY.md Authoring): POST /__city-save
// {id, json} writes src/maps/<id>.json. Builds never include it (configureServer runs only in dev).
function citySave(){
  return {name:'city-save',configureServer(server){server.middlewares.use('/__city-save',(req,res)=>{
    const reply=(code,body)=>{res.statusCode=code;res.setHeader('content-type','application/json');res.end(JSON.stringify(body));};
    if(req.method!=='POST')return reply(405,{error:'POST only'});
    let body='';req.on('data',chunk=>{body+=chunk;if(body.length>8e6)req.destroy();});
    req.on('end',()=>{try{const {id,json}=JSON.parse(body);if(!/^[a-z0-9][a-z0-9-]{0,40}$/.test(id))return reply(400,{error:'bad city id'});JSON.parse(json);
      const dir=fileURLToPath(new URL('./src/maps/',import.meta.url));mkdirSync(dir,{recursive:true});writeFileSync(dir+id+'.json',json+'\n');reply(200,{path:`src/maps/${id}.json`});}
    catch(error){reply(400,{error:error.message});}});
  });}};
}
export default defineConfig(({command,mode})=>({
  plugins:[devLogDirectories(),...(mode==='playground'?[citySave()]:[])],
  // public/ holds only the dev logs, so builds skip it. Serve other static assets from elsewhere
  // (or exclude dev-logs explicitly) if public/ ever gains game files.
  publicDir:command==='serve'?'public':false,
  define:{__PLAYGROUND__:JSON.stringify(mode==='playground')},
  build:{outDir:mode==='playground'?'dist-playground':'dist'}
}));
