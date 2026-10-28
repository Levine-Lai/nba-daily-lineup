export const DVP_POSITIONS=['PG','SG','SF','PF','C'];
export const DVP_POSITION_NAMES={PG:'控卫',SG:'分卫',SF:'小前锋',PF:'大前锋',C:'中锋'};
export const DVP_METRICS={fantasy:{label:'BAO5 积分',unit:'分'},points:{label:'得分',unit:'分'},rebounds:{label:'篮板',unit:'个'},assists:{label:'助攻',unit:'次'},threes:{label:'三分命中',unit:'个'},steals:{label:'抢断',unit:'次'},blocks:{label:'盖帽',unit:'次'},turnovers:{label:'失误',unit:'次',inverse:true},fgPct:{label:'投篮命中率',unit:'%'}};
export function dvpFantasy(r){return r.points+1.2*r.rebounds+1.5*r.assists+3*r.steals+3*r.blocks-r.turnovers;}
export function playerDvpPositions(p){const tokens=String(p.positionRaw||'').toUpperCase().split(/[^A-Z]+/);return [...new Set(tokens.flatMap(t=>t==='G'?['PG','SG']:t==='F'?['SF','PF']:DVP_POSITIONS.includes(t)?[t]:[]))];}
export function broadDvpPosition(p){return String(p.positionRaw||'').toUpperCase().split(/[^A-Z]+/).some(t=>t==='G'||t==='F');}
export function prepareDefense(data,season){
 if(!data||data.season!==season||data.basis!=='per48'||!Array.isArray(data.rows)||data.rows.length!==150)return null;
 const rows=data.rows.map(r=>({...r,fantasy:dvpFantasy(r)}));
 if(new Set(rows.map(r=>r.team+':'+r.position)).size!==150||DVP_POSITIONS.some(pos=>rows.filter(r=>r.position===pos).length!==30)||rows.some(r=>Object.keys(DVP_METRICS).some(k=>!Number.isFinite(r[k]))))return null;
 const means={},ranks={};
 for(const pos of DVP_POSITIONS){const group=rows.filter(r=>r.position===pos);means[pos]={};
  for(const [metric,meta] of Object.entries(DVP_METRICS)){means[pos][metric]=group.reduce((s,r)=>s+r[metric],0)/group.length;const ordered=[...group].sort((a,b)=>meta.inverse?b[metric]-a[metric]:a[metric]-b[metric]);for(const r of group){ranks[r.team+':'+pos+':'+metric]=ordered.findIndex(x=>x[metric]===r[metric])+1;}}
 }
 return {...data,rows,means,ranks};
}
export function matchupCell(data,team,position,metric='fantasy'){
 const r=data?.rows.find(r=>r.team===team&&r.position===position),mean=data?.means[position]?.[metric];if(!r||!Number.isFinite(mean)||!mean)return null;
 return {value:r[metric],mean,rank:data.ranks[team+':'+position+':'+metric],delta:(r[metric]/mean-1)*(DVP_METRICS[metric].inverse?-1:1)};
}
