# Conteúdo do baralho

O conteúdo do app (cartões, lei seca, novidades) fica **criptografado** no `index.html`. O texto puro fica num arquivo-fonte (`fonte.html`) que **não** vai para este repositório. Guarde-o num lugar privado: no seu computador, num repositório **privado** ou no Drive.

## Fluxo de atualização

```bash
# 1. abrir o baralho em JSONs editáveis (um por disciplina)
python ferramentas/conteudo/baralho.py extrair fonte.html baralho/

# 2. editar baralho/cartoes/<disc>.json (à mão ou pedindo ao agente com o MCP Planalto)

# 3. conferir a lei seca com o Planalto (gera CSV para abrir no Excel)
python ferramentas/conteudo/baralho.py conferir fonte.html --prefixo ls- --disc cv --saida conferencia_cc.csv

# 4. devolver as edições ao fonte e gerar o app criptografado
python ferramentas/conteudo/baralho.py montar baralho/ fonte.html
SENHA='sua senha' node build.mjs fonte.html index.html

# 5. subir a versão nova do sw.js (CACHE 'revisao-dpe-vNN') e fazer commit só do index.html e do sw.js
```

## Estudo em Markdown: Aprofundamento e cartões Certo ou errado

Textos de estudo (por exemplo, pesquisas em `.md` ou exportadas de `.docx`) entram no app de duas formas. **Nada disso vai para o Git:** o texto e os resultados ficam em `dados/ebooks/` (ignorada), porque o repositório é público.

```bash
# 1. guardar o texto limpo em dados/ebooks/fonte/<id>.md
#    (# Título geral; cada "# Capítulo"; "## Questão N" com a afirmação em negrito e "**Certo.**"/"**Errado.**" + comentário;
#     tabelas "| Afirmação | Avaliação |" com "Errada: ..." / "Correta.")

# 2. estudo em capítulos (Biblioteca › Aprofundamento)
python ferramentas/conteudo/ebooks.py preparar dados/ebooks/fonte/<id>.md <id> dh "Título" "Subtítulo"
python ferramentas/conteudo/ebooks.py inserir deck.json ferramentas/conteudo/dados/ebooks/*.json

# 3. cartões Certo ou errado para a revisão espaçada (FSRS)
python ferramentas/conteudo/estudo_md.py cartoes dados/ebooks/fonte/<id>.md --id <id> --tema "Título" --abr SP
python ferramentas/conteudo/estudo_md.py inserir baralho/ ferramentas/conteudo/dados/ebooks/cartoes/*.json
```

- `--abr` é a abrangência do cartão: `nucleo_comum` (todos) ou a sigla do estado (`SP`, `RN`...); o cartão só aparece para quem escolheu aquele concurso. `--disc` padrão: `dh`.
- Os ids são `ps-<id>-qNN` (questões) e `ps-<id>-pNN` (pegadinhas). `inserir` pode ser repetido: atualiza pelo id e não duplica. Recusa disciplina que o baralho não tem e id que já existe em outra disciplina.
- Depois, o fluxo normal: `baralho.py montar`, `SENHA=... node build.mjs`, subir `CACHE`/`APP_CACHE`.
- O renderizador do Aprofundamento mostra links só como texto (por segurança). Por isso as URLs das fontes devem aparecer por extenso numa lista "Fontes" ao fim do texto.

## Alterações no app feitas direto no `index.html`

Algumas mudanças no código do app foram aplicadas direto no `index.html` publicado, por scripts em `ferramentas/ajustes/`. Antes de cada `node build.mjs`, aplique essas mudanças no seu `fonte.html`, senão o build volta o app à versão antiga. Um comando faz tudo:

```bash
python ferramentas/ajustes/preparar_fonte.py caminho/fonte.html
```

Ele roda, nesta ordem:

```bash
python ferramentas/ajustes/defensorias.py fonte.html   # lista de Defensorias no campo Concurso
python ferramentas/ajustes/aba_defensoria.py fonte.html ferramentas/conteudo/dados/defensoria.json --publico   # aba Defensoria (súmulas e teses)
python ferramentas/ajustes/novidades_publicas.py fonte.html ferramentas/conteudo/dados/novidades-2026-10-14.json   # novidades embutidas no código
python ferramentas/ajustes/novidades_secoes.py fonte.html   # aba Novidades separada em Leis e Jurisprudência
```

Os dados ficam em `ferramentas/conteudo/dados/` (os mesmos embutidos no `index.html` publicado, nas constantes `DPE_PUBLICO` e `NOV_PUBLICO`). Os scripts podem ser rodados mais de uma vez.

O passo 3 precisa de `pip install -r ferramentas/mcp-planalto/requirements.txt`.

## Como ler o relatório `conferir`

- `confere`: as palavras do cartão (com as lacunas preenchidas pelo verso) aparecem no artigo vigente.
- `revisar`: a cobertura ficou entre 70% e 90%. Costuma ser só uma paráfrase; dê uma olhada.
- `provável divergência`: há palavras importantes que não existem no artigo (veja a coluna `ausentes`). Pode ser redação alterada ou número de artigo errado.
- `artigo não encontrado`: o artigo foi revogado ou a origem do cartão está errada.

A comparação é uma triagem automática. Cartões de pergunta direta têm cobertura menor por natureza, e a palavra final sobre qualquer correção é sua.

## Campos de um cartão

`id` (único; prefixos `ls-` lei seca, `lq-` questões, `nv-` novidades), `disc`, `tema`, `tipo`, `frente`, `verso`, `porque`, `origem` (ex.: `CPC, art. 99`), `abr`, `peso` e `inc` (1 a 5), `fonte`.
