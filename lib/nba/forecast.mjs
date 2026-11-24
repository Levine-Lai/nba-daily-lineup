// All tuning constants are priors, not coefficients fitted to ownership labels.
export const forecastConfig={version:2,scoreHalfLifeDays:14,minutesHalfLifeDays:7,priorGames:5,ownershipSamplesPerProfile:60,ownershipProfiles:[.6,1,1.4]};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function recencyWeights(logs,date,halfLife=14){
 return logs.map(g=>Math.pow(2,-Math.max(0,(Date.parse(date)-Date.parse(g.dateCN||g.date))/86400000)/halfLife));
}
export function moments(values,weights){
 const sum=weights.reduce((a,b)=>a+b,0),squares=weights.reduce((a,b)=>a+b*b,0);
 if(!sum)return {mean:0,variance:0,effectiveN:0};
 const mean=values.reduce((s,x,i)=>s+x*weights[i],0)/sum;
 const divisor=sum-squares/sum;
 return {mean,variance:divisor>1e-8?values.reduce((s,x,i)=>s+weights[i]*(x-mean)**2,0)/divisor:0,effectiveN:sum*sum/squares};
}
export function weightedForecast(logs,old,date,fantasy,neutral){
 const w=recencyWeights(logs,date),mw=recencyWeights(logs,date,7);
 const scores=logs.map(fantasy),mins=logs.map(g=>+g.min);
 const score=moments(scores,w),minutes=moments(mins,mw);
 const neutralScores=logs.map(neutral),neutralMean=moments(neutralScores,w).mean;
 const weightedMinutes=moments(mins,w).mean;
 const rate=weightedMinutes?neutralMean/weightedMinutes:0;
 const oldMins=old.reduce((s,g)=>s+(+g.min),0);
 const priorRate=oldMins?old.reduce((s,g)=>s+fantasy(g),0)/oldMins:null;
 const confidence=score.effectiveN/(score.effectiveN+5);
 const baseline=(priorRate===null?rate:confidence*rate+(1-confidence)*priorRate)*minutes.mean;
 // Shrink unstable small-sample variances; observed game variance already
 // contains minutes/role volatility, so do not add it again independently.
 const priorVariance=old.length>1?moments(old.map(fantasy),old.map(()=>1)).variance:Math.max(8,baseline*.35)**2;
 const variance=(score.effectiveN*score.variance+5*priorVariance)/(score.effectiveN+5);
 const sd=Math.sqrt(Math.max(64,variance)*(1+1/(score.effectiveN+5)));
 const sum=w.reduce((a,b)=>a+b,0);
 const residualVariance=score.variance*(1-1/(score.effectiveN||1));
 return {baseline,sd,effectiveN:score.effectiveN,minutes:minutes.mean,minutesSd:Math.sqrt(minutes.variance),weightedAverage:score.mean,weightedVariance:score.variance,confidence,recentTrend:score.mean-(scores.length?scores.reduce((a,b)=>a+b,0)/scores.length:0),minuteTrend:minutes.mean-(mins.length?mins.reduce((a,b)=>a+b,0)/mins.length:0),residuals:scores.map((x,i)=>({z:residualVariance>1e-8?(x-score.mean)/Math.sqrt(residualVariance):0,weight:w[i]/sum}))};
}
export function generator(seed=20261125){return ()=>{seed=(1664525*seed+1013904223)>>>0;return (seed+.5)/4294967296;};}
export const normal=rnd=>Math.sqrt(-2*Math.log(rnd()))*Math.cos(2*Math.PI*rnd());

export function ownershipSignal(p,date){
 const historyAge=p.historical?Math.max(0,(Date.parse(date)-Date.parse(p.historical.date))/86400000):Infinity;
 return {
  value:clamp((p.value-1)*4,-3,4),
  form:clamp(p.recentTrend*.3,-3,3),
  role:clamp(p.minuteTrend*.5,-3,3),
  opportunity:p.injuryBeneficiaries?.length?2:0,
  matchup:clamp((p.factors.defense*p.factors.pace-1)*20,-2,2),
  history:p.historical?clamp((p.historical.percent-25)/15,-1,3)*Math.pow(2,-historyAge/3):0
 };
}
export function estimateOwnership(rows,date,optimize,{samples=60}={}){
 const eligible=rows.filter(p=>p.eligible),rnd=generator(),profiles=[],all=[];
 for(const p of rows)p.ownershipSignals=ownershipSignal(p,date);
 for(const attention of forecastConfig.ownershipProfiles){
  const counts={},portfolios=[];
  for(let i=0;i<samples;i++){
   const scores={},style=i%3,trendWeight=attention*(.5+rnd());
   for(const p of eligible){
    const signals=Object.values(p.ownershipSignals).reduce((a,b)=>a+b,0);
    // Different managers follow season averages, new projections or safe floors.
    const base=style===0?.55*p.expected+.45*p.average:style===1?p.expected:p.expected-.45*p.sd;
    scores[p.id]=base+trendWeight*signals+normal(rnd)*(2+p.sd*.25);
   }
   const lineup=optimize(eligible,{scores});
   if(lineup.length!==5)continue;
   const ids=lineup.map(p=>p.id);portfolios.push(ids);all.push(ids);
   for(const id of ids)counts[id]=(counts[id]||0)+1;
  }
  profiles.push({attention,portfolios,counts});
 }
 for(const p of rows){
  const estimates=profiles.map(s=>s.portfolios.length?(s.counts[p.id]||0)/s.portfolios.length*100:0);
  p.predictedOwnership=all.length?all.reduce((s,a)=>s+Number(a.includes(p.id)),0)/all.length*100:0;
  p.ownershipLow=Math.min(...estimates);p.ownershipHigh=Math.max(...estimates);
 }
 return {profiles,portfolios:all,samples:all.length};
}
