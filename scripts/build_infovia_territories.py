"""Associação espacial entre rotas e UFs. Requer Shapely; não altera as bases."""
import json,hashlib
from pathlib import Path
from shapely.geometry import shape
from shapely.ops import unary_union
ROOT=Path(__file__).resolve().parents[1]
lines=json.loads((ROOT/'infovias.geojson').read_text(encoding='utf-8'))['features']
result={};sources={}
for uf in ['AM','PA','AP','RR']:
    p=ROOT/f'municipios/municipios_{uf}.geojson'
    area=unary_union([shape(f['geometry']) for f in json.loads(p.read_text(encoding='utf-8'))['features']])
    names=sorted({f['properties']['KML_FOLDER'] for f in lines if shape(f['geometry']).intersects(area)})
    result[uf]=names;sources[str(p.relative_to(ROOT)).replace('\\','/')]=hashlib.sha256(p.read_bytes()).hexdigest()
    print(uf, names)
sources['infovias.geojson']=hashlib.sha256((ROOT/'infovias.geojson').read_bytes()).hexdigest()
payload={'byState':result,'sources':sources,'method':'Interseção do traçado com a união dos limites municipais da UF, incluindo contato na divisa. Associação espacial na versão local da base; não comprova responsabilidade administrativa.'}
(ROOT/'infovia-territories.js').write_text('const InfoviaTerritories = '+json.dumps(payload,ensure_ascii=False,indent=2)+';\nif (typeof module !== "undefined") module.exports = InfoviaTerritories;\n',encoding='utf-8')
