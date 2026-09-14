// Interface e registro dos critérios da análise, sem dependências adicionais.
(() => {
    const byId = id => document.getElementById(id);
    const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const section = byId('select-uf').closest('.sidebar-section');
    const controls = document.createElement('div');
    controls.innerHTML = `<label for="analysis-mode">Modo de análise</label><select id="analysis-mode" class="custom-select"><option value="buffer">Área de influência</option><option value="municipal">Análise territorial</option></select><p id="analysis-summary"></p><p id="analysis-status" role="status" aria-live="polite">Selecione os critérios para começar.</p><details><summary>Como interpretar os indicadores</summary><p id="analysis-method"></p><p>Capital: todo o território dos municípios de Manaus, Belém, Macapá e Boa Vista. Interior: demais municípios. Categorias filtram localidades; os totais demográficos descrevem a área selecionada.</p><p>Setores disponíveis: recorte de 50 km. A contagem municipal de setores se refere apenas a esse recorte. Referência demográfica declarada na aplicação: Censo 2022; procedência e transformações devem ser conferidas no catálogo.</p><a href="data-catalog.json" target="_blank" rel="noopener">Catálogo das bases</a></details>`;
    section.querySelector('h3').after(controls);
    const mode = byId('analysis-mode');
    const municipality = byId('select-municipio');
    const catalogPromise = fetch('data-catalog.json').then(r => { if (!r.ok) throw new Error('Catálogo indisponível'); return r.json(); }).catch(() => null);
    window.showAnalysisReport = html => {
        const dialog = document.createElement('dialog');
        dialog.style.cssText = 'width:95vw;height:94vh;max-width:1200px;margin:auto;border:1px solid #64748b;border-radius:12px;padding:16px;background:#fff';
        const bar = document.createElement('div');
        bar.style.cssText = 'display:flex;gap:12px;padding-bottom:12px';
        const frame = document.createElement('iframe');
        frame.title = 'Relatório da análise territorial';
        frame.style.cssText = 'width:100%;height:calc(100% - 48px);border:0';
        frame.setAttribute('sandbox', 'allow-same-origin allow-modals');
        frame.srcdoc = html.replace(/<div class="no-print-bar">[\s\S]*?<\/div>\s*<\/div>/, '');
        for (const [label, action] of [
            ['Imprimir / PDF', () => frame.contentWindow.print()],
            ['Baixar HTML', () => { const url = URL.createObjectURL(new Blob([html], {type:'text/html'})); const a = document.createElement('a'); a.href = url; a.download = 'relatorio-geografico.html'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }],
            ['Fechar', () => dialog.close()]
        ]) { const button = document.createElement('button'); button.textContent = label; button.style.cssText = 'padding:10px 16px;cursor:pointer'; button.addEventListener('click', action); bar.append(button); }
        dialog.append(bar, frame); document.body.append(dialog);
        dialog.addEventListener('close', () => dialog.remove()); dialog.showModal();
    };
    let snapshot = null;
    let results = [];
    const countNote = document.createElement('p'); countNote.id = 'count-method'; countNote.style.fontSize = '12px'; section.append(countNote);
    let reportMap = '';
    function buildReportMap(area, features) {
        if (!area?.features?.length) return '';
        const bounds = turf.bbox(area);
        const project = ([lon, lat]) => [lon * Math.PI / 180, Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360))];
        const [left, bottom] = project([bounds[0], bounds[1]]);
        const [right, top] = project([bounds[2], bounds[3]]);
        const scale = Math.min(660 / Math.max(right-left, 1e-9), 320 / Math.max(top-bottom, 1e-9));
        const point = c => { const [x,y] = project(c); return [(350 + (x-(left+right)/2)*scale).toFixed(1), (180 - (y-(top+bottom)/2)*scale).toFixed(1)]; };
        const ringPath = ring => ring.map((c,i) => (i ? 'L' : 'M') + point(c).join(',')).join(' ') + 'Z';
        let paths = '';
        area.features.forEach(f => {
            const polygons = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [];
            polygons.forEach(poly => paths += `<path d="${poly.map(ringPath).join(' ')}" fill="#cdebf6" fill-rule="evenodd" stroke="#16799b" stroke-width="1"/>`);
        });
        const dots = features.map(f => { const [x,y] = point(f.geometry.coordinates); return `<circle cx="${x}" cy="${y}" r="2" fill="#b53629"/>`; }).join('');
        const km = (100 / scale * 6371 * Math.cos((bounds[1]+bounds[3])/2 * Math.PI/180)).toFixed(1);
        return `<figure style="break-inside:avoid;margin:20px 0"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 410" role="img" aria-label="Área analisada e localidades selecionadas" style="width:100%;background:#f8fafc;border:1px solid #cbd5e1">${paths}${dots}<text x="675" y="24" text-anchor="middle" font-size="13">N ↑</text><path d="M25,365v6h100v-6" fill="none" stroke="#172838"/><text x="25" y="389" font-size="11">${km} km (aprox. no centro)</text><text x="250" y="389" font-size="11">Azul: área analisada • Vermelho: localidades</text></svg><figcaption>Esquema cartográfico da seleção em projeção Mercator. Sem mapa base. As feições refletem a versão local dos dados.</figcaption></figure>`;
    }
    const selected = id => { const el = byId(id); return el.options?.[el.selectedIndex]?.text || el.value; };
    function criteria() {
        return `${selected('analysis-mode')} • ${selected('select-uf')} • ${mode.value === 'municipal' ? selected('select-municipio') : selected('select-infovia') + ' • ' + byId('slider-distancia').value + ' km'} • ${selected('select-categoria-ct')}`;
    }
    function sync() {
        const territorial = mode.value === 'municipal';
        municipality.closest('.control-group').hidden = !territorial;
        for (const id of ['select-infovia', 'slider-distancia']) byId(id).closest('.control-group').hidden = territorial;
        byId('analysis-summary').textContent = criteria();
        byId('analysis-method').textContent = territorial
            ? 'Totais demográficos do município presentes na base. Localidades selecionadas por código municipal.'
            : 'Estimativa: soma integral dos setores cujo centroide está no buffer. Não representa uma medição exata da população dentro da faixa.';
    }
    mode.addEventListener('change', () => {
        municipality.value = 'all';
        if (mode.value === 'municipal') { byId('slider-distancia').value = 0; byId('input-distancia').value = 0; }
        sync(); window.executarAnaliseEspacial?.();
    });
    section.addEventListener('change', sync);
    window.addEventListener('analysis-reset', () => { mode.value = 'buffer'; setTimeout(sync); });
    const panel = document.createElement('details');
    panel.className = 'sidebar-section';
    panel.innerHTML = '<summary>Resultados em tabela</summary><label for="results-search">Pesquisar nos resultados</label><input id="results-search" class="custom-select" type="search" placeholder="Localidade, município ou categoria"><p id="results-count"></p><div style="overflow:auto;max-height:320px"><table><thead><tr><th>Localidade</th><th>Município</th><th>Categoria</th></tr></thead><tbody id="results-body"></tbody></table></div><button id="download-audit" class="action-btn secondary" disabled>Baixar registro da análise</button>';
    section.after(panel);
    function render() {
        const query = byId('results-search').value.toLocaleLowerCase('pt-BR');
        const filtered = results.filter(f => [f.properties.NM_LOCALIDADE, f.properties.NM_MUN, f.properties.CT_LOCALIDADE].join(' ').toLocaleLowerCase('pt-BR').includes(query));
        byId('results-count').textContent = `${filtered.length} resultados. Exibindo até 200 registros; refine a pesquisa para localizar os demais.`;
        const body = byId('results-body'); body.replaceChildren();
        filtered.slice(0, 200).forEach(f => {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            const button = document.createElement('button'); button.textContent = f.properties.NM_LOCALIDADE;
            button.addEventListener('click', () => {
                window.GeoportalState.atualizarCamada('camadaPontos', true);
                const marker = f._markerRef;
                if (marker && window.geoportalLayers.localidadesCluster) window.geoportalLayers.localidadesCluster.zoomToShowLayer(marker, () => marker.openPopup());
                else window.map.setView([f.geometry.coordinates[1], f.geometry.coordinates[0]], 13);
            }); cell.append(button); row.append(cell);
            for (const key of ['NM_MUN', 'CT_LOCALIDADE']) { const td = document.createElement('td'); td.textContent = (key === 'CT_LOCALIDADE' ? LocalityModel.categories(f) : f.properties[key]) || 'Não informado'; row.append(td); }
            body.append(row);
        });
    }
    byId('results-search').addEventListener('input', render);
    window.addEventListener('analysis-status', ({detail}) => {
        sync();
        byId('analysis-status').textContent = detail.state === 'loading' ? 'Processando… Aguarde para exportar.' : detail.state === 'error' ? detail.message : mode.value === 'municipal' && municipality.value === 'all' ? 'Selecione um estado e um município.' : 'Análise concluída.';
        if (detail.state !== 'ready') { window.analysisMapSelection = null; snapshot = null; results = []; render(); byId('download-audit').disabled = true; }
    });
    window.addEventListener('analysis-results', async ({detail}) => {
        results = detail.features;
        const active = detail.area?.features?.length > 0;
        window.analysisMapSelection = active ? results : null;
        window.atualizarHeatmapGlobal?.();
        window.filtrarLocalidadesNoMapa?.(byId('select-uf').value, byId('select-categoria-ct').value);
        const universe = LocalityModel.territory(window.geoportalData.localidades?.features || [], byId('select-uf').value, municipality.disabled ? 'all' : municipality.value, byId('select-categoria-ct').value);
        const rawCount = universe.reduce((n,f) => n + f.properties.REGISTROS_ORIGEM.filter(p => byId('select-categoria-ct').value === 'all' || p.CT_LOCALIDADE === byId('select-categoria-ct').value).length, 0);
        countNote.textContent = `${universe.length.toLocaleString('pt-BR')} localidades consolidadas / ${rawCount.toLocaleString('pt-BR')} registros de origem no território e categoria. ` + (active ? `Mapa e relatório: ${results.length} localidades selecionadas; filtros de distância de contexto não se aplicam.` : 'Mapa de contexto: aplica os filtros de distância cadastrada de 50 km.');

        reportMap = buildReportMap(detail.area, results);
        snapshot = {generatedAt: detail.generatedAt, criteria: criteria(), method: byId('analysis-method').textContent, count: results.length, catalog: 'data-catalog.json', stateLocalities: LocalityModel.territory(window.geoportalData.localidades?.features || [], byId('select-uf').value, 'all', 'all').length, stateName: selected('select-uf'), territorialLocalities: universe.length, territorialRecords: rawCount, capitalDefinition: 'Municípios das capitais, incluindo área rural'};
        const current = snapshot; render();
        const catalog = await catalogPromise;
        if (snapshot !== current) return;
        snapshot.datasets = catalog?.datasets || [];
        snapshot.catalogAvailable = Boolean(catalog);
        byId('download-audit').disabled = false;
    });
    byId('download-audit').addEventListener('click', () => {
        if (!snapshot) return;
        const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], {type:'application/json'}));
        const a = document.createElement('a'); a.href = url; a.download = 'registro-analise.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    window.analysisAuditHTML = () => snapshot ? `<section style="padding:24px;border-bottom:1px solid #ccc"><h2>Registro da análise</h2><p>${escape(snapshot.criteria)}</p><p>${escape(snapshot.method)}</p><p>Referência estadual — ${escape(snapshot.stateName)}: ${snapshot.stateLocalities} localidades de todos os municípios e categorias.</p><p>Território e categoria: ${snapshot.territorialLocalities} localidades consolidadas, ${snapshot.territorialRecords} registros de origem. Seleção: ${snapshot.count} localidades.</p><p>Gerado em ${escape(snapshot.generatedAt)}. Capital: município completo, incluindo área rural. Setores: recorte de 50 km. Categorias filtram localidades, não a demografia.</p>${reportMap}<details><summary>Versões dos dados (SHA-256)</summary>${(snapshot.datasets || []).map(d => `<p style="font-size:9px;overflow-wrap:anywhere">${escape(d.path)}: ${escape(d.sha256)}</p>`).join('')}</details></section>` : '';
    const style = document.createElement('style');
    style.textContent = '[hidden]{display:none!important} #analysis-summary,#analysis-status{font-size:12px;line-height:1.6} details p{font-size:12px;line-height:1.6} summary{cursor:pointer;padding:10px 0} :focus-visible{outline:3px solid #00bcd4;outline-offset:3px} table{width:100%;font-size:11px;border-collapse:collapse} th,td{padding:8px;text-align:left;border-bottom:1px solid #64748b55} td button{color:inherit;background:transparent;border:0;text-align:left;cursor:pointer;text-decoration:underline}';
    document.head.append(style); sync(); render();
})();
