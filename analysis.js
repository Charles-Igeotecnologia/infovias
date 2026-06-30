// MÓDULO DE ANÁLISE ESPACIAL AVANÇADA (BUFFER E SELEÇÃO LINEAR)

(function() {
    let activeBufferLayer     = null; // Camada Leaflet que exibe a área de influência (buffer)
    let bufferDebounceTimer   = null; // Timer para evitar múltiplos cálculos enquanto arrasta o slider
    let localidadesAfetadasList = []; // Cache das localidades afetadas pelo filtro atual

    // Variáveis demográficas calculadas (Censo 2022)
    let totalPopEst = 0;
    let totalDomEst = 0;
    let setoresAfetadosEst = 0;
    let popCapitalEst = 0;
    let popInteriorEst = 0;
    let domCapitalEst = 0;
    let domInteriorEst = 0;

    // Referências DOM
    const selectInfovia     = document.getElementById("select-infovia");
    const selectUF          = document.getElementById("select-uf");          // MELHORIA 4.2
    const selectCategoriaCt = document.getElementById("select-categoria-ct"); // Filtro de Categoria Censo
    const sliderDistancia   = document.getElementById("slider-distancia");
    const inputDistancia    = document.getElementById("input-distancia");
    const btnReset          = document.getElementById("btn-reset-filters");
    
    const statTotal     = document.getElementById("stat-total");
    const statTotalPct  = document.getElementById("stat-total-pct");       // MELHORIA 4.1
    const statSedes     = document.getElementById("stat-sedes");
    const statSedesPct  = document.getElementById("stat-sedes-pct");       // MELHORIA 4.1
    const statVilas     = document.getElementById("stat-vilas");
    const statVilasPct  = document.getElementById("stat-vilas-pct");       // MELHORIA 4.1
    const statRurais    = document.getElementById("stat-rurais");
    const statRuraisPct = document.getElementById("stat-rurais-pct");      // MELHORIA 4.1
    
    // Controles demográficos
    const statPop       = document.getElementById("stat-populacao");
    const statPopSub    = document.getElementById("stat-populacao-sub");
    const statDom       = document.getElementById("stat-domicilios");
    const statDomSub    = document.getElementById("stat-domicilios-sub");
    const demoContainer = document.getElementById("demografia-container");
    
    const impactList = document.getElementById("impact-list");
    const btnExport  = document.getElementById("btn-export-csv");
    const btnReport  = document.getElementById("btn-generate-report"); // Novo botão de Relatório
    const btnFocus   = document.getElementById("btn-focus-extent");
    
    // Controles do detalhamento de Categoria Censo (CT)
    const ctBreakdownContainer = document.getElementById("ct-breakdown-container");
    const btnToggleCtBreakdown = document.getElementById("btn-toggle-ct-breakdown");
    const ctBreakdownChevron   = document.getElementById("ct-breakdown-chevron");
    const ctBreakdownList      = document.getElementById("ct-breakdown-list");

    function init() {
        const map = window.map;
        if (!map) {
            setTimeout(init, 100);
            return;
        }

        // Criar grupo para a camada de buffer e adicionar ao mapa
        activeBufferLayer = L.featureGroup().addTo(map);

        // Registrar eventos nos elementos da sidebar
        if (sliderDistancia) {
            sliderDistancia.addEventListener("input",  onSliderInput);
            sliderDistancia.addEventListener("change", onSliderChange);
        }
        if (inputDistancia) {
            inputDistancia.addEventListener("input",  onInputDistanciaInput);
            inputDistancia.addEventListener("change", onInputDistanciaChange);
        }
        if (selectInfovia) {
            selectInfovia.addEventListener("change", executarAnaliseEspacial);
        }
        // MELHORIA 4.2: Filtro por UF reexecuta análise
        if (selectUF) {
            selectUF.addEventListener("change", executarAnaliseEspacial);
        }
        // Filtro por Categoria Censo reexecuta análise
        if (selectCategoriaCt) {
            selectCategoriaCt.addEventListener("change", executarAnaliseEspacial);
        }
        if (btnReset) {
            btnReset.addEventListener("click", resetarFiltros);
        }
        if (btnExport) {
            btnExport.addEventListener("click", exportarDadosParaCSV);
        }
        if (btnReport) {
            btnReport.addEventListener("click", gerarRelatorioHTML);
        }
        if (btnToggleCtBreakdown) {
            btnToggleCtBreakdown.addEventListener("click", toggleCtBreakdownPanel);
        }
        if (btnFocus) {
            btnFocus.addEventListener("click", enquadrarInfoviasNoMapa);
        }

        // Sincronizar clique nas linhas de infovia para ativar análise imediata na Sidebar
        sincronizarCliqueNasInfovias();
    }

    // Alterna a exibição do detalhamento de categorias do Censo (CT) na sidebar
    function toggleCtBreakdownPanel() {
        if (!ctBreakdownList || !btnToggleCtBreakdown) return;
        
        const isCollapsed = (ctBreakdownList.style.display === "none" || ctBreakdownList.style.display === "");
        
        if (isCollapsed) {
            ctBreakdownList.style.display = "flex";
            btnToggleCtBreakdown.classList.add("active");
        } else {
            ctBreakdownList.style.display = "none";
            btnToggleCtBreakdown.classList.remove("active");
        }
    }

    // Evento contínuo ao arrastar o slider (sincroniza o input numérico)
    function onSliderInput(e) {
        const valor = e.target.value;
        if (inputDistancia) {
            inputDistancia.value = valor;
        }
        
        // Limpar timer anterior do debounce
        if (bufferDebounceTimer) {
            clearTimeout(bufferDebounceTimer);
        }

        // Configura debounce de 150ms para recalcular a geometria apenas quando o usuário desacelerar o arrasto
        bufferDebounceTimer = setTimeout(() => {
            executarAnaliseEspacial();
        }, 150);
    }

    // Evento disparado ao digitar valor no campo de texto (debounce)
    function onInputDistanciaInput(e) {
        let valor = parseFloat(e.target.value);
        if (isNaN(valor)) valor = 0;
        
        if (valor > 50) valor = 50;
        if (valor < 0) valor = 0;

        if (sliderDistancia) {
            sliderDistancia.value = valor;
        }

        if (bufferDebounceTimer) {
            clearTimeout(bufferDebounceTimer);
        }

        bufferDebounceTimer = setTimeout(() => {
            executarAnaliseEspacial();
        }, 150);
    }

    // Evento disparado ao confirmar/mudar valor (soltar foco ou enter)
    function onInputDistanciaChange(e) {
        let valor = parseFloat(e.target.value);
        if (isNaN(valor)) valor = 0;
        
        if (valor > 50) valor = 50;
        if (valor < 0) valor = 0;
        e.target.value = valor;

        if (sliderDistancia) {
            sliderDistancia.value = valor;
        }

        if (bufferDebounceTimer) {
            clearTimeout(bufferDebounceTimer);
        }
        executarAnaliseEspacial();
    }

    // Evento disparado quando o usuário solta o mouse do slider (garantia de cálculo final)
    function onSliderChange() {
        if (bufferDebounceTimer) {
            clearTimeout(bufferDebounceTimer);
        }
        executarAnaliseEspacial();
    }

    // Executa o processamento espacial usando Turf.js
    async function executarAnaliseEspacial() {
        const infoviaSelecionada = selectInfovia ? selectInfovia.value : "all";
        const ufSelecionada = selectUF ? selectUF.value : "all";
        const categoriaSelecionada = selectCategoriaCt ? selectCategoriaCt.value : "all";
        const raioKm = sliderDistancia ? parseFloat(sliderDistancia.value) : 0;      
        
        // Filtrar visualmente as bolinhas no mapa de acordo com o estado e categoria selecionados
        if (window.filtrarLocalidadesNoMapa) {
            window.filtrarLocalidadesNoMapa(ufSelecionada, categoriaSelecionada);
        }

        // Limpar destaques e camadas de buffer anteriores
        limparCamadaBuffer();
        restaurarEstiloOriginalLocalidades();
        localidadesAfetadasList = [];

        const selectMunicipio = document.getElementById("select-municipio");
        const cdMunSelecionado = (selectMunicipio && !selectMunicipio.disabled) ? selectMunicipio.value : "all";
        const modoMunicipal = cdMunSelecionado !== "all";

        if (modoMunicipal) {
            // Se entramos no modo municipal, resetamos o raio/buffer para 0 visualmente para evitar conflito
            if (sliderDistancia && sliderDistancia.value != 0) {
                sliderDistancia.value = 0;
                if (inputDistancia) inputDistancia.value = 0;
                raioKm = 0;
            }
        }

        // Atualizar estatísticas se o raio for 0 (e não for análise de município)
        if (raioKm === 0 && !modoMunicipal) {
            totalPopEst = 0;
            totalDomEst = 0;
            setoresAfetadosEst = 0;
            popCapitalEst = 0;
            popInteriorEst = 0;
            domCapitalEst = 0;
            domInteriorEst = 0;
            
            atualizarEstatisticasSidebar([], 0);
            atualizarListaSidebar([]);
            return;
        }

        const dataLinhas = window.geoportalData.infovias;
        const dataPontos = window.geoportalData.localidades;

        if (!dataLinhas || !dataPontos) {
            console.warn("Aguardando carregamento completo dos dados GeoJSON.");
            return;
        }

        console.time("Processamento Turf.js");

        if (modoMunicipal) {
            // ================= MODO B: FILTRO TERRITORIAL MUNICIPAL =================
            const uf = ufSelecionada;
            const munData = window._municipiosCache[uf];
            if (!munData || !munData.features) {
                console.warn("Aguardando carregamento da malha de municípios da UF.");
                return;
            }

            const munFeature = munData.features.find(f => String(f.properties.CD_MUN) === String(cdMunSelecionado));
            if (!munFeature) return;

            // 1. Obter dados demográficos totais reais oficiais do IBGE para o município
            totalPopEst = munFeature.properties.POPULACAO_REAL || 0;
            totalDomEst = munFeature.properties.DOMICILIOS_REAL || 0;
            setoresAfetadosEst = 0;
            popCapitalEst = 0;
            popInteriorEst = 0;
            domCapitalEst = 0;
            domInteriorEst = 0;

            const CODIGOS_CAPITAIS = ["1302603", "1501402", "1600303", "1400100"];
            if (CODIGOS_CAPITAIS.includes(String(cdMunSelecionado))) {
                popCapitalEst = totalPopEst;
                domCapitalEst = totalDomEst;
            } else {
                popInteriorEst = totalPopEst;
                domInteriorEst = totalDomEst;
            }

            // Contar os setores censitários pertencentes a esse município no cache
            const setoresData = window._setoresCache[uf];
            if (setoresData && setoresData.features) {
                setoresData.features.forEach(s => {
                    if (String(s.properties.CD_MUN) === String(cdMunSelecionado)) {
                        setoresAfetadosEst++;
                    }
                });
            }

            // 2. Filtrar comunidades contidas administrativamente no município
            const todasLocalidades = dataPontos.features;
            let totalSedes = 0, totalVilas = 0, totalRurais = 0;

            todasLocalidades.forEach(localidade => {
                if (String(localidade.properties.CD_MUN) === String(cdMunSelecionado)) {
                    if (categoriaSelecionada === "all" || localidade.properties.CT_LOCALIDADE === categoriaSelecionada) {
                        localidadesAfetadasList.push(localidade);

                        const cat = localidade.properties.CATEGORIA_MAPA;
                        if (cat === 'Sede') totalSedes++;
                        else if (cat === 'Vila') totalVilas++;
                        else if (cat === 'Rural') totalRurais++;

                        // Destaque visual no Leaflet
                        if (localidade._markerRef) {
                            localidade._markerRef.setStyle({
                                radius: 8.5,
                                color: '#00f2fe',
                                weight: 3.5,
                                fillOpacity: 1.0
                            });
                        }
                    }
                }
            });

            // 3. Filtrar InfoVias envolvidas (que cruzam ou tocam o território do município)
            const todasInfovias = dataLinhas.features;
            todasInfovias.forEach(infovia => {
                try {
                    // Verificar intersecção da infovia com o polígono do município
                    const intersecta = turf.booleanIntersects(infovia.geometry, munFeature.geometry);
                    if (intersecta) {
                        linhasAfetadasList.push(infovia);
                    }
                } catch (err) {
                    // Fallback geométrico manual se erro no Turf
                    let tocou = false;
                    const coords = infovia.geometry.coordinates;
                    if (infovia.geometry.type === "LineString") {
                        for (let pt of coords) {
                            if (turf.booleanPointInPolygon(turf.point(pt), munFeature)) {
                                tocou = true;
                                break;
                            }
                        }
                    }
                    if (tocou) {
                        linhasAfetadasList.push(infovia);
                    }
                }
            });

            // Adicionar o polígono de limite municipal ao mapa com visual de destaque azul/ciano sutil
            L.geoJSON(munFeature, {
                style: {
                    color: '#0284c7',
                    weight: 1.5,
                    dashArray: '6, 6',
                    fillColor: '#0284c7',
                    fillOpacity: 0.03,
                    opacity: 0.5
                }
            }).addTo(activeBufferLayer);

            console.timeEnd("Processamento Turf.js");
            console.log(`Análise Territorial de Município concluída: ${localidadesAfetadasList.length} comunidades. Demografia: ${totalPopEst} hab., ${totalDomEst} dom.`);

            // Atualizar sidebar e lista
            atualizarEstatisticasSidebar(localidadesAfetadasList, 0);
            atualizarListaSidebar(localidadesAfetadasList);

        } else {
            // ================= MODO A: FILTRO DE PROXIMIDADE (BUFFER) =================
            // 1. Filtrar as linhas de infovia selecionadas
            let linhasParaBuffer = [];
            if (infoviaSelecionada === "all") {
                linhasParaBuffer = dataLinhas.features;
            } else {
                linhasParaBuffer = dataLinhas.features.filter(f => f.properties.KML_FOLDER === infoviaSelecionada);
            }

            if (linhasParaBuffer.length === 0) {
                console.warn("Nenhuma linha de infovia selecionada para gerar buffer.");
                atualizarEstatisticasSidebar([], 0);
                atualizarListaSidebar([]);
                return;
            }

            // Criar uma FeatureCollection com as linhas selecionadas
            const featureCollectionLinhas = turf.featureCollection(linhasParaBuffer);

            // 1.5. Combinar as linhas em uma única geometria MultiLineString para dissolver buffers sobrepostos
            const combinadas = turf.combine(featureCollectionLinhas);
            const linhaCombinada = combinadas.features[0];

            // 2. Gerar o polígono de Buffer unificado (dissolvido) ao redor das linhas combinadas
            const bufferGeoJSON = turf.buffer(linhaCombinada, raioKm, { units: 'kilometers' });

            // 3. Adicionar o polígono de buffer ao mapa com estilização suave e moderna (Glassmorphism cian)
            L.geoJSON(bufferGeoJSON, {
                style: {
                    color: '#ff8800',
                    weight: 2,
                    dashArray: '6, 4',
                    fillColor: '#ff8800',
                    fillOpacity: 0.15,
                    opacity: 0.85
                }
            }).addTo(activeBufferLayer);

            // 4. Filtrar quais localidades estão dentro da geometria do buffer
            const localidadesFeatures = dataPontos.features;
            let totalSedes = 0, totalVilas = 0, totalRurais = 0;

            localidadesFeatures.forEach(localidade => {
                if (ufSelecionada !== "all" && localidade.properties.SIGLA_UF !== ufSelecionada) return;
                if (categoriaSelecionada !== "all" && localidade.properties.CT_LOCALIDADE !== categoriaSelecionada) return;

                // Verificação espacial robusta contra o buffer unificado
                const estaDentro = turf.booleanPointInPolygon(localidade.geometry, bufferGeoJSON);

                if (estaDentro) {
                    localidadesAfetadasList.push(localidade);

                    const cat = localidade.properties.CATEGORIA_MAPA;
                    if (cat === 'Sede') totalSedes++;
                    else if (cat === 'Vila') totalVilas++;
                    else if (cat === 'Rural') totalRurais++;

                    // Destaque visual no Leaflet
                    if (localidade._markerRef) {
                        localidade._markerRef.setStyle({
                            radius: 8.5,
                            color: '#00f2fe',
                            weight: 3.5,
                            fillOpacity: 1.0
                        });
                    }
                }
            });

            // 4.5. Calcular estimativa demográfica baseada nos setores censitários (Censo 2022)
            totalPopEst = 0;
            totalDomEst = 0;
            setoresAfetadosEst = 0;
            popCapitalEst = 0;
            popInteriorEst = 0;
            domCapitalEst = 0;
            domInteriorEst = 0;

            const CODIGOS_CAPITAIS = ["1302603", "1501402", "1600303", "1400100"];

            const ufsParaCarregar = ufSelecionada === "all" ? ["AM", "AP", "PA", "RR"] : [ufSelecionada];
            const promessasSetores = ufsParaCarregar.map(async (uf) => {
                if (!window._setoresCache[uf]) {
                    try {
                        const res = await fetch(`setores_censitarios/setores_${uf}_50km.geojson`);
                        if (res.ok) {
                            window._setoresCache[uf] = await res.json();
                        }
                    } catch (err) {
                        console.error(`Erro ao carregar setores para análise demográfica da UF: ${uf}`, err);
                    }
                }
            });

            await Promise.all(promessasSetores);

            // Processar cruzamento espacial contra os setores
            ufsParaCarregar.forEach(uf => {
                const setoresData = window._setoresCache[uf];
                if (!setoresData || !setoresData.features) return;
                
                setoresData.features.forEach(setor => {
                    let pontoRepresentativo;
                    try {
                        pontoRepresentativo = turf.centroid(setor);
                    } catch (e) {
                        const coords = setor.geometry.coordinates;
                        if (setor.geometry.type === "Polygon") {
                            pontoRepresentativo = turf.point(coords[0][0]);
                        } else if (setor.geometry.type === "MultiPolygon") {
                            pontoRepresentativo = turf.point(coords[0][0][0]);
                        } else {
                            return;
                        }
                    }
                    
                    const estaDentro = turf.booleanPointInPolygon(pontoRepresentativo, bufferGeoJSON);
                    
                    if (estaDentro) {
                        const pop = parseInt(setor.properties.POPULACAO) || 0;
                        const dom = parseInt(setor.properties.DOMICILIOS) || 0;
                        const cdMun = setor.properties.CD_MUN;
                        
                        if (CODIGOS_CAPITAIS.includes(cdMun)) {
                            popCapitalEst += pop;
                            domCapitalEst += dom;
                        } else {
                            popInteriorEst += pop;
                            domInteriorEst += dom;
                        }
                        
                        totalPopEst += pop;
                        totalDomEst += dom;
                        setoresAfetadosEst++;
                    }
                });
            });

            console.timeEnd("Processamento Turf.js");
            console.log(`Análise concluída: ${localidadesAfetadasList.length} comunidades afetadas. Demografia: ${totalPopEst} hab., ${totalDomEst} dom. em ${setoresAfetadosEst} setores.`);

            // 5. Atualizar os cartões e a lista da Sidebar
            atualizarEstatisticasSidebar(localidadesAfetadasList, raioKm);
            atualizarListaSidebar(localidadesAfetadasList);
        }
    }

    // Remove o polígono de buffer do mapa
    function limparCamadaBuffer() {
        if (activeBufferLayer) {
            activeBufferLayer.clearLayers();
        }
    }

    // Restaura as propriedades padrão de raio e borda de todos os circleMarkers
    function restaurarEstiloOriginalLocalidades() {
        const dataPontos = window.geoportalData.localidades;
        if (!dataPontos) return;

        dataPontos.features.forEach(localidade => {
            if (localidade._markerRef) {
                const originalColor = window.obterCorPorCT(localidade.properties.CT_LOCALIDADE);
                
                localidade._markerRef.setStyle({
                    radius: 7,
                    color: '#ffffff',
                    weight: 1.5,
                    fillOpacity: 0.92,
                    fillColor: originalColor
                });
            }
        });
    }

    // MELHORIA 4.1: Atualiza contadores + percentuais + gráfico SVG
    function atualizarEstatisticasSidebar(afetadas, raioKm) {
        const total = afetadas.length;
        const totalGeral = 11186; // Total fixo de localidades na base

        if (statTotal) statTotal.textContent = total.toLocaleString('pt-BR');

        // Atualizar estatísticas demográficas na Sidebar com desdobramento Capital/Interior
        if (totalPopEst > 0 || totalDomEst > 0) {
            if (statPop) statPop.textContent = totalPopEst.toLocaleString('pt-BR');
            if (statPopSub) {
                statPopSub.innerHTML = `Interior: <strong>${popInteriorEst.toLocaleString('pt-BR')}</strong><br>Capitais: ${popCapitalEst.toLocaleString('pt-BR')}`;
            }
            
            if (statDom) statDom.textContent = totalDomEst.toLocaleString('pt-BR');
            if (statDomSub) {
                statDomSub.innerHTML = `Interior: <strong>${domInteriorEst.toLocaleString('pt-BR')}</strong><br>Capitais: ${domCapitalEst.toLocaleString('pt-BR')}`;
            }
            
            if (demoContainer) demoContainer.style.display = "block";
        } else {
            if (demoContainer) demoContainer.style.display = "none";
        }

        let totalSedes = 0, totalVilas = 0, totalRurais = 0;
        afetadas.forEach(loc => {
            const cat = loc.properties.CATEGORIA_MAPA;
            if (cat === 'Sede') totalSedes++;
            else if (cat === 'Vila') totalVilas++;
            else if (cat === 'Rural') totalRurais++;
        });

        if (statSedes)  statSedes.textContent  = totalSedes.toLocaleString('pt-BR');
        if (statVilas)  statVilas.textContent  = totalVilas.toLocaleString('pt-BR');
        if (statRurais) statRurais.textContent = totalRurais.toLocaleString('pt-BR');

        // MELHORIA 4.1: Percentuais em relação ao total geral
        const pctTotal  = total > 0 ? ((total  / totalGeral) * 100).toFixed(1) : 0;
        const pctSedes  = total > 0 ? ((totalSedes  / total) * 100).toFixed(0) : 0;
        const pctVilas  = total > 0 ? ((totalVilas  / total) * 100).toFixed(0) : 0;
        const pctRurais = total > 0 ? ((totalRurais / total) * 100).toFixed(0) : 0;

        if (statTotalPct)  statTotalPct.textContent  = `${pctTotal}% do total`;
        if (statSedesPct)  statSedesPct.textContent  = `${pctSedes}%`;
        if (statVilasPct)  statVilasPct.textContent  = `${pctVilas}%`;
        if (statRuraisPct) statRuraisPct.textContent = `${pctRurais}%`;

        // MELHORIA 4.3: Atualizar gráfico SVG de composição
        atualizarGraficoSVG(totalSedes, totalVilas, totalRurais, total);

        // Atualizar detalhamento de categorias do Censo (CT_LOCALIDADE) na sidebar
        if (ctBreakdownList) {
            ctBreakdownList.innerHTML = "";
        }

        if (total === 0) {
            if (ctBreakdownContainer) ctBreakdownContainer.style.display = "none";
            if (ctBreakdownList) {
                ctBreakdownList.style.display = "none";
            }
            if (btnToggleCtBreakdown) {
                btnToggleCtBreakdown.classList.remove("active");
            }
        } else {
            if (ctBreakdownContainer) ctBreakdownContainer.style.display = "block";

            // Contar ocorrências por Categoria Censo (CT_LOCALIDADE)
            const ctCounts = {};
            afetadas.forEach(loc => {
                const ct = loc.properties.CT_LOCALIDADE || "Outras Localidades";
                ctCounts[ct] = (ctCounts[ct] || 0) + 1;
            });

            // Converter para array e ordenar decrescente pelo count
            const ctList = Object.keys(ctCounts).map(name => {
                return { name: name, count: ctCounts[name] };
            }).sort((a, b) => b.count - a.count);

            // Injetar na UI de forma de alta densidade
            if (ctBreakdownList) {
                ctList.forEach(item => {
                    const dotColor = window.obterCorPorCT(item.name);
                    const pct = ((item.count / total) * 100).toFixed(1);
                    const itemDiv = document.createElement("div");
                    itemDiv.className = "ct-breakdown-item";
                    itemDiv.innerHTML = `
                        <div class="ct-breakdown-label">
                            <span class="ct-breakdown-dot" style="background-color: ${dotColor}"></span>
                            <span>${item.name}</span>
                        </div>
                        <div class="ct-breakdown-values">
                            <span class="ct-breakdown-badge">${item.count}</span>
                            <span class="ct-breakdown-pct">${pct}%</span>
                        </div>
                    `;
                    ctBreakdownList.appendChild(itemDiv);
                });
            }
        }

        // Habilitar/desabilitar botão de exportação CSV e Relatório
        if (btnExport) {
            btnExport.disabled = (total === 0);
        }
        if (btnReport) {
            btnReport.disabled = (total === 0);
        }
    }

    // MELHORIA 4.3: Gráfico de barras horizontais em SVG puro
    function atualizarGraficoSVG(sedes, vilas, rurais, total) {
        const chartContainer = document.getElementById("chart-container");
        const chartSedes  = document.getElementById("chart-sedes");
        const chartVilas  = document.getElementById("chart-vilas");
        const chartRurais = document.getElementById("chart-rurais");

        if (!chartContainer || !chartSedes || !chartVilas || !chartRurais) return;

        if (total === 0) {
            chartContainer.style.display = "none";
            return;
        }

        chartContainer.style.display = "block";

        // Calcular larguras proporcionais (viewBox de 100 unidades de largura)
        const wSedes  = (sedes  / total) * 100;
        const wVilas  = (vilas  / total) * 100;
        const wRurais = (rurais / total) * 100;

        // Gap entre barras: 1 unidade
        const gap = total > 0 ? 1 : 0;
        let x = 0;

        // Sedes (vermelha)
        chartSedes.setAttribute("x", x.toFixed(2));
        chartSedes.setAttribute("width", Math.max(0, wSedes - (vilas > 0 ? gap : 0)).toFixed(2));
        x += wSedes;

        // Vilas (amarela)
        chartVilas.setAttribute("x", x.toFixed(2));
        chartVilas.setAttribute("width", Math.max(0, wVilas - (rurais > 0 ? gap : 0)).toFixed(2));
        x += wVilas;

        // Rurais (verde)
        chartRurais.setAttribute("x", x.toFixed(2));
        chartRurais.setAttribute("width", Math.max(0, wRurais).toFixed(2));
    }

    // Renderiza os itens de localidades afetadas na barra lateral
    function atualizarListaSidebar(afetadas) {
        if (!impactList) return;
        impactList.innerHTML = "";

        if (afetadas.length === 0) {
            impactList.innerHTML = `
                <div class="content" style="color: var(--text-muted); text-align: center; padding: 20px 0; font-size: 12px;">
                    Aumente o raio de proximidade para listar as comunidades impactadas ao redor das infovias.
                </div>
            `;
            return;
        }

        // Ordenar afetadas por categoria (Sede -> Vila -> Rural) e depois por nome
        const afetadasOrdenadas = [...afetadas].sort((a, b) => {
            const catOrder = { 'Sede': 3, 'Vila': 2, 'Rural': 1 };
            const diff = catOrder[b.properties.CATEGORIA_MAPA] - catOrder[a.properties.CATEGORIA_MAPA];
            if (diff !== 0) return diff;
            return a.properties.NM_LOCALIDADE.localeCompare(b.properties.NM_LOCALIDADE);
        });

        // Limitamos a exibição na interface a 50 itens para garantir rolagem lisa
        const limiteUI  = 50;
        const itensExibir = afetadasOrdenadas.slice(0, limiteUI);

        itensExibir.forEach(loc => {
            const props   = loc.properties;
            const itemDiv = document.createElement("div");
            itemDiv.className = "impact-item";
            
            const badgeClass  = props.CATEGORIA_MAPA.toLowerCase();
            const rotuloCat   = props.CATEGORIA_MAPA === 'Sede' ? 'Sede Municipal' : (props.CATEGORIA_MAPA === 'Vila' ? 'Vila' : 'Lugar Rural');
            
            const distSedeText = (props.DIST_MUNICIPIO !== undefined && props.DIST_MUNICIPIO !== null && props.DIST_MUNICIPIO > 0)
                ? ` • <span style="color: var(--accent-cyan); font-weight: 500;">${props.DIST_MUNICIPIO.toFixed(1)} km da Sede</span>`
                : (props.CATEGORIA_MAPA === 'Sede' ? ' • <span style="color: var(--priority-medium); font-weight: 600;">Sede</span>' : '');

            itemDiv.innerHTML = `
                <div>
                    <div class="name-uf" title="${props.NM_LOCALIDADE}">${props.NM_LOCALIDADE} (${props.SIGLA_UF})</div>
                    <div class="mun">${props.NM_MUN || 'Município não cadastrado'}${distSedeText}</div>
                </div>
                <span class="prio-badge ${badgeClass}">${rotuloCat}</span>
            `;

            // Clique na linha da sidebar foca e abre o popup da comunidade no mapa
            itemDiv.style.cursor = 'pointer';
            itemDiv.addEventListener("click", () => {
                const coords = loc.geometry.coordinates;
                const map    = window.map;
                // Centralizar e aplicar zoom
                map.setView([coords[1], coords[0]], 12);
                
                // Se a camada de pontos estiver desativada, ativa
                window.GeoportalState.atualizarCamada('camadaPontos', true);

                // Esperar o mapa mover e abrir o popup
                setTimeout(() => {
                    if (loc._markerRef) {
                        loc._markerRef.openPopup();
                    }
                }, 300);
            });

            impactList.appendChild(itemDiv);
        });

        // Caso haja mais itens que o limite da interface, informa o usuário
        if (afetadasOrdenadas.length > limiteUI) {
            const avisoMaisItens = document.createElement("div");
            avisoMaisItens.style.cssText = "font-size: 11px; color: var(--text-muted); text-align: center; padding: 10px 0; border-top: 1px solid var(--border-glass); margin-top: 5px;";
            avisoMaisItens.textContent = `Exibindo as primeiras ${limiteUI} de ${afetadasOrdenadas.length} comunidades. Use a exportação CSV para baixar a lista completa.`;
            impactList.appendChild(avisoMaisItens);
        }
    }

    // Configura a Seleção Linear a partir de um clique direto na infovia do mapa
    function sincronizarCliqueNasInfovias() {
        // Aguarda a inicialização da camada de infovias no app.js
        const checkLayersExist = setInterval(() => {
            if (window.geoportalLayers.infoviasLayer) {
                clearInterval(checkLayersExist);
                
                window.geoportalLayers.infoviasLayer.on("click", (e) => {
                    const feature = e.propagatedFrom.feature; // Feição da linha clicada
                    if (!feature) return;
                    
                    const infoviaNome = feature.properties.KML_FOLDER;
                    
                    if (infoviaNome && selectInfovia) {
                        // Sincronizar selectbox lateral
                        selectInfovia.value = infoviaNome;
                        console.log(`Seleção Linear ativada para infovia: ${infoviaNome}`);
                        
                        // Se o raio estiver em 0, define automaticamente para 10 km para mostrar comunidades
                        if (parseFloat(sliderDistancia.value) === 0) {
                            sliderDistancia.value = 10;
                            if (inputDistancia) inputDistancia.value = 10;
                        }
                        
                        executarAnaliseEspacial();
                    }
                });
            }
        }, 200);
    }

    // Reseta todos os filtros para o estado padrão
    function resetarFiltros() {
        if (selectInfovia)     selectInfovia.value     = "all";
        if (selectUF)          selectUF.value          = "all";  // MELHORIA 4.2
        if (selectCategoriaCt) selectCategoriaCt.value = "all";  // Reseta Categoria Censo
        if (sliderDistancia) {
            sliderDistancia.value = 0;
        }
        if (inputDistancia) {
            inputDistancia.value = 0;
        }
        executarAnaliseEspacial();
        
        // Centralizar o mapa na visão geral
        enquadrarInfoviasNoMapa();
    }

    // Enquadra a tela nas extensões das infovias selecionadas
    function enquadrarInfoviasNoMapa() {
        const infoviaSelecionada = selectInfovia ? selectInfovia.value : "all";
        const layerInfovias = window.geoportalLayers.infoviasLayer;
        
        if (!layerInfovias) return;

        if (infoviaSelecionada === "all") {
            window.map.fitBounds(layerInfovias.getBounds(), { padding: [30, 30] });
        } else {
            // Filtrar as sub-camadas (linhas individuais) que coincidem com a infovia selecionada
            const bounds = L.latLngBounds();
            layerInfovias.eachLayer(layer => {
                if (layer.feature && layer.feature.properties.KML_FOLDER === infoviaSelecionada) {
                    if (layer.getBounds) {
                        bounds.extend(layer.getBounds());
                    }
                }
            });
            if (bounds.isValid()) {
                window.map.fitBounds(bounds, { padding: [50, 50] });
            }
        }
    }

    // Gera e baixa o arquivo CSV com todas as comunidades na área de influência ou município
    function exportarDadosParaCSV() {
        if (localidadesAfetadasList.length === 0) return;

        const selectMunicipio = document.getElementById("select-municipio");
        const cdMunSelecionado = (selectMunicipio && !selectMunicipio.disabled) ? selectMunicipio.value : "all";
        const modoMunicipal = cdMunSelecionado !== "all";
        const municipioNome = modoMunicipal ? selectMunicipio.options[selectMunicipio.selectedIndex].text : "";

        console.log("Iniciando exportação de CSV...");
        
        // Cabeçalho do CSV (com a nova coluna de distância)
        let csvContent = "Nome_Localidade;Estado_UF;Municipio;Categoria_Censo;Classificacao_Mapa;Distancia_Sede_KM;Latitude;Longitude\n";
        
        // Corpo do CSV
        localidadesAfetadasList.forEach(loc => {
            const props  = loc.properties;
            const coords = loc.geometry.coordinates; // [lng, lat]
            
            // Escapar ponto e vírgula e aspas
            const nome      = (props.NM_LOCALIDADE || "").replace(/;/g, ",").replace(/"/g, '""');
            const uf        = props.SIGLA_UF || "";
            const mun       = (props.NM_MUN  || "").replace(/;/g, ",").replace(/"/g, '""');
            const cat       = props.CT_LOCALIDADE || "";
            const classeMapa = props.CATEGORIA_MAPA === 'Sede' ? 'Sede Municipal' : (props.CATEGORIA_MAPA === 'Vila' ? 'Vila' : 'Lugar Rural');
            const distSede   = props.DIST_MUNICIPIO !== undefined && props.DIST_MUNICIPIO !== null ? props.DIST_MUNICIPIO : "";
            const lat       = coords[1].toFixed(6);
            const lng       = coords[0].toFixed(6);
            
            csvContent += `"${nome}";"${uf}";"${mun}";"${cat}";"${classeMapa}";${distSede};${lat};${lng}\n`;
        });

        // Gerar o Blob e forçar download
        const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" }); // \ufeff ativa suporte a acentos no Excel
        const url  = URL.createObjectURL(blob);
        const link = document.createElement("a");
        
        const infoviaNome = selectInfovia && selectInfovia.value !== "all" ? selectInfovia.value.replace(/\s+/g, "_") : "Geral";
        const raio        = sliderDistancia ? sliderDistancia.value : 0;
        
        link.setAttribute("href",     url);
        if (modoMunicipal) {
            const munNomeLimpo = municipioNome.replace(/\s+/g, "_");
            link.setAttribute("download", `comunidades_municipio_${munNomeLimpo}.csv`);
        } else {
            link.setAttribute("download", `comunidades_impactadas_infovia_${infoviaNome}_raio_${raio}km.csv`);
        }
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log("Exportação para CSV concluída com sucesso.");
    }

    // Gera o relatório analítico formatado em HTML para visualização e impressão/PDF
    function gerarRelatorioHTML() {
        if (localidadesAfetadasList.length === 0) return;

        console.log("Iniciando geração de relatório HTML...");

        // Coletar parâmetros atuais da análise
        const selectMunicipio = document.getElementById("select-municipio");
        const cdMunSelecionado = (selectMunicipio && !selectMunicipio.disabled) ? selectMunicipio.value : "all";
        const modoMunicipal = cdMunSelecionado !== "all";
        const municipioNome = modoMunicipal ? selectMunicipio.options[selectMunicipio.selectedIndex].text : "";

        const infoviaSelecionada = selectInfovia && selectInfovia.value !== "all" ? selectInfovia.value : "Todas as Infovias (Geral)";
        const ufSelecionada = selectUF && selectUF.value !== "all" ? selectUF.value : "Todos os Estados";
        const categoriaSelecionada = selectCategoriaCt && selectCategoriaCt.value !== "all" ? selectCategoriaCt.value : "Todas as Categorias";
        const raio = sliderDistancia ? sliderDistancia.value : 0;
        const dataEmissao = new Date().toLocaleString('pt-BR');

        // Calcular estatísticas das localidades afetadas
        let totalSedes = 0, totalVilas = 0, totalRurais = 0;
        localidadesAfetadasList.forEach(loc => {
            const cat = loc.properties.CATEGORIA_MAPA;
            if (cat === 'Sede') totalSedes++;
            else if (cat === 'Vila') totalVilas++;
            else if (cat === 'Rural') totalRurais++;
        });
        const total = localidadesAfetadasList.length;

        // Ordenar as localidades para o relatório (Sede -> Vila -> Rural, depois por Nome)
        const afetadasOrdenadas = [...localidadesAfetadasList].sort((a, b) => {
            const catOrder = { 'Sede': 3, 'Vila': 2, 'Rural': 1 };
            const diff = catOrder[b.properties.CATEGORIA_MAPA] - catOrder[a.properties.CATEGORIA_MAPA];
            if (diff !== 0) return diff;
            return a.properties.NM_LOCALIDADE.localeCompare(b.properties.NM_LOCALIDADE);
        });

        // Gerar linhas da tabela (com coluna de distância, população e domicílios)
        let tabelaLinhasHtml = "";
        afetadasOrdenadas.forEach((loc, index) => {
            const props = loc.properties;
            const coords = loc.geometry.coordinates; // [lng, lat]
            const rotuloCat = props.CATEGORIA_MAPA === 'Sede' ? 'Sede Municipal' : (props.CATEGORIA_MAPA === 'Vila' ? 'Vila' : 'Lugar Rural');
            const distSedeText = (props.DIST_MUNICIPIO !== undefined && props.DIST_MUNICIPIO !== null)
                ? (props.DIST_MUNICIPIO === 0 ? "Sede" : `${props.DIST_MUNICIPIO.toFixed(1)} km`)
                : "N/A";
            
            // Buscar população e domicílios (Consolidado urbano para Sedes, Setor pontual para outras)
            let popLoc = 0;
            let domLoc = 0;
            let temDados = false;
            let ehNucleoUrbano = false;
            
            const ufLoc = props.SIGLA_UF;
            const setoresData = window._setoresCache ? window._setoresCache[ufLoc] : null;
            
            if (setoresData && setoresData.features) {
                if (props.CATEGORIA_MAPA === 'Sede') {
                    // Sede Municipal -> Somar todos os setores urbanos daquele município
                    const cdMunTarget = String(props.CD_MUN);
                    setoresData.features.forEach(setor => {
                        const cdMunSetor = String(setor.properties.CD_MUN);
                        const sitSetor = setor.properties.SITUACAO;
                        if (cdMunSetor === cdMunTarget && sitSetor === "Urbana") {
                            popLoc += parseInt(setor.properties.POPULACAO) || 0;
                            domLoc += parseInt(setor.properties.DOMICILIOS) || 0;
                            temDados = true;
                            ehNucleoUrbano = true;
                        }
                    });
                } else {
                    // Vila ou Lugar Rural -> Pertencimento geométrico ponto-em-polígono
                    const pontoLoc = turf.point(coords);
                    for (let j = 0; j < setoresData.features.length; j++) {
                        const setor = setoresData.features[j];
                        if (setor.geometry && turf.booleanPointInPolygon(pontoLoc, setor)) {
                            popLoc = parseInt(setor.properties.POPULACAO) || 0;
                            domLoc = parseInt(setor.properties.DOMICILIOS) || 0;
                            temDados = true;
                            break;
                        }
                    }
                }
            }
            
            // Formatar os textos com indicação visual para sedes
            let popText = "N/A";
            let domText = "N/A";
            
            if (temDados) {
                popText = popLoc.toLocaleString('pt-BR');
                domText = domLoc.toLocaleString('pt-BR');
                if (ehNucleoUrbano) {
                    popText += ` <span style="font-size: 10px; color: #b927fc; font-weight: bold;" title="Total consolidado do Núcleo Urbano da cidade">*</span>`;
                    domText += ` <span style="font-size: 10px; color: var(--accent-cyan); font-weight: bold;" title="Total consolidado do Núcleo Urbano da cidade">*</span>`;
                }
            }
            
            tabelaLinhasHtml += `
                <tr>
                    <td style="text-align: center;">${index + 1}</td>
                    <td><strong>${props.NM_LOCALIDADE || 'N/A'}</strong></td>
                    <td>${props.NM_MUN || 'N/A'} (${props.SIGLA_UF || 'N/A'})</td>
                    <td>${props.CT_LOCALIDADE || 'N/A'}</td>
                    <td style="text-align: center;">
                        <span class="prio-tag ${props.CATEGORIA_MAPA.toLowerCase()}">${rotuloCat}</span>
                    </td>
                    <td style="text-align: center; font-weight: 500;">${popText}</td>
                    <td style="text-align: center; font-weight: 500;">${domText}</td>
                    <td style="text-align: center; font-weight: 500; font-size: 12px; color: ${props.DIST_MUNICIPIO === 0 ? 'var(--accent-cyan)' : '#334155'};">
                        ${distSedeText}
                    </td>
                    <td style="font-family: monospace; font-size: 11px; text-align: center;">
                        ${coords[1].toFixed(6)}, ${coords[0].toFixed(6)}
                    </td>
                </tr>
            `;
        });

        // Contar ocorrências por Categoria Censo (CT_LOCALIDADE) no relatório
        const ctCountsReport = {};
        localidadesAfetadasList.forEach(loc => {
            const ct = loc.properties.CT_LOCALIDADE || "Outras Localidades";
            ctCountsReport[ct] = (ctCountsReport[ct] || 0) + 1;
        });

        const ctListReport = Object.keys(ctCountsReport).map(name => {
            return { name: name, count: ctCountsReport[name] };
        }).sort((a, b) => b.count - a.count);

        let ctBreakdownHtml = "";
        ctListReport.forEach(item => {
            const dotColor = window.obterCorPorCT(item.name);
            const pct = ((item.count / total) * 100).toFixed(1);
            ctBreakdownHtml += `
                <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px; padding: 6px 10px; background: #f8fafc; border: 1px solid var(--border); border-radius: 6px;">
                    <div style="display: flex; align-items: center; gap: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 70%;">
                        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${dotColor}; border: 1px solid rgba(0,0,0,0.15);"></span>
                        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.name}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-weight: 700; background: rgba(0,0,0,0.05); padding: 2px 6px; border-radius: 4px; font-size: 10px;">${item.count}</span>
                        <span style="font-size: 9px; color: #64748b; width: 40px; text-align: right;">${pct}%</span>
                    </div>
                </div>
            `;
        });

        // Montar o documento HTML do relatório
        const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>${modoMunicipal ? `Relatório de Impacto - ${municipioNome} (${ufSelecionada})` : 'Relatório de Impacto - Geoportal InfoVias'}</title>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
    <style>
        /* Estilos de tela */
        :root {
            --primary: #1e293b;
            --primary-light: #334155;
            --accent: #0088ff;
            --accent-cyan: #09a5b3;
            --sede: #ff3366;
            --vila: #ff9f00;
            --rural: #00e676;
            --border: #e2e8f0;
            --bg-body: #f8fafc;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; background-color: var(--bg-body); color: #1e293b; padding: 0 0 40px 0; line-height: 1.5; }
        
        .no-print-bar {
            background-color: var(--primary);
            padding: 12px 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            color: white;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            position: sticky;
            top: 0;
            z-index: 100;
        }
        .brand { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 16px; letter-spacing: 0.5px; }
        .brand i { color: #00f2fe; }
        .action-buttons { display: flex; gap: 10px; }
        .btn {
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            border: none;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s;
        }
        .btn-primary { background-color: var(--accent); color: white; }
        .btn-primary:hover { background-color: #0077e6; }
        .btn-secondary { background-color: rgba(255,255,255,0.1); color: white; }
        .btn-secondary:hover { background-color: rgba(255,255,255,0.2); }

        .container { max-width: 1000px; margin: 30px auto; padding: 0 20px; }
        
        .report-header {
            background: white;
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 24px;
            margin-bottom: 24px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }
        .report-title-section {
            border-bottom: 2px solid var(--border);
            padding-bottom: 16px;
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }
        .report-title-section h1 { font-size: 20px; font-weight: 700; color: var(--primary); }
        .report-meta { font-size: 12px; color: #64748b; margin-top: 4px; }
        
        .params-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
            background: #f1f5f9;
            padding: 16px;
            border-radius: 8px;
            font-size: 12px;
        }
        .param-item span { display: block; }
        .param-label { font-weight: 600; color: #475569; text-transform: uppercase; font-size: 10px; margin-bottom: 2px; }
        .param-val { color: var(--primary-light); font-weight: 500; font-size: 12px; }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
            margin-bottom: 24px;
        }
        .stat-card {
            background: white;
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 16px;
            text-align: center;
            box-shadow: 0 1px 3px rgba(0,0,0,0.02);
            position: relative;
            overflow: hidden;
        }
        .stat-card.total { border-left: 4px solid var(--accent); }
        .stat-card.sede { border-left: 4px solid var(--sede); }
        .stat-card.vila { border-left: 4px solid var(--vila); }
        .stat-card.rural { border-left: 4px solid var(--rural); }
        .stat-label { font-size: 10px; text-transform: uppercase; font-weight: 600; color: #64748b; margin-bottom: 4px; }
        .stat-val { font-size: 24px; font-weight: 700; color: var(--primary); }

        .table-card {
            background: white;
            border: 1px solid var(--border);
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }
        .table-card h3 { font-size: 14px; font-weight: 700; color: var(--primary); padding: 16px 20px; border-bottom: 1px solid var(--border); background: #fafafa; }
        
        table { width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; }
        th { background: #f8fafc; color: #475569; font-weight: 600; padding: 12px 16px; border-bottom: 1px solid var(--border); text-transform: uppercase; font-size: 10px; }
        td { padding: 12px 16px; border-bottom: 1px solid var(--border); color: #334155; }
        tr:last-child td { border-bottom: none; }
        tr:nth-child(even) { background-color: #f8fafc; }

        .prio-tag {
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 9px;
            font-weight: 600;
            text-transform: uppercase;
            display: inline-block;
        }
        .prio-tag.sede { background-color: rgba(255, 51, 102, 0.1); color: var(--sede); border: 1px solid rgba(255, 51, 102, 0.2); }
        .prio-tag.vila { background-color: rgba(255, 159, 0, 0.1); color: var(--vila); border: 1px solid rgba(255, 159, 0, 0.2); }
        .prio-tag.rural { background-color: rgba(0, 230, 118, 0.1); color: var(--rural); border: 1px solid rgba(0, 230, 118, 0.2); }

        /* Estilos de impressão */
        @media print {
            .no-print-bar { display: none !important; }
            body { background: white; color: black; padding: 0; }
            .container { max-width: 100%; margin: 0; padding: 0; }
            .report-header { border: 1px solid #94a3b8; box-shadow: none; border-radius: 0; }
            .stats-grid { gap: 10px; }
            .stat-card { border: 1px solid #94a3b8; box-shadow: none; border-radius: 0; }
            .table-card { border: 1px solid #94a3b8; box-shadow: none; border-radius: 0; }
            table { font-size: 11px; }
            th { border-bottom: 2px solid #000; background: #e2e8f0; color: black; }
            td { border-bottom: 1px solid #e2e8f0; }
            .prio-tag { border: 1px solid #94a3b8 !important; background: transparent !important; color: black !important; }
            
            /* Controle de quebras de página */
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            thead { display: table-header-group; }
        }
    </style>
</head>
<body>

    <!-- BARRA FLUTUANTE (Não imprimível) -->
    <div class="no-print-bar">
        <div class="brand" style="display: flex; align-items: center; gap: 8px;">
            <img src="logo_evereste.png" alt="Evereste" style="height: 24px; filter: drop-shadow(0 0 4px rgba(0, 242, 254, 0.4));">
            <span>Relatório Geoportal Evereste</span>
        </div>
        <div class="action-buttons">
            <button class="btn btn-primary" onclick="window.print()">
                <i class="fa-solid fa-print"></i> Imprimir ou Salvar PDF
            </button>
            <button class="btn btn-secondary" onclick="window.close()">
                <i class="fa-solid fa-xmark"></i> Fechar Relatório
            </button>
        </div>
    </div>

    <div class="container">
        
        <!-- CABEÇALHO DO RELATÓRIO -->
        <div class="report-header">
            <div class="report-title-section" style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <img src="logo_evereste.png" alt="Evereste" style="height: 48px;">
                    <div>
                        <h1 style="font-size: 18px; font-weight: 700; color: var(--primary); margin-bottom: 2px;">Relatório de Impacto Socioeconômico</h1>
                        <div class="report-meta">Geoportal das InfoVias da Região Norte &bull; Gerado em: ${dataEmissao}</div>
                    </div>
                </div>
                <div style="text-align: right; font-size: 11px; color: #64748b; line-height: 1.4;">
                    <strong>Território Digital &amp; IGeoTecnologia</strong><br>
                    Filtro Espacial Avançado
                </div>
            </div>
            
            <!-- PARÂMETROS APLICADOS -->
            <div class="params-grid">
                ${modoMunicipal ? `
                <div class="param-item">
                    <span class="param-label">Município Analisado</span>
                    <span class="param-val" style="color: #0284c7; font-weight: bold;">${municipioNome} (${ufSelecionada})</span>
                </div>
                <div class="param-item">
                    <span class="param-label">Tipo de Análise</span>
                    <span class="param-val" style="color: #0284c7; font-weight: bold;">Filtro Territorial Político</span>
                </div>
                <div class="param-item">
                    <span class="param-label">Filtro de Categoria</span>
                    <span class="param-val">${categoriaSelecionada}</span>
                </div>
                <div class="param-item">
                    <span class="param-label">Fonte de Dados</span>
                    <span class="param-val">Total Real IBGE (Censo 2022)</span>
                </div>
                ` : `
                <div class="param-item">
                    <span class="param-label">Infovia Analisada</span>
                    <span class="param-val">${infoviaSelecionada}</span>
                </div>
                <div class="param-item">
                    <span class="param-label">Raio de Influência (Buffer)</span>
                    <span class="param-val">${raio} km</span>
                </div>
                <div class="param-item">
                    <span class="param-label">Filtro de Estado (UF)</span>
                    <span class="param-val">${ufSelecionada}</span>
                </div>
                <div class="param-item">
                    <span class="param-label">Filtro de Categoria (Censo)</span>
                    <span class="param-val">${categoriaSelecionada}</span>
                </div>
                `}
            </div>
        </div>

        <!-- CARDS DE ESTATÍSTICA -->
        <div class="stats-grid">
            <div class="stat-card total">
                <div class="stat-label">Comunidades no Limite</div>
                <div class="stat-val">${total}</div>
            </div>
            <div class="stat-card sede">
                <div class="stat-label">Sedes Municipais</div>
                <div class="stat-val">${totalSedes}</div>
            </div>
            <div class="stat-card vila">
                <div class="stat-label">Vilas</div>
                <div class="stat-val">${totalVilas}</div>
            </div>
            <div class="stat-card rural">
                <div class="stat-label">Lugares Rurais</div>
                <div class="stat-val">${totalRurais}</div>
            </div>
        </div>

        <!-- ESTIMATIVAS DEMOGRÁFICAS (Melhoria Setores Censitários) -->
        <div style="margin-top: 16px; margin-bottom: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; page-break-inside: avoid;">
            <div class="stat-card" style="border-left: 4px solid #b927fc; text-align: left; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.02); padding: 16px; border: 1px solid var(--border); border-radius: 10px;">
                <div class="stat-label" style="color: #b927fc; font-weight: 700; font-size: 10px; text-transform: uppercase; margin-bottom: 6px;">População Residente Estimada</div>
                <div class="stat-val" style="font-size: 20px; font-weight: 700; color: var(--primary); margin-bottom: 4px;">${totalPopEst.toLocaleString('pt-BR')} <span style="font-size: 11px; font-weight: 500; color: #64748b; text-transform: none;">habitantes (Censo 2022)</span></div>
                <div style="font-size: 11px; color: #334155; margin-bottom: 6px;">
                    Interior: <strong>${popInteriorEst.toLocaleString('pt-BR')} hab.</strong> | Capitais: ${popCapitalEst.toLocaleString('pt-BR')} hab.
                </div>
                <div style="font-size: 9px; color: #64748b; line-height: 1.4;">${modoMunicipal ? `População total real oficial de todo o território do município do Censo 2022 (IBGE).` : `Soma populacional de todos os setores censitários interceptados pela área de influência ativa.`}</div>
            </div>
            <div class="stat-card" style="border-left: 4px solid var(--accent-cyan); text-align: left; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.02); padding: 16px; border: 1px solid var(--border); border-radius: 10px;">
                <div class="stat-label" style="color: var(--accent-cyan); font-weight: 700; font-size: 10px; text-transform: uppercase; margin-bottom: 6px;">Total de Domicílios</div>
                <div class="stat-val" style="font-size: 20px; font-weight: 700; color: var(--primary); margin-bottom: 4px;">${totalDomEst.toLocaleString('pt-BR')} <span style="font-size: 11px; font-weight: 500; color: #64748b; text-transform: none;">residências (Censo 2022)</span></div>
                <div style="font-size: 11px; color: #334155; margin-bottom: 6px;">
                    Interior: <strong>${domInteriorEst.toLocaleString('pt-BR')} res.</strong> | Capitais: ${domCapitalEst.toLocaleString('pt-BR')} res.
                </div>
                <div style="font-size: 9px; color: #64748b; line-height: 1.4;">${modoMunicipal ? `Total real de domicílios de todo o território do município do Censo 2022 (IBGE) (${setoresAfetadosEst} setores urbanos e rurais).` : `Quantidade de domicílios nos setores censitários intersectados (${setoresAfetadosEst} setores afetados).`}</div>
            </div>
        </div>

        <!-- DETALHAMENTO DE CATEGORIAS DO CENSO (CT) -->
        <div class="table-card" style="margin-bottom: 24px; page-break-inside: avoid;">
            <h3 style="font-size: 14px; font-weight: 700; color: var(--primary); padding: 16px 20px; border-bottom: 1px solid var(--border); background: #fafafa;">
                Distribuição por Categoria do Censo (CT)
            </h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; padding: 20px;">
                ${ctBreakdownHtml}
            </div>
        </div>
        
        <!-- TABELA DE RESULTADOS -->
        <div class="table-card">
            <h3>${modoMunicipal ? `Relação Detalhada de Comunidades no Território de ${municipioNome} (${total} itens)` : `Relação Detalhada de Comunidades no Raio de Influência (${total} itens)`}</h3>
            <table>
                <thead>
                    <tr>
                        <th style="width: 50px; text-align: center;">#</th>
                        <th>Nome da Comunidade</th>
                        <th>Município / UF</th>
                        <th>Categoria (Censo)</th>
                        <th style="width: 140px; text-align: center;">Classificação</th>
                        <th style="width: 110px; text-align: center;">População (Setor)</th>
                        <th style="width: 110px; text-align: center;">Domicílios (Setor)</th>
                        <th style="width: 100px; text-align: center;">Dist. Sede</th>
                        <th style="width: 170px; text-align: center;">Coordenadas (Lat, Lng)</th>
                    </tr>
                </thead>
                <tbody>
                    ${tabelaLinhasHtml}
                </tbody>
            </table>
        </div>
        
        <div style="font-size: 10px; color: #64748b; margin-top: 10px; padding: 0 4px; line-height: 1.5; page-break-inside: avoid;">
            <strong>* Nota Explicativa (Consolidação de Sede):</strong> Para as localidades classificadas como <strong>Sede Municipal</strong> (marcadas com <strong>*</strong>), os valores representam a população e os domicílios agregados de <strong>todos os setores censitários do núcleo urbano consolidado</strong> daquele município. Para as demais categorias (Vilas e Lugares Rurais), os valores indicam o setor censitário rural pontual exato onde a comunidade está geograficamente assentada.
        </div>

    </div>

</body>
</html>
        `;

        // Abrir a nova aba e injetar o HTML
        const novaAba = window.open();
        if (novaAba) {
            novaAba.document.write(htmlContent);
            novaAba.document.close();
            console.log("Relatório gerado e aberto com sucesso em uma nova aba.");
        } else {
            alert("Não foi possível abrir o relatório em uma nova aba. Verifique se o bloqueador de popups do seu navegador está ativo!");
            console.warn("Popups bloqueados pelo navegador. Não foi possível abrir o relatório.");
        }
    }

    // Inicializar o módulo
    init();
})();
