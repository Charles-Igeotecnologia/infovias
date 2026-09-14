window.TerritorialRoutes = (() => {
    const cache = new Map();
    let current = {lines:[],boundary:null,summary:[]};
    async function prepare(uf, municipality, route) {
        const original = window.geoportalData.infovias?.features || [];
        let boundary=null, lines=original, totals={};
        if (uf !== 'all') {
            if (!cache.has(uf)) cache.set(uf, fetch(`territorial/${uf}.json`).then(r=>{if(!r.ok)throw new Error('Recorte territorial indisponível.');return r.json();}).catch(e=>{cache.delete(uf);throw e;}));
            const data=await cache.get(uf);
            const territory=municipality==='all'?data:data.municipalities[municipality];
            if(!territory)throw new Error('Limite municipal não encontrado para recorte.');
            boundary=territory.boundary;lines=territory.lines;totals=data.totalRouteKm;
        } else {
            const response=await fetch('territorial/RR.json');
            if(!response.ok)throw new Error('Metadados de extensão indisponíveis.');
            totals=(await response.json()).totalRouteKm;
        }
        if(municipality==='all' && route!=='all')lines=lines.filter(f=>f.properties.KML_FOLDER===route);
        const grouped=new Map();
        for(const f of lines){const name=f.properties.KML_FOLDER;const row=grouped.get(name)||{name,totalKm:totals[name],territoryKm:0,borderKm:0};row.territoryKm+=f.properties.CLIPPED_KM??turf.length(f,{units:'kilometers'});row.borderKm+=f.properties.BORDER_KM||0;grouped.set(name,row);}
        if (uf === 'all') for(const row of grouped.values()) row.territoryKm=row.totalKm;
        return {lines,boundary,summary:[...grouped.values()],uf,municipality};
    }
    function apply(selection) {
        current=selection;
        const layer=window.geoportalLayers.infoviasLayer;
        if(layer){layer.clearLayers();layer.addData({type:'FeatureCollection',features:selection.lines});}
        window.dispatchEvent(new CustomEvent('territorial-routes',{detail:selection}));
    }
    const panel=document.createElement('details');panel.id='territorial-route-metrics';panel.className='sidebar-section';
    const heading=document.createElement('summary');heading.textContent='Extensão das infovias no território';panel.append(heading);
    const content=document.createElement('div');panel.append(content);
    document.getElementById('stat-total').closest('.sidebar-section').append(panel);
    window.addEventListener('territorial-routes',({detail})=>{
        content.replaceChildren();
        const description=document.createElement('p');description.style.fontSize='12px';
        description.textContent=detail.boundary?'Mapa, distâncias e análise usam apenas os trechos dentro do território selecionado. O buffer também é limitado a esse território.':'Visão regional: traçados completos da base.';content.append(description);
        for(const row of detail.summary){const p=document.createElement('p');p.style.cssText='font-size:12px;margin:12px 0';p.textContent=`${row.name}: ${row.territoryKm.toLocaleString('pt-BR',{maximumFractionDigits:2})} km no território / ${row.totalKm.toLocaleString('pt-BR',{maximumFractionDigits:2})} km totais na base. Trecho na divisa: ${row.borderKm.toLocaleString('pt-BR',{maximumFractionDigits:3})} km.`;content.append(p);}
        if(!detail.summary.length){const p=document.createElement('p');p.textContent='Nenhum trecho de infovia dentro deste território.';content.append(p);}
        const note=document.createElement('p');note.style.fontSize='11px';note.textContent='Trechos coincidentes com divisas podem aparecer em ambos os territórios. Não somar extensões territoriais para obter a extensão regional. Comprimentos geodésicos em WGS 84.';content.append(note);
    });
    return {prepare,apply,get current(){return current;}};
})();
