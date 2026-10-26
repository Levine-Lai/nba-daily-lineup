import assert from 'node:assert/strict';
import {autoDomain,ticksFor,formatTick,applyDomain,mapCoordinate,metricValue} from '../lib/chart-scale.mjs';
for(const values of [[18,22,31,150],[-12,-3,4],[35,35],[0,0],[.001,.009],[-.12,-.12]]){
 const domain=autoDomain(values),ticks=ticksFor(domain);
 assert.ok(domain[0]<=Math.min(...values)&&domain[1]>=Math.max(...values));
 assert.ok(domain[1]>domain[0]);
 assert.equal(ticks[0],domain[0]);assert.equal(ticks.at(-1),domain[1]);
 assert.ok(ticks.every((v,i)=>!i||v>ticks[i-1]));
}
assert.deepEqual(autoDomain([null,NaN,undefined]),[0,1]);
assert.equal(formatTick(10.5,[10.5,80]),'10.5');
assert.equal(formatTick(.0025,[0,.01]),'0.0025');
assert.deepEqual(applyDomain([0,80],'10.5',''),[10.5,80]);
for(const range of [['30','10'],['abc','80'],['10','10']])assert.throws(()=>applyDomain([0,80],...range));
assert.equal(mapCoordinate(0,[-10,10],50,250),150);
assert.equal(mapCoordinate(25,[25,75],400,40),400);
assert.equal(mapCoordinate(75,[25,75],400,40),40);
assert.equal(metricValue({ts:.61},'ts'),61);
assert.equal(metricValue({average:null},'average'),null);
assert.equal(metricValue({average:0},'average'),0);
console.log('Chart ranges, numeric ticks, percentages and missing values passed');
