# Auditoria das contagens de localidades

Reavaliação em 14/09/2026. As bases não foram modificadas.

A página inicial conta registros GeoJSON. O relatório deduplica por nome exatamente igual e diferenças de coordenadas inferiores a 0,0001 grau em ambos os eixos. O mapa filtra por UF, categoria e distância cadastrada de 50 km, sem a mesma deduplicação e sem restringir os marcadores ao município ou buffer analisado.

| UF | Registros na base | Após regra atual de deduplicação | Descartados pela regra | Registros até 50 km cadastrados | Até 50 km após deduplicação |
|---|---:|---:|---:|---:|---:|
| AM | 4357 | 3831 | 526 | 3127 | 2753 |
| PA | 4838 | 3763 | 1075 | 1333 | 1074 |
| AP | 597 | 515 | 82 | 166 | 145 |
| RR | 1394 | 907 | 487 | 119 | 97 |

## Conclusões

- Os totais do catálogo coincidem com as quatro bases: 11.186 registros. A regra atual do relatório resulta em 9.016 registros, descartando 2.170 ocorrências. Esse resultado não certifica 9.016 localidades reais distintas.
- O filtro inicial do mapa inclui 4.745 registros pela distância cadastrada. Deduplicar esse subconjunto pela regra atual resulta em 4.069. Não confundir com o buffer Turf: ele é recalculado para as infovias escolhidas e o raio selecionado.
- Todas as 237 agregações municipais foram contabilizadas no arquivo JSON. As somas por município coincidem com os totais dos estados, antes e depois da regra atual de deduplicação.
- Exemplo: município de Manaus tem 68 registros, 58 após a regra do relatório. A localidade Manaus aparece como sede municipal e capital estadual com as mesmas coordenadas e código. São duas classificações do mesmo ponto.
- O percentual do cartão usa sempre 11.186 como denominador, mesmo ao selecionar UF ou município. Assim, os 58 de Manaus aparecem como 0,5% do conjunto de quatro estados, não como percentual do município.
- O modo municipal seleciona localidades por código municipal. O cluster continua filtrado por estado/categoria/distância; a quantidade de marcadores não é o total do relatório.

## Ajustes recomendados

1. Definir uma regra única de identidade de localidade, preservando as classificações múltiplas. A regra de nome/coordenadas deve ser revisada antes de excluir registros da origem.
2. Mostrar separadamente registros de origem, localidades consolidadas e localidades selecionadas na análise.
3. Aplicar a mesma consolidação nos cartões, mapa, relatório e exportações. Tornar explícito se o mapa mostra contexto territorial ou somente resultados.
4. Calcular percentual com denominador do território e categoria selecionados, exibindo essa definição junto ao indicador.
5. Manter a distância cadastrada de 50 km identificada como filtro de contexto, distinta do buffer calculado.

## Detalhamento municipal

| UF | Código | Município | Registros | Após regra atual | Descartados |
|---|---|---|---:|---:|---:|
| AM | 1300029 | Alvarães | 31 | 25 | 6 |
| AM | 1300060 | Amaturá | 65 | 54 | 11 |
| AM | 1300086 | Anamã | 19 | 17 | 2 |
| AM | 1300102 | Anori | 16 | 16 | 0 |
| AM | 1300144 | Apuí | 6 | 5 | 1 |
| AM | 1300201 | Atalaia do Norte | 120 | 98 | 22 |
| AM | 1300300 | Autazes | 216 | 197 | 19 |
| AM | 1300409 | Barcelos | 162 | 137 | 25 |
| AM | 1300508 | Barreirinha | 202 | 186 | 16 |
| AM | 1300607 | Benjamin Constant | 64 | 57 | 7 |
| AM | 1300631 | Beruri | 53 | 49 | 4 |
| AM | 1300680 | Boa Vista do Ramos | 29 | 27 | 2 |
| AM | 1300706 | Boca do Acre | 103 | 101 | 2 |
| AM | 1300805 | Borba | 149 | 146 | 3 |
| AM | 1300839 | Caapiranga | 13 | 12 | 1 |
| AM | 1300904 | Canutama | 15 | 15 | 0 |
| AM | 1301001 | Carauari | 20 | 19 | 1 |
| AM | 1301100 | Careiro | 29 | 29 | 0 |
| AM | 1301159 | Careiro da Várzea | 56 | 54 | 2 |
| AM | 1301209 | Coari | 68 | 57 | 11 |
| AM | 1301308 | Codajás | 12 | 12 | 0 |
| AM | 1301407 | Eirunepé | 62 | 62 | 0 |
| AM | 1301506 | Envira | 14 | 14 | 0 |
| AM | 1301605 | Fonte Boa | 89 | 80 | 9 |
| AM | 1301654 | Guajará | 2 | 2 | 0 |
| AM | 1301704 | Humaitá | 66 | 51 | 15 |
| AM | 1301803 | Ipixuna | 19 | 19 | 0 |
| AM | 1301852 | Iranduba | 55 | 51 | 4 |
| AM | 1301902 | Itacoatiara | 77 | 74 | 3 |
| AM | 1301951 | Itamarati | 17 | 16 | 1 |
| AM | 1302009 | Itapiranga | 2 | 2 | 0 |
| AM | 1302108 | Japurá | 37 | 36 | 1 |
| AM | 1302207 | Juruá | 32 | 24 | 8 |
| AM | 1302306 | Jutaí | 74 | 60 | 14 |
| AM | 1302405 | Lábrea | 141 | 130 | 11 |
| AM | 1302504 | Manacapuru | 54 | 46 | 8 |
| AM | 1302553 | Manaquiri | 68 | 65 | 3 |
| AM | 1302603 | Manaus | 68 | 58 | 10 |
| AM | 1302702 | Manicoré | 109 | 98 | 11 |
| AM | 1302801 | Maraã | 54 | 48 | 6 |
| AM | 1302900 | Maués | 122 | 104 | 18 |
| AM | 1303007 | Nhamundá | 31 | 23 | 8 |
| AM | 1303106 | Nova Olinda do Norte | 61 | 58 | 3 |
| AM | 1303205 | Novo Airão | 65 | 57 | 8 |
| AM | 1303304 | Novo Aripuanã | 47 | 45 | 2 |
| AM | 1303403 | Parintins | 31 | 24 | 7 |
| AM | 1303502 | Pauini | 89 | 64 | 25 |
| AM | 1303536 | Presidente Figueiredo | 54 | 46 | 8 |
| AM | 1303569 | Rio Preto da Eva | 12 | 11 | 1 |
| AM | 1303601 | Santa Isabel do Rio Negro | 132 | 100 | 32 |
| AM | 1303700 | Santo Antônio do Içá | 85 | 79 | 6 |
| AM | 1303809 | São Gabriel da Cachoeira | 570 | 504 | 66 |
| AM | 1303908 | São Paulo de Olivença | 123 | 91 | 32 |
| AM | 1303957 | São Sebastião do Uatumã | 2 | 2 | 0 |
| AM | 1304005 | Silves | 12 | 11 | 1 |
| AM | 1304062 | Tabatinga | 112 | 73 | 39 |
| AM | 1304104 | Tapauá | 108 | 105 | 3 |
| AM | 1304203 | Tefé | 108 | 95 | 13 |
| AM | 1304237 | Tonantins | 57 | 49 | 8 |
| AM | 1304260 | Uarini | 31 | 24 | 7 |
| AM | 1304302 | Urucará | 10 | 10 | 0 |
| AM | 1304401 | Urucurituba | 7 | 7 | 0 |
| PA | 1500107 | Abaetetuba | 206 | 186 | 20 |
| PA | 1500131 | Abel Figueiredo | 1 | 1 | 0 |
| PA | 1500206 | Acará | 115 | 80 | 35 |
| PA | 1500305 | Afuá | 8 | 8 | 0 |
| PA | 1500347 | Água Azul do Norte | 16 | 13 | 3 |
| PA | 1500404 | Alenquer | 41 | 35 | 6 |
| PA | 1500503 | Almeirim | 53 | 36 | 17 |
| PA | 1500602 | Altamira | 152 | 96 | 56 |
| PA | 1500701 | Anajás | 10 | 10 | 0 |
| PA | 1500800 | Ananindeua | 5 | 3 | 2 |
| PA | 1500859 | Anapu | 39 | 25 | 14 |
| PA | 1500909 | Augusto Corrêa | 32 | 30 | 2 |
| PA | 1500958 | Aurora do Pará | 23 | 19 | 4 |
| PA | 1501006 | Aveiro | 108 | 79 | 29 |
| PA | 1501105 | Bagre | 16 | 10 | 6 |
| PA | 1501204 | Baião | 90 | 62 | 28 |
| PA | 1501253 | Bannach | 5 | 5 | 0 |
| PA | 1501303 | Barcarena | 53 | 49 | 4 |
| PA | 1501402 | Belém | 30 | 25 | 5 |
| PA | 1501451 | Belterra | 49 | 40 | 9 |
| PA | 1501501 | Benevides | 13 | 13 | 0 |
| PA | 1501576 | Bom Jesus do Tocantins | 48 | 29 | 19 |
| PA | 1501600 | Bonito | 8 | 7 | 1 |
| PA | 1501709 | Bragança | 49 | 46 | 3 |
| PA | 1501725 | Brasil Novo | 28 | 21 | 7 |
| PA | 1501758 | Brejo Grande do Araguaia | 15 | 12 | 3 |
| PA | 1501782 | Breu Branco | 16 | 15 | 1 |
| PA | 1501808 | Breves | 11 | 11 | 0 |
| PA | 1501907 | Bujaru | 58 | 45 | 13 |
| PA | 1501956 | Cachoeira do Piriá | 37 | 26 | 11 |
| PA | 1502004 | Cachoeira do Arari | 37 | 31 | 6 |
| PA | 1502103 | Cametá | 137 | 98 | 39 |
| PA | 1502152 | Canaã dos Carajás | 14 | 13 | 1 |
| PA | 1502202 | Capanema | 18 | 18 | 0 |
| PA | 1502301 | Capitão Poço | 37 | 36 | 1 |
| PA | 1502400 | Castanhal | 42 | 27 | 15 |
| PA | 1502509 | Chaves | 3 | 3 | 0 |
| PA | 1502608 | Colares | 26 | 22 | 4 |
| PA | 1502707 | Conceição do Araguaia | 8 | 6 | 2 |
| PA | 1502756 | Concórdia do Pará | 75 | 44 | 31 |
| PA | 1502764 | Cumaru do Norte | 28 | 23 | 5 |
| PA | 1502772 | Curionópolis | 9 | 8 | 1 |
| PA | 1502806 | Curralinho | 27 | 18 | 9 |
| PA | 1502855 | Curuá | 23 | 23 | 0 |
| PA | 1502905 | Curuçá | 32 | 32 | 0 |
| PA | 1502939 | Dom Eliseu | 5 | 5 | 0 |
| PA | 1502954 | Eldorado do Carajás | 13 | 13 | 0 |
| PA | 1503002 | Faro | 11 | 9 | 2 |
| PA | 1503044 | Floresta do Araguaia | 6 | 6 | 0 |
| PA | 1503077 | Garrafão do Norte | 23 | 18 | 5 |
| PA | 1503093 | Goianésia do Pará | 22 | 14 | 8 |
| PA | 1503101 | Gurupá | 57 | 38 | 19 |
| PA | 1503200 | Igarapé-Açu | 10 | 9 | 1 |
| PA | 1503309 | Igarapé-Miri | 24 | 20 | 4 |
| PA | 1503408 | Inhangapi | 20 | 14 | 6 |
| PA | 1503457 | Ipixuna do Pará | 17 | 17 | 0 |
| PA | 1503507 | Irituia | 66 | 46 | 20 |
| PA | 1503606 | Itaituba | 58 | 45 | 13 |
| PA | 1503705 | Itupiranga | 35 | 26 | 9 |
| PA | 1503754 | Jacareacanga | 255 | 183 | 72 |
| PA | 1503804 | Jacundá | 4 | 4 | 0 |
| PA | 1503903 | Juruti | 69 | 66 | 3 |
| PA | 1504000 | Limoeiro do Ajuru | 3 | 2 | 1 |
| PA | 1504059 | Mãe do Rio | 5 | 5 | 0 |
| PA | 1504109 | Magalhães Barata | 13 | 13 | 0 |
| PA | 1504208 | Marabá | 32 | 31 | 1 |
| PA | 1504307 | Maracanã | 40 | 39 | 1 |
| PA | 1504406 | Marapanim | 33 | 33 | 0 |
| PA | 1504422 | Marituba | 1 | 1 | 0 |
| PA | 1504455 | Medicilândia | 14 | 10 | 4 |
| PA | 1504505 | Melgaço | 2 | 2 | 0 |
| PA | 1504604 | Mocajuba | 64 | 47 | 17 |
| PA | 1504703 | Moju | 111 | 85 | 26 |
| PA | 1504752 | Mojuí dos Campos | 7 | 6 | 1 |
| PA | 1504802 | Monte Alegre | 21 | 19 | 2 |
| PA | 1504901 | Muaná | 8 | 8 | 0 |
| PA | 1504950 | Nova Esperança do Piriá | 9 | 8 | 1 |
| PA | 1504976 | Nova Ipixuna | 5 | 5 | 0 |
| PA | 1505007 | Nova Timboteua | 9 | 9 | 0 |
| PA | 1505031 | Novo Progresso | 9 | 9 | 0 |
| PA | 1505064 | Novo Repartimento | 60 | 37 | 23 |
| PA | 1505106 | Óbidos | 147 | 121 | 26 |
| PA | 1505205 | Oeiras do Pará | 55 | 31 | 24 |
| PA | 1505304 | Oriximiná | 229 | 152 | 77 |
| PA | 1505403 | Ourém | 26 | 21 | 5 |
| PA | 1505437 | Ourilândia do Norte | 27 | 18 | 9 |
| PA | 1505486 | Pacajá | 17 | 11 | 6 |
| PA | 1505494 | Palestina do Pará | 4 | 4 | 0 |
| PA | 1505502 | Paragominas | 48 | 41 | 7 |
| PA | 1505536 | Parauapebas | 32 | 26 | 6 |
| PA | 1505551 | Pau D'Arco | 8 | 6 | 2 |
| PA | 1505601 | Peixe-Boi | 7 | 7 | 0 |
| PA | 1505635 | Piçarra | 10 | 9 | 1 |
| PA | 1505650 | Placas | 5 | 5 | 0 |
| PA | 1505700 | Ponta de Pedras | 47 | 33 | 14 |
| PA | 1505809 | Portel | 12 | 11 | 1 |
| PA | 1505908 | Porto de Moz | 20 | 17 | 3 |
| PA | 1506005 | Prainha | 13 | 13 | 0 |
| PA | 1506104 | Primavera | 8 | 8 | 0 |
| PA | 1506112 | Quatipuru | 4 | 4 | 0 |
| PA | 1506138 | Redenção | 4 | 3 | 1 |
| PA | 1506161 | Rio Maria | 3 | 3 | 0 |
| PA | 1506187 | Rondon do Pará | 12 | 10 | 2 |
| PA | 1506195 | Rurópolis | 9 | 8 | 1 |
| PA | 1506203 | Salinópolis | 13 | 12 | 1 |
| PA | 1506302 | Salvaterra | 64 | 40 | 24 |
| PA | 1506351 | Santa Bárbara do Pará | 16 | 16 | 0 |
| PA | 1506401 | Santa Cruz do Arari | 2 | 2 | 0 |
| PA | 1506500 | Santa Izabel do Pará | 39 | 30 | 9 |
| PA | 1506559 | Santa Luzia do Pará | 58 | 37 | 21 |
| PA | 1506583 | Santa Maria das Barreiras | 9 | 8 | 1 |
| PA | 1506609 | Santa Maria do Pará | 19 | 15 | 4 |
| PA | 1506708 | Santana do Araguaia | 7 | 6 | 1 |
| PA | 1506807 | Santarém | 256 | 173 | 83 |
| PA | 1506906 | Santarém Novo | 9 | 9 | 0 |
| PA | 1507003 | Santo Antônio do Tauá | 20 | 17 | 3 |
| PA | 1507102 | São Caetano de Odivelas | 22 | 22 | 0 |
| PA | 1507151 | São Domingos do Araguaia | 7 | 7 | 0 |
| PA | 1507201 | São Domingos do Capim | 21 | 18 | 3 |
| PA | 1507300 | São Félix do Xingu | 84 | 63 | 21 |
| PA | 1507409 | São Francisco do Pará | 7 | 7 | 0 |
| PA | 1507458 | São Geraldo do Araguaia | 15 | 11 | 4 |
| PA | 1507466 | São João da Ponta | 9 | 9 | 0 |
| PA | 1507474 | São João de Pirabas | 17 | 17 | 0 |
| PA | 1507508 | São João do Araguaia | 12 | 12 | 0 |
| PA | 1507607 | São Miguel do Guamá | 56 | 47 | 9 |
| PA | 1507706 | São Sebastião da Boa Vista | 22 | 22 | 0 |
| PA | 1507755 | Sapucaia | 1 | 1 | 0 |
| PA | 1507805 | Senador José Porfírio | 33 | 23 | 10 |
| PA | 1507904 | Soure | 7 | 7 | 0 |
| PA | 1507953 | Tailândia | 14 | 14 | 0 |
| PA | 1507961 | Terra Alta | 8 | 8 | 0 |
| PA | 1507979 | Terra Santa | 3 | 3 | 0 |
| PA | 1508001 | Tomé-Açu | 55 | 43 | 12 |
| PA | 1508035 | Tracuateua | 24 | 19 | 5 |
| PA | 1508050 | Trairão | 14 | 10 | 4 |
| PA | 1508084 | Tucumã | 4 | 3 | 1 |
| PA | 1508100 | Tucuruí | 9 | 6 | 3 |
| PA | 1508126 | Ulianópolis | 15 | 10 | 5 |
| PA | 1508159 | Uruará | 9 | 7 | 2 |
| PA | 1508209 | Vigia | 16 | 16 | 0 |
| PA | 1508308 | Viseu | 55 | 48 | 7 |
| PA | 1508357 | Vitória do Xingu | 32 | 26 | 6 |
| PA | 1508407 | Xinguara | 16 | 16 | 0 |
| AP | 1600055 | Serra do Navio | 6 | 6 | 0 |
| AP | 1600105 | Amapá | 7 | 6 | 1 |
| AP | 1600154 | Pedra Branca do Amapari | 136 | 122 | 14 |
| AP | 1600204 | Calçoene | 12 | 11 | 1 |
| AP | 1600212 | Cutias | 10 | 10 | 0 |
| AP | 1600238 | Ferreira Gomes | 3 | 3 | 0 |
| AP | 1600253 | Itaubal | 12 | 11 | 1 |
| AP | 1600279 | Laranjal do Jari | 48 | 46 | 2 |
| AP | 1600303 | Macapá | 119 | 101 | 18 |
| AP | 1600402 | Mazagão | 51 | 50 | 1 |
| AP | 1600501 | Oiapoque | 112 | 75 | 37 |
| AP | 1600535 | Porto Grande | 12 | 12 | 0 |
| AP | 1600550 | Pracuúba | 8 | 7 | 1 |
| AP | 1600600 | Santana | 24 | 21 | 3 |
| AP | 1600709 | Tartarugalzinho | 22 | 19 | 3 |
| AP | 1600808 | Vitória do Jari | 15 | 15 | 0 |
| RR | 1400027 | Amajari | 170 | 114 | 56 |
| RR | 1400050 | Alto Alegre | 253 | 198 | 55 |
| RR | 1400100 | Boa Vista | 52 | 31 | 21 |
| RR | 1400159 | Bonfim | 44 | 28 | 16 |
| RR | 1400175 | Cantá | 47 | 37 | 10 |
| RR | 1400209 | Caracaraí | 56 | 46 | 10 |
| RR | 1400233 | Caroebe | 29 | 17 | 12 |
| RR | 1400282 | Iracema | 80 | 60 | 20 |
| RR | 1400308 | Mucajaí | 37 | 30 | 7 |
| RR | 1400407 | Normandia | 204 | 111 | 93 |
| RR | 1400456 | Pacaraima | 134 | 74 | 60 |
| RR | 1400472 | Rorainópolis | 57 | 37 | 20 |
| RR | 1400506 | São João da Baliza | 7 | 4 | 3 |
| RR | 1400605 | São Luiz do Anauá | 2 | 2 | 0 |
| RR | 1400704 | Uiramutã | 222 | 118 | 104 |
