# Pacote de estudo completo, VERIFICADO em fontes oficiais: pasta DPESP - PESQUISAS + DPERN (21/10/2026)

**54 estudos, 466 capítulos e 1056 cartões "Certo ou errado".** Tudo no formato do app (disciplina `dh`).

## Origem e tratamento
- **Perplexity / IA** (8 estudos antigos: haiti-mandinga … dh-dpern): conteúdo integral, só limpeza de formatação. Cartões SP/RN, como antes.
- **Cursinhos que você comprou** (RDP, CP Iuris, Reta Final): **reescritos** como síntese própria e condensada (≈20–50% do original), sem a voz do professor, marcas d'água, licença/CPF, URLs ou questões copiadas. As questões Certo/Errado dos cartões foram criadas do zero. Abrangência `nucleo_comum`.
- **Autorais (Estudos da Raiane)**: Ponto 0, Ponto 0.1, Bloco 1, tabela dos 26 casos e simulado, aproveitados de forma fiel (só formatação). Simulado: só cartões, com o seu gabarito.
- Itens que o texto marca com **(conferir norma vigente)** ou **(conferir)**: valores defasados, divergências entre as fontes, erros de numeração corrigidos. Reveja antes de publicar.

## Arquivos desta entrega (sem zip)
- `cartoes-todos.json`: os 1.056 cartões numa lista só (vale direto no `estudo_md.py inserir`).
- `ebooks-todos.json`: os 54 estudos numa lista só; use com `inserir_ebooks_todos.py`.
- `estudos-texto-completo.md` e `questoes-texto-completo.md`: tudo em texto, para ler no celular.
- `verificacao-todas.md`: o que foi conferido em fonte oficial e o que ficou sem confirmação.

## Como colocar no app (no computador, com `fonte.html` e a senha)
```bash
# guarde os arquivos em qualquer pasta, ex.: ~/estudo/ ; rode de dentro de ferramentas/conteudo
python baralho.py extrair ../../fonte.html baralho/
python estudo_md.py inserir baralho/ ~/estudo/cartoes-todos.json
python baralho.py montar baralho/ ../../fonte.html
python inserir_ebooks_todos.py deck.json ~/estudo/ebooks-todos.json     # deck.json = o objeto DECK do fonte.html
SENHA='...' node ../../build.mjs fonte.html index.html                   # suba CACHE/APP_CACHE (sw.js, gate.js, gate do index.html)
```
(Copie `inserir_ebooks_todos.py` para `ferramentas/conteudo/`.) Repetir não duplica nada. Não suba esses arquivos ao repositório: ele é público.

## Verificação em fonte oficial (21/10/2026)
Os pontos duvidosos foram conferidos por busca restrita a domínios oficiais (Planalto, STF, STJ, CNJ, Câmara, Senado, Corte IDH, OEA/CIDH, ONU/OHCHR, Conselho da Europa, Mercosul). **Limite:** os sites oficiais não abrem neste ambiente; só os resumos dos resultados da busca foram usados, nunca o texto integral das leis e acórdãos. Por isso, o que não foi afirmado de forma explícita por um resultado oficial ficou como **NÃO CONFIRMADO**, com a marca "(conferir)" no texto.
A tabela de cada lote está em `verificacao/` (ponto, arquivo, resultado, o que a fonte diz): corte-comissao.md, onu-tratados.md, grupos-normas.md, reta-final-tortura.md.

Principais correções em relação às apostilas: cotas em concursos (Lei 15.142/2025 substitui a 12.990/2014: 30%, a partir de 2 vagas; Res. CNJ 657/2025); Brasil reconhece 6 comitês (inclui Criança, Dec. 12.313/2024); Dec. 11.777/2023 promulga os dois protocolos do PIDCP; Fábrica de Fogos: 60 mortos; Gomes Lund 24/11/2010; Sales Pimenta: memorial em Juiz de Fora; Alcântara: 171 comunidades; juiz ad hoc só em casos interestatais (OC-20); Bolívia Estado Parte do Mercosul (2024); Ushuaia II ainda não em vigor; Lei 15.410/2026 (violência doméstica como tortura); marco temporal: STF considerou inconstitucional o trecho da Lei 14.701/2023 (dez/2025).

**Antes de publicar, confira você mesma o que ficou NÃO CONFIRMADO** (resultado dos embargos/conciliação do marco temporal, ADPF 442/709/976/828, ADI 7330, sentença do mecanismo estadual de tortura em SP, nº de sentenças da Corte contra o Brasil, Estados associados do Mercosul, texto consolidado da Res. CNJ 348, Decreto 10.410/2020, PDL 863/2017, Estatuto dos Povos Ciganos etc.): busque `(conferir` nos arquivos de `fonte/`.

## Atenção
- Os cartões dos cursinhos se sobrepõem em temas (ex.: casos do Brasil na Corte IDH aparecem em RDP, CP Iuris e Reta Final). Ids diferentes, sem conflito; se achar repetitivo, remova os arquivos de `cartoes/` que não quiser antes do passo 2.
- Conteúdo de IA e síntese de apostilas: não verificado juridicamente. Confira em lei, STF/STJ, CNJ.
- Os 8 cartões antigos SP/RN seguem restritos a esses estados.

## Estudos
| id | título | capítulos | cartões | abr |
|---|---|---|---|---|
| clima-consulta | Clima, futuras gerações e consulta prévia | 13 | 12 | SP |
| dh-100-regras-brasilia | As 100 Regras de Brasília | 5 | 14 | nucleo_comum |
| dh-agenda-2030 | Agenda 2030 da ONU | 10 | 18 | nucleo_comum |
| dh-bloco-1 | Bloco 1 — Sistema global, Agenda 2030 e teorias críticas | 8 | 16 | nucleo_comum |
| dh-cautelares-provisorias | Medidas cautelares e provisórias | 5 | 20 | nucleo_comum |
| dh-cedaw-convencao-racial | Convenções da ONU: discriminação racial e contra a mulher | 4 | 21 | nucleo_comum |
| dh-comentarios-gerais-comites | Comentários gerais dos comitês da ONU | 4 | 26 | nucleo_comum |
| dh-comissao-idh-brasil | Casos do Brasil na Comissão IDH | 11 | 22 | nucleo_comum |
| dh-controle-convencionalidade | Controle de convencionalidade e status dos tratados | 11 | 20 | nucleo_comum |
| dh-corte-idh-brasil | Casos do Brasil na Corte IDH | 17 | 27 | nucleo_comum |
| dh-corte-idh-outros-paises | Casos da Corte IDH: outros países da OEA | 9 | 20 | nucleo_comum |
| dh-cpiuris-c01-teoria-geral | Teoria geral dos direitos humanos | 13 | 22 | nucleo_comum |
| dh-cpiuris-c02a-sistema-global-onu | Sistema global (ONU) de proteção dos direitos humanos | 3 | 18 | nucleo_comum |
| dh-cpiuris-c02b-sistema-interamericano-cadh | Sistema interamericano: OEA, Declaração Americana, CADH e Protocolo de San Salvador | 5 | 20 | nucleo_comum |
| dh-cpiuris-c02c-europeu-africano-mercosul | Sistemas europeu e africano e direitos humanos no Mercosul | 4 | 17 | nucleo_comum |
| dh-cpiuris-c02d-processo-sidh-convencionalidade | Processo internacional, procedimentos da CIDH e da Corte IDH e controle de convencionalidade | 7 | 18 | nucleo_comum |
| dh-cpiuris-c02e-condenacoes-brasil-1 | Condenações do Brasil na Corte IDH (1): Ximenes Lopes a Brasil Verde | 7 | 18 | nucleo_comum |
| dh-cpiuris-c02f-condenacoes-brasil-2 | Condenações do Brasil na Corte IDH (2): Favela Nova Brasília a Fábrica de Fogos | 6 | 17 | nucleo_comum |
| dh-cpiuris-c02g-condenacoes-brasil-3 | Condenações do Brasil na Corte IDH (3): Barbosa de Souza a Nogueira de Carvalho | 13 | 17 | nucleo_comum |
| dh-cpiuris-c02h-tratados-constituicao-idc | Direitos humanos e Constituição de 1988: status dos tratados, ratificação e IDC | 5 | 16 | nucleo_comum |
| dh-cpiuris-c02i-combate-tortura | Combate à tortura: tratados, supervisão e sistema nacional | 5 | 16 | nucleo_comum |
| dh-cpiuris-c02j-discriminacao-mulheres | Combate à discriminação: conceitos e proteção das mulheres | 4 | 18 | nucleo_comum |
| dh-cpiuris-c02k-discriminacao-racial | Combate à discriminação racial: CERD, CICRDR, Estatuto e ações afirmativas | 5 | 18 | nucleo_comum |
| dh-cpiuris-c02l-pessoas-com-deficiencia | Proteção das pessoas com deficiência: CDPD, Marraqueche, Convenção Interamericana, LBI, BPC e aposentadoria | 8 | 18 | nucleo_comum |
| dh-cpiuris-c02m-lgbtqia-rua-periferias | Proteção de pessoas LGBTQIA+, população em situação de rua e comunidades periféricas | 4 | 16 | nucleo_comum |
| dh-cpiuris-c02n-trafico-de-pessoas | Combate ao tráfico de pessoas: Protocolo de Palermo, Lei 13.344/2016 e art. 149-A do CP | 5 | 18 | nucleo_comum |
| dh-cpiuris-c03-povos-indigenas | Proteção aos povos indígenas | 4 | 18 | nucleo_comum |
| dh-defensor-interamericano | Defensor Público Interamericano | 4 | 13 | nucleo_comum |
| dh-dih | Direito Internacional Humanitário | 7 | 14 | nucleo_comum |
| dh-direito-indigenista | Direito Indigenista: temas aprofundados | 5 | 21 | nucleo_comum |
| dh-dpern | Direitos Humanos · DPE-RN | 15 | 13 | RN |
| dh-genero-idosos | Vulnerabilidade por gênero e idosos | 5 | 14 | nucleo_comum |
| dh-introducao-temas-gerais | Direitos Humanos: introdução e temas gerais | 15 | 22 | nucleo_comum |
| dh-lgbtqiap | Proteção jurídica das pessoas LGBTQIAP+ | 5 | 20 | nucleo_comum |
| dh-monitoramento-global | Mecanismos de monitoramento do sistema global | 5 | 24 | nucleo_comum |
| dh-oea-sistema-interamericano | OEA e o sistema interamericano | 8 | 24 | nucleo_comum |
| dh-opinioes-consultivas | Opiniões consultivas da Corte IDH | 6 | 22 | nucleo_comum |
| dh-ponto-0-overview | Ponto 0 — Overview e mapeamento de artigos | 15 | 28 | nucleo_comum |
| dh-ponto-01-lei-seca | Ponto 0.1 — Lei seca comentada | 12 | 32 | nucleo_comum |
| dh-pop-rua | Pessoas em situação de rua | 9 | 18 | nucleo_comum |
| dh-povos-ciganos | Povos ciganos | 5 | 15 | nucleo_comum |
| dh-refugiados | Direito dos Refugiados | 6 | 16 | nucleo_comum |
| dh-reta-final-complementar | Reta Final · complemento | 6 | 24 | nucleo_comum |
| dh-reta-final | Reta Final DPE · Direitos Humanos | 11 | 33 | nucleo_comum |
| dh-sistema-onusiano | Sistema onusiano | 13 | 25 | nucleo_comum |
| dh-tabela-26-casos | Tabela mestra dos 26 casos contenciosos do Brasil | 5 | 24 | nucleo_comum |
| dh-terreiros-pescadores-ribeirinhos | Terreiros, pescadores artesanais, ribeirinhos e catadores | 6 | 15 | nucleo_comum |
| dh-tortura-prova-seguranca | Tortura, prova e segurança pública | 15 | 27 | nucleo_comum |
| haiti-mandinga | Constitucionalismo haitiano e Carta Mandinga | 11 | 17 | SP |
| ia-racismo-dpesp | IA, racismo algorítmico e tecnologias digitais | 18 | 13 | SP |
| letalidade-prisoes | Letalidade policial, câmeras e sistema prisional | 16 | 13 | SP |
| litigancia-estrutural | Litigância estrutural e barreiras de acesso | 21 | 22 | SP |
| minimo-existencial | Mínimo existencial e proteção insuficiente | 10 | 8 | SP |
| racial-genero-deficiencia | Perspectiva racial, gênero e deficiência | 17 | 8 | SP |
