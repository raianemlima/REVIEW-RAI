# Livros completos em PDF no Aprofundamento

Livros de estudo em PDF (texto corrido, com marcadores) entram no **Aprofundamento** (Biblioteca) pelo mesmo caminho dos resumos por matéria: o texto nunca fica legível no repositório público.

| Livro | id | disciplina | capítulos | arquivo |
|---|---|---|---|---|
| Direito Constitucional · manual completo (2026) | `dc-manual-2026` | `dc` | 25 | `conteudo-cifrado/manual-direito-constitucional.bin` |
| Direito Processual Penal · manual completo (2026) | `pp-manual-2026` | `pp` | 24 | `conteudo-cifrado/manual-direito-processual-penal.bin` |
| Criminologia · livro completo (2020) | `cr-sinopse-2020` | `cr` | 38 | `conteudo-cifrado/livros-sinopses.bin` |
| Direitos da Pessoa com Deficiência · livro completo (2020) | `dh-pcd-sinopse-2020` | `dh` | 21 | `conteudo-cifrado/livros-sinopses.bin` |
| Direito Administrativo · livro completo (2020) | `ad-sinopse-2020` | `ad` | 17 | `conteudo-cifrado/livros-sinopses.bin` |
| Direito Tributário · livro completo (17ª ed., 2023) | `tr-manual-2023` | `tr` | 17 | `conteudo-cifrado/livros-sinopses.bin` |
| Processo Civil · manual completo (volume único, 2018) | `pc-manual-2018` | `pc` | 79 | `conteudo-cifrado/livros-manuais.bin` |
| Direito do Consumidor · curso completo (12ª ed., 2018) | `co-curso-2018` | `co` | 50 | `conteudo-cifrado/livros-manuais.bin` |
| O novo CPC e o Direito Civil · livro completo (2015) | `cv-novo-cpc-2015` | `cv` | 17 | `conteudo-cifrado/livros-manuais.bin` |

## Como entra (cada passo roda fora do Git, só o `.bin` selado vai)

```bash
# 1. PDF -> Markdown (títulos pelos marcadores do PDF, capítulos pelo sumário impresso, caixas viram citações, tabelas)
python ferramentas/conteudo/pdf2md.py "Livro.pdf" livro.md "Título do livro"

# 2. Markdown -> JSON de capítulos do Aprofundamento (um capítulo do app por capítulo do livro)
python ferramentas/conteudo/ebook_md.py livro.md <id> <disc> "Título" "Subtítulo" livro.json

# 3. selar com a chave pública do app (não precisa de segredo)
node ferramentas/ajustes/selar_conteudo.mjs conteudo-cifrado/<arquivo>.bin livro.json
```

Na publicação, `ferramentas/ci/aplicar_ebooks.mjs` abre os `.bin` com a senha do app (`APP_SENHA`) e insere os livros no baralho cifrado (`DECK.ebooks`). O texto só existe dentro do `deck.enc`. Nenhum segredo novo, e o cache do app é carimbado na publicação.

## Livros que chegam como texto já extraído (uma seção por página)

Quando o livro vem como Markdown "## Página N" (texto extraído do PDF, sem os marcadores de fonte do `pdf2md.py`), use `ferramentas/conteudo/livro_paginas.py LIVRO.md CONFIG.json SAIDA.json`. O `CONFIG.json` (um por livro, em `ferramentas/conteudo/livros_paginas_*.json`) traz só títulos de capítulo, páginas do sumário e regras de limpeza, nunca o texto. O script tira cabeçalhos e rodapés, une as linhas em parágrafos, refaz palavras partidas por hífen, troca o "0" do OCR por "o", marca como título (`##` a `####`) a linha numerada que também está no sumário impresso e corta cada capítulo no seu título. Depois: `node ferramentas/ajustes/selar_conteudo.mjs conteudo-cifrado/livros-sinopses.bin cr.json pcd.json adm.json tr.json`.

Limites: quadros e figuras do PDF viram texto solto (ou somem); as edições são anteriores a leis novas (o Administrativo, de 2020, é anterior às Leis 14.133 e 14.230/2021; o Tributário, de 2023, à regulamentação da reforma tributária). Para o regime vigente, use os **Pontos de prova** de cada matéria.

**Fora do app:** o Manual de Processo Civil de 2016 (Daniel Amorim) é a edição anterior do manual de 2018 que já está no app e não foi incluído; o volume de Processo Civil (Coleção Novo CPC, Didier) veio com OCR ilegível (825 de 856 páginas em ideogramas) e não foi incluído; precisa do PDF original ou de nova extração.

### Qualidade do texto dos livros extraídos

Só ficam no app os livros cujo texto passou na verificação (cobertura, hífens, numeração e ruído de OCR):

- **Processo Civil (2018)**: texto limpo; as notas de rodapé ficam no meio do texto, na página em que aparecem.
- **Direito do Consumidor (2018)** e **O novo CPC e o Direito Civil (2015)**: texto limpo; são anteriores à Lei 14.181/2021 (superendividamento) e a alterações posteriores do CPC.
- **Fora do app, por qualidade**: Direito Civil (Tartuce, 2024; OCR com muitos erros), Prática forense (OCR ruim) e Direito Penal estruturado (Greco; a extração perdeu a numeração dos tópicos). Precisam de nova leitura do PDF.

## O que o conversor faz e não faz

- Une as linhas do PDF em parágrafos; preserva negrito e itálico; tira cabeçalho, rodapé e o sumário impresso (pontilhado).
- Os títulos seguem os marcadores do PDF; o capítulo começa na página do primeiro título listado no sumário impresso (o cabeçalho de página serve só de reserva, porque no Constitucional o capítulo 19 não aparece em nenhum cabeçalho).
- O que vem antes do capítulo 1 (capa, ficha, apresentação da editora, sumário e "sobre o autor") fica de fora, e as atribuições a sites ou editoras comerciais no meio do texto viram redação neutra (`NEUTRO` em `ebook_md.py`); as referências bibliográficas de autores ficam. O script avisa se sobrar menção de origem comercial.
- As caixas de destaque ("ATENÇÃO", "QUESTÃO DE CONCURSO", "GABARITO COMENTADO") viram citações; tabelas de dados viram tabelas.
- **Imagens não são extraídas** (esquemas e figuras: 100 no Constitucional e 45 no Processual Penal).
- O renderizador do Aprofundamento aceita `##` a `######`, citações, tabelas, listas, negrito e itálico; barras de escape não são removidas, então o `ebook_md.py` as tira (`\*` vira `∗`).

## Peso

Os dois primeiros livros somam cerca de 4,4 milhões de caracteres; os sete livros extraídos depois somam cerca de 12 milhões de caracteres selados ao repositório (e ao `deck.enc`). Selados (gzip + AES) ficam em 0,6 a 0,7 MB cada no repositório; dentro do baralho cifrado acrescentam cerca de 1,8 MB ao `deck.enc`, que abre uma vez por entrada no app.

## Direitos

São livros comerciais de uso pessoal da titular do app. Não commitar o `.pdf`, o `.md` nem o `.json`: só o `.bin` selado.
