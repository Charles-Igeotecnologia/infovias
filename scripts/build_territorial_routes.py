"""Recortes territoriais reproduzíveis; preserva integralmente as bases de origem."""
import json,hashlib
from pathlib import Path
from shapely.geometry import shape,mapping,MultiLineString
from shapely.ops import unary_union
from pyproj import Geod
ROOT=Path(__file__).resolve().parents[1]
GEOD=Geod(ellps='WGS84')
def lines_only(g):
    if g.is_empty:return []
    if g.geom_type=='LineString':return [g]
    if hasattr(g,'geoms'):return [line for part in g.geoms for line in lines_only(part)]
    return []
def clip(feature,area,index):
    original=shape(feature['geometry']);parts=lines_only(original.intersection(area))
    if not parts:return None
    geometry=parts[0] if len(parts)==1 else MultiLineString(parts)
    assert geometry.difference(area).length < 1e-8
    border=original.intersection(area.boundary)
    border_km=sum(GEOD.geometry_length(g) for g in lines_only(border))/1000
    return {'type':'Feature','geometry':mapping(geometry),'properties':{**feature['properties'],'SOURCE_INDEX':index,'CLIPPED_KM':GEOD.geometry_length(geometry)/1000,'BORDER_KM':border_km}}
if __name__=='__main__':
    fs=json.loads((ROOT/'infovias.geojson').read_text(encoding='utf-8'))['features']
    totals={}
    for f in fs:totals[f['properties']['KML_FOLDER']]=totals.get(f['properties']['KML_FOLDER'],0)+GEOD.geometry_length(shape(f['geometry']))/1000
    out=ROOT/'territorial';out.mkdir(exist_ok=True)
    for uf in ['AM','PA','AP','RR']:
        source=ROOT/f'municipios/municipios_{uf}.geojson'
        municipalities=json.loads(source.read_text(encoding='utf-8'))['features']
        area=unary_union([shape(f['geometry']) for f in municipalities])
        def selection(boundary):return [r for i,f in enumerate(fs) if (r:=clip(f,boundary,i))]
        payload={'uf':uf,'sources':{f'municipios/municipios_{uf}.geojson':hashlib.sha256(source.read_bytes()).hexdigest(),'infovias.geojson':hashlib.sha256((ROOT/'infovias.geojson').read_bytes()).hexdigest()},'totalRouteKm':totals,'boundary':{'type':'Feature','properties':{'UF':uf},'geometry':mapping(area)},'lines':selection(area),'municipalities':{str(m['properties']['CD_MUN']):{'boundary':m,'lines':selection(shape(m['geometry']))} for m in municipalities}}
        (out/f'{uf}.json').write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
        print(uf,len(payload['lines']),'segmentos estaduais;',len(municipalities),'municípios; recortes contidos nos limites: OK')
