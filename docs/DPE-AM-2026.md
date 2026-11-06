# DPE/AM 2026 · Analista Jurídico de Defensoria (servidor)

O que o app tem do **Edital nº 01/2026 da Defensoria Pública do Estado do Amazonas** (VI Concurso de servidores, banca Fundação Carlos Chagas) e como cada parte foi obtida. O recorte é o **cargo R, Analista Jurídico de Defensoria – Ciência Jurídica**; os demais cargos (A a Q) não foram incluídos.

## No app

| Onde | O quê | Fonte |
|---|---|---|
| **Cronograma** › "DPE/AM · Analista Jurídico (servidor) · Edital 1/2026" (`am-2026-servidor`) | 11 rubricas e 173 assuntos: 3 de Conhecimentos Gerais e 8 dos Específicos do cargo R, cada assunto com o texto do edital e a página do PDF | Anexo II do edital (PDF, páginas 30 e 43 a 47) |
| **Cronograma** › sugestão de percentuais | Perfil por questões: 20 Gerais e 40 Específicas | Item 7.1 do edital |
| **Aprofundamento** › grupo "Apostila DPE/AM" | Três e-books: a **apostila de estudo** (29 capítulos, com notas de fonte), os **21 quadros comparativos** (23 capítulos) e **LC nº 80/1994 × DPE-AM** (12 capítulos) | Material de estudo fornecido pela titular do app (veja abaixo) |
| **Cronograma** › botão **📖 Ler o resumo** | 17 assuntos do edital abrem a apostila no capítulo certo: os 9 de Legislação da Defensoria, os 7 de Conhecimentos Jurídicos e Institucionais e o item 6 de Direito Constitucional | `ferramentas/conteudo/dpeam/mapa-apostila.json` |
| **Plano estratégico** (`plano-dpeam-2026.html`) | Regras do edital e consequências, simulador da nota, mapa do programa, fases datadas até 07/03/2027, piloto de 4 semanas, diagnóstico por disciplina, checklist de datas | Itens 4, 7 a 13 e Anexos II a IV |

O programa tem `cargo: "servidor"`, então fica **fora do relatório de frequência dos editais de Defensor** (aba Progresso). Os cartões e a revisão espaçada seguem a regra geral: um cartão novo só entra depois de marcar "Estudei este assunto" no Cronograma.

## A regra da nota

O item 9.2 define a nota como a média ponderada das notas de Conhecimentos Gerais (peso 1) e de Específicos (peso 2), cada uma de 0 a 10. Como cada nota é medida sobre o próprio número de questões (20 e 40), a conta se reduz a `(acertos Gerais + acertos Específicos) ÷ 6`: **toda questão vale o mesmo**, e os Específicos respondem por 40/60 da nota, não por 80%.

Por isso o perfil de pesos usa `tipo: "questoes"` (como o TJPB) e não "pontos" (como a DPDF), em que o valor é questões × peso. Nota mínima de 6,00 (item 9.3) equivale a **36 acertos em 60**, supondo conversão linear para a escala 0 a 10; o edital não detalha a fórmula. Os testes fixam essa aritmética em `tests/plano-dpeam-2026.test.mjs` e `tests/cronograma-percentuais.test.mjs`.

O edital não divide as 20 questões gerais entre as três rubricas nem as 40 específicas entre as oito. A divisão igual (6,67 e 5 questões) é **hipótese de tempo, não peso oficial**, e está dita assim na `nota` do perfil.

## Limites conhecidos

- **Blocos sem numeração.** Os Conhecimentos Gerais e o bloco de Criança e Adolescente, Idoso, Pessoa com Deficiência e Mulher não têm itens numerados. Cada tópico de Conhecimentos Gerais é uma frase do edital, e o último bloco segue as quatro seções rotuladas pelo próprio edital. O texto é o do edital; a divisão em tópicos é editorial.
- **Numeração anômala em Direito Processual Civil.** O item 6 aparece duas vezes e a sequência pula do 12 para o 14. O texto mantém a numeração impressa.
- **Direito Penal, item 9 desdobrado.** O item reúne teoria da pena, crimes em espécie e legislação penal especial. Foi dividido em três tópicos com o texto literal, para caber em blocos de estudo.
- **Números de lei que parecem errados no edital.** A Lei de Drogas aparece como "Lei nº 15.343/06" e o abuso de autoridade como "Lei nº 16.869/2019"; as normas com esses nomes são a Lei nº 11.343/2006 e a Lei nº 13.869/2019. O catálogo preserva o texto impresso e registra o aviso em `lacunas`. Confirme em eventual retificação.
- **Marco temporal.** Vale a legislação e a jurisprudência vigentes até a publicação do edital (item 13.2). A data exata de publicação não consta do texto recebido (arquivo revisado em 30/10/2026; impugnação em 03 e 04/11/2026).
- **Cronograma sujeito a alteração.** As datas do plano vêm do Anexo III e podem mudar; confira o site da banca. O plano exibe as datas como "previstas".
- **Localizador de página.** O número impresso no rodapé do Anexo II reinicia na página 1, então o localizador é a página do arquivo PDF (`Edital nº 01/2026 – DPE/AM, Anexo II, PDF p. N`).
- **Vagas.** O cargo R tem 1 vaga imediata em Itacoatiara e cadastro de reserva nos 12 polos; o corte de classificação é a 30ª posição por polo (40ª nas cotas).
- **Resumos por matéria.** O botão **Ler o resumo** do Cronograma depende do campo `editais` do e-book selado (veja [Resumos por matéria](RESUMOS-POR-MATERIA.md)). Os e-books de resumos por matéria não têm este edital nesse mapa, então só os 17 assuntos ligados à apostila (acima) têm o botão; nos demais ele e o aviso "sem resumo" não aparecem, sem erro. Ligar o restante exigiria regenerar os resumos com o material pessoal do Drive (`ferramentas/conteudo/drive/`), que não faz parte do repositório.
- **Só um botão por assunto.** Se dois e-books ligarem o mesmo assunto, vale o primeiro na ordem do baralho. Por isso só a apostila tem `editais`; os quadros e o estudo da LC nº 80 abrem pelo Aprofundamento.
- **Fora do escopo.** Programas dos cargos A a Q.

## Material de estudo (Apostila DPE/AM)

Três materiais fornecidos pela titular do app entram como e-books do Aprofundamento, no grupo **Apostila DPE/AM**, em `conteudo-cifrado/dpeam-estudo.bin`. **O repositório é público**: o texto nunca fica legível nele. Só o `.bin` selado com a chave pública do app vai ao Git; a publicação o abre com `APP_SENHA` (`ferramentas/ci/aplicar_ebooks.mjs`) e o põe no baralho cifrado. Por isso os e-books só aparecem no app depois do merge e da publicação.

| E-book | id | Conteúdo |
|---|---|---|
| Apostila de estudo — DPE/AM | `dpeam-apostila-cg` | Legislação da Defensoria e Conhecimentos Jurídicos e Institucionais do Anexo II (CF arts. 5º, 37 e 134, emendas, LC 80/1994, normas do Amazonas, ética, direito antidiscriminatório), com casos, questões comentadas e 264 notas de fonte |
| Quadros comparativos DPE/AM | `dpeam-quadros` | 21 quadros de "conceito, alcance, exemplo e confusão a evitar" e um capítulo de uso |
| LC nº 80/1994 e a DPE-AM | `dpeam-lc80` | O que é comum, o que é da DPU e o que cada Estado complementa; 9 quadros |

**O que o conversor muda** (`ferramentas/conteudo/dpeam/apostila_para_ebook.py`), porque o renderizador do app aceita uma sintaxe curta: tira o logo, o `<span>` oculto com as notas e os separadores; troca `[^1_12]` por `[12]` e leva as notas ao capítulo "Fontes consultadas" (em texto simples, pois o app não torna links clicáveis); resolve escapes; normaliza o separador de tabela para 3 traços (com 2, o app não reconhece a tabela); tira o vocativo pessoal da abertura dos quadros; e recusa tabela com número de colunas diferente do cabeçalho. O resto do texto é o original.

**Aviso do app.** Cada e-book abre com um aviso sobre o marco temporal: a prova só cobre a legislação vigente até a publicação do edital (item 13.2). Os materiais citam alterações de 2026 (LC estadual nº 288/2026 e Lei estadual nº 8.345/2026) que **não foram verificadas de forma independente** (uma busca na web não encontrou fonte para nenhuma das duas, o que não prova que não existam). Confira a data de publicação delas antes de memorizar.

**Também não foram verificadas** as demais afirmações jurídicas dos materiais, como as ADIs nº 2.167 e nº 6.873 e os números de artigos da LC nº 80/1994. O texto é do material, não do app.

**Os testes** usam texto fictício (o conteúdo real não entra no repositório). `tests/apostila-dpeam.test.mjs` cobre o conversor, o mapa dos assuntos contra o catálogo e o botão no Cronograma, com uma apostila sintética montada a partir dos próprios títulos do mapa.

**Regenerar** (os arquivos de origem ficam fora do Git):

```bash
python3 -I ferramentas/conteudo/dpeam/apostila_para_ebook.py --perfil apostila --mapa ferramentas/conteudo/dpeam/mapa-apostila.json apostila.md saida/apostila.json
python3 -I ferramentas/conteudo/dpeam/apostila_para_ebook.py --perfil quadros quadros.md saida/quadros.json
python3 -I ferramentas/conteudo/dpeam/apostila_para_ebook.py --perfil lc80 lc80.md saida/lc80.json
node ferramentas/ajustes/selar_conteudo.mjs conteudo-cifrado/dpeam-estudo.bin saida/apostila.json saida/quadros.json saida/lc80.json
```

A conversão falha se o mapa apontar para capítulo ou título que não existe, o que protege as âncoras do botão **Ler o resumo**. Depois aumente a versão do cache (`CACHE` em `sw.js`; `APP_CACHE` em `gate.js` e `index.html`) e rode `npm test`.

## Lei seca grifada (Lei 9.784, Lei 8.987 e Estatuto da Pessoa com Deficiência)

Três leis do programa entram no leitor de **Lei seca** com os grifos por cor, as questões por artigo (2022–2026) e os cartões de lacuna, pelo mesmo fluxo das demais leis do curso (`ferramentas/conteudo/leiseca_decodificada.py` → `ferramentas/ajustes/cifrar_leiseca.mjs` → `leiseca-cifrada/*.bin` selado; a publicação abre com `APP_SENHA`).

| Lei | id | Artigos | Com grifos | Julgados | Cartões | Itens do edital |
|---|---|---|---|---|---|---|
| Lei 9.784/1999 · Processo Administrativo | `l9784-dls` | 77 | 66 | 11 | 66 | Administrativo, item 4 (procedimento administrativo) |
| Lei 8.987/1995 · Concessões e Permissões | `l8987-dls` | 49 | 33 | 15 | 37 | Administrativo, item 7 (concessão, permissão e parceria público-privada) |
| Estatuto da Pessoa com Deficiência · Lei 13.146/2015 | `epd-dls` | 127 | 66 | 0 | 56 | Bloco Criança, Idoso, Pessoa com Deficiência e Mulher (o edital cita a Lei 13.146/2015 pelo número) |

- **O EPD substitui o texto oficial (`l13146`, 130 artigos) e a seleção antiga (`epcd`).** A grifada não traz os arts. 29, 82 e 106, que no texto oficial são `(VETADO)`; os demais estão inteiros (o oficial só é maior por pontilhados e notas de alteração). Esta edição da apostila não tem as seções de assertivas nem de julgados (0 e 0): é a série sem "3 em 1".
- **A Lei 9.784 já existia como texto oficial** (`ferramentas/conteudo/dados/leiseca-publica/l9784.json`, sem grifos). A grifada declara `substitui: ["l9784"]` e a publicação a coloca no lugar da pública, sem duplicar a lei no leitor. A Lei 8.987 não tinha versão pública.
- **Correção na publicação (`aplicar_leiseca.mjs`).** O campo `substitui` só enxergava leis que já estavam no baralho; as leis públicas inseridas na **mesma** execução ainda estavam na lista de novas e escapavam. Foi achado numa simulação da publicação com os dados reais (o baralho ficaria com as duas versões) e agora há teste para isso.
- **Onde aparecem no Cronograma.** O atalho **⚖️ Lei seca** só sai quando o edital cita a lei ou ela é a "lei da disciplina" (tabela `LEI_DA_DISCIPLINA` em `arquivos/cronograma.js`, que não tem Administrativo). O edital da DPE/AM não cita a Lei 9.784 nem a 8.987 por número. Por isso elas aparecem em **Ver tudo sobre o assunto**, por coincidência de termos: em verificação local com os dados reais, em 10 dos 13 assuntos de Administrativo. Elas também casam com assuntos de outras rubricas (por exemplo, recursos e prazos em Processo Penal) por termos genéricos; isso já acontece com as demais leis e fica restrito a essa lista.
- **Atalho que não funcionava com os ids publicados (corrigido).** A tabela `LEI_DA_DISCIPLINA` usa os ids base (`cf`, `cdc`, `idoso`, `lmp`, `epcd`), mas no baralho publicado essas leis têm outros ids (as do curso levam `-dls`, e o EPD é `l13146` ou `epd-dls`). Medindo na tela real, o atalho só saía com o id antigo; com `cf-dls`, `idoso-dls`, `epd-dls` e `l13146` sumia, o que atingia Constitucional e o bloco Criança, Idoso, PcD e Mulher. `leiDoAssunto` agora normaliza o id (`ID_BASE_DA_LEI`); `tests/cronograma-lei-seca.test.mjs` cobre os ids antigos e novos, com controle negativo (lei que não é da disciplina não ganha o atalho).
- **Improbidade (`lia-dls`) não foi trocada; Idoso (`idoso-dls`) foi.** Os PDFs foram reenviados. Com o extrator já corrigido (próximo item), a Improbidade sai idêntica à anterior, então não há o que trocar. O Idoso sai com 2 palavras coladas a menos (ver abaixo) e a mesma estrutura (117 artigos, 42 cartões); como o código de extração era o mesmo quando o `.bin` atual foi gerado, ele tem esses defeitos. A troca é por id.
- **Palavras coladas e acentos decompostos (corrigido no extrator).** Causa raiz, confirmada nos PDFs reais: a última palavra de um trecho grifado termina sem espaço, e o espaço seguinte é um **trecho próprio só de espaço**, na fonte normal. O extrator descartava todo trecho só de espaço (`if not t.strip(): continue`), então "interdisciplinar" + "e" virava `interdisciplinare`. Agora o espaço entre trechos do **texto da lei** é mantido (na margem, no rodapé e em outras fontes continua descartado), e todo texto sai em NFC (o PDF traz alguns acentos como letra + acento combinante). Reextraídos os 5 PDFs enviados, as únicas mudanças foram 8 espaços inseridos e 13 acentos compostos, sem alteração de estrutura, de artigos ou de cartões:

  | Lei | Espaços inseridos | Exemplos |
  |---|---|---|
  | Lei 8.987 | 4 (2 artigos) | `concedentedeverá`, `autorizadapelo` |
  | EPD | 2 (1 artigo) | `interdisciplinare` (o oficial é "interdisciplinar e considerará") |
  | Idoso | 2 (1 artigo) | `Leisão` |
  | Lei 9.784 e Improbidade | 0 | já estavam corretas |

  **Lição:** o detector que usei antes só enxergava colagem de minúscula com maiúscula, e por isso afirmei, errado, que as leis novas estavam sem palavras coladas. Colagem entre duas minúsculas ("concedentedeverá") só se vê comparando com um texto de referência. A comparação com o texto oficial da mesma lei (`leiseca-publica`) é o teste mais confiável quando ele existe.
- **CF: "Art. !º", "modi cação", "esse m," e palavras coladas (resolvido com o PDF novo, causa inferida).** Em produção, o art. 2º aparecia como `Art. !º SãoPoderesdaUnião,independenteseharmônicosentresi,o Legislativo...`, e as assertivas com "modi cação" (de "modificação") e "esse m," (de "esse fim"). Nada disso sai do PDF `Constituição Federal - Legislação Decodificada 3 em 1 - Grifos com cores` (9,7 MB, de 05/11): tanto o extrator antigo (de 01/11) quanto o atual dão o art. 2º correto, com número e espaços, e o texto do PDF confere com um segundo extrator independente (poppler, em ordem de conteúdo): 898 de 898 assertivas e 947 de 947 julgados achados, e 388 de 408 artigos linha a linha (os 20 restantes divergem só onde o cabeçalho da página corta o texto). O Drive tem **duas edições** desse PDF: a de 31/10 (20,4 MB), que é a que o `cf-dls.bin` de 01/11 usou, e a de 05/11. **Inferência, não verificada:** a edição antiga tem a camada de texto com problema (dígito mapeado para "!", ligadura "fi" e espaços perdidos), e por isso o defeito não se repete com o PDF novo; não abri o PDF antigo aqui. A correção é reextrair da edição nova e trocar o `cf-dls.bin`.
- **Defeitos reais achados na CF nova (corrigidos no extrator, com teste).** (1) A etiqueta da emenda ("EC 141/2026") vem em trecho próprio e colada ao texto: saía `EC 141/2026duração do trabalho` (73 casos). (2) O bloco "COMO ESTÁ CAINDO · questões recentes do Vade Mecum de Questões" não tinha tratamento: quando vinha depois do bloco de assertivas (art. 183 e art. 224), o texto dele, com "GABARITO: FALSO", era anexado à última assertiva. As outras 5 leis saem idênticas com as duas correções. Esse bloco traz questões com gabarito comentado (80 no PDF) que o app ainda **descarta**; incluí-las seria uma melhoria à parte.
- **Artigos que sumiam do leitor por perderem o número (corrigido, com teste).** O número do artigo, na margem, é escrito em fonte que **encolhe** para caber (12 pt em "1º", 8,2 pt em "156-A", 6,8 pt em "1.240-A"), e o extrator só aceitava 10 pt ou mais. O artigo ficava sem `a`; o leitor só mostra item com número, então **o texto do artigo não aparecia** e as assertivas dele ficavam soltas. Contagem de artigos antes → depois, com o mesmo PDF: CC 1.879 → 2.017 (133 sem número), CF 408 → 416, CPC 1.064 → 1.071, CDC 116 → 120, Lei 9.784 77 → 79 (arts. 49-A e 69-A), Improbidade 31 → 33 (arts. 17-B e 18-A). Lei 8.987, EPD e Idoso não mudaram. Assertivas soltas: CC 42 → 0, CPC 7 → 0, CF 2 → 0.
- **Reselados nesta etapa:** `cf-dls`, `cpc-dls`, `cc-dls` e `cdc-dls` (edição nova dos PDFs, de 05/11), e `l9784-dls` e `lia-dls` (só pelos artigos que faltavam; o resto igual). Conferência com `pdftotext -raw` do mesmo PDF: todas as assertivas e todos os julgados achados (CF 898/898 e 947/947; CPC 216/216 e 779/779; CC 516/516 e 582/582; CDC 17/17 e 173/173); artigos linha a linha: 95 a 99%, e os que sobram divergem onde o cabeçalho da página corta o texto.
- **Cuidado com o histórico dos cartões.** O id do cartão é posicional por grupo (`ls-<lei><grupo>-<ordem>`). Onde entraram artigos novos, os cartões seguintes do mesmo grupo mudam de id, e o histórico de revisão deles pode ficar trocado. Id por artigo evitaria isso, mas zeraria o histórico de todos os cartões de lei seca de uma vez; fica como decisão à parte.
- **Lacunas que não mexi.** Artigos vetados e alguns revogados não saem (ficam como item vazio entre o anterior e o seguinte: CDC arts. 11, 45, 62, 89 e 96; Lei 8.987 arts. 8, 12 e 24; EPD arts. 29 e 82). O texto "(Vetado)" não tem valor de estudo, mas o leitor pula o número.
- **Demais leis já no app, ainda da extração antiga.** CP, CPP, ECA, Maria da Penha, Drogas, LEP, Lei 14.133, Lei 8.112 e Desarmamento foram geradas com o extrator anterior, em parte a partir de edições antigas dos PDFs. Elas têm, no mínimo, o defeito do número do artigo que encolhe (artigos "-A" sem texto no leitor) e as palavras coladas. Precisam ser reextraídas com o extrator atual, a partir da edição mais nova de cada PDF. Teste útil antes de selar: conferir o texto extraído contra `pdftotext -raw` do mesmo PDF (assertivas e julgados devem ser achados 100%) e contar itens com texto e sem número (devem ser 0).
- **Limites da CF que não mexi.** O "TÍTULO V" sai sem o nome (o PDF não o traz na mesma linha), e o ADCT (arts. 1º a 138) entra no último grupo, sem cabeçalho próprio. Duas assertivas depois da "SEÇÃO V-A" (art. 156-A) ficam soltas e aparecem sem artigo, agora com o texto correto.
- **"Ver gabarito" mostrando "undefined." (defeito do app, corrigido).** As assertivas do "Decorando a Lei Seca" trazem só `{q, b}` (enunciado e banca), sem gabarito, porque a banca as considera corretas. Dentro de um artigo o leitor já tratava isso ("Assertiva considerada correta pela banca"). Mas uma assertiva que vem **depois de um título** (TÍTULO, CAPÍTULO, Seção) não tem artigo a que se prender e vira item solto (`qsolta`), cujo modelo em `app-src.txt` presumia gabarito e escrevia `undefined.`. Agora usa o mesmo tratamento do artigo. `tests/leiseca-leitor.test.mjs` reproduz os dois casos (com e sem gabarito) e o controle dentro do artigo. **Não explicado:** por que, na CF, as assertivas aparecem soltas depois dos títulos em vez de dentro do artigo; as cinco leis novas não têm nenhuma assertiva solta, então o motivo está na estrutura do PDF da CF.
- **Tabela do extrator.** Foram acrescentadas as linhas das três leis em `LEIS` e as substituições em `SUBSTITUI`; `tests/leiseca-decodificada.test.mjs` cobre o reconhecimento pelo título e as substituições sem importar o PyMuPDF nem usar PDF.
- **Marca d'água.** Os PDFs trazem dados pessoais da compradora em cada página. O extrator os descarta e aborta se algo parecido sobrar; a saída foi conferida de novo à parte (nenhuma ocorrência).

## Atualizar

Com o PDF do edital (ou de uma retificação):

```bash
python3 -I ferramentas/conteudo/dpeam/extrair_dpeam.py edital.pdf saida/dpeam.json
node ferramentas/conteudo/dpeam/inserir_dpeam.mjs . saida/dpeam.json
```

O extrator exige `pdftotext` (poppler) e usa `-layout`: sem isso o poppler apaga o hífen no fim da linha ("DPE-" + "AM" virava "DPEAM"). Se o edital for retificado, `inserir_dpeam.mjs` recusa inserir por cima; remova antes o programa `am-2026-servidor` de `arquivos/cronograma-conteudo.js` e de `arquivos/cronograma-pesos.js`. Depois aumente a versão do cache em `sw.js`, `gate.js` e `index.html` (`CACHE` e `APP_CACHE`) e rode `npm test`.
