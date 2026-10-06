import {execFileSync} from 'node:child_process';
// Whole-browser CPU (renderer, GPU and browser processes) — what Activity Monitor shows — measured as
// cumulative CPU time of every process launched beneath this Node process.
function seconds(text){const [clock,days]=text.includes('-')?text.split('-').reverse():[text,'0'];const parts=clock.split(':').map(Number);let total=0;for(const p of parts)total=total*60+p;return total+Number(days)*86400;}
export function browserCpuSeconds(rootPid=process.pid){
 if(process.platform==='win32')return null;
 const rows=execFileSync('ps',['-A','-o','pid=,ppid=,time='],{encoding:'utf8'}).trim().split('\n').map(line=>line.trim().split(/\s+/)).map(([pid,ppid,time])=>({pid:+pid,ppid:+ppid,cpu:seconds(time)}));
 const children=new Map();for(const r of rows){if(!children.has(r.ppid))children.set(r.ppid,[]);children.get(r.ppid).push(r);}
 let total=0;const stack=[...(children.get(rootPid)||[])];
 while(stack.length){const r=stack.pop();total+=r.cpu;stack.push(...(children.get(r.pid)||[]));}
 return total;
}
