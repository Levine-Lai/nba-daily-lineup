export const METRICS={
 energy:{label:'当前能量',unit:'能量',group:'积分与价格'},
 expected:{label:'预期积分',unit:'分',group:'积分与价格'},
 average:{label:'实际场均积分',unit:'分',group:'积分与价格'},
 value:{label:'预期性价比',unit:'分 / 能量',group:'积分与价格'},
 minutes:{label:'近期上场时间',unit:'分钟',group:'上场与效率'},
 usage:{label:'使用率',unit:'%',group:'上场与效率'},
 ts:{label:'真实命中率',unit:'%',group:'上场与效率'},
 modelSelection:{label:'模型选中频率',unit:'%',group:'上场与效率'}
};
export function metricValue(p,key){const value=p[key];return Number.isFinite(value)?value*(key==='ts'?100:1):null;}
const clean=v=>Math.abs(v)<1e-10?0:Number(v.toPrecision(12));
function niceStep(raw){const magnitude=10**Math.floor(Math.log10(raw||1));const relative=raw/magnitude;return [1,2,2.5,5,10].find(v=>v>=relative)*magnitude;}
export function autoDomain(values){
 const finite=values.filter(Number.isFinite);if(!finite.length)return [0,1];
 const low=Math.min(...finite),high=Math.max(...finite),span=high-low;
 const padding=Math.max(span*.1,Math.abs(high)*.035,.05);
 const step=niceStep((span+padding*2)/5);
 const min=low>=0?Math.max(0,Math.floor((low-padding)/step)*step):Math.floor((low-padding)/step)*step;
 return [clean(min),clean(Math.max(min+step,Math.ceil((high+padding)/step)*step))];
}
export function ticksFor(domain,count=5){
 const [min,max]=domain;if(!Number.isFinite(min)||!Number.isFinite(max)||max<=min)throw Error('坐标最大值必须大于最小值');
 const step=niceStep((max-min)/count);const ticks=[min];
 for(let v=Math.ceil((min+step*.001)/step)*step;v<max-step*.001;v+=step){if(v>min+step*.001)ticks.push(clean(v));}
 ticks.push(max);return ticks.map(clean);
}
export function formatTick(value,domain){
 return clean(value).toLocaleString('en-US',{maximumFractionDigits:6});
}
export function applyDomain(auto,min,max){
 const parse=(v,fallback)=>v===''||v===undefined?fallback:Number(v);
 const domain=[parse(min,auto[0]),parse(max,auto[1])];
 if(domain.some(v=>!Number.isFinite(v))||domain[0]>=domain[1])throw Error('请输入有效范围，最小值须小于最大值');
 return domain;
}
export function mapCoordinate(value,domain,start,end){return start+(value-domain[0])/(domain[1]-domain[0])*(end-start);}
