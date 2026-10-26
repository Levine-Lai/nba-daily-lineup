import assert from 'node:assert/strict';
import fs from 'node:fs';
import {optimize,project,strategyScore} from '../lib/nba/model.mjs';
let seed=42;const rnd=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
function brute(rows,lock=[],exclude=[]){let best=-Infinity,result=[];function walk(i,a){if(a.length===5){if(a.reduce((s,p)=>s+p.energy,0)>150||![2,3].includes(a.filter(p=>p.position==='front').length)||lock.some(id=>!a.some(p=>p.id===id)))return;const v=a.reduce((s,p)=>s+p.expected,0);if(v>best){best=v;result=a;}return;}for(let j=i;j<rows.length;j++)if(!exclude.includes(rows[j].id)&&rows[j].eligible)walk(j+1,[...a,rows[j]]);}walk(0,[]);return result;}
for(let trial=0;trial<30;trial++){
 const rows=Array.from({length:11},(_,i)=>({id:String(i),position:i<6?'front':'back',energy:10+Math.floor(rnd()*45),expected:rnd()*70,eligible:true}));
 for(const options of [{},{lock:['1']},{exclude:['3']},{lock:['1','8'],exclude:['3']}]){
  const actual=optimize(rows,options),expected=brute(rows,options.lock,options.exclude);
  assert.ok(Math.abs(actual.reduce((s,p)=>s+p.expected,0)-expected.reduce((s,p)=>s+p.expected,0))<1e-8);
 }
}
const raw=JSON.parse(fs.readFileSync(new URL('../lib/nba/initial.json',import.meta.url)));
const model=project(raw,'2026-10-27',{scenarios:2});
assert.equal(new Set(model.rows.map(p=>p.id)).size,model.rows.length);
assert.equal(model.lineup.length,5);
assert.ok(model.rows.filter(p=>model.lineup.includes(p.id)).reduce((s,p)=>s+p.energy,0)<=150);
assert.ok(model.rows.every(p=>Number.isFinite(p.expected)&&p.expected>=0));
assert.ok(model.rows.every(p=>p.todayOwnership===null));
assert.ok(model.rows.filter(p=>['out','questionable','doubtful'].includes(p.status.key)).every(p=>!p.eligible));
const withoutBlowout=project(raw,'2026-10-27',{scenarios:0,blowout:false});
for(const p of model.rows){const q=withoutBlowout.rows.find(q=>q.id===p.id);assert.ok(p.expected<=q.expected+1e-8);}
assert.ok(model.games.every(g=>g.blowout===null||(g.blowout>=0&&g.blowout<=1)));
const riskPlayer={expected:40,sd:10,b2b:true,injuriesFresh:false,modelSelection:20};
assert.equal(strategyScore(riskPlayer,'balanced'),40);
assert.equal(strategyScore(riskPlayer,'steady'),26);
assert.equal(strategyScore(riskPlayer,'differential'),48);
assert.ok(strategyScore({...riskPlayer,injuriesFresh:true},'steady')>strategyScore(riskPlayer,'steady'));
console.log('PASS: 120 optimizer/brute-force comparisons; legal budgets, locks, exclusions, unique IDs, finite projections, missing ownership, injury exclusions and blowout direction.');
