# Pontos de prova · cinco matérias para carreiras jurídicas

Cinco e-books no **Aprofundamento** (Biblioteca), grupo **Pontos de prova**, com o que mais cai nas provas de concursos jurídicos (Defensoria, Tribunais, Ministério Público, Procuradorias). Cada um é um resumo reescrito, com quadros comparativos, súmulas e vinculantes, "pegadinhas" e uma seção final **Como cai em prova**. Servem à **DPE/RN**, ao **TJPB 2026** e à **DPDF 2026** e a outros concursos jurídicos.

| E-book | id | Disciplina | Capítulos | Tamanho |
|---|---|---|---|---|
| Criminologia: pontos de prova | `pdp-criminologia` | `cr` | 7 | 21 mil caracteres |
| Direito Administrativo: pontos de prova | `pdp-administrativo` | `ad` | 10 | 39 mil caracteres |
| Direito Tributário: pontos de prova | `pdp-tributario` | `tr` | 7 | 37 mil caracteres |
| Direitos da Pessoa com Deficiência: pontos de prova | `pdp-pessoa-com-deficiencia` | `dh` | 5 | 20 mil caracteres |
| Processo Civil: tutela provisória e procedimentos especiais | `pdp-processo-civil` | `pc` | 4 | 29 mil caracteres |

Os textos não citam curso, editora nem material de origem: são apoio ao estudo. Leia junto com a lei seca e **confira a redação vigente e a jurisprudência atual**. Quando um tema mudou depois do material de origem, o e-book traz o regime vigente e avisa.

## O que cada e-book cobre

- **Criminologia**: conceito e método; marcos históricos; escolas (clássica, positiva, Lyon, Terza Scuola, técnico-jurídica, Marburgo, correcionalista, Nova Defesa Social, Lei e Ordem); teorias (Chicago, aprendizagem social, anomia, subcultura, etiquetamento, crítica); vitimologia; prevenção, modelos de reação, teorias da pena e cifras; abolicionismo, minimalismo, garantismo, direito penal do inimigo e velocidades; justiça restaurativa, sistema carcerário (ADPF 347), drogas, bullying e stalking.
- **Direito Administrativo**: regime jurídico e princípios; organização administrativa e terceiro setor; atos e poderes; agentes públicos; **licitações e contratos pela Lei 14.133/2021** (com quadro de equivalência com a Lei 8.666); serviços públicos e concessões; responsabilidade civil do Estado; bens públicos e intervenção na propriedade; processo administrativo e controle; **improbidade pela Lei 14.230/2021** (Temas 897 e 1.199 do STF).
- **Direito Tributário**: tributo e espécies; competência; princípios e imunidades; legislação, interpretação e fato gerador; responsabilidade tributária; lançamento, decadência e prescrição; suspensão, extinção e exclusão do crédito; garantias; fiscalização, dívida ativa e execução fiscal; impostos em espécie; **reforma tributária** (EC 132/2023, LC 214/2025 e LC 227/2026) e planejamento tributário. Traz as súmulas e vinculantes mais cobradas.
- **Direitos da Pessoa com Deficiência**: CDPD com status de emenda constitucional, modelo social, LBI (conceito, avaliação biopsicossocial, barreiras), capacidade civil, curatela e tomada de decisão apoiada, direitos setoriais (educação, trabalho e cotas, BPC, saúde, transporte), acessibilidade, **crimes** e Res. CNJ 230/2016.
- **Processo Civil**: tutela provisória (urgência, evidência, antecedente e **estabilização**), procedimentos especiais (exigir contas, possessórias, dissolução parcial, inventário, embargos de terceiro, família, monitória, jurisdição voluntária e interdição) e direito intertemporal.

## Cobertura e limites (leia antes de confiar)

O material de origem não foi lido página por página nos cinco casos. O resumo parte da estrutura dos livros, dos trechos lidos e dos pontos que o próprio material destaca, e completa o restante com o regime legal vigente:

- **Criminologia**: lidos com detalhe as escolas, as principais teorias, a vitimologia e a prevenção; os demais capítulos (técnicas, classificações de criminosos, temas atuais) foram escritos a partir do sumário e de trechos localizados.
- **Pessoa com deficiência**: lidos com detalhe a introdução, o conceito, as barreiras, trechos de trabalho, BPC, curatela, crimes e a resolução do CNJ; o restante segue o sumário e o texto da LBI.
- **Administrativo (2020)** e **Tributário (2023)**: lidos o sumário, as notas de atualização e os trechos que citam súmulas e jurisprudência; o corpo foi escrito pela estrutura do livro e pelo direito vigente. Sem leitura integral.
- **Processo Civil**: o arquivo de origem é uma digitalização com muitos erros (letras trocadas, palavras coladas). O sumário foi reconstruído e o artigo sobre estabilização da tutela foi lido; os demais temas seguem o sumário e o texto do CPC.

Por isso o texto **não substitui** a leitura da lei seca e do material completo. Pontos marcados com "conferir" dependem de verificação na redação atual.

## Como entra no app (nada legível vai para o Git)

1. O Markdown do resumo (um `# Capítulo` por capítulo, `##` por assunto) fica **fora do repositório**.
2. `python3 -I ferramentas/conteudo/pontos_de_prova.py RESUMO.md pdp-<id> <disc> "Título" "Subtítulo" SAIDA.json` converte para o JSON do Aprofundamento. O script recusa menção a curso, editora ou material de origem, dado pessoal, título `#` no corpo e linha de tabela com colunas a mais ou a menos.
3. `node ferramentas/ajustes/selar_conteudo.mjs conteudo-cifrado/pontos-de-prova.bin pdp-*.json` sela os e-books com a chave pública do app (não precisa de segredo).
4. Na publicação, `ferramentas/ci/aplicar_ebooks.mjs` abre o `.bin` com a senha do app (`APP_SENHA`) e insere os e-books no baralho cifrado (`DECK.ebooks`), trocando pelo id. O `.bin` não é copiado para o site.

Se a senha do app mudar, sele de novo (o log da etapa de lei seca mostra a chave pública nova). O Markdown e o JSON nunca vão para o Git; só o `.bin`.

## Atualizações a acompanhar

- **Administrativo**: regulamentos da Lei 14.133 (valores de dispensa atualizados por decreto) e a evolução do Tema 1.199.
- **Tributário**: calendário da reforma tributária (testes em 2026, CBS plena em 2027, IBS gradual de 2029 a 2033) e as leis complementares seguintes.
- **Pessoa com deficiência**: situação da Súmula 552 do STJ diante da Lei 14.768/2023; critérios do BPC.
- **Processo Civil**: orientação do STJ sobre a estabilização (reação do réu além do recurso).
