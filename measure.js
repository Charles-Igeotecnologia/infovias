// MÓDULO DE MEDIÇÃO AVANÇADA COM TURF.JS

(function() {
    // Estado interno do módulo de medição
    let currentTool = null; // 'distance', 'area' ou 'coords'
    let measurePoints = []; // Coordenadas [lat, lng] dos cliques
    
    // Elementos Leaflet para desenho temporário
    let measureLayer = null; 
    let tempLine = null; // Linha que acompanha o movimento do mouse
    let tempPolygon = null; // Polígono que acompanha o movimento do mouse
    let tempMarkers = []; // Marcadores nos vértices
    let activeTooltip = null; // Dica flutuante que acompanha o mouse

    // Elementos do DOM
    const btnDistance = document.getElementById("btn-measure-distance");
    const btnArea = document.getElementById("btn-measure-area");
    const btnCoords = document.getElementById("btn-measure-coords");
    const btnClear = document.getElementById("btn-measure-clear");
    const panelResults = document.getElementById("custom-measure-results");
    const instructionBox = document.getElementById("measure-instructions");

    // Inicialização ao carregar o script
    function init() {
        const map = window.map;
        if (!map) {
            setTimeout(init, 100);
            return;
        }

        // Criar grupo de camadas para os desenhos de medição
        measureLayer = L.featureGroup().addTo(map);
        window.measureLayer = measureLayer;

        // Isolamento de cliques nos painéis da interface (impede adicionar pontos no mapa ao clicar nos menus)
        const paineis = [
            document.getElementById("custom-measure-bar"),
            document.getElementById("custom-measure-results"),
            document.getElementById("floating-menu"),
            document.getElementById("sidebar")
        ];

        paineis.forEach(painel => {
            if (painel) {
                L.DomEvent.disableClickPropagation(painel);
                L.DomEvent.disableScrollPropagation(painel);
            }
        });

        // Eventos dos botões da barra de medição
        if (btnDistance) btnDistance.addEventListener("click", () => alternarFerramenta('distance'));
        if (btnArea) btnArea.addEventListener("click", () => alternarFerramenta('area'));
        if (btnCoords) btnCoords.addEventListener("click", () => alternarFerramenta('coords'));
        if (btnClear) btnClear.addEventListener("click", limparMedicoes);

        // Registrar eventos no mapa
        map.on("click", onMapClick);
        map.on("mousemove", onMapMouseMove);
        map.on("dblclick", onMapDblClick);
    }

    // Alterna a ferramenta ativa e ajusta a interface
    function alternarFerramenta(ferramenta) {
        // Resetar desenho ativo atual sem limpar a camada inteira (a menos que mude de ferramenta)
        resetDesenhoTemporario();

        if (currentTool === ferramenta) {
            // Desativar ferramenta se clicada novamente
            desativarFerramentas();
        } else {
            currentTool = ferramenta;
            
            // Atualizar classes ativas nos botões
            if (btnDistance) btnDistance.classList.toggle("active", ferramenta === 'distance');
            if (btnArea) btnArea.classList.toggle("active", ferramenta === 'area');
            if (btnCoords) btnCoords.classList.toggle("active", ferramenta === 'coords');

            // Mudar cursor do mapa
            window.map.getContainer().style.cursor = 'crosshair';

            // Desabilitar o duplo clique de zoom nativo para permitir duplo clique de finalização
            window.map.doubleClickZoom.disable();

            // Exibir painel de resultados com as instruções
            if (panelResults) panelResults.style.display = 'block';
            
            atualizarInstrucoes();
        }
    }

    function desativarFerramentas() {
        currentTool = null;
        if (btnDistance) btnDistance.classList.remove("active");
        if (btnArea) btnArea.classList.remove("active");
        if (btnCoords) btnCoords.classList.remove("active");

        window.map.getContainer().style.cursor = '';
        window.map.doubleClickZoom.enable();
        resetDesenhoTemporario();

        if (panelResults) panelResults.style.display = 'none';
    }

    // Atualiza o texto instrutivo com base na ferramenta selecionada
    function atualizarInstrucoes(mensagemAdicional = "") {
        if (!instructionBox) return;

        let txt = "";
        if (currentTool === 'distance') {
            txt = `<strong>Ferramenta Régua</strong><br>
                   Clique no mapa para marcar pontos. <br>
                   Dê <strong>duplo clique</strong> para encerrar.<br><br>
                   ${mensagemAdicional || '<em>Aguardando início...</em>'}`;
        } else if (currentTool === 'area') {
            txt = `<strong>Ferramenta Área</strong><br>
                   Clique no mapa para criar os vértices da área (mínimo 3).<br>
                   Dê <strong>duplo clique</strong> para fechar o polígono.<br><br>
                   ${mensagemAdicional || '<em>Aguardando início...</em>'}`;
        } else if (currentTool === 'coords') {
            txt = `<strong>Coletor de Coordenadas</strong><br>
                   Clique em qualquer local do mapa para extrair a latitude e longitude exatas.<br><br>
                   ${mensagemAdicional || '<em>Clique no mapa...</em>'}`;
        }

        instructionBox.innerHTML = txt;
    }

    // Gerenciador do evento de clique no mapa
    function onMapClick(e) {
        if (!currentTool) return;

        const latlng = e.latlng;
        measurePoints.push([latlng.lng, latlng.lat]); // Turf.js usa [lng, lat]

        // Adicionar um marcador pequeno no vértice do clique
        const marker = L.circleMarker(latlng, {
            radius: 4,
            fillColor: '#0088ff',
            color: '#fff',
            weight: 1.5,
            fillOpacity: 1,
            pane: 'popupPane'
        }).addTo(measureLayer);
        tempMarkers.push(marker);

        if (currentTool === 'distance') {
            desenharLinhaProvisoria();
        } else if (currentTool === 'area') {
            desenharPoligonoProvisorio();
        } else if (currentTool === 'coords') {
            processarCoordenadas(latlng);
        }
    }

    // Desenha as linhas entre os cliques da Régua
    function desenharLinhaProvisoria() {
        // Remover linha provisória anterior se houver
        if (tempLine) measureLayer.removeLayer(tempLine);

        // Convertemos os pontos de volta para latlng do Leaflet
        const leafletPoints = measurePoints.map(pt => [pt[1], pt[0]]);
        
        tempLine = L.polyline(leafletPoints, {
            color: '#0088ff',
            weight: 3,
            opacity: 0.85
        }).addTo(measureLayer);

        // Calcular a distância acumulada até o momento
        if (measurePoints.length > 1) {
            const linhaGeoJSON = turf.lineString(measurePoints);
            const comprimento = turf.length(linhaGeoJSON, { units: 'kilometers' });
            
            let distFormatada = formatarDistancia(comprimento);
            atualizarInstrucoes(`<strong>Distância Acumulada:</strong> <span style="color:var(--accent-cyan); font-weight:bold;">${distFormatada}</span>`);
        }
    }

    // Desenha a área poligonal provisória
    function desenharPoligonoProvisorio() {
        if (tempPolygon) measureLayer.removeLayer(tempPolygon);

        if (measurePoints.length >= 2) {
            // Desenha com preenchimento verde translúcido
            const leafletPoints = measurePoints.map(pt => [pt[1], pt[0]]);
            tempPolygon = L.polygon(leafletPoints, {
                color: '#00e676',
                weight: 2,
                fillColor: '#58ffd3',
                fillOpacity: 0.25
            }).addTo(measureLayer);

            // Calcular área parcial se tiver 3 ou mais pontos
            if (measurePoints.length >= 3) {
                // Fechar o anel de pontos para o Turf
                const anelFechado = [...measurePoints, measurePoints[0]];
                const poligonoGeoJSON = turf.polygon([anelFechado]);
                const areaKm2 = turf.area(poligonoGeoJSON) / 1000000; // Turf.area retorna metros quadrados
                
                // Calcular também o perímetro
                const linhaGeoJSON = turf.lineString(anelFechado);
                const perimetro = turf.length(linhaGeoJSON, { units: 'kilometers' });

                let areaFormatada = formatarArea(areaKm2 * 1000000); // Passa em m²
                let perimetroFormatado = formatarDistancia(perimetro);

                atualizarInstrucoes(`
                    <strong>Área Parcial:</strong> <span style="color:var(--priority-low); font-weight:bold;">${areaFormatada}</span><br>
                    <strong>Perímetro:</strong> ${perimetroFormatado}
                `);
            }
        }
    }

    // Coleta coordenadas do clique
    function processarCoordenadas(latlng) {
        resetDesenhoTemporario(); // Limpa pontos anteriores de coordenada
        
        const lat = latlng.lat.toFixed(6);
        const lng = latlng.lng.toFixed(6);
        
        // Criar marcador de coordenada destacado
        const coordMarker = L.marker(latlng, {
            icon: L.divIcon({
                className: 'custom-coord-marker',
                html: '<i class="fa-solid fa-crosshairs" style="color: var(--priority-high); font-size: 20px; text-shadow: 0 0 5px #000; margin-left: -10px; margin-top: -10px;"></i>'
            })
        }).addTo(measureLayer);
        tempMarkers.push(coordMarker);

        // HTML do painel com botão de copiar
        const html = `
            <strong>Coordenadas Capturadas:</strong><br>
            <div style="background:rgba(0,0,0,0.3); padding: 8px; border-radius: 6px; margin: 8px 0; font-family: monospace; text-align: center; border: 1px solid var(--border-glass);">
                Lat: ${lat}<br>Lng: ${lng}
            </div>
            <button id="btn-copy-coords" class="action-btn" style="padding: 6px 12px; font-size: 11px;">
                <i class="fa-regular fa-copy"></i> Copiar Lat,Lng
            </button>
            <div id="copy-success-msg" style="color: var(--priority-low); font-size: 11px; text-align: center; margin-top: 5px; display: none;">
                Copiado para a área de transferência!
            </div>
        `;
        
        atualizarInstrucoes(html);

        // Bind do evento de cópia
        const btnCopy = document.getElementById("btn-copy-coords");
        if (btnCopy) {
            btnCopy.addEventListener("click", () => {
                const textToCopy = `${lat}, ${lng}`;
                navigator.clipboard.writeText(textToCopy).then(() => {
                    const msg = document.getElementById("copy-success-msg");
                    if (msg) {
                        msg.style.display = "block";
                        setTimeout(() => { if (msg) msg.style.display = "none"; }, 2000);
                    }
                }).catch(err => {
                    console.error("Falha ao copiar:", err);
                });
            });
        }
    }

    // Evento de movimento do mouse: desenha a linha elástica entre o último clique e o cursor
    function onMapMouseMove(e) {
        if (!currentTool || measurePoints.length === 0) return;

        const latlng = e.latlng;
        const mousePt = [latlng.lng, latlng.lat];

        // Atualizar tooltip de acompanhamento do cursor
        atualizarTooltipFlutuante(latlng);

        if (currentTool === 'distance') {
            const leafletPoints = [...measurePoints.map(pt => [pt[1], pt[0]]), [latlng.lat, latlng.lng]];
            
            if (tempLine) measureLayer.removeLayer(tempLine);
            tempLine = L.polyline(leafletPoints, {
                color: '#0088ff',
                weight: 3,
                opacity: 0.6,
                dashArray: '5, 5'
            }).addTo(measureLayer);

            // Calcular distância flutuante temporária
            const linhaTemporariaGeoJSON = turf.lineString([...measurePoints, mousePt]);
            const comprimentoTemp = turf.length(linhaTemporariaGeoJSON, { units: 'kilometers' });
            activeTooltip.setContent(formatarDistancia(comprimentoTemp));

        } else if (currentTool === 'area' && measurePoints.length >= 2) {
            const leafletPoints = [...measurePoints.map(pt => [pt[1], pt[0]]), [latlng.lat, latlng.lng]];
            
            if (tempPolygon) measureLayer.removeLayer(tempPolygon);
            tempPolygon = L.polygon(leafletPoints, {
                color: '#00e676',
                weight: 2,
                fillColor: '#58ffd3',
                fillOpacity: 0.15,
                dashArray: '3, 3'
            }).addTo(measureLayer);

            if (measurePoints.length >= 2) {
                // Perímetro temporário incluindo a linha até o mouse
                const anelTemporario = [...measurePoints, mousePt, measurePoints[0]];
                const poligonoTempGeoJSON = turf.polygon([anelTemporario]);
                const areaTemp = turf.area(poligonoTempGeoJSON);
                activeTooltip.setContent(formatarArea(areaTemp));
            }
        }
    }

    // Evento de duplo clique: fecha e fixa a medição atual
    function onMapDblClick(e) {
        if (!currentTool || measurePoints.length === 0) return;

        // Leaflet às vezes dispara o clique normal junto com o dblclick, então removemos o último ponto redundante se necessário
        if (measurePoints.length > 1) {
            // Remova os pontos muito próximos
            const p1 = measurePoints[measurePoints.length - 1];
            const p2 = measurePoints[measurePoints.length - 2];
            const dist = turf.distance(p1, p2, { units: 'meters' });
            if (dist < 1) {
                measurePoints.pop();
                if (tempMarkers.length > 0) {
                    const m = tempMarkers.pop();
                    measureLayer.removeLayer(m);
                }
            }
        }

        const latlng = e.latlng;

        if (currentTool === 'distance' && measurePoints.length > 1) {
            // Fixar a linha e aplicar popup com resultado final
            const linhaGeoJSON = turf.lineString(measurePoints);
            const totalDist = turf.length(linhaGeoJSON, { units: 'kilometers' });
            const distFormatada = formatarDistancia(totalDist);

            const finalLine = L.polyline(measurePoints.map(pt => [pt[1], pt[0]]), {
                color: '#0088ff',
                weight: 4,
                opacity: 0.9
            }).addTo(measureLayer);

            const lastPoint = measurePoints[measurePoints.length - 1];
            finalLine.bindPopup(`<strong>Medição de Distância</strong><br>Total acumulado: <strong>${distFormatada}</strong>`).openPopup(L.latLng(lastPoint[1], lastPoint[0]));

            // Atualiza painel e desativa ferramenta
            atualizarInstrucoes(`<strong>Medição Concluída!</strong><br>Distância final: <span style="color:var(--accent-cyan); font-weight:bold;">${distFormatada}</span>`);
            desativarFerramentas();

        } else if (currentTool === 'area' && measurePoints.length >= 3) {
            // Fechar o polígono ligando o último ponto ao primeiro
            const anelFechado = [...measurePoints, measurePoints[0]];
            const poligonoGeoJSON = turf.polygon([anelFechado]);
            const totalAreaM2 = turf.area(poligonoGeoJSON);
            const areaFormatada = formatarArea(totalAreaM2);
            
            const finalPolygon = L.polygon(measurePoints.map(pt => [pt[1], pt[0]]), {
                color: '#00e676',
                weight: 3,
                fillColor: '#58ffd3',
                fillOpacity: 0.35
            }).addTo(measureLayer);

            // Perímetro final
            const linhaGeoJSON = turf.lineString(anelFechado);
            const totalPerimetro = turf.length(linhaGeoJSON, { units: 'kilometers' });
            const perimetroFormatado = formatarDistancia(totalPerimetro);

            // Centroid para abrir o popup de resultado
            const centroid = turf.centroid(poligonoGeoJSON);
            const centroidCoords = centroid.geometry.coordinates;

            finalPolygon.bindPopup(`
                <strong>Medição de Área</strong><br>
                Área total: <strong>${areaFormatada}</strong><br>
                Perímetro: <strong>${perimetroFormatado}</strong>
            `).openPopup(L.latLng(centroidCoords[1], centroidCoords[0]));

            atualizarInstrucoes(`
                <strong>Medição Concluída!</strong><br>
                Área final: <span style="color:var(--priority-low); font-weight:bold;">${areaFormatada}</span><br>
                Perímetro final: ${perimetroFormatado}
            `);
            desativarFerramentas();
        }
    }

    // Cria/atualiza o tooltip informativo que acompanha o mouse
    function atualizarTooltipFlutuante(latlng) {
        if (!activeTooltip) {
            activeTooltip = L.tooltip({
                permanent: true,
                direction: 'right',
                className: 'measure-tooltip',
                offset: [15, 0]
            });
        }
        activeTooltip.setLatLng(latlng).addTo(window.map);
    }

    // Remove desenhos da medição atualmente ativa
    function resetDesenhoTemporario() {
        if (tempLine) { measureLayer.removeLayer(tempLine); tempLine = null; }
        if (tempPolygon) { measureLayer.removeLayer(tempPolygon); tempPolygon = null; }
        if (activeTooltip) { window.map.removeLayer(activeTooltip); activeTooltip = null; }
        
        tempMarkers.forEach(m => measureLayer.removeLayer(m));
        tempMarkers = [];
        measurePoints = [];
    }

    // Função Lixeira: Remove TUDO da tela e reinicia
    function limparMedicoes() {
        resetDesenhoTemporario();
        if (measureLayer) {
            measureLayer.clearLayers();
        }
        desativarFerramentas();
        console.log("Camada de medição limpa com sucesso.");
    }

    // Funções utilitárias de escala métrica
    function formatarDistancia(distKm) {
        if (distKm < 1.0) {
            const metros = (distKm * 1000).toFixed(0);
            return `${metros} m`;
        } else {
            return `${distKm.toFixed(2)} km`;
        }
    }

    function formatarArea(areaM2) {
        if (areaM2 < 10000) {
            return `${areaM2.toFixed(1)} m²`;
        } else {
            const ha = (areaM2 / 10000).toFixed(2);
            return `${ha} ha`;
        }
    }

    // Inicializar o módulo
    init();
})();
