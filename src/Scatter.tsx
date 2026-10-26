// @ts-nocheck
import {useState,useRef,useEffect,useId} from 'react';
import {CN} from '../lib/nba/model.mjs';

const fmt=(v,d=1)=>Number.isFinite(+v)&&v!==null?Number(v).toFixed(d):'—';
const fields={energy:'当前能量',expected:'预期积分',value:'预期性价比',minutes:'近期分钟',usage:'使用率',ts:'真实命中率',modelSelection:'模型选中频率'};

function AvatarMark({p,cx,cy,r,clipId,picked,active,onActivate,onPlayer}){
 const urls=[`https://cdn.nba.com/headshots/nba/latest/260x190/${p.id}.png`,p.headshot].filter(Boolean);
 const [source,setSource]=useState(0);
 return <g className={`avatar-point${picked?' picked':''}${active?' is-active':''}`} transform={`translate(${cx},${cy})`} role="button" tabIndex={0} aria-label={`${p.name}，${CN[p.team]||p.team}，预期${fmt(p.expected)}分`} onMouseEnter={()=>onActivate(p.id)} onFocus={()=>onActivate(p.id)} onClick={()=>{onActivate(p.id);onPlayer(p);}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onPlayer(p);}}}>
  <defs><clipPath id={clipId}><circle r={r-1}/></clipPath></defs>
  <circle className="avatar-bg" r={r}/>
  {source>=urls.length&&<text className="avatar-initial" y="5" textAnchor="middle">{p.name.slice(-2)}</text>}
  {source<urls.length&&<image href={urls[source]} x={-r} y={-r} width={r*2} height={r*2} preserveAspectRatio="xMidYMin slice" clipPath={`url(#${clipId})`} onError={()=>setSource(i=>i+1)}/>}
  <circle className="avatar-outline" r={r}/>
  <title>{`${p.name} · ${CN[p.team]||p.team} · 预期 ${fmt(p.expected)}分 · 能量 ${p.energy}`}</title>
 </g>;
}

export default function Scatter({rows,lineup,onPlayer}){
 const [x,setX]=useState('energy'),[y,setY]=useState('expected'),[zoom,setZoom]=useState(1),[position,setPosition]=useState('all'),[query,setQuery]=useState(''),[active,setActive]=useState(null),[full,setFull]=useState(false),[width,setWidth]=useState(1100);
 const viewport=useRef(null),section=useRef(null),id=useId().replace(/:/g,'');
 useEffect(()=>{if(!viewport.current)return;const observer=new ResizeObserver(([e])=>setWidth(Math.max(1000,e.contentRect.width)));observer.observe(viewport.current);return()=>observer.disconnect();},[]);
 useEffect(()=>{if(!full)return;const previous=document.activeElement;const old=document.body.style.overflow;document.body.style.overflow='hidden';section.current?.querySelector('.chart-expand')?.focus();const key=e=>{if(e.key==='Escape')setFull(false);if(e.key==='Tab'){const all=[...section.current.querySelectorAll('button:not([disabled]),select,input,[tabindex="0"]')];if(e.shiftKey&&document.activeElement===all[0]){e.preventDefault();all.at(-1)?.focus();}else if(!e.shiftKey&&document.activeElement===all.at(-1)){e.preventDefault();all[0]?.focus();}}};document.addEventListener('keydown',key);return()=>{document.body.style.overflow=old;document.removeEventListener('keydown',key);previous?.focus?.();};},[full]);
 const eligible=rows.filter(p=>p.eligible&&(position==='all'||p.position===position));
 const valid=eligible.filter(p=>Number.isFinite(p[x])&&Number.isFinite(p[y]));
 const visible=valid.filter(p=>`${p.name} ${p.englishName} ${CN[p.team]||p.team}`.toLowerCase().includes(query.toLowerCase()));
 const mx=Math.max(...valid.map(p=>p[x]),1)*1.08,my=Math.max(...valid.map(p=>p[y]),1)*1.12;
 const left=64,right=width-48,top=48,bottom=570;
 const selected=visible.find(p=>p.id===active)||visible.find(p=>lineup.includes(p.id))||visible[0];
 useEffect(()=>{if(!selected||!viewport.current)return;const frame=viewport.current;const px=(left+selected[x]/mx*(right-left))*zoom,py=(bottom-selected[y]/my*(bottom-top))*zoom;frame.scrollTo({left:Math.max(0,px-frame.clientWidth/2),top:Math.max(0,py-frame.clientHeight/2),behavior:'instant'});},[zoom,query,position,x,y,width]);
 const sorted=[...visible].sort((a,b)=>Number(lineup.includes(a.id))-Number(lineup.includes(b.id))||Number(a.id===selected?.id)-Number(b.id===selected?.id));
 const labelValue=(v,field)=>field==='ts'?fmt(v*100)+'%':field==='usage'||field==='modelSelection'?fmt(v)+'%':fmt(v,field==='value'?2:1);
 return <section ref={section} className={`panel section avatar-scatter${full?' chart-fullscreen':''}`} role={full?'dialog':undefined} aria-modal={full||undefined} aria-label={full?'放大球员对比图':undefined}>
  <div className="section-head"><h2>球员对比</h2><div className="toolbar"><label className="subtle">横轴 <select aria-label="散点图横轴" value={x} onChange={e=>setX(e.target.value)}>{Object.entries(fields).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><label className="subtle">纵轴 <select aria-label="散点图纵轴" value={y} onChange={e=>setY(e.target.value)}>{Object.entries(fields).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><button className="chart-expand" aria-pressed={full} onClick={()=>setFull(!full)}>{full?'退出放大':'放大图表'}</button></div></div>
  <div className="filter-row chart-controls"><input aria-label="图表搜索球员" placeholder="搜索图中球员 / 球队" value={query} onChange={e=>setQuery(e.target.value)}/><select aria-label="图表位置筛选" value={position} onChange={e=>setPosition(e.target.value)}><option value="all">全部位置</option><option value="front">前场</option><option value="back">后场</option></select><div className="button-row"><button className="small" aria-label="缩小图表" disabled={zoom<=1} onClick={()=>setZoom(z=>Math.max(1,z-.5))}>−</button><span className="subtle chart-scale">{zoom*100}%</span><button className="small" aria-label="放大图表比例" disabled={zoom>=3} onClick={()=>setZoom(z=>Math.min(3,z+.5))}>＋</button></div><span className="subtle">{visible.length} 人 · 绿框为当前阵容</span></div>
  {selected&&<button className="chart-player-preview" onClick={()=>{setFull(false);onPlayer(selected);}}><PhotoPreview p={selected}/><span className="chart-preview-name"><strong>{selected.name}</strong><small>{CN[selected.team]||selected.team} · {selected.position==='front'?'前场':'后场'}</small></span><span><small>{fields[x]}</small><b>{labelValue(selected[x],x)}</b></span><span><small>{fields[y]}</small><b>{labelValue(selected[y],y)}</b></span><span className="chart-detail-label">球员详情 →</span></button>}
  <div className="chart-viewport" ref={viewport} aria-label="球员头像图表，可横向及纵向滚动"><svg className="avatar-chart" width={width*zoom} height={640*zoom} viewBox={`0 0 ${width} 640`} role="group" aria-label={`${fields[x]}与${fields[y]}球员头像散点图`}>
   {[0,1,2,3,4].map(i=><g key={i}><line className="axis" x1={left} x2={right} y1={bottom-i*(bottom-top)/4} y2={bottom-i*(bottom-top)/4}/><text className="axis-text" x={left-12} y={bottom+4-i*(bottom-top)/4} textAnchor="end">{fmt(my*i/4,my<=2?2:0)}</text><text className="axis-text" x={left+i*(right-left)/4} y={bottom+28} textAnchor="middle">{fmt(mx*i/4,mx<=2?2:0)}</text></g>)}
   {sorted.map(p=><AvatarMark key={p.id} p={p} cx={left+p[x]/mx*(right-left)} cy={bottom-p[y]/my*(bottom-top)} r={p.id===selected?.id?25:lineup.includes(p.id)?22:18} clipId={`${id}-avatar-${p.id}`} picked={lineup.includes(p.id)} active={p.id===selected?.id} onActivate={setActive} onPlayer={p=>{setFull(false);onPlayer(p);}}/>)}
   <text className="axis-text" x={left} y="22">{fields[y]}</text><text className="axis-text" x={right} y="624" textAnchor="end">{fields[x]}</text>
  </svg></div>
  {!visible.length&&<p className="empty">没有符合条件的球员</p>}
  <p className="section-note">悬停或聚焦头像查看姓名，点击打开详情。缺少指标的 {eligible.length-valid.length} 人未画点。</p>
 </section>;
}

function PhotoPreview({p}){const [failed,setFailed]=useState(false);useEffect(()=>setFailed(false),[p.id]);return failed?<span className="chart-preview-fallback">{p.name.slice(-2)}</span>:<img className="chart-preview-photo" src={p.headshot} alt="" onError={()=>setFailed(true)}/>;}
