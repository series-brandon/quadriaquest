import {defineConfig} from 'vite';
import {existsSync} from 'node:fs';
import {cp, readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

// Vite's SPA fallback otherwise serves the game for public directory URLs.
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

// Keep local editorial content out of game builds while retaining other public assets.
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
export default defineConfig(({mode})=>({
  plugins:[devLogDirectories(),gamePublicAssets()],
  base:'./',
  define:{__PLAYGROUND__:JSON.stringify(mode==='playground')},
  build:{outDir:mode==='playground'?'dist-playground':'dist',copyPublicDir:false}
}));
