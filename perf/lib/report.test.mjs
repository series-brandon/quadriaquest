import test from 'node:test';
import assert from 'node:assert/strict';
import {sweepKnees,evaluate} from './report.mjs';

const step=(series,props,draws,fps,intervalP95=16.7)=>({series,props,summary:{counters:{draws,triangles:draws*100},timing:{fps,intervalP95}}});
const budgets=targets=>({defaults:{heapGrowthMB:2,rateTolerance:.25,counterNote:.05},targets:{'dev-gpu':targets}});
const run=(scenario,counters,timing={fps:59.5,intervalP95:16.7,intervalMax:17})=>({scenario,summary:{counters,timing,sections:{}},samples:[],errors:[]});

test('a sweep knee is the first step clearly worse than the empty one, per series', () => {
  const steps=[step('separate',0,100,59.5),step('separate',1000,2000,59.4),step('separate',2000,4000,52),step('separate',3000,6000,40),
    step('merged',1000,120,59.5),step('merged',2000,120,59.5,22)];
  const knees=sweepKnees(steps);
  assert.equal(knees.separate.knee.props,2000);
  assert.equal(knees.separate.lastGood.props,1000);
  assert.equal(knees.merged.knee.props,2000,'interval p95 rising 25% over the empty step is a knee');
  assert.equal(knees.merged.lastGood.props,1000);
});

test('no knee: the last step is the last good one', () => {
  const knees=sweepKnees([step('separate',0,100,59.5),step('separate',100,300,59.6)]);
  assert.equal(knees.separate.knee,null);
  assert.equal(knees.separate.lastGood.props,100);
});

test('a sweep never fails on its own frame times or targets', () => {
  const r={...run('view-density',{draws:9000,triangles:1},{fps:20,intervalP95:50,intervalMax:60}),sweep:[step('separate',0,100,59.5),step('separate',100,9000,20,50)]};
  const [row]=evaluate({envName:'dev-gpu',env:{},results:[r],baseline:null,budgets:budgets({'*':{minFps:55,maxViewDraws:6000}})});
  assert.equal(row.status,'PASS');
  assert.match(row.notes[0],/knee at 100 props/);
});

test('draws and triangles in view fail only over the measured limit', () => {
  const b=budgets({'*':{maxViewDraws:6000,maxViewTriangles:1000}});
  const [ok]=evaluate({envName:'dev-gpu',env:{},results:[run('a',{draws:5999,triangles:1000})],baseline:null,budgets:b});
  assert.equal(ok.status,'PASS');
  const [over]=evaluate({envName:'dev-gpu',env:{},results:[run('a',{draws:6001,triangles:1001})],baseline:null,budgets:b});
  assert.equal(over.status,'FAIL');
  assert.equal(over.issues.filter(i=>/density/.test(i.text)).length,2);
  const [other]=evaluate({envName:'low-perf',env:{},results:[run('a',{draws:9000,triangles:9000})],baseline:null,budgets:b});
  assert.equal(other.status,'PASS','limits apply only to the environment they were measured in');
});
