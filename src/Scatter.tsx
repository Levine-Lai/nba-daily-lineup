// @ts-nocheck
import {useState,useRef,useEffect,useId,useMemo} from 'react';
import {CN} from '../lib/nba/model.mjs';
import {METRICS,metricValue,autoDomain,ticksFor,formatTick,applyDomain,mapCoordinate} from '../lib/chart-scale.mjs';
import Select from './Select';

const fmt=(v,d=1)=>Number.isFinite(v)?v.toFixed(d):'—';
const presets=[{key:'value',label:'能量 × 预期',x:'energy',y:'expected'},{key:'actual',label:'能量 × 实际',x:'energy',y:'average'},{key:'compare',label:'实际 × 预期',x:'average',y:'expected'}];

function AvatarMark({p,cx,cy,r,clipId,picked,active,label,onActivate,onPlayer}){
 const urls=[`https://cdn.nba.com/headshots/nba/latest/260x190/${p.id}.png`,p.headshot].filter(Boolean);
 const [source,setSource]=useState(0);
 return <g className={`avatar-point${picked?' picked':''}${active?' is-active':''}`} transform={`translate(${cx},${cy})`} role="button" tabIndex={0} aria-label={`${p.name}，预期${fmt(p.expected)}分，实际场均${fmt(p.average)}分`} onMouseEnter={()=>onActivate(p.id)} onFocus={()=>onActivate(p.id)} onClick={()=>onPlayer(p)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onPlayer(p);}}}>
  <defs><clipPath id={clipId}><circle r={r-1}/></clipPath></defs><circle className="avatar-bg" r={r}/>
  {source>=urls.length&&<text className="avatar-initial" y="4" textAnchor="middle">{p.name.slice(-2)}</text>}
  {source<urls.length&&<image href={urls[source]} x={-r} y={-r} width={r*2} height={r*2} preserveAspectRatio="xMidYMin slice" clipPath={`url(#${clipId})`} onError={()=>setSource(i=>i+1)}/>}
  <circle className="avatar-outline" r={r}/>
  {label&&<text className="point-label" x="0" y={-r-7} textAnchor="middle">{p.name.split('·').at(-1)}</text>}
  <title>{`${p.name} · ${CN[p.team]||p.team} · 预期 ${fmt(p.expected)} · 实际场均 ${fmt(p.average)} · 能量 ${p.energy}`}</title>
 </g>;
}

export default function Scatter({rows,lineup,onPlayer}){
 const [x,setX]=useState('energy'),[y,setY]=useState('expected'),[position,setPosition]=useState('all'),[team,setTeam]=useState('all'),[minMinutes,setMinMinutes]=useState('0'),[query,setQuery]=useState(''),[active,setActive]=useState(null),[full,setFull]=useState(false),[size,setSize]=useState('16'),[rangeOpen,setRangeOpen]=useState(false),[error,setError]=useState('');
 const [draft,setDraft]=useState({xmin:'',xmax:'',ymin:'',ymax:''}),[bounds,setBounds]=useState(null),[canvas,setCanvas]=useState({width:1000,height:600});
 const viewport=useRef(null),section=useRef(null),id=useId().replace(/:/g,'');
 useEffect(()=>{if(!viewport.current)return;const observer=new ResizeObserver(([entry])=>setCanvas({width:Math.max(240,entry.contentRect.width),height:Math.max(280,entry.contentRect.height)}));observer.observe(viewport.current);return()=>observer.disconnect();},[]);
 useEffect(()=>{if(!full)return;const previous=document.activeElement,old=document.body.style.overflow;document.body.style.overflow='hidden';section.current?.querySelector('.chart-expand')?.focus();const key=e=>{if(e.key==='Escape'&&e.target.getAttribute('aria-expanded')!=='true')setFull(false);if(e.key==='Tab'){const all=[...section.current.querySelectorAll('button:not([disabled]),input,[tabindex="0"]')];if(e.shiftKey&&document.activeElement===all[0]){e.preventDefault();all.at(-1)?.focus();}else if(!e.shiftKey&&document.activeElement===all.at(-1)){e.preventDefault();all[0]?.focus();}}};document.addEventListener('keydown',key);return()=>{document.body.style.overflow=old;document.removeEventListener('keydown',key);previous?.focus?.({preventScroll:true});};},[full]);
 const eligible=useMemo(()=>rows.filter(p=>p.eligible&&(position==='all'||p.position===position)&&(team==='all'||p.team===team)&&p.minutes>=Number(minMinutes)),[rows,position,team,minMinutes]);
 const valid=useMemo(()=>eligible.filter(p=>metricValue(p,x)!==null&&metricValue(p,y)!==null),[eligible,x,y]);
 const compare=(x==='average'&&y==='expected')||(x==='expected'&&y==='average');
 const autoX=autoDomain(compare?valid.flatMap(p=>[metricValue(p,x),metricValue(p,y)]):valid.map(p=>metricValue(p,x)));
 const autoY=compare?autoX:autoDomain(valid.map(p=>metricValue(p,y)));
 const xDomain=bounds?.x||autoX,yDomain=bounds?.y||autoY;
 const searched=valid.filter(p=>`${p.name} ${p.englishName} ${CN[p.team]||p.team}`.toLowerCase().includes(query.toLowerCase()));
 const visible=searched.filter(p=>{const px=metricValue(p,x),py=metricValue(p,y);return px>=xDomain[0]&&px<=xDomain[1]&&py>=yDomain[0]&&py<=yDomain[1];});
 const selected=visible.find(p=>p.id===active)||visible.find(p=>lineup.includes(p.id))||visible[0];
 const {width,height}=canvas,left=width<500?52:68,right=width-(width<500?24:36),top=44,bottom=height-58;
 const sx=v=>mapCoordinate(v,xDomain,left,right),sy=v=>mapCoordinate(v,yDomain,bottom,top);
 const sorted=[...visible].sort((a,b)=>Number(lineup.includes(a.id))-Number(lineup.includes(b.id))||Number(a.id===selected?.id)-Number(b.id===selected?.id));
 const currentPreset=presets.find(p=>p.x===x&&p.y===y)?.key;
 function resetRange(){setDraft({xmin:'',xmax:'',ymin:'',ymax:''});setBounds(null);setError('');}
 function axisChange(key,value){key==='x'?setX(value):setY(value);resetRange();}
 function apply(e){e.preventDefault();try{setBounds({x:applyDomain(autoX,draft.xmin,draft.xmax),y:applyDomain(autoY,draft.ymin,draft.ymax)});setError('');}catch(e){setError(e.message);}}
 function choosePreset(p){setX(p.x);setY(p.y);resetRange();}
 const equalLow=Math.max(xDomain[0],yDomain[0]),equalHigh=Math.min(xDomain[1],yDomain[1]);
 return <section ref={section} className={`panel section avatar-scatter${full?' chart-fullscreen':''}`} role={full?'dialog':undefined} aria-modal={full||undefined} aria-label={full?'放大球员对比图':undefined}>
  <div className="section-head chart-heading"><div><h2>球员对比</h2><div className="chart-legend"><span><i className="legend-dot"/>候选球员</span><span><i className="legend-dot picked"/>当前阵容</span></div></div><div className="chart-actions"><button aria-expanded={rangeOpen} onClick={()=>setRangeOpen(!rangeOpen)}>坐标范围</button><button className="chart-expand" aria-pressed={full} onClick={()=>setFull(!full)}>{full?'退出放大':'放大图表'}</button></div></div>
  <div className="chart-workbench"><div className="chart-sidebar"><div className="chart-presets" aria-label="图表快捷视图">{presets.map(p=><button key={p.key} aria-pressed={currentPreset===p.key} onClick={()=>choosePreset(p)}>{p.label}</button>)}</div>
  <div className="chart-filter-grid"><label>横轴<Select aria-label="散点图横轴" value={x} onChange={e=>axisChange('x',e.target.value)}>{['积分与价格','上场与效率'].map(group=><optgroup key={group} label={group}>{Object.entries(METRICS).filter(([,m])=>m.group===group).map(([key,m])=><option key={key} value={key}>{m.label}</option>)}</optgroup>)}</Select></label><label>纵轴<Select aria-label="散点图纵轴" value={y} onChange={e=>axisChange('y',e.target.value)}>{['积分与价格','上场与效率'].map(group=><optgroup key={group} label={group}>{Object.entries(METRICS).filter(([,m])=>m.group===group).map(([key,m])=><option key={key} value={key}>{m.label}</option>)}</optgroup>)}</Select></label><label>位置<Select aria-label="图表位置筛选" value={position} onChange={e=>setPosition(e.target.value)}><option value="all">全部位置</option><option value="front">前场</option><option value="back">后场</option></Select></label><label>球队<Select aria-label="图表球队筛选" value={team} onChange={e=>setTeam(e.target.value)}><option value="all">全部球队</option>{[...new Set(rows.map(p=>p.team))].sort().map(t=><option key={t} value={t}>{CN[t]||t}</option>)}</Select></label><label>近期分钟<Select aria-label="图表分钟筛选" value={minMinutes} onChange={e=>setMinMinutes(e.target.value)}><option value="0">全部出场时间</option><option value="15">至少 15 分钟</option><option value="20">至少 20 分钟</option><option value="30">至少 30 分钟</option></Select></label><label>头像大小<Select aria-label="图表头像大小" value={size} onChange={e=>setSize(e.target.value)}><option value="12">紧凑</option><option value="16">标准</option><option value="21">大头像</option></Select></label></div>
  {rangeOpen&&<form className="axis-range-panel" onSubmit={apply}><fieldset><legend>横轴 · {METRICS[x].unit}</legend><label>最小值<input aria-label="横轴最小值" inputMode="decimal" type="number" step="any" value={draft.xmin} placeholder={String(autoX[0])} onChange={e=>setDraft({...draft,xmin:e.target.value})}/></label><span>—</span><label>最大值<input aria-label="横轴最大值" inputMode="decimal" type="number" step="any" value={draft.xmax} placeholder={String(autoX[1])} onChange={e=>setDraft({...draft,xmax:e.target.value})}/></label></fieldset><fieldset><legend>纵轴 · {METRICS[y].unit}</legend><label>最小值<input aria-label="纵轴最小值" inputMode="decimal" type="number" step="any" value={draft.ymin} placeholder={String(autoY[0])} onChange={e=>setDraft({...draft,ymin:e.target.value})}/></label><span>—</span><label>最大值<input aria-label="纵轴最大值" inputMode="decimal" type="number" step="any" value={draft.ymax} placeholder={String(autoY[1])} onChange={e=>setDraft({...draft,ymax:e.target.value})}/></label></fieldset><div className="chart-actions"><button className="primary" type="submit">应用范围</button><button type="button" onClick={resetRange}>恢复自动</button></div>{error&&<p className="range-error" role="alert">{error}</p>}</form>}
  <div className="chart-search-row"><input aria-label="图表搜索球员" placeholder="搜索球员 / 球队" value={query} onChange={e=>setQuery(e.target.value)}/><span className="subtle">显示 {visible.length} 人{bounds?` · 范围外 ${searched.length-visible.length} 人`:''}{eligible.length-valid.length?` · 缺少指标 ${eligible.length-valid.length} 人`:''}</span></div>
  {selected&&<button className="chart-player-preview" onClick={()=>{setFull(false);onPlayer(selected);}}><PhotoPreview p={selected}/><span className="chart-preview-name"><strong>{selected.name}</strong><small>{CN[selected.team]||selected.team} · {selected.energy} 能量 · {selected.gamesPlayed} 场</small></span><span className="chart-value-block"><small>预期积分</small><b>{fmt(selected.expected)}</b></span><span className="chart-value-block actual"><small>实际场均积分</small><b>{fmt(selected.average)}</b></span><span className="chart-detail-label">详情 →</span></button>}
  </div><div className="chart-viewport" ref={viewport}><svg className="avatar-chart" viewBox={`0 0 ${width} ${height}`} role="group" aria-label={`${METRICS[x].label}与${METRICS[y].label}球员头像散点图`}>
   {ticksFor(yDomain).map(v=><g key={`y${v}`}><line className="axis-grid" x1={left} x2={right} y1={sy(v)} y2={sy(v)}/><line className="axis-tick" x1={left-4} x2={left} y1={sy(v)} y2={sy(v)}/><text className="axis-text y-tick" x={left-10} y={sy(v)+4} textAnchor="end">{formatTick(v,yDomain)}</text></g>)}
   {ticksFor(xDomain).map(v=><g key={`x${v}`}><line className="axis-grid vertical" x1={sx(v)} x2={sx(v)} y1={top} y2={bottom}/><line className="axis-tick" x1={sx(v)} x2={sx(v)} y1={bottom} y2={bottom+5}/><text className="axis-text x-tick" x={sx(v)} y={bottom+23} textAnchor="middle">{formatTick(v,xDomain)}</text></g>)}
   <line className="axis-baseline" x1={left} x2={right} y1={bottom} y2={bottom}/><line className="axis-baseline" x1={left} x2={left} y1={top} y2={bottom}/>
   {compare&&equalHigh>equalLow&&<g><line className="equal-score-line" x1={sx(equalLow)} y1={sy(equalLow)} x2={sx(equalHigh)} y2={sy(equalHigh)}/><text className="reference-label" x={right-4} y={top+15} textAnchor="end">虚线：预期 = 实际</text></g>}
   {sorted.map(p=><AvatarMark key={p.id} p={p} cx={sx(metricValue(p,x))} cy={sy(metricValue(p,y))} r={Number(size)+(p.id===selected?.id?4:lineup.includes(p.id)?2:0)} clipId={`${id}-${p.id}`} picked={lineup.includes(p.id)} active={p.id===selected?.id} label={p.id===selected?.id} onActivate={setActive} onPlayer={p=>{setFull(false);onPlayer(p);}}/>)}
   <text className="axis-title" x={left} y="21">{METRICS[y].label}（{METRICS[y].unit}）</text><text className="axis-title" x={(left+right)/2} y={height-9} textAnchor="middle">{METRICS[x].label}（{METRICS[x].unit}）</text>
  </svg>{!visible.length&&<p className="chart-empty">没有符合条件的球员</p>}</div></div>
 </section>;
}

function PhotoPreview({p}){const [failed,setFailed]=useState(false);useEffect(()=>setFailed(false),[p.id]);return failed?<span className="chart-preview-fallback">{p.name.slice(-2)}</span>:<img className="chart-preview-photo" src={p.headshot} alt="" onError={()=>setFailed(true)}/>;}
