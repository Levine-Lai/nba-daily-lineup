import fs from 'node:fs';
import assert from 'node:assert/strict';
const manifest=JSON.parse(fs.readFileSync('public/data/manifest.json'));
assert.ok(manifest.dates.length>0);
for(const date of manifest.dates){
 const model=JSON.parse(fs.readFileSync(`public/data/${date}.json`));
 assert.equal(model.date,date);
 const selected=model.rows.filter(p=>model.lineup.includes(p.id));
 assert.equal(selected.length,5);
 assert.ok(selected.reduce((s,p)=>s+p.energy,0)<=150);
 assert.ok([2,3].includes(selected.filter(p=>p.position==='front').length));
 assert.ok(model.meta.fetchedAt);
 if(model.meta.forecast?.version>=2){
  assert.ok(Math.abs(model.rows.reduce((s,p)=>s+p.predictedOwnership,0)-500)<1e-6);
  assert.ok(model.rows.every(p=>Number.isFinite(p.sd)&&Number.isFinite(p.variance)&&p.variance>=0));
  const safe=model.rows.filter(p=>model.survival.lineup.includes(p.id));
  assert.equal(safe.length,5);assert.ok(safe.reduce((s,p)=>s+p.energy,0)<=150);
  assert.ok([2,3].includes(safe.filter(p=>p.position==='front').length));
 }
}
assert.ok(!fs.readFileSync('src/Dashboard.tsx','utf8').includes("fetch('/api/slate"));
console.log('PASS: static snapshots, legal lineups, manifest date mapping, source timestamps, no server API dependency.');
