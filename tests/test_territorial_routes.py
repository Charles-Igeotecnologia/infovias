import unittest,json,hashlib,sys
from pathlib import Path
from shapely.geometry import shape,box,LineString,MultiLineString,mapping
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from build_territorial_routes import clip
ROOT=Path(__file__).resolve().parents[1]
class TerritorialRoutes(unittest.TestCase):
 def test_crossing_and_inside(self):
  boundary=box(0,0,1,1)
  f={'geometry':mapping(MultiLineString([[(-1,.5),(2,.5)],[(.2,.2),(.8,.2)]])),'properties':{'KML_FOLDER':'test'}}
  result=clip(f,boundary,0);g=shape(result['geometry'])
  self.assertAlmostEqual(g.length,1.6);self.assertTrue(boundary.covers(g))
  self.assertIsNone(clip({'geometry':mapping(LineString([(-2,-2),(-1,-1)])),'properties':{}},boundary,1))
 def test_shared_border(self):
  line={'geometry':mapping(LineString([(0,0),(1,0)])),'properties':{}}
  result=clip(line,box(0,0,1,1),0)
  self.assertGreater(result['properties']['BORDER_KM'],0)
  self.assertAlmostEqual(result['properties']['BORDER_KM'],result['properties']['CLIPPED_KM'])
 def test_all_published_clips(self):
  municipalities=0
  for uf in ['AM','PA','AP','RR']:
   data=json.loads((ROOT/f'territorial/{uf}.json').read_text(encoding='utf-8'))
   for path,digest in data['sources'].items():self.assertEqual(hashlib.sha256((ROOT/path).read_bytes()).hexdigest(),digest)
   for territory in [data,*data['municipalities'].values()]:
    boundary=shape(territory['boundary']['geometry'])
    for f in territory['lines']:
     self.assertLess(shape(f['geometry']).difference(boundary).length,1e-8)
     self.assertGreater(f['properties']['CLIPPED_KM'],0)
   municipalities+=len(data['municipalities'])
  self.assertEqual(municipalities,237)
if __name__=='__main__':unittest.main()
