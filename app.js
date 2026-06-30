// ETAPA 1: Configuração Inicial e Gerenciador de Estados (Event Bus)

// Armazenamento global dos dados carregados para acesso em outros scripts (measure.js, analysis.js)
window.geoportalData = {
    localidades: null,
    infovias: null,
    pontosEstrategicos: null
};

// Referências das camadas Leaflet para ligar/desligar de forma dinâmica
window.geoportalLayers = {
    localidadesCluster: null,
    infoviasLayer: null,
    pontosEstrategicosLayer: null,
    heatmapLayer: null
};

// Gerenciador de Estado Centralizado (Previne loops e sincroniza Sidebar / Floating Menu / Leaflet)
const GeoportalState = {
    state: {
        camadaPontos: true,
        camadaLinhas: true,
        camadaCalor: false
    },
    listeners: [],
    
    inscrever(modulo) {
        this.listeners.push(modulo);
    },
    
    atualizarCamada(chave, valor) {
        if (this.state[chave] === valor) return; // Quebra loops redundantes
        this.state[chave] = valor;
        
        // Notifica as interfaces inscritas
        this.listeners.forEach(modulo => modulo(chave, valor));
        
        // Executa a ação real de ligar/desligar no mapa Leaflet
        this._sincronizarCamadaMapa(chave, valor);
    },

    _sincronizarCamadaMapa(chave, valor) {
        const map = window.map;
        if (!map) return;

        if (chave === 'camadaPontos' && window.geoportalLayers.localidadesCluster) {
            if (valor) {
                map.addLayer(window.geoportalLayers.localidadesCluster);
            } else {
                map.removeLayer(window.geoportalLayers.localidadesCluster);
            }
        } else if (chave === 'camadaLinhas' && window.geoportalLayers.infoviasLayer) {
            if (valor) {
                map.addLayer(window.geoportalLayers.infoviasLayer);
                if (window.geoportalLayers.pontosEstrategicosLayer) map.addLayer(window.geoportalLayers.pontosEstrategicosLayer);
            } else {
                map.removeLayer(window.geoportalLayers.infoviasLayer);
                if (window.geoportalLayers.pontosEstrategicosLayer) map.removeLayer(window.geoportalLayers.pontosEstrategicosLayer);
            }
        } else if (chave === 'camadaCalor' && window.geoportalLayers.heatmapLayer) {
            if (valor) {
                map.addLayer(window.geoportalLayers.heatmapLayer);
            } else {
                map.removeLayer(window.geoportalLayers.heatmapLayer);
            }
        }
    }
};

// Disponibilizar globalmente para os demais módulos
window.GeoportalState = GeoportalState;

// ETAPA 2: Inicialização do Mapa Leaflet
// Lê os parâmetros de URL para restaurar visão compartilhada (Melhoria 2.4)
const urlParams = new URLSearchParams(window.location.search);
const initLat   = parseFloat(urlParams.get('lat'))  || -3.119;
const initLng   = parseFloat(urlParams.get('lng'))  || -60.021;
const initZoom  = parseInt(urlParams.get('zoom'))   || 6;

const map = L.map('map', {
    center: [initLat, initLng],
    zoom: initZoom,
    minZoom: 4,
    maxZoom: 18,
    preferCanvas: true // Renderização em Canvas para altíssima performance de linhas
});
window.map = map;

// ETAPA 3: Provedores de Mapas Base (Basemaps)
const basemaps = {
    "Escuro": L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20
    }),
    "Claro": L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20
    }),
    "Satélite": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    }),
    "Híbrido": L.layerGroup([
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri'
        }),
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Labels &copy; Esri'
        })
    ]),
    "OpenStreetMap": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    })
};

// Adicionar Basemap Padrão
basemaps["Escuro"].addTo(map);

// MELHORIA 1.1: Basemaps posicionados no canto INFERIOR ESQUERDO
// Isso evita conflitos com a sidebar (aba do geoportal) no lado direito e mantém o alinhamento esquerdo
L.control.layers(basemaps, null, { position: 'bottomleft', collapsed: true }).addTo(map);


// ETAPA 4: Sincronização dos Painéis de Interface com o Estado
document.addEventListener("DOMContentLoaded", () => {
    const swPontos = document.getElementById("switch-pontos");
    const swLinhas = document.getElementById("switch-linhas");
    const swCalor  = document.getElementById("switch-calor");
    const swAte50  = document.getElementById("switch-dist-ate50");
    const swMais50 = document.getElementById("switch-dist-mais50");
    const subFiltros = document.getElementById("sub-filtros-comunidades");

    // Sincronizar UI quando o Estado mudar
    GeoportalState.inscrever((camada, ativa) => {
        if (camada === 'camadaPontos') {
            if (swPontos) swPontos.checked = ativa;
            if (subFiltros) {
                subFiltros.style.opacity = ativa ? "1" : "0.5";
                subFiltros.style.pointerEvents = ativa ? "auto" : "none";
            }
        }
        if (camada === 'camadaLinhas' && swLinhas) swLinhas.checked = ativa;
        if (camada === 'camadaCalor'  && swCalor)  swCalor.checked  = ativa;
    });

    // Escutar eventos de cliques na interface para atualizar o Estado
    if (swPontos) swPontos.addEventListener("change", (e) => GeoportalState.atualizarCamada('camadaPontos', e.target.checked));
    if (swLinhas) swLinhas.addEventListener("change", (e) => GeoportalState.atualizarCamada('camadaLinhas', e.target.checked));
    if (swCalor)  swCalor.addEventListener("change",  (e) => GeoportalState.atualizarCamada('camadaCalor',  e.target.checked));

    // Ouvintes para os sub-filtros de distância
    const reexecutarFiltragemDistancia = () => {
        const uf = document.getElementById("select-uf")?.value || "all";
        const cat = document.getElementById("select-categoria-ct")?.value || "all";
        if (window.filtrarLocalidadesNoMapa) {
            window.filtrarLocalidadesNoMapa(uf, cat);
        }
    };

    if (swAte50) swAte50.addEventListener("change", reexecutarFiltragemDistancia);
    if (swMais50) swMais50.addEventListener("change", reexecutarFiltragemDistancia);

    // Configurar estado inicial dos subfiltros
    if (subFiltros && swPontos) {
        const ativa = swPontos.checked;
        subFiltros.style.opacity = ativa ? "1" : "0.5";
        subFiltros.style.pointerEvents = ativa ? "auto" : "none";
    }

    // MELHORIA 2.1: Colapso/Expansão da Sidebar
    inicializarToggleSidebar();

    // MELHORIA 2.4: Botão de compartilhar URL
    inicializarCompartilharUrl();

    // MELHORIA 3.1: Carregamento Progressivo (Lazy Fetch)
    carregarBasesGeograficas();
});


// MELHORIA 2.1: Toggle de Colapso da Sidebar
function inicializarToggleSidebar() {
    const sidebar       = document.getElementById("sidebar");
    const toggleBtn     = document.getElementById("sidebar-toggle");
    const toggleIcon    = document.getElementById("sidebar-toggle-icon");
    if (!sidebar || !toggleBtn) return;

    let isCollapsed = false;

    toggleBtn.addEventListener("click", () => {
        isCollapsed = !isCollapsed;
        if (isCollapsed) {
            sidebar.classList.add("collapsed");
            toggleBtn.classList.add("collapsed");
            toggleIcon.className = "fa-solid fa-chevron-left";
        } else {
            sidebar.classList.remove("collapsed");
            toggleBtn.classList.remove("collapsed");
            toggleIcon.className = "fa-solid fa-chevron-right";
        }
    });
}


// MELHORIA 2.4: Compartilhamento de URL com estado do mapa
function inicializarCompartilharUrl() {
    const btnShare = document.getElementById("btn-share-url");
    if (!btnShare) return;

    btnShare.addEventListener("click", () => {
        const center   = window.map.getCenter();
        const zoom     = window.map.getZoom();
        const infovia  = document.getElementById("select-infovia")?.value || "all";

        const url = new URL(window.location.href.split('?')[0]);
        url.searchParams.set("lat",     center.lat.toFixed(5));
        url.searchParams.set("lng",     center.lng.toFixed(5));
        url.searchParams.set("zoom",    zoom);
        if (infovia !== "all") url.searchParams.set("infovia", infovia);

        navigator.clipboard.writeText(url.toString()).then(() => {
            // Feedback visual temporário no botão
            const icon = btnShare.querySelector("i");
            const original = btnShare.innerHTML;
            btnShare.innerHTML = '<i class="fa-solid fa-check"></i> Link copiado!';
            btnShare.style.color = "var(--priority-low)";
            setTimeout(() => {
                btnShare.innerHTML = original;
                btnShare.style.color = "";
            }, 2500);
        }).catch(() => {
            prompt("Copie o link abaixo:", url.toString());
        });
    });
}


// ETAPA 5: Carregamento de GeoJSONs e Configuração das Camadas
// MELHORIA 3.1: Carregamento PROGRESSIVO — infovias primeiro, localidades depois
async function carregarBasesGeograficas() {
    const loadingOverlay  = document.getElementById("loading-overlay");
    const loadingMsg      = document.getElementById("loading-msg");
    const loadingBar      = document.getElementById("loading-bar");

    function setProgress(pct, msg) {
        if (loadingBar) loadingBar.style.width = pct + "%";
        if (loadingMsg) loadingMsg.textContent = msg;
    }

    try {
        const cacheBust = "?v=" + Date.now();

        // FASE 1: Carregar infovias e pontos estratégicos (rápido, ~730 KB total)
        setProgress(15, "Carregando InfoVias e Pontos Estratégicos...");

        const [resLinhas, resPontos] = await Promise.all([
            fetch('infovias.geojson' + cacheBust).then(r => r.json()),
            fetch('pontos_estrategicos.geojson' + cacheBust).then(r => r.json())
        ]);

        window.geoportalData.infovias         = resLinhas;
        window.geoportalData.pontosEstrategicos = resPontos;

        setProgress(50, "Configurando traçados das InfoVias no mapa...");

        // Renderizar infovias e pontos estratégicos imediatamente
        configurarInfovias(resLinhas);
        configurarPontosEstrategicos(resPontos);
        preencherFiltroInfovias(resLinhas);
        adicionarLegendaAoMapa();
        inicializarMenusColapsaveis();

        // FASE 2: Carregar localidades em segundo plano (~6 MB)
        setProgress(60, "Carregando Comunidades (11.186 localidades)...");

        const resLocalidades = await fetch('localidades.geojson' + cacheBust).then(r => r.json());
        window.geoportalData.localidades = resLocalidades;

        setProgress(90, "Configurando clusters de comunidades...");

        configurarLocalidades(resLocalidades);
        configurarMapaDeCalor(resLocalidades);
        inicializarBuscaLocalidades(resLocalidades);
        
        // Filtragem inicial das localidades (Melhoria 5.0)
        if (window.filtrarLocalidadesNoMapa) {
            window.filtrarLocalidadesNoMapa("all", "all");
        }

        setProgress(100, "Pronto!");

        // Esconder o overlay com fade out suave
        setTimeout(() => {
            if (loadingOverlay) {
                loadingOverlay.classList.add("fade-out");
                setTimeout(() => {
                    loadingOverlay.style.display = "none";
                }, 500);
            }
        }, 400);

        // Restaurar infovia da URL (Melhoria 2.4)
        const infoviaDaUrl = urlParams.get('infovia');
        if (infoviaDaUrl) {
            const select = document.getElementById("select-infovia");
            if (select) {
                select.value = infoviaDaUrl;
                select.dispatchEvent(new Event("change"));
            }
        }

    } catch (err) {
        console.error("Erro crítico ao carregar dados geográficos:", err);
        if (loadingMsg) loadingMsg.textContent = "Erro ao carregar dados. Verifique o console.";
        if (loadingBar) loadingBar.style.background = "var(--priority-high)";
    }
}


// MELHORIA 2.2: Busca de localidade por nome
function inicializarBuscaLocalidades(geojson) {
    const input    = document.getElementById("input-busca-localidade");
    const clearBtn = document.getElementById("btn-clear-busca");
    const dropdown = document.getElementById("busca-resultados");
    if (!input || !dropdown) return;

    let debounce = null;

    input.addEventListener("input", () => {
        clearTimeout(debounce);
        const termo = input.value.trim();
        if (clearBtn) clearBtn.style.display = termo ? "flex" : "none";
        if (termo.length < 2) { dropdown.style.display = "none"; return; }

        debounce = setTimeout(() => {
            const termoLower = termo.toLowerCase();
            const resultados = geojson.features.filter(f => {
                const nm  = (f.properties.NM_LOCALIDADE || "").toLowerCase();
                const mun = (f.properties.NM_MUN        || "").toLowerCase();
                return nm.includes(termoLower) || mun.includes(termoLower);
            }).slice(0, 8); // Limite de 8 resultados no dropdown

            dropdown.innerHTML = "";
            if (resultados.length === 0) {
                dropdown.innerHTML = `<div class="search-no-result">Nenhuma localidade encontrada.</div>`;
                dropdown.style.display = "block";
                return;
            }

            resultados.forEach(feat => {
                const p   = feat.properties;
                const div = document.createElement("div");
                div.className = "search-result-item";
                div.innerHTML = `
                    <span class="result-nome">${p.NM_LOCALIDADE}</span>
                    <span class="result-mun">${p.NM_MUN} — ${p.SIGLA_UF}</span>
                `;
                div.addEventListener("click", () => {
                    const [lng, lat] = feat.geometry.coordinates;
                    window.map.flyTo([lat, lng], 13, { animate: true, duration: 1.2 });
                    input.value  = p.NM_LOCALIDADE;
                    dropdown.style.display = "none";
                    if (clearBtn) clearBtn.style.display = "flex";

                    // Abrir popup após o voo
                    setTimeout(() => {
                        if (feat._markerRef) feat._markerRef.openPopup();
                    }, 1400);
                });
                dropdown.appendChild(div);
            });
            dropdown.style.display = "block";
        }, 200);
    });

    // Limpar busca
    if (clearBtn) {
        clearBtn.addEventListener("click", () => {
            input.value = "";
            dropdown.style.display = "none";
            clearBtn.style.display = "none";
            input.focus();
        });
    }

    // Fechar dropdown ao clicar fora
    document.addEventListener("click", (e) => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = "none";
        }
    });
}


// 5.1 Estilização e Popup das Infovias
// MELHORIA 2.3: Tooltip ao passar o mouse nas infovias
function configurarInfovias(geojson) {
    window.geoportalLayers.infoviasLayer = L.geoJSON(geojson, {
        style: function(feature) {
            const tipo = feature.properties.TIPO;
            let color    = 'var(--accent-blue)';
            let weight   = 3.5;
            let dashArray = null;

            if (tipo === 'Tronco') {
                color  = '#00f2fe'; // Cian neon
                weight = 4;
            } else if (tipo === 'Derivação') {
                color  = '#b927fc'; // Roxo neon
                weight = 3;
            } else if (tipo === 'Planejada') {
                color     = '#ffb703'; // Amarelo
                weight    = 3;
                dashArray = '5, 8'; // Tracejado
            }

            return {
                color: color,
                weight: weight,
                dashArray: dashArray,
                opacity: 0.85,
                lineJoin: 'round'
            };
        },
        onEachFeature: function(feature, layer) {
            const props = feature.properties;
            
            // Calcular centróide da linha para o link do Google Maps usando Turf.js
            const centroid = turf.centroid(feature);
            const coords   = centroid.geometry.coordinates; // [lng, lat]
            const mapsUrl  = `https://www.google.com/maps/search/?api=1&query=${coords[1]},${coords[0]}`;

            const popupContent = `
                <div style="min-width: 250px; font-family: 'Inter', sans-serif;">
                    <h4 style="margin-bottom: 8px; font-size: 13px; color: var(--accent-cyan); font-weight: 600;">Relatório de Infovia</h4>
                    <table class="popup-report-table">
                        <tr><th>Infovia</th><td>${props.KML_FOLDER || 'N/A'}</td></tr>
                        <tr><th>Segmento</th><td>${props.NAME || 'N/A'}</td></tr>
                        <tr><th>Tipo</th><td>${props.TIPO || 'N/A'}</td></tr>
                        <tr><th>Estilo KML</th><td>${props.KML_STYLE || 'N/A'}</td></tr>
                        <tr><th>Tessellate</th><td>${props.tessellate !== undefined ? props.tessellate : 'N/A'}</td></tr>
                        <tr><th>Rota/Dist.</th><td>${props.ROTA_DISTANCIA || 'N/A'}</td></tr>
                    </table>
                    <a href="${mapsUrl}" target="_blank" class="popup-maps-link">
                        <i class="fa-solid fa-map-location-dot"></i> Visualizar no Google Maps
                    </a>
                </div>
            `;
            layer.bindPopup(popupContent);

            // MELHORIA 2.3: Tooltip informativo ao passar o mouse na linha
            const tipoLabel = props.TIPO ? ` · ${props.TIPO}` : '';
            layer.bindTooltip(`<strong>${props.KML_FOLDER || 'Infovia'}</strong>${tipoLabel}`, {
                sticky: true,
                opacity: 0.92,
                className: 'infovia-tooltip'
            });
            
            // Efeito hover na linha
            layer.on({
                mouseover: function(e) {
                    const l = e.target;
                    l.setStyle({
                        opacity: 1.0,
                        weight: (props.TIPO === 'Tronco' ? 6 : 5)
                    });
                },
                mouseout: function(e) {
                    window.geoportalLayers.infoviasLayer.resetStyle(e.target);
                }
            });
        }
    });

    // Se estiver ativo no estado inicial, adiciona ao mapa
    if (GeoportalState.state.camadaLinhas) {
        window.geoportalLayers.infoviasLayer.addTo(map);
    }
}

// 5.2 Estilização dos Pontos Estratégicos de Infraestrutura (Nós de Conexão das Infovias)
function configurarPontosEstrategicos(geojson) {
    // Função interna para calcular a distância Haversine
    function calcularHaversine(lon1, lat1, lon2, lat2) {
        const toRad = deg => deg * Math.PI / 180;
        const R = 6371; // km
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    // Função para criar o DivIcon para os nós estratégicos em formato de círculo pulsante
    function criarIconeEstrategico() {
        const html = `<div class="ponto-estrategico-marker"></div>`;
        return L.divIcon({
            html: html,
            className: 'ponto-estrategico-container',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
    }

    window.geoportalLayers.pontosEstrategicosLayer = L.geoJSON(geojson, {
        pointToLayer: function(feature, latlng) {
            return L.marker(latlng, {
                icon: criarIconeEstrategico(),
                pane: 'markerPane' // Renderiza por cima das linhas e das localidades
            });
        },
        onEachFeature: function(feature, layer) {
            const props   = feature.properties;
            const latlng  = layer.getLatLng();
            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${latlng.lat},${latlng.lng}`;

            // Configurar popup dinâmico para calcular distância à sede mais próxima
            layer.bindPopup(function(layerRef) {
                let distMunHtml = "";
                if (window.geoportalData && window.geoportalData.localidades) {
                    const locs = window.geoportalData.localidades.features;
                    let minSede = null;
                    let minDist = Infinity;
                    
                    locs.forEach(feat => {
                        const lp = feat.properties;
                        if (lp.CATEGORIA_MAPA === 'Sede') {
                            const coords = feat.geometry.coordinates; // [lng, lat]
                            const dist = calcularHaversine(latlng.lng, latlng.lat, coords[0], coords[1]);
                            if (dist < minDist) {
                                minDist = dist;
                                minSede = lp;
                            }
                        }
                    });
                    
                    if (minSede) {
                        distMunHtml = `
                            <tr><th>Município (Sede)</th><td>${minSede.NM_MUN || 'N/A'} (${minSede.SIGLA_UF || 'N/A'})</td></tr>
                            <tr><th>Dist. Sede Municipal</th><td><strong>${minDist.toFixed(1)} km</strong></td></tr>
                        `;
                    }
                }

                return `
                    <div style="min-width: 260px; font-family: 'Inter', sans-serif;">
                        <h4 style="margin-bottom: 8px; font-size: 13px; color: var(--accent-cyan); font-weight: 600;">Relatório de Conexão</h4>
                        <table class="popup-report-table">
                            <tr><th>Nome do Ponto</th><td>${props.NAME || 'N/A'}</td></tr>
                            <tr><th>Infovia Relacionada</th><td>${props.KML_FOLDER || 'N/A'}</td></tr>
                            <tr><th>Estilo KML</th><td>${props.KML_STYLE || 'N/A'}</td></tr>
                            ${distMunHtml}
                            <tr><th>Latitude</th><td>${latlng.lat.toFixed(6)}</td></tr>
                            <tr><th>Longitude</th><td>${latlng.lng.toFixed(6)}</td></tr>
                        </table>
                        <a href="${mapsUrl}" target="_blank" class="popup-maps-link">
                            <i class="fa-solid fa-map-location-dot"></i> Visualizar no Google Maps
                        </a>
                    </div>
                `;
            }, { maxWidth: 300, autoPan: true });
        }
    });

    if (GeoportalState.state.camadaLinhas) {
        window.geoportalLayers.pontosEstrategicosLayer.addTo(map);
    }
}

// Mapeamento global de cores para as 10 categorias de CT_LOCALIDADE (Categoria Censo)
window.obterCorPorCT = function(ct) {
    if (!ct) return '#a1a1a6';
    const norm = ct.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    switch (norm) {
        case 'cidade': return '#ff3366';               // Vermelho Neon
        case 'vila': return '#ff9f00';                 // Laranja
        case 'nucleo urbano': return '#ffcc00';        // Amarelo
        case 'povoado': return '#00f2fe';              // Cian Neon
        case 'localidade indigena': return '#00e676';  // Verde Esmeralda
        case 'localidade quilombola': return '#b927fc';// Roxo Violeta
        case 'lugarejo': return '#ff00ff';             // Magenta Neon
        case 'agrovila do pa': return '#00d2ff';       // Azul Turquesa
        case 'nucleo rural': return '#a1887f';         // Terracota / Marrom Claro
        case 'outras localidades':
        default: return '#a1a1a6';                     // Cinza Metálico
    }
};

// 5.3 Configuração do MarkerCluster de Localidades
function configurarLocalidades(geojson) {
    // Inicializa o grupo de clusters
    const clusterGroup = L.markerClusterGroup({
        maxClusterRadius: 50,
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: true,
        // Função customizada para estilizar o agrupamento de círculos brilhantes
        iconCreateFunction: function(cluster) {
            const childCount = cluster.getChildCount();
            let c = 'marker-cluster-';
            if (childCount < 50) {
                c += 'small';
            } else if (childCount < 250) {
                c += 'medium';
            } else {
                c += 'large';
            }
            return new L.DivIcon({ 
                html: '<div><span>' + childCount + '</span></div>', 
                className: 'marker-cluster ' + c, 
                iconSize: new L.Point(40, 40) 
            });
        }
    });

    // Função interna para criar o DivIcon com estilo de círculo idêntico ao original
    function criarIconeLocalidade(fillColor, borderColor, weight, radius, fillOpacity, isHighlighted = false) {
        const size = (radius * 2) + (weight * 2);
        const innerSize = radius * 2;
        const borderStyle = `${weight}px solid ${borderColor}`;
        
        const html = `
            <div class="localidade-icon ${isHighlighted ? 'highlighted' : ''}" style="
                width: ${innerSize}px;
                height: ${innerSize}px;
                background-color: ${fillColor};
                border: ${borderStyle};
                opacity: ${fillOpacity};
                box-sizing: border-box;
            "></div>
        `;
        
        return L.divIcon({
            html: html,
            className: 'localidade-marker-container',
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2]
        });
    }

    // Criar os marcadores de localidades e colocá-los no cluster.
    // Usamos L.marker + DivIcon para garantir hit-detection precisa para cliques/popups no DOM,
    // já que o MarkerCluster tem incompatibilidades de eventos com vetores sob preferCanvas: true.
    const geojsonLayer = L.geoJSON(geojson, {
        pointToLayer: function(feature, latlng) {
            // Obter cor correspondente à categoria censo (CT_LOCALIDADE)
            const defaultColor = window.obterCorPorCT(feature.properties.CT_LOCALIDADE);

            const marker = L.marker(latlng, {
                icon: criarIconeLocalidade(defaultColor, '#ffffff', 1.5, 7, 0.92)
            });

            // Armazenar as propriedades de estilo nas opções para permitir leitura futura
            marker.options.style = {
                fillColor: defaultColor,
                color: '#ffffff',
                weight: 1.5,
                radius: 7,
                fillOpacity: 0.92
            };

            // Implementação de setStyle para compatibilidade total com analysis.js
            marker.setStyle = function(style) {
                const currentStyle = this.options.style || {};
                const newStyle = Object.assign({}, currentStyle, style);
                this.options.style = newStyle;
                
                // Se o estilo de cor da borda for alterado para o cyan neon (#00f2fe), consideramos destacado
                const isHighlighted = (newStyle.color === '#00f2fe' || newStyle.isHighlighted === true);
                
                const newIcon = criarIconeLocalidade(
                    newStyle.fillColor || defaultColor,
                    newStyle.color || '#ffffff',
                    newStyle.weight || 1.5,
                    newStyle.radius || 7,
                    newStyle.fillOpacity || 0.92,
                    isHighlighted
                );
                this.setIcon(newIcon);
            };

            // Referência ao marcador para destacar no filtro de buffer
            feature._markerRef = marker;
            return marker;
        },
        onEachFeature: function(feature, layer) {
            const props  = feature.properties;
            const latlng = layer.getLatLng();
            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${latlng.lat},${latlng.lng}`;

            // Null-check no CATEGORIA_MAPA para evitar erro em features com campo ausente
            const catMapa     = props.CATEGORIA_MAPA || 'Rural';
            const rotuloCat   = catMapa === 'Sede' ? 'Sede Municipal' : (catMapa === 'Vila' ? 'Vila' : 'Lugar Rural');
            const classeBadge = catMapa.toLowerCase();

            const popupContent = `
                <div style="min-width: 300px; font-family: 'Inter', sans-serif;">
                    <h4 style="margin-bottom: 8px; font-size: 13px; color: var(--accent-cyan); font-weight: 600; display: flex; justify-content: space-between; align-items: center;">
                        <span>${props.NM_LOCALIDADE || 'Localidade'}</span>
                        <span class="prio-badge ${classeBadge}" style="font-size: 8px; padding: 2px 6px; margin-left: 10px;">
                            ${rotuloCat}
                        </span>
                    </h4>
                    <table class="popup-report-table">
                        <tr><th>Cód. Localidade</th><td>${props.CD_LOCALIDADE ? parseInt(props.CD_LOCALIDADE) : 'N/A'}</td></tr>
                        <tr><th>Estado / UF</th><td>${props.NM_UF || 'N/A'} (${props.SIGLA_UF || 'N/A'}) (Cód: ${props.CD_UF || 'N/A'})</td></tr>
                        <tr><th>Município</th><td>${props.NM_MUN || 'N/A'} (Cód: ${props.CD_MUN || 'N/A'})</td></tr>
                        <tr><th>Dist. Sede Municipal</th><td>${(props.DIST_MUNICIPIO !== undefined && props.DIST_MUNICIPIO !== null) ? (props.DIST_MUNICIPIO === 0 ? '<strong>Sede do Município</strong>' : `<strong>${props.DIST_MUNICIPIO.toFixed(1)} km</strong>`) : 'N/A'}</td></tr>
                        <tr><th>Classificação</th><td><strong>${rotuloCat}</strong></td></tr>
                        <tr><th>Categoria Censo</th><td>${props.CT_LOCALIDADE || 'N/A'}</td></tr>
                        <tr><th>Subcategoria</th><td>${props.SCT_LOCALIDADE || 'N/A'}</td></tr>
                        <tr><th>Região Intermed.</th><td>${props.NM_RGINT || 'N/A'} (Cód: ${props.CD_RGINT || 'N/A'})</td></tr>
                        <tr><th>Região Imediata</th><td>${props.NM_RGI || 'N/A'} (Cód: ${props.CD_RGI || 'N/A'})</td></tr>
                        <tr><th>Latitude</th><td>${latlng.lat.toFixed(6)}</td></tr>
                        <tr><th>Longitude</th><td>${latlng.lng.toFixed(6)}</td></tr>
                    </table>
                    <a href="${mapsUrl}" target="_blank" class="popup-maps-link">
                        <i class="fa-solid fa-map-location-dot"></i> Visualizar no Google Maps
                    </a>
                </div>
            `;
            layer.bindPopup(popupContent, { maxWidth: 340, autoPan: true });

            // Tooltip leve ao hover para confirmação visual antes do clique
            layer.bindTooltip(props.NM_LOCALIDADE || 'Localidade', {
                sticky: false,
                direction: 'top',
                offset: [0, -8],
                opacity: 0.9,
                className: 'localidade-tooltip'
            });
        }
    });

    clusterGroup.addLayer(geojsonLayer);
    window.geoportalLayers.localidadesCluster = clusterGroup;

    if (GeoportalState.state.camadaPontos) {
        map.addLayer(clusterGroup);
    }
}

// Função global para filtrar os pontos de localidades mostrados no cluster do mapa com base no estado e na categoria selecionados
window.filtrarLocalidadesNoMapa = function(ufSelecionada, categoriaSelecionada) {
    const clusterGroup = window.geoportalLayers.localidadesCluster;
    const geojson = window.geoportalData.localidades;
    const map = window.map;
    
    if (!clusterGroup || !geojson || !map) return;
    
    const ufs = ufSelecionada || "all";
    const cats = categoriaSelecionada || "all";
    
    // Obter estado dos sub-filtros de distância
    const swAte50 = document.getElementById("switch-dist-ate50");
    const swMais50 = document.getElementById("switch-dist-mais50");
    const mostrarAte50 = swAte50 ? swAte50.checked : true;
    const mostrarMais50 = swMais50 ? swMais50.checked : false;
    
    // Armazena se a camada de cluster está ativa no mapa atualmente
    const estavaAtiva = map.hasLayer(clusterGroup);
    
    // Remove temporariamente o cluster para evitar retrabalho pesado de re-layout em tempo real
    if (estavaAtiva) {
        map.removeLayer(clusterGroup);
    }
    
    // Limpa todas as camadas internas do cluster
    clusterGroup.clearLayers();
    
    const marcadoresAdicionar = [];
    
    geojson.features.forEach(feature => {
        if (feature._markerRef) {
            const props = feature.properties;
            const atendeUf  = (ufs === "all" || props.SIGLA_UF === ufs);
            const atendeCat = (cats === "all" || props.CT_LOCALIDADE === cats);
            
            // Filtragem por distância das infovias (Melhoria 5.0)
            const dist = props.DIST_INFOVIA;
            let atendeDist = false;
            
            // Se a distância for nula ou indefinida, assume-se como fora do raio (> 50 km)
            const estaAte50 = (dist !== undefined && dist !== null && dist <= 50.0);
            
            if (estaAte50 && mostrarAte50) {
                atendeDist = true;
            } else if (!estaAte50 && mostrarMais50) {
                atendeDist = true;
            }
            
            // Se atende a todos os critérios, adiciona ao cluster
            if (atendeUf && atendeCat && atendeDist) {
                marcadoresAdicionar.push(feature._markerRef);
            }
        }
    });
    
    // Adiciona todos os marcadores qualificados de uma só vez (otimização do markercluster)
    clusterGroup.addLayers(marcadoresAdicionar);
    
    // Re-adiciona o cluster ao mapa se ele estava visível
    if (estavaAtiva) {
        map.addLayer(clusterGroup);
    }
};

// 5.4 Configuração do Mapa de Calor (Heatmap)
function configurarMapaDeCalor(geojson) {
    // Extrai pontos [lat, lng, intensidade] do GeoJSON de localidades
    const heatPoints = geojson.features.map(f => {
        const coords = f.geometry.coordinates;
        // O GeoJSON salva em [lng, lat]. O Leaflet heatlayer precisa de [lat, lng, intensidade]
        const cat = f.properties.CATEGORIA_MAPA;
        let intensity = 0.4; // Rural por padrão
        
        if (cat === 'Sede') {
            intensity = 1.0;
        } else if (cat === 'Vila') {
            intensity = 0.7;
        }

        return [coords[1], coords[0], intensity];
    });

    window.geoportalLayers.heatmapLayer = L.heatLayer(heatPoints, {
        radius: 20,
        blur: 15,
        maxZoom: 10,
        gradient: {
            0.2: '#0088ff', // azul
            0.4: '#00e676', // verde
            0.7: '#ffcc00', // amarelo
            1.0: '#ff4d4d'  // vermelho
        }
    });

    if (GeoportalState.state.camadaCalor) {
        window.geoportalLayers.heatmapLayer.addTo(map);
    }
}

// 5.5 Preenche o Selectbox de Infovias na Sidebar de Análise
function preencherFiltroInfovias(geojson) {
    const select = document.getElementById("select-infovia");
    if (!select) return;

    // Extrair pastas KML_FOLDER únicas (nomes das Infovias)
    const infoviasSet = new Set();
    geojson.features.forEach(f => {
        if (f.properties.KML_FOLDER) {
            infoviasSet.add(f.properties.KML_FOLDER);
        }
    });

    // Ordenar e adicionar no select
    const infoviasOrdenadas = Array.from(infoviasSet).sort();
    infoviasOrdenadas.forEach(infovia => {
        const option = document.createElement("option");
        option.value = infovia;
        option.textContent = infovia;
        select.appendChild(option);
    });
}

// 5.6 Adiciona Legenda de Convenções Temáticas no Canto Superior Esquerdo
function adicionarLegendaAoMapa() {
    const legend = L.control({ position: 'topleft' });

    legend.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'info legend glass-panel');
        div.id = 'legend-panel';
        div.innerHTML = `
            <div class="legend-header" id="legend-header" style="cursor: pointer; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                <h4 style="margin: 0; font-size: 12px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 6px;"><i class="fa-solid fa-circle-info" style="color: var(--accent-cyan);"></i> Legenda Geoportal</h4>
                <i class="fa-solid fa-chevron-up" id="legend-menu-chevron" style="transition: transform 0.3s ease; color: var(--text-secondary); font-size: 11px;"></i>
            </div>
            <div class="legend-content" id="legend-content">
                <div class="legend-group" style="margin-top: 12px;">
                    <h5>Categorias de Comunidades (CT)</h5>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px 10px; margin-top: 4px; font-size: 11px;">
                        <div class="legend-item"><span class="legend-color" style="background: #ff3366; border: 1.2px solid #fff;"></span> Cidade</div>
                        <div class="legend-item"><span class="legend-color" style="background: #ff9f00; border: 1.2px solid #fff;"></span> Vila</div>
                        <div class="legend-item"><span class="legend-color" style="background: #ffcc00; border: 1.2px solid #fff;"></span> N. Urbano</div>
                        <div class="legend-item"><span class="legend-color" style="background: #00f2fe; border: 1.2px solid #fff;"></span> Povoado</div>
                        <div class="legend-item"><span class="legend-color" style="background: #00e676; border: 1.2px solid #fff;"></span> Indígena</div>
                        <div class="legend-item"><span class="legend-color" style="background: #b927fc; border: 1.2px solid #fff;"></span> Quilombola</div>
                        <div class="legend-item"><span class="legend-color" style="background: #ff00ff; border: 1.2px solid #fff;"></span> Lugarejo</div>
                        <div class="legend-item"><span class="legend-color" style="background: #00d2ff; border: 1.2px solid #fff;"></span> Agrovila</div>
                        <div class="legend-item"><span class="legend-color" style="background: #a1887f; border: 1.2px solid #fff;"></span> N. Rural</div>
                        <div class="legend-item"><span class="legend-color" style="background: #a1a1a6; border: 1.2px solid #fff;"></span> Outras</div>
                    </div>
                </div>
                <div class="legend-group" style="margin-top: 10px;">
                    <h5>Elementos das InfoVias</h5>
                    <div class="legend-item">
                        <span style="display:inline-block; width:12px; height:3px; background:#00f2fe; margin-right:4px;"></span>
                        Infovia Tronco
                    </div>
                    <div class="legend-item">
                        <span style="display:inline-block; width:12px; height:3px; background:#b927fc; margin-right:4px;"></span>
                        Infovia Derivação
                    </div>
                    <div class="legend-item">
                        <span style="display:inline-block; width:12px; height:2px; border-top: 2px dashed #ffb703; margin-right:4px;"></span>
                        Infovia Planejada
                    </div>
                    <div class="legend-item">
                        <span class="legend-color" style="background: linear-gradient(135deg, #ff007f, #ff5e62); border: 1.5px solid #fff; border-radius: 50%; width: 8px; height: 8px; margin-left: 2px; margin-right: 6px; box-shadow: 0 0 4px rgba(255, 0, 127, 0.6);"></span>
                        Nó de Infraestrutura (Ponto da Infovia)
                    </div>
                </div>
            </div>
        `;
        
        // Impedir propagação de eventos no Leaflet
        L.DomEvent.disableClickPropagation(div);
        L.DomEvent.disableScrollPropagation(div);
        
        return div;
    };

    legend.addTo(window.map);
}

// 5.7 Inicializa Menus Colapsáveis com Suporte Móvel (Começam fechados em celular)
function inicializarMenusColapsaveis() {
    const isMobile = window.innerWidth <= 768;

    // 1. Menu Flutuante de Camadas
    const floatMenuHeader = document.getElementById("floating-menu-header");
    const floatMenu = document.getElementById("floating-menu");
    const floatContent = document.getElementById("floating-menu-content");
    const floatChevron = document.getElementById("floating-menu-chevron");

    if (floatMenuHeader && floatMenu && floatContent && floatChevron) {
        const toggleFloatMenu = (forceCollapse = null) => {
            const isCurrentlyCollapsed = floatMenu.classList.contains("collapsed");
            const shouldCollapse = forceCollapse !== null ? forceCollapse : !isCurrentlyCollapsed;
            
            if (shouldCollapse) {
                // Colapsar
                floatMenu.classList.add("collapsed");
                floatContent.style.maxHeight = "0px";
                floatContent.style.opacity = "0";
                floatChevron.style.transform = "rotate(180deg)";
            } else {
                // Expandir
                floatMenu.classList.remove("collapsed");
                floatContent.style.maxHeight = floatContent.scrollHeight + "px";
                floatContent.style.opacity = "1";
                floatChevron.style.transform = "rotate(0deg)";
            }
        };

        floatMenuHeader.addEventListener("click", () => toggleFloatMenu());

        // Configuração inicial
        if (isMobile) {
            // No mobile, começa fechado
            setTimeout(() => toggleFloatMenu(true), 200);
        } else {
            // No desktop, começa aberto
            setTimeout(() => {
                floatContent.style.maxHeight = floatContent.scrollHeight + "px";
                floatContent.style.opacity = "1";
                floatChevron.style.transform = "rotate(0deg)";
            }, 300);
        }
    }

    // 2. Painel de Legenda
    const legendHeader = document.getElementById("legend-header");
    const legendPanel = document.getElementById("legend-panel");
    const legendContent = document.getElementById("legend-content");
    const legendChevron = document.getElementById("legend-menu-chevron");

    if (legendHeader && legendPanel && legendContent && legendChevron) {
        const toggleLegend = (forceCollapse = null) => {
            const isCurrentlyCollapsed = legendPanel.classList.contains("collapsed");
            const shouldCollapse = forceCollapse !== null ? forceCollapse : !isCurrentlyCollapsed;
            
            if (shouldCollapse) {
                // Colapsar
                legendPanel.classList.add("collapsed");
                legendContent.style.maxHeight = "0px";
                legendContent.style.opacity = "0";
                legendChevron.style.transform = "rotate(180deg)";
            } else {
                // Expandir
                legendPanel.classList.remove("collapsed");
                legendContent.style.maxHeight = legendContent.scrollHeight + "px";
                legendContent.style.opacity = "1";
                legendChevron.style.transform = "rotate(0deg)";
            }
        };

        legendHeader.addEventListener("click", () => toggleLegend());

        // Configuração inicial
        if (isMobile) {
            // No mobile, começa fechado
            setTimeout(() => toggleLegend(true), 200);
        } else {
            // No desktop, começa aberto
            setTimeout(() => {
                legendContent.style.maxHeight = legendContent.scrollHeight + "px";
                legendContent.style.opacity = "1";
                legendChevron.style.transform = "rotate(0deg)";
            }, 300);
        }
    }
}
