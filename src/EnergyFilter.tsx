// @ts-nocheck
import {useId} from 'react';

export function energyRangeError(range){
 const values=[range.min,range.max].filter(v=>v!=='');
 if(values.some(v=>!Number.isFinite(Number(v))||Number(v)<0))return '能量须为非负数字';
 if(range.min!==''&&range.max!==''&&Number(range.min)>Number(range.max))return '最低能量不能大于最高能量';
 return '';
}
export function matchesEnergy(energy,range){
 return !energyRangeError(range)&&Number.isFinite(energy)&&(range.min===''||energy>=Number(range.min))&&(range.max===''||energy<=Number(range.max));
}
export default function EnergyFilter({range,onChange,prefix}){
 const id=useId(),error=energyRangeError(range);
 return <fieldset className="energy-filter"><legend>能量区间</legend><div className="energy-filter-fields"><label><span>最低能量</span><input type="number" min="0" step="any" inputMode="decimal" aria-label={`${prefix}最低能量`} aria-invalid={!!error} aria-describedby={error?id:undefined} placeholder="不限" value={range.min} onChange={e=>onChange({...range,min:e.target.value})}/></label><span className="energy-range-dash" aria-hidden="true">—</span><label><span>最高能量</span><input type="number" min="0" step="any" inputMode="decimal" aria-label={`${prefix}最高能量`} aria-invalid={!!error} aria-describedby={error?id:undefined} placeholder="不限" value={range.max} onChange={e=>onChange({...range,max:e.target.value})}/></label><button type="button" disabled={range.min===''&&range.max===''} onClick={()=>onChange({min:'',max:''})} aria-label={`${prefix}清除能量区间`}>清除</button></div>{error&&<p id={id} className="range-error" role="alert">{error}</p>}</fieldset>;
}
