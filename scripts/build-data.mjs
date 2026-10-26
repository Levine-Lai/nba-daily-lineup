import fs from 'node:fs';
import path from 'node:path';
import {project,nextDate,getDates} from '../lib/nba/model.mjs';
const file=fs.existsSync('data/collected.json')?'data/collected.json':'lib/nba/initial.json';
const raw=JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
const first=nextDate(raw);
const dates=(raw.upcomingDates||getDates(raw).filter(d=>d>=first).slice(0,5));
const output='public/data';fs.mkdirSync(output,{recursive:true});
const slates={};
for(const date of dates){
 const model=project(raw,date);model.availableDates=dates;
 if(model.lineup.length!==5)throw Error(date+': no valid lineup; refusing incomplete publication');
 model.meta.updateIntervalMinutes=30;
 fs.writeFileSync(path.join(output,date+'.json'),JSON.stringify(model));
 if(date===dates[0])fs.writeFileSync(path.join(output,'default.json'),JSON.stringify(model));
 slates[date]={deadline:model.deadline,games:model.games.length,players:model.rows.length};
}
const manifest={schemaVersion:1,defaultDate:dates[0],dates,slates,generatedAt:new Date().toISOString(),collectedAt:raw.fetchedAt,intervalMinutes:30};
fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(manifest));
console.log(JSON.stringify(manifest));
