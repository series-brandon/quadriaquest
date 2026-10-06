import {bootstrapDelta,round} from './stats.mjs';
const LOWER_IS_BETTER_COUNTERS=['draws','objects','visibleMeshes','programs','geometries','textures','uploadsPerFrame','uploadKBPerFrame','textureUploadsPerFrame','programSwitchesPerFrame','mutationsPerSec','layoutsPerSec'];
const pct=n=>`${n>=0?'+':''}${(n*100).toFixed(1)}%`;

// Gate one environment's results. FAIL: budgets, targets, leaks, unexplained counter growth.
// WARN: statistically significant timing/CPU regressions against the stored baseline.
export function evaluate({envName,env,results,baseline,budgets,calibrationMs,scenarios=[]}){
 const d=budgets.defaults,rows=[];
 // Machine-speed ratio vs the baseline session, clamped; scales baseline frame times (not CPU %, fps or counters).
 const speed=baseline?.meta?.calibrationMs&&calibrationMs?Math.min(1.6,Math.max(.6,calibrationMs/baseline.meta.calibrationMs)):1;
 for(const r of results){
  const issues=[],notes=[],s=r.summary,base=baseline?.scenarios?.[r.scenario];
  const budget={...budgets.budgets?.['*']?.[r.scenario],...budgets.budgets?.[envName]?.[r.scenario]};
  for(const [key,limit] of Object.entries(budget)){const value=s.counters[key]??s.timing[key];if(value!=null&&value>limit)issues.push({level:'FAIL',text:`${key} ${round(value,1)} exceeds budget ${limit}`});}
  const target=budgets.targets?.[envName]?.[r.scenario];
  if(target?.minFps&&!env.countersOnly&&s.timing.fps<target.minFps)issues.push({level:'FAIL',text:`fps ${round(s.timing.fps,1)} below target ${target.minFps}`});
  if(r.leak){const steady=r.leak.slice(1);for(const key of ['objects','geometries','textures','programs'])if(new Set(steady.map(c=>c[key])).size>1)issues.push({level:'FAIL',text:`${key} changed across travel cycles: ${steady.map(c=>c[key]).join(' → ')}`});
   const heap=steady.map(c=>c.heapMB).filter(v=>v!=null);if(heap.length>1&&heap.at(-1)-heap[0]>d.heapGrowthMB)issues.push({level:'FAIL',text:`heap grew ${round(heap.at(-1)-heap[0],2)} MB across travel cycles`});}
  if(r.errors?.length)issues.push({level:'FAIL',text:`${r.errors.length} page error(s): ${r.errors[0]}`});
  if(base){
   for(const key of LOWER_IS_BETTER_COUNTERS){const value=s.counters[key],was=base.summary.counters[key];if(value==null||was==null)continue;
    // Per-second rates move with frame rate and timers, so they get a looser tolerance than per-frame counts.
    const tolerance=key.endsWith('PerSec')?d.rateTolerance:d.counterTolerance;
    // Stochastic scenarios (combat: hits, misses, defeats) report DOM/layout rates without gating them.
    if(key.endsWith('PerSec')&&scenarios.find(x=>x.id===r.scenario)?.stochastic){if(value>was*(1+tolerance)+d.counterSlack)notes.push(`${key} ${round(value,1)} vs baseline ${round(was,1)} (stochastic scenario, not gated)`);continue;}
    if(value>was*(1+tolerance)+d.counterSlack)issues.push({level:'FAIL',text:`${key} ${round(value,1)} vs baseline ${round(was,1)} (${pct((value-was)/(was||1))})`});
    else if(value<was*(1-tolerance)-d.counterSlack)notes.push(`${key} improved ${round(was,1)} → ${round(value,1)}`);}
   if(!env.countersOnly){
    for(const [key,tolerance,higherIsWorse] of [['frameMs',d.medianTolerance,true],['frameP95',d.p95Tolerance,true],['cpuPercent',d.cpuTolerance,true],['fps',d.fpsTolerance,false]]){
     const scale=key.startsWith('frame')?speed:1,a=base.samples.map(x=>x[key]*scale).filter(Number.isFinite),b=r.samples.map(x=>x[key]).filter(Number.isFinite),ci=bootstrapDelta(a,b);if(!ci)continue;
     const worse=higherIsWorse?ci.relative>tolerance&&ci.low>0:ci.relative<-tolerance&&ci.high<0;
     const better=higherIsWorse?ci.relative<-tolerance&&ci.high<0:ci.relative>tolerance&&ci.low>0;
     if(worse)issues.push({level:'WARN',text:`${key} ${pct(ci.relative)} (95% CI ${pct(ci.low)}…${pct(ci.high)})`});else if(better)notes.push(`${key} improved ${pct(ci.relative)}`);
    }
   }
  }
  const status=issues.some(i=>i.level==='FAIL')?'FAIL':issues.length?'WARN':'PASS';
  rows.push({scenario:r.scenario,status,issues,notes,diagnosis:status==='PASS'?null:diagnose(r,base)});
 }
 return rows;
}

// Where to look first: loop phases that grew, scene contents that changed, hottest functions.
export function diagnose(r,base){
 const out={};
 if(base){
  out.sections=Object.entries(r.summary.sections).map(([k,v])=>[k,round(v-(base.summary.sections[k]||0))]).filter(([,v])=>Math.abs(v)>=.02).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const delta=(now={},was={})=>Object.entries({...was,...now}).map(([k])=>[k,(now[k]||0)-(was[k]||0)]).filter(([,v])=>v).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1])).slice(0,8);
  out.byGroup=delta(r.census.byGroup,base.census?.byGroup);out.byKind=delta(r.census.byKind,base.census?.byKind);
 }
 if(r.top)out.hotFunctions=r.top.slice(0,10);
 return out;
}

export function formatTable(envName,results,rows){
 const lines=[`\n## ${envName}`,'','| scenario | status | frame ms (p95) | fps | browser CPU % | draws | objects | top phases |','|---|---|---|---|---|---|---|---|'];
 for(const r of results){const s=r.summary,row=rows.find(x=>x.scenario===r.scenario),phases=Object.entries(s.sections).slice(0,3).map(([k,v])=>`${k} ${v.toFixed(2)}`).join(', ');
  lines.push(`| ${r.scenario} | ${row?.status??'—'} | ${s.timing.frameMs?.toFixed(2)} (${s.timing.frameP95?.toFixed(2)}) | ${s.timing.fps?.toFixed(1)} | ${s.timing.cpuPercent?.toFixed(0)??'—'} | ${Math.round(s.counters.draws)} | ${s.counters.objects} | ${phases} |`);}
 for(const row of rows){
  if(row.issues.length||row.notes.length)lines.push('',`**${row.scenario}** — ${row.status}`,...row.issues.map(i=>`- ${i.level}: ${i.text}`),...row.notes.map(n=>`- note: ${n}`));
  const g=row.diagnosis;if(!g)continue;
  if(g.sections?.length)lines.push(`- phase change (ms/frame): ${g.sections.map(([k,v])=>`${k} ${v>0?'+':''}${v}`).join(', ')}`);
  if(g.byGroup?.length)lines.push(`- objects by group: ${g.byGroup.map(([k,v])=>`${k} ${v>0?'+':''}${v}`).join(', ')}`);
  if(g.byKind?.length)lines.push(`- visible meshes by kind: ${g.byKind.map(([k,v])=>`${k} ${v>0?'+':''}${v}`).join(', ')}`);
  if(g.hotFunctions?.length)lines.push(`- hottest functions: ${g.hotFunctions.map(f=>`${f.fn} ${f.ms}ms`).join('; ')}`);
 }
 return lines.join('\n');
}
