"""Valida os GeoJSON publicados e atualiza catálogo: python scripts/validate_data.py --catalog."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def coordinates(value):
    if isinstance(value, list) and len(value) >= 2 and isinstance(value[0], (int, float)):
        yield value
    elif isinstance(value, list):
        for child in value:
            yield from coordinates(child)


def inspect(path):
    raw = path.read_bytes()
    data = json.loads(raw)
    assert data.get('type') == 'FeatureCollection', f'{path}: coleção inválida'
    features = data['features']
    bounds = [180, 90, -180, -90]
    for index, feature in enumerate(features):
        geometry = feature.get('geometry')
        assert geometry, f'{path}:{index}: geometria ausente'
        points = list(coordinates(geometry.get('coordinates')))
        assert points, f'{path}:{index}: coordenadas ausentes'
        for lon, lat, *_ in points:
            assert -180 <= lon <= 180 and -90 <= lat <= 90, f'{path}:{index}: coordenada fora dos limites geográficos'
            bounds = [min(bounds[0], lon), min(bounds[1], lat), max(bounds[2], lon), max(bounds[3], lat)]
        props = feature.get('properties', {})
        if path.parent.name in ('municipios', 'setores_censitarios', 'localidades_por_uf'):
            assert len(str(int(props['CD_MUN']))) == 7, f'{path}:{index}: código municipal inválido'
        fields = ['POPULACAO_REAL', 'DOMICILIOS_REAL'] if path.parent.name == 'municipios' else ['POPULACAO', 'DOMICILIOS'] if path.parent.name == 'setores_censitarios' else []
        for field in fields:
            assert isinstance(props.get(field), (float, int)) and props[field] >= 0, f'{path}:{index}: {field} ausente ou inválido'
    return {'path': path.relative_to(ROOT).as_posix(), 'sha256': hashlib.sha256(raw).hexdigest(), 'bytes': len(raw), 'features': len(features), 'bbox': bounds, 'geometryTypes': sorted({f['geometry']['type'] for f in features}), 'source': 'Origem e transformações pendentes de documentação', 'referencePeriod': 'Referência demográfica declarada: Censo 2022; verificar fonte', 'crs': data.get('crs', 'Não declarado; coordenadas verificadas somente quanto aos limites geográficos')}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--catalog', action='store_true')
    args = parser.parse_args()
    patterns = ['infovias.geojson', 'pontos_estrategicos.geojson', 'localidades_por_uf/*.geojson', 'municipios/*.geojson', 'setores_censitarios/*.geojson']
    datasets = [inspect(p) for pattern in patterns for p in sorted(ROOT.glob(pattern))]
    if args.catalog:
        (ROOT / 'data-catalog.json').write_text(json.dumps({'schemaVersion': 1, 'datasets': datasets}, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'{len(datasets)} bases válidas; {sum(d["features"] for d in datasets)} feições. Topologia e procedência não são certificadas por este teste.')
