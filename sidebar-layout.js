// Reorganiza os controles existentes, preservando seus eventos e identificadores.
(() => {
    const get = id => document.getElementById(id);
    const sidebar = get('sidebar');
    const header = sidebar.querySelector('.sidebar-header');
    const filterSection = get('select-uf').closest('.sidebar-section');
    const indicators = get('stat-total').closest('.sidebar-section');
    get('stat-sedes').closest('.stats-container').classList.add('composition-stats');
    const results = get('results-search').closest('details');
    const directory = get('directory-query').closest('details');
    const summaryList = get('impact-list').closest('.sidebar-section');
    const exports = get('btn-export-csv').closest('.sidebar-section');
    const search = get('input-busca-localidade').closest('.sidebar-section');
    const toolbar = document.createElement('div'); toolbar.className = 'panel-toolbar';
    toolbar.innerHTML = '<span>Painel de análise</span><button id="panel-width" type="button" aria-pressed="false">Ampliar painel ↔</button>';
    const tabs = document.createElement('div'); tabs.className = 'panel-tabs'; tabs.setAttribute('role','tablist'); tabs.setAttribute('aria-label','Seções do painel');
    const body = document.createElement('div'); body.className = 'panel-body';
    const panels = [], buttons = [];
    for (const [i,label] of ['Filtros','Indicadores','Localidades'].entries()) {
        const button=document.createElement('button'); button.type='button'; button.id=`panel-tab-${i}`; button.textContent=label; button.setAttribute('role','tab'); button.setAttribute('aria-controls',`panel-page-${i}`);
        const panel=document.createElement('section'); panel.id=`panel-page-${i}`; panel.setAttribute('role','tabpanel'); panel.setAttribute('aria-labelledby',button.id); panel.tabIndex=0;
        tabs.append(button); body.append(panel); buttons.push(button); panels.push(panel);
        button.addEventListener('click',()=>select(i));
        button.addEventListener('keydown',event=>{
            const next = event.key==='ArrowRight' ? (i+1)%3 : event.key==='ArrowLeft' ? (i+2)%3 : event.key==='Home' ? 0 : event.key==='End' ? 2 : null;
            if(next!==null){event.preventDefault();select(next);buttons[next].focus();}
        });
    }
    function select(index) {
        panels.forEach((p,i)=>p.hidden=i!==index);
        buttons.forEach((b,i)=>{b.setAttribute('aria-selected',String(i===index));b.tabIndex=i===index?0:-1;});
        body.scrollTop=0;
    }
    if(search) panels[0].append(search);
    panels[0].append(filterSection);
    const viewResults=document.createElement('button'); viewResults.type='button';viewResults.className='action-btn secondary';viewResults.textContent='Consultar indicadores →';viewResults.addEventListener('click',()=>{select(1);buttons[1].focus();});panels[0].append(viewResults);
    panels[1].append(indicators, get('demografia-container'), exports);
    panels[2].append(results,directory);
    results.open=true;
    const compact=document.createElement('details');compact.innerHTML='<summary>Lista resumida com acesso ao mapa</summary>';compact.append(summaryList);panels[2].append(compact);
    // Metodologia e notas continuam disponíveis sem ocupar toda a tela inicial.
    const methodology=document.createElement('details');methodology.innerHTML='<summary>Critérios de contagem e visualização</summary>';
    const explanation = indicators.querySelector(':scope > p');
    if(explanation) methodology.append(explanation);
    if(get('count-method')) methodology.append(get('count-method'));
    panels[1].append(methodology);
    header.after(toolbar,tabs,body);
    const footer = sidebar.querySelector('.sidebar-footer');
    if(footer) { panels[0].append(footer); }
    get('panel-width').addEventListener('click',()=>{
        const expanded=document.documentElement.classList.toggle('wide-analysis-panel');
        get('panel-width').setAttribute('aria-pressed',String(expanded));get('panel-width').textContent=expanded?'Reduzir painel ↔':'Ampliar painel ↔';
    });
    const toggle=get('sidebar-toggle');toggle.setAttribute('aria-controls','sidebar');toggle.setAttribute('aria-expanded','true');
    new MutationObserver(()=>{const collapsed=sidebar.classList.contains('collapsed');toggle.setAttribute('aria-expanded',String(!collapsed));sidebar.inert=collapsed;}).observe(sidebar,{attributes:true,attributeFilter:['class']});
    select(0);
})();
