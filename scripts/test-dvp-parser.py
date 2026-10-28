import unittest
from pathlib import Path
from importlib.util import spec_from_file_location,module_from_spec
spec=spec_from_file_location('collect_dvp',Path(__file__).with_name('collect-dvp.py'));module=module_from_spec(spec);spec.loader.exec_module(module)
class ParserTest(unittest.TestCase):
 def fixture(self):
  teams=['ATL','BOS','BKN','CHA','CHI','CLE','DAL','DEN','DET','GS','HOU','IND','LAC','LAL','MEM','MIA','MIL','MIN','NO','NY','OKC','ORL','PHI','PHO','POR','SAC','SA','TOR','UTA','WAS']
  cells=''.join('<td><span>10.5</span><span>99</span></td>' for _ in range(9))
  rows=''.join(f'<tr><td>{p}</td><td><span>{t}</span> <span>120</span></td>{cells}</tr>' for p in ['PG','SG','SF','PF','C'] for t in teams)
  return '<option selected="selected" value="1">Show data from the entire 2026-27 NBA Season</option><strong>Updated:</strong> 27 October 2026<table id="ContentPlaceHolder1_GridView1">'+rows+'</table>'
 def test_numbers_not_source_ranks_and_aliases(self):
  result=module.parse_html(self.fixture());self.assertEqual(len(result['rows']),150);self.assertEqual(result['rows'][0]['points'],10.5);self.assertEqual(result['sourceDate'],'2026-10-27');self.assertIn('GSW',{r['team'] for r in result['rows']})
 def test_missing_row_rejected(self):
  html=self.fixture();start=html.index('<tr>');end=html.index('</tr>',start)+5
  with self.assertRaises(ValueError):module.parse_html(html[:start]+html[end:])
 def test_period_unverified_rejected(self):
  with self.assertRaises(ValueError):module.parse_html(self.fixture().replace('selected="selected"',''))
if __name__=='__main__':unittest.main()
