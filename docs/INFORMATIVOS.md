# Informativos · STF e STJ

Aba **Informativos**: julgados dos Informativos do STF e do Informativo de Jurisprudência do STJ desde 2024 (texto oficial, público), com busca, filtro por tribunal, ano e matéria, filtro "só com tese/destaque" e marcação de lido (`S.ajustes.inf.lidos`, sincroniza com os demais ajustes).

## Dados

- `arquivos/informativos/indice.json` e um arquivo por tribunal e ano (`stf-2025.json`, `stj-2026.json`...). A tela carrega sob demanda; o service worker guarda no aparelho o que já foi aberto (não entram no `CORE`, para não pesar na instalação).
- Fontes: `https://www.stf.jus.br/arquivo/informativo/documento/informativo<N>.htm` (STF) e `https://processo.stj.jus.br/jurisprudencia/externo/informativo/?acao=pesquisarumaedicao&livre=<NNNN>` (STJ).
- Cobertura na primeira carga: STF 1121–1234 e STJ 800–907. Itens do STF sem caso ("Nenhum caso foi selecionado.") são descartados.
- O STJ não publica a tese de todos os itens: o campo "Destaque" pode vir vazio (afetações de repetitivos, por exemplo).

## Atualizar

```bash
pip install beautifulsoup4 lxml
python ferramentas/conteudo/informativos/coletar.py cache/ saida/ --desde 2024-01-01   # cache/ fica fora do repositório
cp saida/*.json arquivos/informativos/
```

Depois suba `CACHE`/`APP_CACHE` (sw.js, gate.js e gate do index.html). Para o STF, ajuste o limite superior em `coleta_stf` (`n = 1260`) se passar de 1260 edições; o STJ procura a partir de 920.

## Código da aba

`python ferramentas/ajustes/aba_informativos.py index.html app-src.txt` insere (sem duplicar) o botão do menu, o estilo, a tela, a rota e o atalho em Hoje, a partir de `ferramentas/ajustes/aba_informativos/`. Teste: `tests/aba-informativos.test.mjs`.
