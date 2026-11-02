# Resumos por matéria · DPE/RN, TJPB 2026 e DPDF 2026

Onze e-books no **Aprofundamento** (Biblioteca), um por matéria, com resumos curtos e objetivos escritos assunto por assunto. Cada resumo junta os assuntos equivalentes dos três editais: o mesmo texto serve à DPE/RN, ao TJPB e à DPDF, e a linha *No edital* mostra os itens de cada concurso que ele cobre.

| E-book | Capítulos | Resumos | Assuntos de edital com resumo |
|---|---|---|---|
| Direito Constitucional | 9 | 42 | 47 de 53 |
| Direito Administrativo | 8 | 27 | 37 de 40 |
| Direito Civil | 7 | 42 | 52 de 58 |
| Direito do Consumidor | 5 | 11 | 14 de 18 |
| Direito Processual Civil | 8 | 31 | 38 de 47 |
| Direito Penal | 6 | 29 | 38 de 51 |
| Direito Processual Penal e Execução Penal | 10 | 47 | 59 de 80 |
| Direitos Humanos | 5 | 41 | 50 de 54 |
| Direitos Difusos e Coletivos | 3 | 31 | 36 de 47 |
| Direito da Criança e do Adolescente | 4 | 17 | 17 de 23 |
| Defensoria Pública e princípios institucionais | 4 | 14 | 14 de 23 |
| **Total** | **69** | **332** | **402 de 494** |

**Língua Portuguesa fica fora**, por escolha da titular do app. As disciplinas próprias da DPDF sem material de estudo (LODF e LC distrital 828/2010, LC 840/2011, política distrital para as mulheres, informática e primeiros socorros) não têm resumo; o item de informática sobre a LGPD aponta para o resumo de LGPD de Direito Civil.

Os resumos não citam curso, editora nem material de origem: são texto de apoio ao estudo. Leia junto com a lei seca e confira a redação vigente e a jurisprudência atual.

## No Cronograma

Em cada bloco de assunto da DPE/RN, do TJPB ou da DPDF (na tela do Cronograma e nos assuntos de hoje, em Hoje):

- assunto com resumo: botão **📖 Ler o resumo** (em Hoje é a ação principal do assunto). Ele abre o e-book da matéria no capítulo certo, rola até o resumo e o destaca;
- assunto sem resumo: aviso para estudar pela lei seca, pelos cartões e pelas fontes oficiais.

A ligação fica no campo `editais` de cada e-book: `{edital: {id do assunto: [capítulo, posição do título no capítulo, 1] | null}}`. `null` é assunto do edital sem resumo. Os outros editais não mudam.

## Como os resumos foram feitos

Os scripts ficam em `ferramentas/conteudo/drive/` e rodam fora do repositório, sobre o material de estudo pessoal baixado do Drive (peças, ofícios e documentos de trabalho ficam de fora):

1. `extrair_drive.py`: texto de PDF, DOCX e MD por página, sem cabeçalho, rodapé e marca d'água e sem linhas com dados pessoais;
2. `trechos.py`: parágrafos e seções, notas de rodapé retiradas e a disciplina de cada trecho;
3. `buscar.py`: para cada assunto e subitem do edital, os trechos mais pertinentes da disciplina (BM25, com os termos do subitem juntos e, quando o edital cita lei pelo número, o mesmo número no trecho);
4. `agrupar_assuntos.py`: agrupa os assuntos dos três editais por matéria, une os que caem nos mesmos trechos e escreve os pacotes de leitura;
5. os resumos são redigidos a partir desses pacotes (`=== <grupo>`, `CAP:`, `TIT:` e o corpo em Markdown, sem títulos `#`), mais enxutos que os trechos e sem nome de fonte;
6. `gerar_resumos.py`: monta os onze e-books (capítulos na ordem lógica da matéria, um título por resumo) e o campo `editais`. O script recusa resumo com nome de curso, de material de origem ou dado pessoal.

## Livros completos

O Aprofundamento também tem os livros completos de **Direito Constitucional** e **Direito Processual Penal** (veja [EBOOKS-PDF.md](EBOOKS-PDF.md)), sem a apresentação da editora e sem menção a curso no texto.

## Segurança

O texto é material de estudo de uso pessoal; o repositório é público. Por isso:

- os e-books vão para `conteudo-cifrado/*.bin` **selados** com a chave pública do app (`leiseca-cifrada/chave-publica.txt`): `node ferramentas/ajustes/selar_conteudo.mjs conteudo-cifrado/resumos-por-materia.bin rm-*.json`. Selar não precisa de segredo;
- na publicação, `ferramentas/ci/aplicar_ebooks.mjs` abre os `.bin` com a senha do app (segredo `APP_SENHA`) e insere os e-books no baralho cifrado (`DECK.ebooks`), trocando pelo id;
- os `.bin` não são copiados para o site; o texto só existe dentro do `deck.enc`. Os resumos em Markdown, os pacotes e os JSON nunca vão para o Git.

Se a senha do app mudar, o log da etapa de lei seca mostra a nova chave pública: sele de novo a lei seca e estes e-books com ela.
