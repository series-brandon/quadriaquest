// A/B: compare the working tree (B) against a git ref (A, default HEAD) in the same browser session,
// alternating A/B order every round so heat and background load affect both sides equally.
// `npm run perf:ab -- [ref] [--env dev-gpu] [--scenarios a,b] [--rounds 4] [--windows 2] [--window-ms 2500]`
// The ref is exported read-only with `git archive`; no worktree, branch or commit is created.
import {mkdir,writeFile,rm,symlink,access} from 'node:fs/promises';import path from 'node:path';import {execSync} from 'node:child_process';
import {openEnvironment,runScenario} from './lib/session.mjs';
import {serve} from './lib/serve.mjs';import {buildPlayground} from './lib/build.mjs';
import {bootstrapDelta,median,round} from './lib/stats.mjs';
import {PERF_SCENARIOS} from '../src/dev/perf-scenarios.js';

const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const argv=process.argv.slice(2),option=(name,fallback)=>{const i=argv.indexOf('--'+name);return i>=0?argv[i+1]:fallback;};
const optionValues=new Set(argv.flatMap((a,i)=>a.startsWith('--')?[i+1]:[]));
const ref=argv.find((a,i)=>!a.startsWith('--')&&!optionValues.has(i))||'HEAD';
const envName=option('env','dev-gpu'),rounds=Number(option('rounds',4)),windows=Number(option('windows',2)),windowMs=Number(option('window-ms',2500));
const scenarios=option('scenarios')?option('scenarios').split(',').map(id=>PERF_SCENARIOS.find(s=>s.id===id)):PERF_SCENARIOS.filter(s=>s.kind!=='travel');
if(scenarios.some(s=>!s))throw Error('Unknown scenario in --scenarios');

// --base-build <dir> compares against an existing perf build instead of a git ref (e.g. an A/A noise check).
const exportDir=path.join(root,'perf/.build/ab-source'),currentBuild=path.join(root,'perf/.build/current');let baseBuild=option('base-build')&&path.resolve(option('base-build'));
if(!baseBuild){
 baseBuild=path.join(root,'perf/.build/ab-base');await rm(exportDir,{recursive:true,force:true});await mkdir(exportDir,{recursive:true});
 console.log(`Exporting ${ref} (read-only git archive)…`);execSync(`git archive --format=tar ${JSON.stringify(ref)} | tar -x -C ${JSON.stringify(exportDir)}`,{cwd:root,stdio:['ignore','ignore','inherit']});
 if(!await access(path.join(exportDir,'src/dev/perf-scenarios.js')).then(()=>true,()=>false))throw Error(`${ref} predates the perf scenario API; A/B needs both sides to include src/dev/perf-scenarios.js.`);
 await symlink(path.join(root,'node_modules'),path.join(exportDir,'node_modules'));
 console.log('Building both sides…');await Promise.all([buildPlayground(exportDir,baseBuild,{viteRoot:root}),buildPlayground(root,currentBuild)]);
 await rm(exportDir,{recursive:true,force:true});
}else{console.log('Building working tree…');await buildPlayground(root,currentBuild);}
const label=option('base-build')?path.relative(root,baseBuild):ref;

const servers={A:await serve(baseBuild),B:await serve(currentBuild)},samples={};let session;
try{
 session=await openEnvironment(envName);
 for(let r=0;r<rounds;r++)for(const scenario of scenarios){
  for(const side of r%2?['B','A']:['A','B']){
   const result=await runScenario(session,{url:servers[side].url,scenario,windows,windowMs});
   ((samples[scenario.id]??={A:[],B:[]})[side]).push(...result.samples);
   process.stdout.write(`round ${r+1}/${rounds} ${scenario.id} ${side}: ${round(median(result.samples.map(s=>s.frameMs)),2)} ms\n`);
  }
 }
}finally{await session?.close();await servers.A.close();await servers.B.close();}

const metrics=[['frameMs','frame ms'],['frameP95','frame p95'],['cpuPercent','browser CPU %'],['fps','fps'],['draws','draws']];
const lines=[`# A/B ${label} (A) → working tree (B) · ${envName} · ${rounds} rounds × ${windows} windows`,'','Negative Δ is better except fps. ✱ = 95% CI excludes zero.','','| scenario | metric | A | B | Δ | 95% CI |','|---|---|---|---|---|---|'];
const pct=n=>`${n>=0?'+':''}${(n*100).toFixed(1)}%`;
for(const [id,{A,B}] of Object.entries(samples))for(const [key,label] of metrics){
 const a=A.map(s=>s[key]).filter(Number.isFinite),b=B.map(s=>s[key]).filter(Number.isFinite),ci=bootstrapDelta(a,b);if(!ci)continue;
 lines.push(`| ${id} | ${label} | ${round(median(a),2)} | ${round(median(b),2)} | ${pct(ci.relative)}${ci.significant?' ✱':''} | ${pct(ci.low)} … ${pct(ci.high)} |`);
}
const outDir=path.join(root,'perf/results',`ab-${new Date().toISOString().replace(/[:.]/g,'-')}`);await mkdir(outDir,{recursive:true});
await writeFile(path.join(outDir,'report.md'),lines.join('\n')+'\n');await writeFile(path.join(outDir,'samples.json'),JSON.stringify({ref:label,envName,samples},null,1));
console.log('\n'+lines.join('\n')+`\n\nSaved: ${path.relative(root,outDir)}`);
