// Performance runner: `npm run perf` (quick, dev-gpu) / `npm run perf:full` (all local environments).
// Options: --env a,b  --scenarios a,b  --windows N  --window-ms N  --no-build  --profile  --no-diagnose
//          --no-gate  --update-baseline --note "why"
import {mkdir,writeFile,readFile} from 'node:fs/promises';import path from 'node:path';import {execFileSync} from 'node:child_process';
import {ENVIRONMENTS,QUICK_ENVIRONMENTS,FULL_ENVIRONMENTS} from './lib/environments.mjs';
import {openEnvironment,runScenario,calibrate} from './lib/session.mjs';
import {serve} from './lib/serve.mjs';import {buildPlayground} from './lib/build.mjs';
import {evaluate,formatTable} from './lib/report.mjs';
import {PERF_SCENARIOS} from '../src/dev/perf-scenarios.js';

const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const argv=process.argv.slice(2),flag=name=>argv.includes('--'+name),option=(name,fallback)=>{const i=argv.indexOf('--'+name);return i>=0?argv[i+1]:fallback;};
const full=flag('full');
const envNames=(option('env')||(full?FULL_ENVIRONMENTS:QUICK_ENVIRONMENTS).join(',')).split(',');
const scenarios=option('scenarios')?option('scenarios').split(',').map(id=>PERF_SCENARIOS.find(s=>s.id===id)||(()=>{throw Error('Unknown scenario '+id);})()):PERF_SCENARIOS;
const windows=Number(option('windows',full?5:3)),windowMs=Number(option('window-ms',2500));
if(flag('update-baseline')&&!option('note'))throw Error('--update-baseline requires --note "reason for the new baseline"');

const git=args=>{try{return execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();}catch{return null;}};
const stamp=new Date().toISOString().replace(/[:.]/g,'-'),outDir=path.join(root,'perf/results',stamp);await mkdir(outDir,{recursive:true});
const budgets=JSON.parse(await readFile(path.join(root,'perf/budgets.json'),'utf8'));
const withTimeout=(promise,ms,label)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(Error(`${label} timed out after ${ms/1000}s`)),ms))]);

const buildDir=path.join(root,'perf/.build/current');
if(!flag('no-build')){console.log('Building unminified playground for perf…');await buildPlayground(root,buildDir);}
const server=await serve(buildDir);let session=null,failed=false;const report=[`# Perf run ${stamp}`,'',`commit ${git(['rev-parse','--short','HEAD'])}${git(['status','--porcelain'])?' (uncommitted changes)':''} · windows ${windows}×${windowMs}ms`];
const stop=async()=>{await session?.close().catch(()=>{});await server.close();};
process.once('SIGINT',async()=>{await stop();process.exit(130);});
try{
 for(const envName of envNames){
  const env=ENVIRONMENTS[envName];console.log(`\n▶ ${envName}: ${env?.description??''}`);
  session=await openEnvironment(envName);const results=[],calibrationStart=await calibrate(session);
  for(const scenario of scenarios){
   process.stdout.write(`  ${scenario.id} … `);
   const result=await withTimeout(runScenario(session,{url:server.url,scenario,windows,windowMs,profile:flag('profile'),screenshot:path.join(outDir,`${envName}-${scenario.id}.jpg`)}),180000,scenario.id);
   results.push(result);console.log(`${result.summary.timing.frameMs} ms, ${result.summary.timing.fps} fps, ${Math.round(result.summary.counters.draws)} draws`);
  }
  const calibrationMs=(calibrationStart+await calibrate(session))/2;
  const baselinePath=path.join(root,'perf/baselines',`${envName}.json`),baseline=JSON.parse(await readFile(baselinePath,'utf8').catch(()=>'null'));
  const rows=evaluate({envName,env,results,baseline,budgets,calibrationMs,scenarios});
  const speed=baseline?.meta?.calibrationMs?calibrationMs/baseline.meta.calibrationMs:null;console.log(`  calibration ${calibrationMs.toFixed(1)} ms${speed?` (×${speed.toFixed(2)} vs baseline; baseline timings scaled)`:''}`);
  if(!flag('no-diagnose')&&!flag('profile')&&env.browser==='chromium')for(const row of rows.filter(r=>r.status!=='PASS')){
   process.stdout.write(`  profiling ${row.scenario} for diagnosis … `);
   const again=await withTimeout(runScenario(session,{url:server.url,scenario:scenarios.find(s=>s.id===row.scenario),windows:1,windowMs,profile:true}),180000,row.scenario);
   const original=results.find(r=>r.scenario===row.scenario);original.top=again.top;original.cpuProfile=again.cpuProfile;row.diagnosis={...row.diagnosis,hotFunctions:again.top?.slice(0,10)};console.log('done');
  }
  await session.close();session=null;
  for(const r of results)if(r.cpuProfile){await writeFile(path.join(outDir,`${envName}-${r.scenario}.cpuprofile`),JSON.stringify(r.cpuProfile));delete r.cpuProfile;}
  await writeFile(path.join(outDir,`${envName}.json`),JSON.stringify({env:envName,renderer:results[0]?.renderer,results,gate:rows},null,1));
  const table=formatTable(envName,results,rows);report.push(`\nRenderer: ${results[0]?.renderer} · calibration ${calibrationMs.toFixed(1)} ms`,table);console.log(table);
  if(!baseline)console.log(`\n(no baseline for ${envName} yet — create one with --update-baseline --note "…")`);
  if(rows.some(r=>r.status==='FAIL'))failed=true;
  if(flag('update-baseline')){
   await mkdir(path.dirname(baselinePath),{recursive:true});
   await writeFile(baselinePath,JSON.stringify({meta:{updated:new Date().toISOString(),note:option('note'),commit:git(['rev-parse','--short','HEAD']),dirty:!!git(['status','--porcelain']),renderer:results[0]?.renderer,windows,windowMs,calibrationMs},
    scenarios:Object.fromEntries(results.map(r=>[r.scenario,{summary:r.summary,samples:r.samples,leak:r.leak,census:{byGroup:r.census.byGroup,byKind:r.census.byKind}}]))},null,1)+'\n');
   console.log(`Baseline updated: ${path.relative(root,baselinePath)}`);
  }
 }
}finally{await stop();}
await writeFile(path.join(outDir,'report.md'),report.join('\n')+'\n');
console.log(`\nReport, screenshots and profiles: ${path.relative(root,outDir)}`);
if(failed&&!flag('no-gate')&&!flag('update-baseline')){console.log('Performance gate FAILED.');process.exitCode=1;}
