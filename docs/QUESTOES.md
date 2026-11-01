# Questões de concursos (TJ e MP)

As provas entram no banco que já existe no app, **Provas de concurso** (`PROVAS_PUBLICO` em `app-src.txt`), com correção na hora, placar por matéria e envio das erradas para a revisão. Esta rotina só **acrescenta** provas: as que já estavam (FCC, DPE-MG, DPE-PE, DPE-PR, DPE-RN, DPE-RO, DPE-SP) saem idênticas, e o teste `tests/questoes-tj.test.mjs` protege isso.

## Fontes e o que entra

- Só cadernos e gabaritos **definitivos** publicados pela banca (FGV: `conhecimento.fgv.br/concursos/<slug>`), prova Tipo 1. Sem comentários. Anuladas ficam com gabarito `X`.
- Quando a banca republica o gabarito (v2, v3...), vale a versão mais nova. Ex.: no TJMT a retificação mudou Direito de 2 para 3 anuladas.
- Figuras e quadros não são extraídos: a questão leva um aviso no enunciado.
- Cargo sem seção correspondente no gabarito **não entra** (em vez de arriscar gabarito trocado). Ficaram de fora: TJRR Analista (Advogado) e TJMT Analista de TI.
- Não coletamos do Qconcursos (termos de uso) nem do PCI Concursos (captcha).

## Como acrescentar

```bash
pip install pymupdf
python ferramentas/conteudo/questoes/fgv_lote.py cache/ saida/ tjrr24:TJRR:2024 tjmtservidor:TJMT:2024   # slug:SIGLA:ANO
python ferramentas/conteudo/questoes/para_banco.py saida/ app-src.txt
```

`fgv_lote.py` imprime um relatório dos cargos que não casaram. `para_banco.py` grava `ferramentas/conteudo/dados/simulados/<id>.json` e reembute `PROVAS_PUBLICO`. Depois suba `CACHE`/`APP_CACHE` (sw.js, gate.js e gate do index.html).
