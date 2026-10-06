export const mean=values=>values.length?values.reduce((a,b)=>a+b,0)/values.length:0;
export function quantile(values,q){if(!values.length)return 0;const s=[...values].sort((a,b)=>a-b);const i=(s.length-1)*q,lo=Math.floor(i),hi=Math.ceil(i);return s[lo]+(s[hi]-s[lo])*(i-lo);}
export const median=values=>quantile(values,.5);
// Deterministic PRNG so confidence intervals are reproducible for the same data.
function rng(seed=1234567){return()=>{seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
// 95% bootstrap interval for median(b)-median(a), relative to median(a). Significant = CI excludes zero
// and the effect is at least minEffect (default 1%), so capped metrics like fps don't flag noise.
export function bootstrapDelta(a,b,{iterations=2000,minEffect=.01}={}){
 if(!a.length||!b.length)return null;const random=rng(),base=median(a),deltas=[];
 const sample=v=>Array.from(v,()=>v[Math.floor(random()*v.length)]);
 for(let i=0;i<iterations;i++)deltas.push(median(sample(b))-median(sample(a)));
 const delta=median(b)-base,scale=Math.abs(base)||1;
 return {delta,relative:delta/scale,low:quantile(deltas,.025)/scale,high:quantile(deltas,.975)/scale,significant:(quantile(deltas,.025)>0||quantile(deltas,.975)<0)&&Math.abs(delta/scale)>=minEffect};
}
export const round=(n,digits=3)=>n==null||!Number.isFinite(n)?n:Math.round(n*10**digits)/10**digits;
