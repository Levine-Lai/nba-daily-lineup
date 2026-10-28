import fs from 'node:fs';
const base='https://levine-lai.github.io/nba-daily-lineup/data/';
async function read(file){const r=await fetch(base+file,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error(`Published snapshot unavailable: ${r.status}`);return r.json();}
const manifest=await read('manifest.json');
if(!manifest.dates?.length||!manifest.dates.some(d=>Date.parse(manifest.slates[d]?.deadline)>Date.now()))throw Error('No open slate in last published snapshot');
const entries=await Promise.all(manifest.dates.map(async date=>{
 const model=await read(date+'.json');
 const selected=(model.rows||[]).filter(p=>model.lineup?.includes(p.id));
 if(model.date!==date||model.lineup?.length!==5||selected.length!==5||selected.reduce((s,p)=>s+p.energy,0)>150||![2,3].includes(selected.filter(p=>p.position==='front').length)||!Number.isFinite(Date.parse(model.meta?.fetchedAt)))throw Error('Invalid published snapshot');
 model.meta.fallback=true;
 model.meta.collectionWarning='BAO5 源站连接失败，价格与赛程沿用上次成功快照';
 model.meta.errors=[...new Set([...(model.meta.errors||[]),'本次 BAO5 采集失败，沿用已发布快照；原始采集时间保持不变'])];
 return [date,model];
}));
fs.mkdirSync('public/data',{recursive:true});
for(const [date,model] of entries)fs.writeFileSync('public/data/'+date+'.json',JSON.stringify(model));
fs.writeFileSync('public/data/default.json',JSON.stringify(entries.find(([d])=>d===manifest.defaultDate)[1]));
fs.writeFileSync('public/data/manifest.json',JSON.stringify({...manifest,generatedAt:new Date().toISOString(),collectionFallback:true}));
console.log('Restored published snapshots; original collectedAt preserved:',manifest.collectedAt);
