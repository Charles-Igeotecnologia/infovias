# Geoportal Evereste

Ambiente local de consulta territorial e análise de proximidade das infovias de AM, PA, AP e RR.

## Operação

Execute `start.bat` ou `python server.py`. Abra `http://127.0.0.1:8000/mapa.html`.
Para outra porta: `python server.py --port 8001`. O servidor escuta somente nesta máquina e não encerra outros processos.
Os mapas base e bibliotecas cartográficas exigem conexão à internet. O servidor Python é de desenvolvimento; publicação institucional requer hospedagem HTTPS definida pela equipe.

## Fluxo de uso

1. Escolha Área de influência ou Análise territorial.
2. No primeiro modo, selecione infovia, UF, categoria e raio de até 50 km. No segundo, escolha UF e município.
3. Aguarde a conclusão. Mudanças de critérios invalidam a exportação anterior e cancelam a construção de buffer em andamento.
4. Consulte a metodologia, os indicadores e a tabela pesquisável. Clique na localidade da tabela para localizar seu marcador.
5. Exporte CSV, relatório HTML para impressão ou registro JSON dos critérios.

## Interpretação

O buffer soma integralmente os setores cujo centroide está dentro da faixa. Não é uma contagem exata de habitantes dentro do polígono. A seleção municipal usa os totais registrados na base municipal. Capital significa todo o município de Manaus, Belém, Macapá ou Boa Vista, incluindo a área rural. Os demais municípios são interior.

Categorias filtram localidades, não os totais demográficos territoriais. Setores disponíveis são um recorte de 50 km; portanto, a contagem municipal de setores não representa necessariamente a malha municipal completa. O catálogo registra hashes das bases, mas a origem e os procedimentos de transformação ainda precisam de documentação pelo responsável pelos dados. O código não certifica a origem IBGE.

## Organização técnica

- `app.js`: mapa, camadas e carregamento compartilhado de localidades.
- `analysis.js`: execução sequencial com descarte de resultados antigos, indicadores e exportações.
- `spatial-worker.js`: construção do buffer fora da execução principal da interface.
- `professional.js`: modos de análise, mensagens acessíveis, tabela e registro de critérios.
- `measure.js`: medições cartográficas.
- `scripts/validate_data.py`: validação estrutural e catálogo com contagens, limites e SHA-256.

## Atualização e recuperação

Antes de substituir bases, guarde uma cópia da versão vigente com seu catálogo. Execute `python scripts/validate_data.py` sobre a nova versão; só então execute com `--catalog` e revise as diferenças de contagens e limites. Documente fonte e transformação. Guarde o catálogo junto aos relatórios que dependem dessa versão.

Para recuperar uma versão, restaure código, arquivos de dados e catálogo do mesmo conjunto. Não misture versões de municípios, setores e localidades. Não há alteração automática dos GeoPackages.

## Verificação

Execute `node --test tests/runtime.test.cjs`, `node --check app.js`, `node --check analysis.js`, `node --check professional.js`, `node --check spatial-worker.js` e `python scripts/validate_data.py`.
No navegador: teste município após raio ativo, troca rápida de UF, limpeza de filtros, resultados vazios, erro de rede e correspondência entre filtros, tabela e exportação. O script não verifica topologia, origem censitária ou precisão da estimativa.

## Limites de implantação

Autenticação, banco multiusuário, edição de dados e hospedagem institucional não fazem parte do ambiente local. Devem ser definidos quando houver usuários, política de acesso e infraestrutura de destino. A geração atual do relatório contém indicadores, tabela e metodologia; inclui esquema vetorial da área selecionada, localidades, legenda e escala aproximada, sem mapa base.

## Página inicial

A página `index.html` apresenta a abrangência com um mapa vetorial gerado das bases locais. As contagens são consultadas em `data-catalog.json`; os cartões abrem `mapa.html?uf=AM` (ou PA, AP, RR), aplicando o filtro e o enquadramento do estado.

Para atualizar o desenho de apresentação após substituir limites municipais ou infovias, execute `python scripts/build_home.py` em um ambiente com Shapely. O script também contém o modelo da página: alterações de apresentação devem ser feitas nele e regeneradas. A simplificação geométrica é exclusiva da apresentação; não modifica os dados utilizados nas análises.

## Contagens territoriais corrigidas

As quatro bases contêm 11.186 registros de origem e 9.016 localidades consolidadas pela regra operacional: mesma UF, município e nome, com diferença inferior a 0,0001 grau em cada coordenada. Essa regra não certifica identidade cadastral. Nenhum registro é excluído dos GeoJSON; os atributos ficam preservados em REGISTROS_ORIGEM, com todas as categorias em CATEGORIAS e SUBCATEGORIAS durante o carregamento.

Página inicial, mapa e relatório compartilham `locality-model.js`. O percentual tem como denominador todas as localidades do estado selecionado (todos os municípios e categorias); sem UF, usa os quatro estados. O total municipal também inclui todas as categorias e permanece separado da análise. Na análise ativa, os marcadores representam os resultados; sem análise, o mapa de contexto aplica os controles de distância cadastrada. O detalhamento de categorias agrupa combinações de categorias; a simbologia Sede/Vila/Rural usa a classificação do primeiro registro preservado.

Execute `node scripts/update_locality_counts.cjs` após atualizar localidades; `python scripts/validate_data.py --catalog` também executa essa etapa (requer Node). Testes: `node --test tests/*.test.cjs`. O relatório em auditoria/ documenta o diagnóstico anterior à correção.

### Referências e relação estadual

O cartão estadual é estável ao trocar município, categoria, infovia e distância. O cartão municipal aparece quando um município é selecionado. Somente o cartão de análise acompanha todos os filtros.

A relação estadual agrupa localidades por município, com pesquisa independente em nome da localidade, município e categorias, e páginas de 100 registros. A exportação estadual baixa a relação inteira do estado, independentemente da busca e dos filtros da análise. Não confundir com o CSV dos resultados. O módulo `territory-directory.js` controla essa apresentação.

## Organização do painel direito

O painel usa três abas: Filtros, Indicadores e Localidades. Mantém cabeçalho e navegação fixos, com rolagem do conteúdo. A largura padrão é 420 px; o botão Ampliar painel alterna para 520 px em desktop. Em telas pequenas, adapta-se à largura disponível e fica acima dos controles do mapa; o botão lateral permite recolhê-lo para usar o mapa.

Filtros reúne seleção e busca; Indicadores reúne totais, demografia e exportação da análise; Localidades reúne resultados, relação estadual e lista resumida. As abas suportam setas do teclado, Home e End. Implementação: sidebar-layout.js e sidebar-layout.css, sem alteração das regras de cálculo.

## Seleção de infovias por estado

O seletor lista rotas cujos traçados intersectam o estado escolhido, incluindo contato com divisas. A associação usa a união dos limites municipais da base local; não representa responsabilidade administrativa. Rotas compartilhadas aparecem em todas as UFs intersectadas.

O mapa recorta os traçados no estado ou município selecionado. Distâncias às infovias e buffers usam esses mesmos trechos; o buffer também é intersectado com o limite territorial. A visão de todos os estados mantém os traçados completos. Os originais são preservados. Indicadores e relatório distinguem extensão territorial e extensão total dos traçados na base, medidas geodésicas em WGS 84. Trechos coincidentes com divisas podem aparecer em ambos os territórios; os totais territoriais não devem ser somados para obter o total regional.

Os recortes são pré-processados em `territorial/*.json`. Após atualizar infovias ou limites municipais, execute `python scripts/build_infovia_territories.py` e `python scripts/build_territorial_routes.py` (Shapely e PyProj), e valide com `python -m unittest discover -s tests -p "test_territorial_routes.py"`. Os testes verificam hashes das fontes e contenção geométrica dos recortes dos quatro estados e 237 municípios.

Ao mudar a UF, uma seleção compatível é mantida; uma incompatível volta para Todas. Sem UF, as dez rotas estão disponíveis. URLs com infovia incompatível não restauram essa seleção. Cliques em linhas fora da lista não mudam a infovia selecionada.

Após atualizar infovias ou limites municipais, execute `python scripts/build_infovia_territories.py` (requer Shapely). O arquivo gerado `infovia-territories.js` contém a associação e os hashes de origem; os testes verificam se esse índice corresponde às bases atuais.
