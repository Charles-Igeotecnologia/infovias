const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const deferred = () => { let resolve; const promise = new Promise(r => resolve = r); return {promise, resolve}; };

test('chamadas concorrentes aguardam o mesmo carregamento de UF', async () => {
    const source = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
    const loader = source.slice(source.indexOf('const localityRequests'), source.indexOf('async function carregarLocalidadesEstadoImpl'));
    const gate = deferred(); let calls = 0;
    const context = vm.createContext({Map, carregarLocalidadesEstadoImpl: async () => { calls++; await gate.promise; return 'loaded'; }});
    vm.runInContext(loader, context);
    const first = context.carregarLocalidadesEstado('AM');
    const second = context.carregarLocalidadesEstado('AM');
    assert.equal(first, second);
    assert.equal(calls, 1);
    gate.resolve();
    assert.equal(await second, 'loaded');
});

test('mudança de critérios descarta a publicação anterior e executa a mais recente', async () => {
    const source = fs.readFileSync(path.join(root, 'analysis.js'), 'utf8');
    const queue = source.slice(source.indexOf('    let analysisRevision'), source.indexOf('    async function processarAnaliseEspacial'));
    const gate = deferred(); const calls = []; const events = [];
    const context = vm.createContext({Promise, activeBufferLayer: {toGeoJSON: () => ({features: []})}, cancelBuffer: null, btnExport: {}, btnReport: {}, localidadesAfetadasList: [], console,
        CustomEvent: class { constructor(type, options) {this.type = type; this.detail = options.detail;} },
        window: {dispatchEvent: event => events.push(event)},
        processarAnaliseEspacial: async revision => {calls.push(revision); if (revision === 1) await gate.promise;},
    });
    vm.runInContext(queue, context);
    const first = context.executarAnaliseEspacial();
    await new Promise(resolve => setImmediate(resolve));
    const second = context.executarAnaliseEspacial();
    gate.resolve(); await Promise.all([first, second]);
    assert.deepEqual(calls, [1, 2]);
    assert.equal(events.filter(e => e.type === 'analysis-results').length, 1);
    assert.equal(events.filter(e => e.detail.state === 'ready').length, 1);
});
