import {defineConfig} from 'vite';
export default defineConfig(({mode})=>({
  define:{__PLAYGROUND__:JSON.stringify(mode==='playground')},
  build:{outDir:mode==='playground'?'dist-playground':'dist'}
}));
