const base=import.meta.env.BASE_URL;
async function read(path){const response=await fetch(base+path,{cache:'no-store'});if(!response.ok)throw Error('最新数据暂未发布，请稍后刷新');return response.json();}
export async function loadModel(target){
 const manifest=await read('data/manifest.json');
 const date=target||manifest.dates.find(d=>Date.parse(manifest.slates[d].deadline)>Date.now())||manifest.defaultDate;
 if(!manifest.dates.includes(date))throw Error('该比赛日尚未生成，请选择已发布日期');
 const model=await read('data/'+date+'.json');
 if(model.date!==date)throw Error('数据日期不匹配，请稍后刷新');
 model.availableDates=manifest.dates;
 model.meta.publishedAt=manifest.generatedAt;
 return model;
}
