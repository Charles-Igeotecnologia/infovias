const fs = require('node:fs');
const path = require('node:path');
const model = require('../locality-model.js');
const root = path.resolve(__dirname,'..');
const catalog = JSON.parse(fs.readFileSync(path.join(root,'data-catalog.json'),'utf8'));
for (const entry of catalog.datasets) {
    if (!entry.path.startsWith('localidades_por_uf/')) continue;
    const data = JSON.parse(fs.readFileSync(path.join(root,entry.path),'utf8'));
    entry.consolidatedFeatures = model.consolidate(data).features.length;
    console.log(entry.path, entry.features, entry.consolidatedFeatures);
}
catalog.localityConsolidation = 'Mesma UF, município e nome; diferença inferior a 0,0001 grau em cada coordenada. Categorias e atributos de origem preservados. Não certifica identidade cadastral.';
fs.writeFileSync(path.join(root,'data-catalog.json'), JSON.stringify(catalog,null,2)+'\n');
