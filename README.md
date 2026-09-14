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
