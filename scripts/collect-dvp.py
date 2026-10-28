"""Collect public per-48-minute DvP facts. No source composite ranking is reused."""
import json,re,sys,urllib.request
from datetime import datetime,timezone
from html.parser import HTMLParser
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
URL='https://hashtagbasketball.com/nba-defense-vs-position'
OUTPUT=ROOT/'public/data/position-defense.json'
ALIASES={'GS':'GSW','PHO':'PHX','NO':'NOP','NY':'NYK','SA':'SAS'}
class PositionTable(HTMLParser):
 def __init__(self):
  super().__init__();self.inside=False;self.cell=False;self.row=[];self.rows=[];self.text=[]
 def handle_starttag(self,tag,attrs):
  if tag=='table' and dict(attrs).get('id')=='ContentPlaceHolder1_GridView1':self.inside=True
  if self.inside and tag=='tr':self.row=[]
  if self.inside and tag=='td':self.cell=True;self.text=[]
 def handle_data(self,data):
  if self.cell:self.text.append(data)
 def handle_endtag(self,tag):
  if self.inside and tag=='td':self.row.append(' '.join(self.text).strip());self.cell=False
  if self.inside and tag=='tr' and self.row:self.rows.append(self.row)
  if self.inside and tag=='table':self.inside=False

def parse_html(html):
 selected=re.search(r'<option[^>]*selected[^>]*>Show data from the entire (\d{4}-\d{2}) NBA Season',html,re.I)
 if not selected:raise ValueError('Cannot confirm full-season selection')
 updated=re.search(r'<strong>Updated:</strong>\s*(\d{1,2} [A-Za-z]+ \d{4})',html)
 if not updated:raise ValueError('Missing source update date')
 parser=PositionTable();parser.feed(html);rows=[]
 keys=['points','fgPct','ftPct','threes','rebounds','assists','steals','blocks','turnovers']
 for cells in parser.rows:
  if len(cells)!=11 or cells[0] not in ['PG','SG','SF','PF','C']:raise ValueError('Unexpected DvP row schema')
  team=cells[1].split()[0];row={'team':ALIASES.get(team,team),'position':cells[0]}
  for key,cell in zip(keys,cells[2:]):
   number=re.match(r'^\s*(\d+(?:\.\d+)?)',cell)
   if not number:raise ValueError('Missing statistic '+key)
   row[key]=float(number.group(1))
  rows.append(row)
 if len(rows)!=150 or len({(r['team'],r['position']) for r in rows})!=150 or len({r['team'] for r in rows})!=30:raise ValueError('Expected 30 teams × 5 unique positions')
 return {'season':selected.group(1),'sourceDate':datetime.strptime(updated.group(1),'%d %B %Y').date().isoformat(),'sourceUrl':URL,'sourceName':'Hashtag Basketball','basis':'per48','positions':['PG','SG','SF','PF','C'],'rows':rows}

def main():
 now=datetime.now(timezone.utc).isoformat()
 try:
  req=urllib.request.Request(URL,headers={'User-Agent':'Mozilla/5.0 (PersonalNBAStaticDashboard/1.0)'})
  with urllib.request.urlopen(req,timeout=30) as response:html=response.read().decode('utf-8')
  result=parse_html(html)
  manifest=json.loads((ROOT/'public/data/manifest.json').read_text(encoding='utf-8-sig'))
  expected=json.loads((ROOT/f'public/data/{manifest["defaultDate"]}.json').read_text(encoding='utf-8-sig'))['season']
  if result['season']!=expected:raise ValueError('Position source season does not match lineup season')
  result.update({'fetchedAt':now,'lastAttemptAt':now,'status':'ok'})
 except Exception as exc:
  if not OUTPUT.exists():raise
  result=json.loads(OUTPUT.read_text(encoding='utf-8-sig'));result.update({'status':'stale','lastAttemptAt':now,'error':str(exc)})
 OUTPUT.parent.mkdir(exist_ok=True,parents=True)
 OUTPUT.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
 print(json.dumps({'sourceDate':result['sourceDate'],'rows':len(result['rows']),'status':result['status']}))
if __name__=='__main__':main()
