"""Reproduz a regra atual de deduplicação; não modifica as bases."""
import collections
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]

def unique_rows(features):
    by_name = collections.defaultdict(list)
    kept, removed = [], []
    for index, feature in enumerate(features):
        name = feature['properties']['NM_LOCALIDADE']
        x, y = feature['geometry']['coordinates'][:2]
        match = next((other for other in by_name[name] if abs(other['geometry']['coordinates'][0]-x) < .0001 and abs(other['geometry']['coordinates'][1]-y) < .0001), None)
        if match is not None:
            removed.append({'index': index, 'name': name, 'municipality': feature['properties']['CD_MUN'], 'differentFields': [key for key in set(feature['properties']) | set(match['properties']) if feature['properties'].get(key) != match['properties'].get(key)]})
        else:
            kept.append(feature)
            by_name[name].append(feature)
    return kept, removed

def count(features):
    unique, removed = unique_rows(features)
    near = [f for f in features if f['properties'].get('DIST_INFOVIA') is not None and f['properties']['DIST_INFOVIA'] <= 50]
    near_unique, _ = unique_rows(near)
    return {'records': len(features), 'afterCurrentDeduplication': len(unique), 'removedByCurrentRule': len(removed), 'recordsStoredDistanceUpTo50km': len(near), 'deduplicatedStoredDistanceUpTo50km': len(near_unique)}

if __name__ == '__main__':
    catalog = json.loads((ROOT/'data-catalog.json').read_text(encoding='utf-8'))
    states, municipalities, duplicates = [], [], {}
    for uf in ['AM','PA','AP','RR']:
        data = json.loads((ROOT/f'localidades_por_uf/localidades_{uf}.geojson').read_text(encoding='utf-8'))['features']
        row = {'uf': uf, **count(data)}
        row['catalogCount'] = next(d['features'] for d in catalog['datasets'] if d['path'] == f'localidades_por_uf/localidades_{uf}.geojson')
        states.append(row)
        _, duplicates[uf] = unique_rows(data)
        groups = collections.defaultdict(list)
        for f in data:
            assert f['properties']['SIGLA_UF'] == uf
            groups[str(int(f['properties']['CD_MUN']))].append(f)
        for code, fs in sorted(groups.items()):
            municipalities.append({'uf': uf, 'code': code, 'name': fs[0]['properties']['NM_MUN'], **count(fs)})
        assert sum(m['records'] for m in municipalities if m['uf']==uf) == row['records']
    report = {'method': 'Nome exatamente igual e diferença absoluta inferior a 0.0001 grau em ambas as coordenadas; primeiro registro preservado, mesma regra de analysis.js. Contagem de 50 km usa DIST_INFOVIA cadastrado, não buffer Turf recalculado. Deduplicação não certifica identidade real.', 'states': states, 'municipalities': municipalities, 'removedRecords': duplicates}
    output = ROOT/'auditoria'; output.mkdir(exist_ok=True)
    (output/'contagens-localidades.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    for row in states: print(json.dumps(row))
    print('municipalities', len(municipalities))
    print('capitals',json.dumps([m for m in municipalities if m['code'] in ['1302603','1501402','1600303','1400100']],ensure_ascii=False))
