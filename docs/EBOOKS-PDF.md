# Livros completos em PDF no Aprofundamento

Livros de estudo em PDF (texto corrido, com marcadores) entram no **Aprofundamento** (Biblioteca) pelo mesmo caminho dos resumos por matéria: o texto nunca fica legível no repositório público.

| Livro | id | disciplina | capítulos | arquivo |
|---|---|---|---|---|
| Direito Constitucional · manual completo (2026) | `dc-manual-2026` | `dc` | 25 | `conteudo-cifrado/manual-direito-constitucional.bin` |
| Direito Processual Penal · manual completo (2026) | `pp-manual-2026` | `pp` | 24 | `conteudo-cifrado/manual-direito-processual-penal.bin` |

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

## O que o conversor faz e não faz

- Une as linhas do PDF em parágrafos; preserva negrito e itálico; tira cabeçalho, rodapé e o sumário impresso (pontilhado).
- Os títulos seguem os marcadores do PDF; o capítulo começa na página do primeiro título listado no sumário impresso (o cabeçalho de página serve só de reserva, porque no Constitucional o capítulo 19 não aparece em nenhum cabeçalho).
- O que vem antes do capítulo 1 (capa, ficha, apresentação da editora, sumário e "sobre o autor") fica de fora, e as atribuições a sites ou editoras comerciais no meio do texto viram redação neutra (`NEUTRO` em `ebook_md.py`); as referências bibliográficas de autores ficam. O script avisa se sobrar menção de origem comercial.
- As caixas de destaque ("ATENÇÃO", "QUESTÃO DE CONCURSO", "GABARITO COMENTADO") viram citações; tabelas de dados viram tabelas.
- **Imagens não são extraídas** (esquemas e figuras: 100 no Constitucional e 45 no Processual Penal).
- O renderizador do Aprofundamento aceita `##` a `######`, citações, tabelas, listas, negrito e itálico; barras de escape não são removidas, então o `ebook_md.py` as tira (`\*` vira `∗`).

## Peso

Os dois livros somam cerca de 4,4 milhões de caracteres. Selados (gzip + AES) ficam em 0,6 a 0,7 MB cada no repositório; dentro do baralho cifrado acrescentam cerca de 1,8 MB ao `deck.enc`, que abre uma vez por entrada no app.

## Direitos

São livros comerciais de uso pessoal da titular do app. Não commitar o `.pdf`, o `.md` nem o `.json`: só o `.bin` selado.
