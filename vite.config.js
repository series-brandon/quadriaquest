import {defineConfig} from 'vite';
export default defineConfig(({mode})=>({
  base:'./',
  define:{__PLAYGROUND__:JSON.stringify(mode==='playground')},
  build:{outDir:mode==='playground'?'dist-playground':'dist'}
}));
