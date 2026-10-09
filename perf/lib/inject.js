// Added to every perf page before game scripts run (Playwright addInitScript). It never ships in any
// build. Randomness is seeded so scenarios repeat, and WebGL, rAF, DOM and long-task activity is
// counted only while a measurement window is recording.
(()=>{
 if(window.__perf)return;
 let seed=0x2f6b1d;
 Math.random=()=>{seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
 const P=window.__perf={recording:false};
 function reset(){Object.assign(P,{frameTotals:[],intervals:[],currentStamp:null,currentTotal:0,draws:0,uploads:0,uploadBytes:0,textureUploads:0,programSwitches:0,mutations:0,longTasks:0,longTaskMs:0,started:performance.now()});}
 reset();
 const raf=window.requestAnimationFrame.bind(window);
 window.requestAnimationFrame=callback=>raf(stamp=>{
  if(!P.recording)return callback(stamp);
  if(stamp!==P.currentStamp){if(P.currentStamp!==null){P.frameTotals.push(P.currentTotal);P.intervals.push(stamp-P.currentStamp);}P.currentStamp=stamp;P.currentTotal=0;}
  const start=performance.now();try{return callback(stamp);}finally{P.currentTotal+=performance.now()-start;}
 });
 const bytes=value=>typeof value==='number'?value:value?.byteLength||0;
 for(const proto of [window.WebGL2RenderingContext?.prototype,window.WebGLRenderingContext?.prototype].filter(Boolean)){
  const wrap=(name,count)=>{const original=proto[name];if(!original)return;proto[name]=function(...args){if(P.recording)count(args);return original.apply(this,args);};};
  for(const name of ['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced','drawRangeElements'])wrap(name,()=>P.draws++);
  wrap('bufferData',args=>{P.uploads++;P.uploadBytes+=bytes(args[1]);});
  wrap('bufferSubData',args=>{P.uploads++;P.uploadBytes+=bytes(args[2]);});
  for(const name of ['texImage2D','texSubImage2D','texImage3D','texSubImage3D'])wrap(name,()=>P.textureUploads++);
  wrap('useProgram',()=>P.programSwitches++);
 }
 const observe=()=>new MutationObserver(records=>{if(P.recording)P.mutations+=records.length;}).observe(document.documentElement,{subtree:true,childList:true,attributes:true,characterData:true});
 if(document.documentElement)observe();else document.addEventListener('DOMContentLoaded',observe,{once:true});
 try{new PerformanceObserver(list=>{if(!P.recording)return;for(const e of list.getEntries()){P.longTasks++;P.longTaskMs+=e.duration;}}).observe({type:'longtask',buffered:false});}catch{}
 const quantile=(values,q)=>{if(!values.length)return 0;const s=[...values].sort((a,b)=>a-b);return s[Math.min(s.length-1,Math.floor(q*s.length))];};
 P.start=()=>{reset();P.recording=true;};
 P.stop=()=>{
  P.recording=false;const seconds=(performance.now()-P.started)/1000,frames=Math.max(1,P.frameTotals.length);
  return {seconds,frames:P.frameTotals.length,
   frameMs:{median:quantile(P.frameTotals,.5),p95:quantile(P.frameTotals,.95),max:Math.max(0,...P.frameTotals)},
   intervalMs:{median:quantile(P.intervals,.5),p95:quantile(P.intervals,.95),max:Math.max(0,...P.intervals)},
   fps:P.intervals.length/seconds,draws:P.draws/frames,uploads:P.uploads/frames,uploadKB:P.uploadBytes/1024/frames,textureUploads:P.textureUploads/frames,programSwitches:P.programSwitches/frames,
   mutationsPerSec:P.mutations/seconds,longTasks:P.longTasks,longTaskMs:P.longTaskMs,heapMB:performance.memory?performance.memory.usedJSHeapSize/1048576:null};
 };
})();
