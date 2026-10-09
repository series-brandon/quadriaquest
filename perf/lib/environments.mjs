const SWIFTSHADER=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'];
// Chromium environments use the installed Google Chrome (real GPU) unless PERF_BUNDLED_CHROMIUM=1
// (`npx playwright install chromium`), which future CI runners will use.
const chrome=()=>process.env.PERF_BUNDLED_CHROMIUM==='1'?{}:{channel:'chrome'};
export const ENVIRONMENTS={
 'dev-gpu':{browser:'chromium',...chrome(),viewport:{width:1280,height:800},deviceScaleFactor:2,requireGpu:true,
  description:'Hardware GPU, Retina pixel density. Daily checks and A/B comparisons.'},
 'low-perf':{browser:'chromium',...chrome(),viewport:{width:1366,height:768},deviceScaleFactor:1,args:SWIFTSHADER,cpuThrottle:4,
  description:'Software WebGL (SwiftShader) plus 4× CPU throttling: a pessimistic weak-laptop/integrated-GPU stand-in. Never representative of normal play.'},
 'mobile-emu':{browser:'chromium',...chrome(),viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true,cpuThrottle:4,
  description:'Phone viewport and pixel density, touch, 4× CPU throttling, hardware GPU.'},
 'webkit':{browser:'webkit',viewport:{width:1280,height:800},deviceScaleFactor:2,processCpu:false,
  description:'Playwright WebKit (Safari engine). Needs `npx playwright install webkit`. No CPU profile, throttling, layout metrics or whole-browser CPU (its helper processes are not children of Node on macOS).'},
 'ci':{browser:'chromium',...chrome(),viewport:{width:1280,height:800},deviceScaleFactor:1,args:SWIFTSHADER,countersOnly:true,
  description:'Software WebGL counters only (draws, objects, uploads, leaks). Planned GitHub Actions gate; timings are not gated.'}
};
export const QUICK_ENVIRONMENTS=['dev-gpu'];
export const FULL_ENVIRONMENTS=['dev-gpu','low-perf','mobile-emu','webkit'];
