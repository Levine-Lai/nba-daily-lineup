import fs from 'node:fs';
import assert from 'node:assert/strict';
import {prepareDefense,matchupCell,dvpFantasy,playerDvpPositions,DVP_POSITIONS} from '../lib/nba/dvp.mjs';
const raw=JSON.parse(fs.readFileSync('public/data/position-defense.json','utf8').replace(/^\uFEFF/,''));
const data=prepareDefense(raw,raw.season);assert.ok(data);assert.equal(data.rows.length,150);
assert.equal(dvpFantasy({points:20,rebounds:10,assists:5,steals:2,blocks:1,turnovers:3}),45.5);
for(const pos of DVP_POSITIONS){
 for(const metric of ['fantasy','points','rebounds','turnovers']){
  const group=data.rows.filter(r=>r.position===pos),inverse=metric==='turnovers';
  const best=[...group].sort((a,b)=>inverse?b[metric]-a[metric]:a[metric]-b[metric])[0];
  const cell=matchupCell(data,best.team,pos,metric);assert.equal(cell.rank,1);assert.ok(cell.delta<=1e-12);
  assert.ok(group.every(r=>{const c=matchupCell(data,r.team,pos,metric);return c.rank>=1&&c.rank<=30&&Number.isFinite(c.delta);}));
 }
}
assert.equal(prepareDefense(raw,'1900-01'),null);
assert.equal(prepareDefense({...raw,rows:raw.rows.slice(1)},raw.season),null);
assert.equal(prepareDefense({...raw,rows:[...raw.rows.slice(1),raw.rows[1]]},raw.season),null);
assert.equal(matchupCell(data,'XXX','C'),null);
assert.deepEqual(playerDvpPositions({positionRaw:'PG-SG'}),['PG','SG']);
assert.deepEqual(playerDvpPositions({positionRaw:'F'}),['SF','PF']);
assert.deepEqual(playerDvpPositions({positionRaw:'G-F'}),['PG','SG','SF','PF']);
assert.deepEqual(playerDvpPositions({positionRaw:''}),[]);
console.log('PASS: DvP BAO5 formula, same-position rankings, inverse turnover direction, missing/duplicate/season guards and position mapping.');

