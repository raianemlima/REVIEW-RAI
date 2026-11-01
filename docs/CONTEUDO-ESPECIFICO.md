# Conteúdo específico · DPE/RN, TJPB 2026 e DPDF 2026

Três e-books no **Aprofundamento** (Biblioteca), um por concurso, montados a partir do material de estudo pessoal guardado no Drive. Cada e-book segue o edital: um capítulo por disciplina, um título por assunto, o texto do item do edital e até quatro trechos do material com a fonte, a página e a seção de onde saíram.

| E-book | Edital no Cronograma | Assuntos com trechos | Trechos |
|---|---|---|---|
| Conteúdo específico · DPE/RN | `rn-2025` (Res. 344/2025) | 100 de 206 | 242 |
| Conteúdo específico · TJPB 2026 | `tjpb-2026` (Edital 01/2026) | 57 de 84 | 154 |
| Conteúdo específico · DPDF 2026 | `df-2026` (Edital 1/2026) | 142 de 233 | 325 |

Os assuntos sem trecho ficam no e-book com o aviso de que o material não cobre o tema. O material do Drive não tem doutrina de Língua Portuguesa, Informática, Primeiros Socorros, LODF e regime dos servidores do DF; em Direito Civil e em Processo Penal ele traz sobretudo informativos e atualizações, não manual.

## No Cronograma

Em cada bloco de assunto (na tela do Cronograma e no card "assuntos de hoje" em Hoje), quando o edital escolhido tem e-book de conteúdo específico:

- assunto com trechos: botão **📖 Estudar os trechos doutrinários**, com o número de trechos. Ele abre o Aprofundamento no capítulo da disciplina, rola até o assunto e o destaca;
- assunto sem trecho: aviso para estudar pela lei seca, pelos cartões e pelas fontes oficiais.

A ligação usa o id do assunto no programa (`mapa` do e-book: id do assunto → capítulo, posição do título, quantidade de trechos). Os outros editais não mudam.

## Como os trechos foram escolhidos

Os scripts ficam em `ferramentas/conteudo/drive/` e rodam fora do repositório, sobre os arquivos baixados do Drive:

1. `extrair_drive.py`: texto de PDF, DOCX e MD por página, sem cabeçalho, rodapé e marca d'água repetidos e sem linhas com dados pessoais (e-mail, CPF, telefone, "licenciado para");
2. `trechos.py`: parágrafos e seções (títulos numerados ou em maiúsculas), notas de rodapé retiradas, gabarito das questões "CAIU NA..." trazido para o texto, e a disciplina de cada trecho (pelo material ou, nos informativos e atualizações, pelo título da seção);
3. `buscar.py`: para cada assunto e cada subitem do edital, busca por correspondência (BM25) só nos trechos da disciplina, exigindo os termos do subitem juntos no texto ou no título da seção. Prefere deixar o assunto sem trecho a mostrar trecho de outro tema;
4. `gerar_ebooks.py`: monta os e-books e o `mapa` (com `OCULTAR=nome1,nome2` tira nomes que não devem aparecer).

É uma seleção automática: confira a pertinência de cada trecho e a redação vigente da lei.

## Segurança

O texto é material de curso e anotações pessoais; o repositório é público. Por isso:

- os e-books vão para `conteudo-cifrado/*.bin` **selados** com a mesma chave pública da lei seca do curso (`leiseca-cifrada/chave-publica.txt`): `node ferramentas/ajustes/selar_conteudo.mjs conteudo-cifrado/ce-dpe-rn.bin ce-dpe-rn.json`. Selar não precisa de segredo;
- na publicação, `ferramentas/ci/aplicar_ebooks.mjs` abre os `.bin` com a senha do app (segredo `APP_SENHA`, o mesmo de sempre) e insere os e-books no baralho cifrado (`DECK.ebooks`), trocando pelo id. Nenhum segredo novo;
- os `.bin` não são copiados para o site; o texto só existe dentro do `deck.enc`, que abre com a senha do app;
- nenhum dado pessoal das marcas d'água vai para os e-books, e as anotações pessoais aparecem como "Anotações de estudo".

Se a senha do app mudar, o log da etapa de lei seca mostra a nova chave pública: sele de novo a lei seca do curso e estes e-books com ela.
