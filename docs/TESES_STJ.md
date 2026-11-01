# Teses STJ · Jurisprudência em Teses

Aba **Teses STJ**: as 281 edições da Jurisprudência em Teses do STJ (texto oficial, público), com as teses de cada edição e os julgados paradigma (acórdãos e decisões monocráticas). Tem busca, filtro por ramo do direito, filtro "só não lidas" e marcação de edição lida (`S.ajustes.teses.lidos`, sincroniza com os demais ajustes).

## Dados

- `arquivos/jurisprudencia-em-teses/indice.json` (uma linha por edição, sem as teses) e um arquivo por ramo (`ramo-direito-civil.json`...). A tela carrega sob demanda; o service worker guarda no aparelho o que já foi aberto (não entram no `CORE`).
- Fonte: `https://processo.stj.jus.br/SCON/jt/` (índice filtrado por ramo e uma página por edição). O host `scon.stj.jus.br` responde 403 a clientes sem navegador; `processo.stj.jus.br` serve o mesmo conteúdo.
- Cobertura na primeira carga: edições 1 a 285 (281 publicadas), 3.484 teses e 18.510 julgados. O texto é a última versão publicada de cada edição.
- A consulta por ramo usa latin-1 (acentos); em UTF-8 os ramos acentuados voltam vazios.

## Atualizar

```bash
pip install beautifulsoup4 lxml
python ferramentas/conteudo/jurisprudencia_em_teses/coletar.py cache/ saida/   # cache/ fica fora do repositório
rm -r arquivos/jurisprudencia-em-teses && mkdir arquivos/jurisprudencia-em-teses && cp saida/*.json arquivos/jurisprudencia-em-teses/
```

Apague `cache/` antes se quiser rebaixar edições que o STJ atualizou. Depois suba `CACHE`/`APP_CACHE` (sw.js, gate.js e gate do index.html).

## Código da aba

`python ferramentas/ajustes/aba_teses_stj.py index.html app-src.txt` insere (sem duplicar) o botão do menu, o estilo, a tela, a rota e o atalho em Hoje, a partir de `ferramentas/ajustes/aba_teses_stj/`. Teste: `tests/aba-teses-stj.test.mjs`.
