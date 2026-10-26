export const CN = {ATL:'老鹰',BOS:'凯尔特人',BKN:'篮网',CHA:'黄蜂',CHI:'公牛',CLE:'骑士',DAL:'独行侠',DEN:'掘金',DET:'活塞',GSW:'勇士',HOU:'火箭',IND:'步行者',LAC:'快船',LAL:'湖人',MEM:'灰熊',MIA:'热火',MIL:'雄鹿',MIN:'森林狼',NOP:'鹈鹕',NYK:'尼克斯',OKC:'雷霆',ORL:'魔术',PHI:'76人',PHX:'太阳',POR:'开拓者',SAC:'国王',SAS:'马刺',TOR:'猛龙',UTA:'爵士',WAS:'奇才'};
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const avg=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0;
const num=(x,f=null)=>typeof x==='number'&&Number.isFinite(x)?x:f;
export const fantasy=g=>['points','rebounds','assists','steals','blocks','turnovers'].reduce((s,k,i)=>s+(+g[k]||0)*[1,1.2,1.5,3,3,-1][i],0);
export const beijing=d=>new Date(d).toLocaleString('sv-SE',{timeZone:'Asia/Shanghai'});
function erf(x){const sign=x<0?-1:1; x=Math.abs(x); const t=1/(1+.3275911*x);return sign*(1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-x*x));}
const cdf=x=>(1+erf(x/Math.SQRT2))/2;
export function getDates(raw){return [...new Set(raw.schedule.games.filter(g=>g.phase==='regular').map(g=>g.date))].sort();}
export function nextDate(raw,now=Date.now()){return getDates(raw).find(d=>Math.min(...raw.schedule.games.filter(g=>g.date===d).map(g=>Date.parse(g.utc)))-900000>now)||getDates(raw).at(-1);}

// Exact budget optimization with a mandatory/omitted set. Typed states avoid
// expensive combinatorial enumeration; every player is considered once.
export function optimize(rows,{exclude=[],lock=[],mode='balanced',scores=null}={}){
 const banned=new Set(exclude),locked=rows.filter(p=>lock.includes(p.id));
 if(locked.length!==lock.length||locked.some(p=>!p.eligible||banned.has(p.id)))return [];
 const front=locked.filter(p=>p.position==='front').length, back=locked.length-front, cost=locked.reduce((s,p)=>s+p.energy,0);
 if(front>3||back>3||cost>150||locked.length>5)return [];
 const key=(f,b,e)=>(f*4+b)*151+e, size=16*151;
 const values=new Float64Array(size); values.fill(-Infinity);
 const paths=new Array(size); values[key(front,back,cost)]=0;paths[key(front,back,cost)]=locked.map(p=>p.id);
 for(const p of rows){
  if(!p.eligible||banned.has(p.id)||lock.includes(p.id)||p.energy>150)continue;
  const df=p.position==='front'?1:0, db=1-df;
  const value=scores?.[p.id]??(p.expected-(mode==='steady'?.2*p.sd:0)+(mode==='differential'?.12*p.sd*(1-(p.modelSelection??50)/100):0));
  for(let f=3-df;f>=0;f--)for(let b=3-db;b>=0;b--){
   if(f+b>=5)continue;
   for(let e=150-p.energy;e>=0;e--){
    const from=key(f,b,e); if(values[from]===-Infinity)continue;
    const to=key(f+df,b+db,e+p.energy),nv=values[from]+value;
    if(nv>values[to]){values[to]=nv;paths[to]=[...paths[from],p.id];}
   }
  }
 }
 let best=-Infinity,ids=[];
 for(const [f,b] of [[2,3],[3,2]])for(let e=0;e<=150;e++){let k=key(f,b,e);if(values[k]>best){best=values[k];ids=paths[k]||[];}}
 return ids.map(id=>rows.find(p=>p.id===id));
}

export function project(raw,date,settings={}){
 const season=raw.players.statsSeason;
 const games=raw.schedule.games.filter(g=>g.date===date&&g.phase==='regular');
 if(!games.length)throw Error('该日期没有常规赛赛程');
 const prior=new Map((raw.priorTeams?.teams||[]).map(t=>[t.abbr,t]));
 const current=(raw.teams?.meta?.season===season?raw.teams?.teams:[])||[];
 const teams=current.map(t=>{
  const p=prior.get(t.abbr), w=(t.games||0)/((t.games||0)+12);
  const blend=k=>num(t[k])===null?num(p?.[k]):p&&num(p[k])!==null?t[k]*w+p[k]*(1-w):t[k];
  return {...t,rawOff:t.off_rating,rawDef:t.def_rating,rawNet:t.net_rating,rawPace:t.pace,off_rating:blend('off_rating'),def_rating:blend('def_rating'),net_rating:blend('net_rating'),pace:blend('pace'),weight:w};
 });
 const tm=new Map(teams.map(t=>[t.abbr,t]));
 const leagueDef=avg(teams.map(t=>t.def_rating).filter(Number.isFinite))||113;
 const leaguePace=avg(teams.map(t=>t.pace).filter(Number.isFinite))||100;
 const matchup=games.map(g=>{
  const a=tm.get(g.away), h=tm.get(g.home);
  const pace=a&&h?(a.pace+h.pace)/2:null;
  const margin=a&&h?((h.net_rating-a.net_rating)/2)*(pace/100)+2.2:null;
  const blowout=margin===null?null:1-(cdf((15-margin)/12)-cdf((-15-margin)/12));
  return {...g,awayData:a,homeData:h,pace,margin,blowout,total:a&&h?((a.off_rating+h.def_rating+h.off_rating+a.def_rating)/2)*pace/100:null};
 });
 const statuses=raw.injuries?.statuses||{};
 const heatById=new Map();
 for(const heat of [...(raw.history||[])].sort((a,b)=>a.dateKey.localeCompare(b.dateKey))){
  for(const p of [...(heat.hot?.front||[]),...(heat.hot?.back||[])])heatById.set(p.id,{percent:p.percent,date:heat.dateKey});
 }
 const advanced=new Map((raw.advanced?.meta?.season===season?raw.advanced.players:[]).map(p=>[String(p.player_id),p]));
 const shooting=new Map((raw.shooting?.meta?.season===season?raw.shooting.players:[]).map(p=>[String(p.player_id),p]));
 const unique=new Map();
 for(const p of raw.players.players){
  const key=p.englishName?.toLowerCase()||p.id,old=unique.get(key);
  const gp=raw.schedule.games.filter(g=>g.status===3&&g.date<date&&[g.home,g.away].includes(p.team)).length;
  const quality=(p.gamesPlayed<=gp+1?10:0)+(p.gamesPlayed>0?1:0);
  if(!old||quality>old.quality)unique.set(key,{p,quality});
 }
 let rows=[];
 for(const {p} of unique.values()){
  const match=matchup.find(g=>[g.home,g.away].includes(p.team));if(!match||p.active===false)continue;
  const regular=(raw.logs?.[p.id]?.recent||[]).filter(g=>g.seasonType==='regular'&&(g.dateCN||g.date)<date&&+g.min>0).sort((a,b)=>b.date.localeCompare(a.date));
  const logs=regular.filter(g=>g.seasonLabel===season),old=regular.filter(g=>g.seasonLabel!==season).slice(0,20),n=logs.length;
  const recent=logs.slice(0,5),minutes=avg(recent.map(g=>+g.min));
  const st=statuses[p.id]||{key:'pending',label:'待更新'};
  const injuriesFresh=raw.injuries?.date===date&&st.asOf===date&&!st.carry;
  const opponent=match.home===p.team?match.away:match.home;
  const opp=tm.get(opponent),own=tm.get(p.team);
  let weighted=0,weights=0;
  for(let i=0;i<logs.length;i++){
   const g=logs[i], o=tm.get(g.opp),d=o?clamp(o.def_rating/leagueDef,.92,1.08):1;
   // A strong defense increases the evidential weight of a past performance,
   // while normalization converts the score to a neutral-opponent baseline.
   const evidence=clamp(1+(1-d)*2,.85,1.15),recency=1/(1+i*.08),w=evidence*recency;
   const gp=own&&o?(own.pace+o.pace)/2/leaguePace:1;
   const neutral=fantasy(g)/(Math.pow(d,.65)*clamp(gp,.94,1.06));
   weighted+=neutral*w;weights+=w;
  }
  const seasonBaseline=weights?weighted/weights:p.average;
  const priorRate=old.length?old.reduce((s,g)=>s+fantasy(g),0)/old.reduce((s,g)=>s+(+g.min),0):null;
  const confidence=n/(n+5);
  const baseline=priorRate!==null?confidence*seasonBaseline+(1-confidence)*priorRate*minutes:seasonBaseline;
  const sd=Math.max(8,n>1?Math.sqrt(avg(logs.map(g=>(fantasy(g)-avg(logs.map(fantasy)))**2))):baseline*.35);
  const defense=opp?clamp(Math.pow(opp.def_rating/leagueDef,.65),.94,1.06):1;
  const pace=match.pace?clamp(match.pace/leaguePace,.94,1.06):1;
  const b2b=raw.schedule.games.some(g=>g.date===new Date(Date.parse(date+'T00:00:00Z')-86400000).toISOString().slice(0,10)&&[g.home,g.away].includes(p.team));
  const rest=b2b?.97:1;
  const lostMinutes=settings.blowout===false?0:minutes>=30&&match.blowout!==null?Math.max(0,match.blowout-.2)*5:0;
  const minutesFactor=minutes?clamp((minutes-lostMinutes)/minutes,.9,1):1;
  const available={'out':0,'doubtful':.25,'questionable':.5,'probable':.9}[st.key]??1;
  const factors={pace:settings.matchup===false?1:pace,defense:settings.matchup===false?1:defense,rest,minutes:minutesFactor,injury:1};
  let expected=baseline*Object.values(factors).reduce((a,b)=>a*b,1)*available;
  const adv=advanced.get(p.id),shoot=shooting.get(p.id);
  const usage=adv?.team_abbreviation===p.team?num(adv.stats?.usage):null;
  const ts=shoot?.team_abbreviation===p.team?num(shoot.stats?.true_shooting_pct):null;
  const historical=heatById.get(p.id)||null;
  const historicalToday=(raw.history||[]).find(h=>h.dateKey===date);
  const today=[...(historicalToday?.hot?.front||[]),...(historicalToday?.hot?.back||[])].find(q=>q.id===p.id);
  rows.push({...p,expected,baseline,sd,seasonValue:p.energy>0?p.average/p.energy:null,value:p.energy>0?expected/p.energy:null,n,minutes,projectedMinutes:Math.max(0,minutes-lostMinutes),lostMinutes,recent:avg(recent.map(fantasy)),usage,ts,opponent,match,defenseRank:opp?[...teams].sort((a,b)=>a.def_rating-b.def_rating).findIndex(t=>t.abbr===opponent)+1:null,factors,b2b,status:st,injuriesFresh,historical,todayOwnership:today?.percent??null,eligible:!!(n&&p.gamesPlayed>0&&p.energy>0&&Number.isInteger(p.energy)&&!['out','doubtful','questionable'].includes(st.key)),logs:logs.slice(0,10).map(g=>({...g,fantasy:fantasy(g)}))});
 }
 // An absence already reflected in recent results must not be counted twice.
 for(const p of rows){
  const newlyOut=rows.filter(q=>q.team===p.team&&q.id!==p.id&&q.injuriesFresh&&q.status.key==='out'&&q.position===p.position&&q.minutes>=24&&q.logs[0]?.dateCN>=p.logs[0]?.dateCN);
  if(newlyOut.length&&p.minutes>=15&&p.minutes<34&&settings.injury!==false){p.factors.injury=1.05;p.expected*=1.05;p.injuryBeneficiaries=newlyOut.map(q=>q.name);}
  p.value=p.expected/p.energy;p.low=Math.max(0,p.expected-p.sd);p.high=p.expected+p.sd;
 }
 rows.sort((a,b)=>b.expected-a.expected);
 const lineup=optimize(rows),best=lineup.reduce((s,p)=>s+p.expected,0);
 // Selection frequency under score perturbations is a MODEL sensitivity metric.
 // It is never presented as predicted real-world ownership.
 const shortlist=[...new Set([...rows.filter(p=>p.eligible).slice(0,35),...rows.filter(p=>p.eligible).sort((a,b)=>b.value-a.value).slice(0,30)])];
 let seed=20261027;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return (seed+.5)/4294967296;};
 const counts={};const scenarios=settings.scenarios??40;
 for(let i=0;i<scenarios;i++){
  const scores={};for(const p of shortlist){const z=Math.sqrt(-2*Math.log(rnd()))*Math.cos(2*Math.PI*rnd());scores[p.id]=Math.max(0,p.expected+z*p.sd*.5);}
  for(const p of optimize(shortlist,{scores}))counts[p.id]=(counts[p.id]||0)+1;
 }
 for(const p of rows){
  p.modelSelection=scenarios?(counts[p.id]||0)/scenarios*100:0;
  if(!p.eligible){p.omitCost=null;p.alternative=[];continue;}
  if(p.modelSelection>=10||lineup.some(q=>q.id===p.id)||p.historical){
   const without=optimize(rows,{exclude:[p.id]}),withP=lineup.some(q=>q.id===p.id)?lineup:optimize(rows,{lock:[p.id]});
   p.omitCost=withP.length===5&&without.length===5?withP.reduce((s,q)=>s+q.expected,0)-without.reduce((s,q)=>s+q.expected,0):null;
   p.alternative=without.map(q=>q.id);
   const diff=[...withP.filter(q=>!without.some(x=>x.id===q.id)),...without.filter(q=>!withP.some(x=>x.id===q.id))];
   const spread=Math.sqrt(diff.reduce((s,q)=>s+q.sd*q.sd,0));
   p.omitLoss10=spread&&p.omitCost!==null?1-cdf((10-p.omitCost)/spread):null;
  }else{p.omitCost=null;p.alternative=[];}
  p.risk=p.modelSelection>=50&&(p.omitCost??0)>=5?'谨慎弃选':p.modelSelection>=25&&(p.omitCost??0)<=3?'可考虑对冲':p.modelSelection<25&&p.value>=1.3?'低热度候选':'常规比较';
 }
 return {date,season,games:matchup,teams,rows,lineup:lineup.map(p=>p.id),best,deadline:new Date(Math.min(...games.map(g=>Date.parse(g.utc)))-900000).toISOString(),meta:{fetchedAt:raw.fetchedAt,playersAt:raw.players.updatedAt,teamsAt:raw.teams?.meta?.generated_at,advancedAt:raw.advanced?.meta?.generated_at,injuryDate:raw.injuries?.date,injuryAt:raw.injuries?.updatedAtLabel,injuryUrl:raw.injuries?.reportUrl,historyDates:(raw.history||[]).map(h=>h.dateKey),energyReady:raw.energy?.ready,errors:raw.errors||[],fallback:raw.fallback||false},leagueDef,leaguePace};
}
