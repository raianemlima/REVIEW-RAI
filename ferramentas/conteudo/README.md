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

## Alterações no app feitas direto no `index.html`

Algumas mudanças no código do app foram aplicadas direto no `index.html` publicado, por scripts em `ferramentas/ajustes/`. Antes do próximo `node build.mjs`, rode os mesmos scripts no seu `fonte.html`, senão o build volta o app à versão antiga:

```bash
python ferramentas/ajustes/defensorias.py fonte.html   # lista de Defensorias no campo Concurso
python ferramentas/ajustes/aba_defensoria.py fonte.html defensoria.json --publico   # aba Defensoria (súmulas e teses)
python ferramentas/ajustes/novidades_publicas.py fonte.html novidades-2026-10-14.json   # novidades embutidas no código
```

O `defensoria.json` e as novidades podem ser recuperados do próprio `index.html` publicado (constantes `DPE_PUBLICO` e `NOV_PUBLICO`). Os scripts podem ser rodados mais de uma vez.

O passo 3 precisa de `pip install -r ferramentas/mcp-planalto/requirements.txt`.

## Como ler o relatório `conferir`

- `confere`: as palavras do cartão (com as lacunas preenchidas pelo verso) aparecem no artigo vigente.
- `revisar`: a cobertura ficou entre 70% e 90%. Costuma ser só uma paráfrase; dê uma olhada.
- `provável divergência`: há palavras importantes que não existem no artigo (veja a coluna `ausentes`). Pode ser redação alterada ou número de artigo errado.
- `artigo não encontrado`: o artigo foi revogado ou a origem do cartão está errada.

A comparação é uma triagem automática. Cartões de pergunta direta têm cobertura menor por natureza, e a palavra final sobre qualquer correção é sua.

## Campos de um cartão

`id` (único; prefixos `ls-` lei seca, `lq-` questões, `nv-` novidades), `disc`, `tema`, `tipo`, `frente`, `verso`, `porque`, `origem` (ex.: `CPC, art. 99`), `abr`, `peso` e `inc` (1 a 5), `fonte`.
