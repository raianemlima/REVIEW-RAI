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
- **Idoso e Improbidade, já no app (`idoso-dls`, `lia-dls`), não foram trocados.** Os PDFs foram reenviados, mas a extração nova sela com tamanho quase idêntico ao do `.bin` do repositório (−0,1% e −0,02%, 16 e 8 bytes), o que indica o mesmo conteúdo; uma edição diferente mudaria o tamanho muito mais. O comparativo é indireto (o conteúdo atual está selado e não pode ser aberto sem a senha do app).
- **Tabela do extrator.** Foram acrescentadas as linhas das três leis em `LEIS` e as substituições em `SUBSTITUI`; `tests/leiseca-decodificada.test.mjs` cobre o reconhecimento pelo título e as substituições sem importar o PyMuPDF nem usar PDF.
- **Marca d'água.** Os PDFs trazem dados pessoais da compradora em cada página. O extrator os descarta e aborta se algo parecido sobrar; a saída foi conferida de novo à parte (nenhuma ocorrência).

## Atualizar

Com o PDF do edital (ou de uma retificação):

```bash
python3 -I ferramentas/conteudo/dpeam/extrair_dpeam.py edital.pdf saida/dpeam.json
node ferramentas/conteudo/dpeam/inserir_dpeam.mjs . saida/dpeam.json
```

O extrator exige `pdftotext` (poppler) e usa `-layout`: sem isso o poppler apaga o hífen no fim da linha ("DPE-" + "AM" virava "DPEAM"). Se o edital for retificado, `inserir_dpeam.mjs` recusa inserir por cima; remova antes o programa `am-2026-servidor` de `arquivos/cronograma-conteudo.js` e de `arquivos/cronograma-pesos.js`. Depois aumente a versão do cache em `sw.js`, `gate.js` e `index.html` (`CACHE` e `APP_CACHE`) e rode `npm test`.
