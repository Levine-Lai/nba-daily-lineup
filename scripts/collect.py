"""Collect public NBA data for static Pages. No login or third-party proxy."""
import concurrent.futures
import json
import time
import urllib.request
from datetime import datetime, timezone, timedelta
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent
CACHE=ROOT/'data'/'collected.json'
SEED=ROOT/'lib'/'nba'/'initial.json'
NBA='https://nbabao5.top/api/nba/'
SUREN='https://www.surennba.com/NBA/data/'
UA='Mozilla/5.0 (compatible; PersonalNBAStaticDashboard/1.0)'

def request(url):
    last=None
    for attempt in range(3):
        try:
            req=urllib.request.Request(url,headers={'User-Agent':UA,'Accept':'application/json'})
            with urllib.request.urlopen(req,timeout=25) as response:
                return json.load(response)
        except Exception as exc:
            last=exc
            if attempt<2:time.sleep(attempt+1)
    raise RuntimeError(str(last))

def main():
    seed=json.loads(SEED.read_text(encoding='utf-8-sig'))
    old=json.loads(CACHE.read_text(encoding='utf-8-sig')) if CACHE.exists() else seed
    errors=[]
    # If core price/schedule data fails, keep the previous published site.
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        p=executor.submit(request,NBA+'players');s=executor.submit(request,NBA+'schedule')
        players,schedule=p.result(),s.result()
    season=players['statsSeason']
    start=int(season[:4]);prior=f'{start-1}-{str(start)[-2:]}'
    now=datetime.now(timezone.utc)
    games=[g for g in schedule['games'] if g.get('phase')=='regular']
    by_date={d:[g for g in games if g['date']==d] for d in sorted({g['date'] for g in games})}
    upcoming=[d for d,gs in by_date.items() if min(datetime.fromisoformat(g['utc'].replace('Z','+00:00')) for g in gs)-timedelta(minutes=15)>now][:5]
    if not upcoming:raise RuntimeError('No open slates in schedule')
    target=upcoming[0]
    def soft(label,url,fallback):
        try:return request(url)
        except Exception as exc:
            errors.append(label+': '+str(exc))
            return fallback
    jobs={
        'injuries':(NBA+'injuries?date='+target,old.get('injuries',{})),
        'energy':(NBA+'energy-changes',old.get('energy',{})),
        'teams':(SUREN+f'teams/{season}-regular.json',old.get('teams',{})),
        'priorTeams':(SUREN+f'teams/{prior}-regular.json',old.get('priorTeams',{})),
        'advanced':(SUREN+f'player/player-stats-{season}-advanced.json',old.get('advanced',{})),
        'shooting':(SUREN+f'player/player-stats-{season}-shooting.json',old.get('shooting',{})),
    }
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
        futures={k:executor.submit(soft,k,url,previous) for k,(url,previous) in jobs.items()}
        extra={k:v.result() for k,v in futures.items()}
    for key in ('teams','priorTeams'):
        extra[key]['teams']=[{k:v for k,v in t.items() if k!='stats'} for t in extra[key].get('teams',[])]
    if extra['teams'].get('meta',{}).get('season')!=season:
        raise RuntimeError('Current advanced team season is unavailable; refusing mixed-season publish')
    playing={t for d in upcoming for g in by_date[d] for t in [g['home'],g['away']]}
    candidates=[p for p in players['players'] if p.get('gamesPlayed',0)>0 and p['team'] in playing]
    logs=dict(old.get('logs',{})) if old.get('players',{}).get('statsSeason')==season else {}
    versions=dict(old.get('logVersions',{}))
    refreshed=0
    def player_log(p):
        version=f'{season}:{p["gamesPlayed"]}'
        if versions.get(p['id'])==version and p['id'] in logs:return p['id'],logs[p['id']],version,False
        previous=logs.get(p['id'],{})
        d=soft('log '+p['id'],NBA+'player-log?id='+p['id']+'&recent=60',previous)
        recent=d.get('recent',[])[:30]
        current=[g for g in recent if g.get('seasonLabel')==season and g.get('seasonType')=='regular']
        # If a stale source trails the season count, retry on the next run.
        complete=len(current)>=p['gamesPlayed'] or p['gamesPlayed']>=30
        return p['id'],{'recent':recent},version if complete else '',True
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
        for ident,d,version,changed in executor.map(player_log,candidates):
            logs[ident]=d;versions[ident]=version;refreshed+=changed
    history=[]
    def historical(i):
        d=(datetime.fromisoformat(target)-timedelta(days=i)).date().isoformat()
        previous=next((h for h in old.get('history',[]) if h.get('dateKey')==d),{'dateKey':d,'hot':{'front':[],'back':[]}})
        return soft('heat '+d,NBA+'heat?date='+d,previous)
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:history=list(executor.map(historical,range(5)))
    # Timestamp the completed collection separately from source-generated times.
    result={**extra,'players':players,'schedule':schedule,'logs':logs,'logVersions':versions,'history':history,'errors':errors,'fallback':bool(errors),'fetchedAt':datetime.now(timezone.utc).isoformat(),'upcomingDates':upcoming}
    CACHE.parent.mkdir(exist_ok=True)
    temp=CACHE.with_suffix('.tmp')
    temp.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    temp.replace(CACHE)
    print(json.dumps({'season':season,'dates':upcoming,'log_requests':refreshed,'cached_logs':len(candidates)-refreshed,'fallbacks':len(errors),'errors':errors[:8]},ensure_ascii=False))

if __name__=='__main__':main()
