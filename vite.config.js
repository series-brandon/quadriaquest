import {defineConfig} from 'vite';
import {existsSync} from 'node:fs';
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
export default defineConfig(({command,mode})=>({
  plugins:[devLogDirectories()],
  // public/ holds only the dev logs, so builds skip it. Serve other static assets from elsewhere
  // (or exclude dev-logs explicitly) if public/ ever gains game files.
  publicDir:command==='serve'?'public':false,
  define:{__PLAYGROUND__:JSON.stringify(mode==='playground')},
  build:{outDir:mode==='playground'?'dist-playground':'dist'}
}));
