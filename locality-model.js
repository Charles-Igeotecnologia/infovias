const LocalityModel = (() => {
    function consolidate(collection) {
        const groups = new Map(), features = [];
        for (const source of collection.features) {
            const p = source.properties, coordinates = source.geometry.coordinates;
            const key = `${p.SIGLA_UF}|${p.CD_MUN}|${p.NM_LOCALIDADE}`;
            const candidates = groups.get(key) || [];
            let target = candidates.find(f => Math.abs(f.geometry.coordinates[0]-coordinates[0]) < 0.0001 && Math.abs(f.geometry.coordinates[1]-coordinates[1]) < 0.0001);
            if (!target) {
                target = {type:'Feature', geometry:source.geometry, properties:{...p, CATEGORIAS:[], SUBCATEGORIAS:[], REGISTROS_ORIGEM:[]}};
                candidates.push(target); groups.set(key,candidates); features.push(target);
            }
            const props = target.properties;
            if (p.CT_LOCALIDADE && !props.CATEGORIAS.includes(p.CT_LOCALIDADE)) props.CATEGORIAS.push(p.CT_LOCALIDADE);
            if (p.SCT_LOCALIDADE && !props.SUBCATEGORIAS.includes(p.SCT_LOCALIDADE)) props.SUBCATEGORIAS.push(p.SCT_LOCALIDADE);
            props.REGISTROS_ORIGEM.push({...p});
        }
        return {...collection, features};
    }
    function matches(feature, category) { return category === 'all' || (feature.properties.CATEGORIAS || [feature.properties.CT_LOCALIDADE]).includes(category); }
    function categories(feature) { return (feature.properties.CATEGORIAS || [feature.properties.CT_LOCALIDADE]).slice().sort().join(' / '); }
    function territory(features, uf, municipality, category) {
        return features.filter(f => (uf === 'all' || f.properties.SIGLA_UF === uf) && (municipality === 'all' || String(f.properties.CD_MUN) === String(municipality)) && matches(f, category));
    }
    return {consolidate,matches,categories,territory};
})();
if (typeof module !== 'undefined') module.exports = LocalityModel;
