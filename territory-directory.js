(() => {
    const el = id => document.getElementById(id);
    const names = {AM:'Amazonas',PA:'Pará',AP:'Amapá',RR:'Roraima'};
    const card = document.createElement('div'); card.className = 'stat-card'; card.hidden = true;
    card.innerHTML = '<span class="label" id="municipality-total-label"></span><span class="value" id="municipality-total"></span><span class="stat-pct">Todas as categorias do município</span>';
    el('stat-geral').parentElement.parentElement.append(card);
    const explanation = document.createElement('p'); explanation.style.cssText = 'font-size:12px;line-height:1.5;margin:12px 0';
    explanation.textContent = 'Referência estadual: localidades consolidadas de todos os municípios, sem filtro de categoria, infovia ou distância. O percentual da análise usa esse total.';
    card.parentElement.after(explanation);
    const directory = document.createElement('details'); directory.className = 'sidebar-section';
    directory.innerHTML = '<summary>Relação de localidades do estado</summary><p id="directory-scope"></p><label for="directory-query">Pesquisar município, localidade ou categoria</label><input id="directory-query" type="search" class="custom-select"><p id="directory-count" role="status"></p><div style="max-height:350px;overflow:auto"><table><thead><tr><th>Localidade</th><th>Categorias</th></tr></thead><tbody id="directory-rows"></tbody></table></div><div style="display:flex;gap:12px;margin:12px 0"><button id="directory-prev" class="action-btn secondary">Anterior</button><button id="directory-next" class="action-btn secondary">Próxima</button></div><button id="directory-export" class="action-btn secondary">Exportar relação estadual (CSV)</button>';
    explanation.after(directory);
    let page = 0, rows = [], matches = [], ready = false, lastUF = null;
    const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    function refresh() {
        const uf = el('select-uf').value;
        if (uf !== lastUF) { page = 0; el('directory-query').value = ''; lastUF = uf; }
        const needed = uf === 'all' ? Object.keys(names) : [uf];
        ready = needed.every(code => window.ufCarregandoStatus?.[code] === 'loaded');
        rows = LocalityModel.territory(window.geoportalData.localidades?.features || [], uf, 'all', 'all');
        rows.sort((a,b) => String(a.properties.SIGLA_UF).localeCompare(b.properties.SIGLA_UF) || String(a.properties.NM_MUN).localeCompare(b.properties.NM_MUN,'pt-BR') || String(a.properties.NM_LOCALIDADE).localeCompare(b.properties.NM_LOCALIDADE,'pt-BR'));
        el('state-total-label').textContent = uf === 'all' ? 'Localidades dos quatro estados' : `Localidades do estado — ${names[uf]}`;
        el('stat-geral').textContent = ready ? rows.length.toLocaleString('pt-BR') : 'Carregando…';
        const municipality = el('select-municipio');
        const code = municipality.disabled ? 'all' : municipality.value;
        card.hidden = code === 'all';
        if (!card.hidden) {
            el('municipality-total-label').textContent = `Localidades do município — ${municipality.options[municipality.selectedIndex].text}`;
            el('municipality-total').textContent = ready ? LocalityModel.territory(rows,uf,code,'all').length.toLocaleString('pt-BR') : 'Carregando…';
        }
        const total = Number(el('stat-total').textContent.replace(/\./g,'')) || 0;
        el('stat-total-pct').textContent = ready ? `${(rows.length ? total / rows.length * 100 : 0).toLocaleString('pt-BR',{maximumFractionDigits:1})}% das localidades ${uf === 'all' ? 'dos quatro estados' : ({AM:'do Amazonas',PA:'do Pará',AP:'do Amapá',RR:'de Roraima'}[uf])}` : 'Aguardando total estadual';
        el('directory-scope').textContent = `${uf === 'all' ? 'Quatro estados' : names[uf]}: todos os municípios e categorias. Esta relação independe dos filtros da análise. A pesquisa abaixo filtra somente esta relação.`;
        render();
    }
    function render() {
        const q = normalize(el('directory-query').value);
        matches = rows.filter(f => normalize([f.properties.NM_LOCALIDADE,f.properties.NM_MUN,LocalityModel.categories(f)].join(' ')).includes(q));
        page = Math.min(page,Math.max(0,Math.ceil(matches.length/100)-1));
        const body = el('directory-rows'); body.replaceChildren();
        let group = '';
        if (ready) for (const f of matches.slice(page*100,(page+1)*100)) {
            const label = `${f.properties.NM_MUN} / ${f.properties.SIGLA_UF}`;
            if (label !== group) { const tr=document.createElement('tr'),th=document.createElement('th'); th.colSpan=2; th.scope='rowgroup'; th.textContent=label; tr.append(th); body.append(tr); group=label; }
            const tr=document.createElement('tr');
            for (const value of [f.properties.NM_LOCALIDADE,LocalityModel.categories(f)]) { const td=document.createElement('td'); td.textContent=value; tr.append(td); } body.append(tr);
        }
        el('directory-count').textContent = ready ? `${matches.length.toLocaleString('pt-BR')} de ${rows.length.toLocaleString('pt-BR')} localidades. Página ${page+1} de ${Math.max(1,Math.ceil(matches.length/100))}.` : 'Carregando relação completa…';
        el('directory-prev').disabled = !ready || page===0;
        el('directory-next').disabled = !ready || (page+1)*100>=matches.length;
        el('directory-export').disabled = !ready || !rows.length;
    }
    el('directory-query').addEventListener('input',()=>{page=0;render();});
    el('directory-prev').addEventListener('click',()=>{page--;render();});
    el('directory-next').addEventListener('click',()=>{page++;render();});
    el('directory-export').addEventListener('click',()=>{
        const quote = v => '"'+String(v??'').replace(/^[=+@-]/,"'$&").replace(/"/g,'""')+'"';
        const records = [['UF','Municipio','Localidade','Categorias','Registros_origem'], ...rows.map(f=>[f.properties.SIGLA_UF,f.properties.NM_MUN,f.properties.NM_LOCALIDADE,LocalityModel.categories(f),f.properties.REGISTROS_ORIGEM.length])];
        const url=URL.createObjectURL(new Blob(['\ufeff'+records.map(r=>r.map(quote).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
        const a=document.createElement('a');a.href=url;a.download=`localidades_${el('select-uf').value}_todos_municipios.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    });
    for (const event of ['analysis-results','analysis-status','localities-loaded']) window.addEventListener(event,refresh);
    refresh();
})();
