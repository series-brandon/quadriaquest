import {spawn} from 'node:child_process';import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
// Run against the development playground. A single browser is bounded to 65 seconds.
const mode=process.argv.includes('--software')?'software':'hardware';
const url=process.argv.find(arg=>/^https?:/.test(arg))||'http://127.0.0.1:5174';
const port=Number(process.env.PROFILE_PORT||9361);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('PROFILE_PORT must be a port from 1024 to 65535');
let occupied=false;try{await fetch(`http://127.0.0.1:${port}/json/version`);occupied=true;}catch{}
if(occupied)throw Error(`Port ${port} is already serving a browser; choose a different PROFILE_PORT`);
const output=await fs.mkdtemp(path.join(os.tmpdir(),'quadria-profile-'));
console.log('Profiles:',output);
const browser=spawn(process.env.CHROME_BIN||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new',`--remote-debugging-port=${port}`,`--user-data-dir=${path.join(output,"browser")}`,'--no-first-run','--no-default-browser-check','--window-size=1200,850',...(mode==='software'?['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']:[]),'about:blank'],{stdio:'ignore'});
const wait=ms=>new Promise(r=>setTimeout(r,ms));let ws;let id=0;const pending=new Map();
const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});
const run=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
const stop=()=>{browser.kill('SIGTERM');ws?.close();for(const p of pending.values())p.reject(new Error('Profiling browser closed'));pending.clear();};
const watchdog=setTimeout(stop,65000);
process.once('SIGINT',stop);process.once('SIGTERM',stop);
let launchError;browser.on('error',error=>{launchError=error;stop();});
try{
 let targets;for(let i=0;i<60;i++){try{targets=await(await fetch(`http://127.0.0.1:${port}/json`)).json();break;}catch{await wait(150);}}
 if(launchError)throw launchError;if(!targets)throw Error('Chrome debugging endpoint did not start');
 ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}};
 await send('Page.enable');await send('Runtime.enable');await send('Performance.enable');await send('Profiler.enable');await send('Profiler.setSamplingInterval',{interval:1000});await send('Page.navigate',{url});await wait(2000);
 for(let i=0;i<50&&!await run('!!window.quadriaquest');i++)await wait(100);
 if(!await run('!!window.quadriaquest'))throw Error('This profiler requires a running playground build');
 await run(`document.getElementById('dev-command-reset').value='3';document.querySelector('[data-command="reset"]').click()`);await wait(500);
 console.log('renderer',await run(`(()=>{const gl=document.querySelector('#game canvas').getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)})()`));
 for(const tab of mode==='software'?['quests']:['quests','inventory','skills','combat-styles']){
 await run(`document.getElementById('open-${tab}').click()`);await wait(200);
 await run(`window.perfCounts={frames:0,mutations:0,targets:{}};window.perfObserver=new MutationObserver(ms=>{perfCounts.mutations+=ms.length;for(const m of ms){const key=m.target.id||m.target.parentElement?.id||m.target.tagName;perfCounts.targets[key]=(perfCounts.targets[key]||0)+1;}});perfObserver.observe(document.getElementById('game-menus'),{subtree:true,attributes:true,childList:true});window.perfRunning=true;requestAnimationFrame(function count(){perfCounts.frames++;if(perfRunning)requestAnimationFrame(count)})`);
 const before=(await send('Performance.getMetrics')).metrics;await send('Profiler.start');await wait(4000);const {profile}=await send('Profiler.stop');const after=(await send('Performance.getMetrics')).metrics;
 const delta=Object.fromEntries(after.filter(x=>['TaskDuration','ScriptDuration','LayoutDuration','RecalcStyleDuration','JSHeapUsedSize'].includes(x.name)).map(x=>[x.name,x.value-(before.find(b=>b.name===x.name)?.value||0)]));
 if(!await run(`typeof perfObserver!=='undefined'`))throw Error('The page reloaded during profiling. Stop source edits/builds and rerun against a stable playground server.');
 const counts=await run(`perfRunning=false;perfObserver.disconnect();perfCounts`);counts.targets=Object.entries(counts.targets).sort((a,b)=>b[1]-a[1]).slice(0,8);
 const times=new Map();profile.samples?.forEach((n,i)=>times.set(n,(times.get(n)||0)+profile.timeDeltas[i]));const top=[...times].sort((a,b)=>b[1]-a[1]).slice(0,12).map(([id,t])=>{const f=profile.nodes.find(n=>n.id===id).callFrame;return {fn:f.functionName,url:f.url.split('/').at(-1),ms:Math.round(t/1000)}});
 console.log(JSON.stringify({mode,tab,delta,counts,top}));await fs.writeFile(path.join(output,`${mode}-${tab}.cpuprofile`),JSON.stringify(profile));
 }
 await send('Page.navigate',{url:'about:blank'});
}finally{clearTimeout(watchdog);ws?.close();browser.kill('SIGTERM');await wait(300);if(browser.exitCode===null)browser.kill('SIGKILL');await fs.rm(path.join(output,'browser'),{recursive:true,force:true,maxRetries:3});}
