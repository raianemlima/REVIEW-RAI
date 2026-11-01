# Conteúdo específico · DPE/RN, TJPB 2026 e DPDF 2026

Três e-books no **Aprofundamento** (Biblioteca), um por concurso, montados a partir do material de estudo pessoal guardado no Drive. Cada e-book segue o edital: um capítulo por disciplina, um título por assunto, o texto do item do edital e até quatro trechos do material com a fonte, a página e a seção de onde saíram.

| E-book | Edital no Cronograma | Assuntos com trechos | Trechos |
|---|---|---|---|
| Conteúdo específico · DPE/RN | `rn-2025` (Res. 344/2025) | 147 de 206 | 405 |
| Conteúdo específico · TJPB 2026 | `tjpb-2026` (Edital 01/2026) | 72 de 78 | 226 |
| Conteúdo específico · DPDF 2026 | `df-2026` (Edital 1/2026) | 174 de 227 | 425 |

**Língua Portuguesa fica fora** dos e-books (TJPB e DPDF), por escolha da titular do app: no Cronograma, esses assuntos não ganham botão nem aviso. Os demais assuntos sem trecho ficam no e-book com o aviso de que o material não cobre o tema. O material do Drive não tem doutrina de Informática, Primeiros Socorros, LODF e regime dos servidores do DF.

## Fontes

São 136 arquivos do Drive, só material de estudo (peças, ofícios e documentos de trabalho ficam de fora):

- **CP Iuris (e-books 2026):** Civil, Administrativo, Consumidor, Processo Civil, Penal (Parte Especial), Legislação Penal Especial, Criança e Adolescente, Direitos Humanos e Informativos 10x;
- **Reta Final DPE/SP (Cursos DUO):** Constitucional, Administrativo e Tributário, Civil, Processo Civil, Penal, Processo Penal, Difusos e Coletivos, Criança e Adolescente, Direitos Humanos, Princípios Institucionais e Teses Institucionais;
- **Cursos DUO, apostilas por ponto:** Civil (famílias, obrigações, registros/LGPD/Marco Civil), Processo Civil (sujeitos, tutela provisória, procedimentos, provas, precedentes, execução), Penal (visão geral, patrimônio), Processo Penal (introdução, inquérito e ação, prova), Execução Penal (progressão, remição, multa), Constitucional (direitos fundamentais) e Princípios Institucionais (assistência jurídica);
- **Pro Leges e NPL (resumos):** Defensoria Pública (LC 80/1994), Difusos e Coletivos, Pessoa com Deficiência, Pessoa Idosa, Consumidor, Criança e Adolescente, Urbanístico, Saúde, Agrário, Digital, Desportivo, Criminologia, Execução Penal, Hermenêutica e Medicina Legal;
- **Curso RDP (Direitos Humanos):** sistemas global e interamericano, casos da Corte IDH, grupos vulneráveis, comentários gerais, refugiados, indigenista e outros;
- **Atualizações e Radar Legislativo** de 2026 e as anotações de estudo.

- **Cursos anteriores (o ano vai no rótulo de cada trecho):** OUSE · Teoria da Constituição (2022: a Constituição, constitucionalismo e história constitucional, poder constituinte, modificação, normas constitucionais); CERS · Carreiras Jurídicas (2021: Constitucional cap. 1; Processo Penal caps. 5, 8, 10, 12, 13 e 16) e aulas de Processo Penal (2021: provas, prisão e cautelares, júri, recursos); Themas · DPE Full (2022: Constitucional — controle de constitucionalidade, poder legislativo, processo legislativo, Tribunal de Contas, racismo; Processo Penal — noções introdutórias, inquérito e juiz de garantias, ação penal, teoria geral das provas, provas em espécie, perícia e cadeia de custódia, meios extraordinários de obtenção de prova, prisão em flagrante, preventiva e temporária, procedimentos, sentença). Os slides quase não entram: o texto fragmentado é descartado.

Os e-books CP Iuris 2026 de **Constitucional e Processo Penal** (cerca de 7 MB cada) não passam pelo conector do Drive, e as ferramentas do Drive não dividem PDF (só copiam ou criam arquivos inteiros); os materiais de 2021/2022 acima cobrem essas matérias. Para usar os e-books completos, envie os PDFs pelo chat da sessão ou divida cada um em partes de até 5 MB no Drive.

Alguns materiais (OUSE, Themas) trazem nome e CPF da compradora no rodapé de cada página; o extrator tira essas linhas e a geração confere que nenhum dado pessoal chega aos trechos.

## No Cronograma

Em cada bloco de assunto (na tela do Cronograma e no card "assuntos de hoje" em Hoje), quando o edital escolhido tem e-book de conteúdo específico:

- assunto com trechos: botão **📖 Ler os trechos (N)** nos assuntos de hoje (em Hoje é a ação principal do assunto) e **📖 Estudar os trechos doutrinários** na semana do Cronograma. Ele abre o Aprofundamento no capítulo da disciplina, rola até o assunto e o destaca;
- assunto sem trecho: aviso para estudar pela lei seca, pelos cartões e pelas fontes oficiais.

A ligação usa o id do assunto no programa (`mapa` do e-book: id do assunto → capítulo, posição do título, quantidade de trechos). Os outros editais não mudam.

## Como os trechos foram escolhidos

Os scripts ficam em `ferramentas/conteudo/drive/` e rodam fora do repositório, sobre os arquivos baixados do Drive:

1. `extrair_drive.py`: texto de PDF, DOCX e MD por página, sem cabeçalho, rodapé e marca d'água repetidos e sem linhas com dados pessoais (e-mail, CPF, telefone, "licenciado para");
2. `trechos.py`: parágrafos e seções (títulos numerados ou em maiúsculas), notas de rodapé retiradas, gabarito das questões "CAIU NA..." trazido para o texto, e a disciplina de cada trecho (pelo material ou, nos informativos e atualizações, pelo título da seção);
3. `buscar.py`: para cada assunto e cada subitem do edital, busca por correspondência (BM25) só nos trechos da disciplina, exigindo os termos do subitem juntos no texto ou no título da seção. Prefere deixar o assunto sem trecho a mostrar trecho de outro tema;
4. (em `buscar.py`) quando o assunto cita lei ou resolução pelo número, o trecho precisa citar o mesmo número;
5. `gerar_ebooks.py`: monta os e-books e o `mapa` (com `OCULTAR=nome1,nome2` tira nomes que não devem aparecer; as disciplinas em `FORA`, hoje só Língua Portuguesa, não entram). O id de cada capítulo é o id da disciplina, para o progresso de leitura não mudar de capítulo quando o e-book é refeito.

É uma seleção automática: confira a pertinência de cada trecho e a redação vigente da lei.

## Segurança

O texto é material de curso e anotações pessoais; o repositório é público. Por isso:

- os e-books vão para `conteudo-cifrado/*.bin` **selados** com a mesma chave pública da lei seca do curso (`leiseca-cifrada/chave-publica.txt`): `node ferramentas/ajustes/selar_conteudo.mjs conteudo-cifrado/ce-dpe-rn.bin ce-dpe-rn.json`. Selar não precisa de segredo;
- na publicação, `ferramentas/ci/aplicar_ebooks.mjs` abre os `.bin` com a senha do app (segredo `APP_SENHA`, o mesmo de sempre) e insere os e-books no baralho cifrado (`DECK.ebooks`), trocando pelo id. Nenhum segredo novo;
- os `.bin` não são copiados para o site; o texto só existe dentro do `deck.enc`, que abre com a senha do app;
- nenhum dado pessoal das marcas d'água vai para os e-books, e as anotações pessoais aparecem como "Anotações de estudo".

Se a senha do app mudar, o log da etapa de lei seca mostra a nova chave pública: sele de novo a lei seca do curso e estes e-books com ela.
