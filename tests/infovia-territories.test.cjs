const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const crypto=require('node:crypto');const vm=require('node:vm');const territories=require('../infovia-territories.js');
const source=fs.readFileSync('app.js','utf8');
const start=source.indexOf('function obterInfoviasDoEstado('),end=source.indexOf('window.obterInfoviasDoEstado =',start);
const context=vm.createContext({InfoviaTerritories:territories,Set});vm.runInContext(source.slice(start,end),context);
const lines=JSON.parse(fs.readFileSync('infovias.geojson','utf8')).features;
test('índice territorial corresponde às bases atuais',()=>{for(const [path,hash] of Object.entries(territories.sources))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex'),hash);});
test('Roraima restringe infovias sem perder rotas compartilhadas',()=>{assert.deepEqual([...new Set(context.obterInfoviasDoEstado(lines,'RR').map(f=>f.properties.KML_FOLDER))].sort(),['INFOVIA 04','INFOVIA PAC']);assert.equal(context.obterInfoviasDoEstado(lines,'all').length,lines.length);assert.equal(context.obterInfoviasDoEstado(lines,'XX').length,0);assert(context.obterInfoviasDoEstado(lines,'AM').some(f=>f.properties.KML_FOLDER==='INFOVIA 04'));});
