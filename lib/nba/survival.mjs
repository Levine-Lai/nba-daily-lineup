import {generator,normal} from './forecast.mjs';
const key=a=>a.map(p=>typeof p==='object'?p.id:p).sort().join(',');
const total=a=>a.reduce((s,p)=>s+p.expected,0);

// Shared player outcomes are essential: managers holding the same player must
// receive exactly the same score. Ownership is represented by legal portfolios.
export function survivalRecommendation(model,optimize,{exclude=[],lock=[],training=900,validation=4000}={}){
 const rows=model.rows,byId=new Map(rows.map(p=>[p.id,p])),eligible=rows.filter(p=>p.eligible);
 const candidates=new Map(),options={exclude,lock};
 const add=a=>{if(a.length===5&&!exclude.some(id=>a.some(p=>p.id===id))&&lock.every(id=>a.some(p=>p.id===id)))candidates.set(key(a),a);};
 const expected=optimize(rows,options);if(expected.length!==5)return {lineup:[],reason:'无法组成合法阵容'};
 add(expected);add(optimize(rows,{...options,mode:'steady'}));
 for(const profile of model.ownership?.profiles||[])for(const ids of profile.portfolios)add(ids.map(id=>byId.get(id)));
 for(const p of eligible.slice(0,25))add(optimize(rows,{...options,lock:[...new Set([...lock,p.id])]}));
 const rnd=generator(876545);
 for(let i=0;i<30;i++){
  const scores=Object.fromEntries(eligible.map(p=>[p.id,p.expected-(i/30)*p.sd+normal(rnd)*p.sd*.2]));
  add(optimize(rows,{...options,scores}));
 }
 const all=[...candidates.values()],index=new Map(eligible.map((p,i)=>[p.id,i]));
 const arrays=a=>a.map(p=>index.get(p.id));
 const scenarios=[];
 for(const profile of model.ownership?.profiles||[]){
  const portfolios=profile.portfolios.map(ids=>ids.map(id=>index.get(id)));
  if(portfolios.length)for(const remaining of [30,35,40])scenarios.push({attention:profile.attention,remaining,portfolios});
 }
 if(!scenarios.length)return {lineup:expected.map(p=>p.id),reason:'缺少对手阵容情景'};
 const groups=[...new Set(eligible.map(p=>p.match.id))],teams=[...new Set(eligible.map(p=>p.team))];
 const evaluate=(lineups,trials,seed)=>{
  const random=generator(seed),encoded=lineups.map(arrays),result=lineups.map(()=>[]);
  for(const scenario of scenarios){
   const losses=new Float64Array(lineups.length),squares=new Float64Array(lineups.length);
   for(let t=0;t<trials;t++){
    const gameZ=Object.fromEntries(groups.map(id=>[id,normal(random)])),teamZ=Object.fromEntries(teams.map(id=>[id,normal(random)]));
    const scores=eligible.map(p=>{
     let z=normal(random);
     // Weighted recent residuals preserve empirical tails. Half of draws use
     // normal residuals to regularize sparse samples and unseen outcomes.
     if(random()<.5&&p.residuals?.length>2){let u=random();for(const r of p.residuals){u-=r.weight;if(u<=0){z=r.z;break;}}}
     const a=p.availability??1;
     if(!a||random()>a)return 0;
     const mean=p.expected/a,sd=Math.sqrt(Math.max(0,(p.sd*p.sd-a*(1-a)*mean*mean)/a));
     return Math.max(-20,mean+sd*(Math.sqrt(.75)*z+Math.sqrt(.1)*gameZ[p.match.id]+Math.sqrt(.15)*teamZ[p.team]));
    });
    const opponents=Array.from({length:scenario.remaining-1},()=>{
     const a=scenario.portfolios[Math.floor(random()*scenario.portfolios.length)];return a.reduce((s,i)=>s+scores[i],0);
    }).sort((a,b)=>a-b);
    // Only scores at/under the fourth smallest opponent can be eliminated.
    for(let j=0;j<encoded.length;j++){
     const score=encoded[j].reduce((s,i)=>s+scores[i],0);
     if(score>opponents[3]+1e-8)continue;
     let below=0,equal=0;for(const s of opponents){if(s<score-1e-8)below++;else if(Math.abs(s-score)<=1e-8)equal++;else break;}
     const loss=below>=4?0:Math.min(1,(4-below)/(equal+1));losses[j]+=loss;squares[j]+=loss*loss;
    }
   }
   for(let j=0;j<result.length;j++){
    const risk=losses[j]/trials;
    result[j].push({attention:scenario.attention,remaining:scenario.remaining,risk,mcError95:1.96*Math.sqrt(Math.max(0,squares[j]/trials-risk*risk)/trials)});
   }
  }
  return lineups.map((a,i)=>({lineup:a.map(p=>p.id),expected:total(a),worst:Math.max(...result[i].map(r=>r.risk)),average:result[i].reduce((s,r)=>s+r.risk,0)/result[i].length,scenarios:result[i]}));
 };
 const trained=evaluate(all,training,183746).sort((a,b)=>a.worst-b.worst||a.average-b.average||b.expected-a.expected);
 // Choose only on training trials; independent validation is for reporting,
 // never another round of selection with the reported simulation results.
 const chosen=trained[0],validationRows=[chosen.lineup.map(id=>byId.get(id))];
 if(key(chosen.lineup)!==key(expected))validationRows.push(expected);
 const checked=evaluate(validationRows,validation,9876543);
 return {version:2,lineup:chosen.lineup,expected:chosen.expected,validation:checked[0],expectedComparison:checked.at(-1),candidates:all.length,training,validationTrials:validation,remainingRange:[30,40],opponents:'合法阵容持有率情景',calibrated:false,ties:'同分随机淘汰',correlation:{game:.1,team:.15},search:'候选搜索，非全局最优证明'};
}
