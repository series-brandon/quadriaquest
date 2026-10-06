import {spawn} from 'node:child_process';import path from 'node:path';
// Perf builds are playground builds without minification so CPU profiles keep function names.
export function buildPlayground(projectRoot,outDir,{viteRoot=projectRoot}={}){
 const vite=path.join(viteRoot,'node_modules/.bin/vite');
 return new Promise((resolve,reject)=>{
  const child=spawn(vite,['build','--mode','playground','--outDir',outDir,'--emptyOutDir','--minify','false','--logLevel','error'],{cwd:projectRoot,stdio:['ignore','ignore','inherit']});
  child.on('error',reject);child.on('exit',code=>code===0?resolve(outDir):reject(Error(`Playground build failed in ${projectRoot} (exit ${code})`)));
 });
}
