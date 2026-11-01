# Questões de concursos (TJ e MP) — só área jurídica

As provas entram no banco que já existe no app, **Provas de concurso** (`PROVAS_PUBLICO` em `app-src.txt`), com correção na hora, placar por matéria e envio das erradas para a revisão. Esta rotina só **acrescenta** provas: as que já estavam (FCC, DPE-MG, DPE-PE, DPE-PR, DPE-RN, DPE-RO, DPE-SP) saem idênticas, e `tests/questoes-tj.test.mjs` protege isso.

## O que entra

- **Fontes:** cadernos e gabaritos **definitivos** publicados pelas bancas: FGV (`conhecimento.fgv.br/concursos/<slug>`, prova Tipo 1) e Cebraspe (API pública `apis.cebraspe.org.br/cebraspe/eventos/<id>` e CDN `cdn.cebraspe.org.br`). Sem comentários. Anuladas ficam com gabarito `X`.
- **Só área jurídica** (`juridica.py`), em dois níveis:
  - *cargo:* entram juiz, promotor, oficial de justiça, analista/técnico judiciário da área judiciária ou de direito, analista jurídico. Ficam de fora engenharia, psicologia, contabilidade, TI, administração, saúde etc.
  - *disciplina:* dentro de um cargo jurídico saem Português, Informática, Estatística, Raciocínio Lógico, Matemática, Atualidades e os "Conhecimentos Gerais".
  As questões mantêm o número original do caderno (podem existir "buracos" na numeração).
- Quando a banca republica o gabarito (v2, v3...), vale a mais nova (no TJMT a retificação mudou Direito de 2 para 3 anuladas).
- Texto-base (Cebraspe: "Texto CG1A1-I") é anexado à questão. Figuras, quadros e gráficos não são extraídos: a questão leva um aviso no enunciado.
- Itens Certo/Errado do Cebraspe entram só em blocos de "Conhecimentos Específicos" (sem rótulo de matéria não dá para separar o que é jurídico).
- Cargo sem seção equivalente no gabarito **não entra** (em vez de arriscar gabarito trocado).
- Não coletamos do Qconcursos (termos de uso) nem do PCI Concursos (captcha).

## Como acrescentar

```bash
pip install pymupdf
python ferramentas/conteudo/questoes/fgv_lote.py cache/ saida_fgv/ tjrr24:TJRR:2024 tjmtservidor:TJMT:2024   # slug:SIGLA:ANO
python ferramentas/conteudo/questoes/cebraspe.py cache/ saida_ceb/ TJ_CE_23_SERVIDOR:TJCE:2023 MP_BA_23_PROMOTOR:MPBA:2023
python ferramentas/conteudo/questoes/para_banco.py app-src.txt saida_fgv/ saida_ceb/
```

Os dois primeiros imprimem um relatório do que não casou. `para_banco.py` apaga e refaz os arquivos `ferramentas/conteudo/dados/simulados/(tj|mp)*.json` a cada execução (os das provas antigas nunca casam) e reembute `PROVAS_PUBLICO`. O cache do app é carimbado na publicação.

## Gabaritos da FGV

Dois layouts, lidos por `fgv.secoes()`: tabela em colunas (números e depois letras, com zeros de preenchimento nos blocos curtos) e pares "número, letra". Cabeçalhos aceitos: `Cargo - TIPO 1`, `Cargo – Tipo 1`, `Cargo - PROVA TIPO 1`, `Cargo – PROVA 1` e `Cargo - 1 - Turno Tarde` (o número é o tipo). O caderno Tipo 1 casa com a seção do tipo 1. A conferência de uma questão resolvida à mão (TJGO 2025, questão 1) está no teste.

O número de cada questão é reconhecido pelo negrito: um "2" solto no meio do texto, quebrado em linha própria, não abre uma questão nova.

## Gabarito definitivo: como é decidido

O lote da FGV aceita qualquer arquivo de gabarito da página do concurso e decide por nome e capa: vale o que diz "definitivo" ou "oficial" (no nome ou na capa) e **nunca** o que a capa chama de "preliminar". Arquivos `gabaritos-para-publicacao` sem marcação na capa não entram (podem ser preliminares). Quando um caderno e outro casam com a mesma seção do gabarito (ex.: MPMT "Promotor" e "Promotor - Grupo 1"), fica o que não tem especialização a mais. A sigla do órgão no cabeçalho ("do MPMT") é ignorada no casamento.

## Ainda não coberto

- **Só tem gabarito preliminar publicado** (não entram até sair o definitivo): TJMS XI 2025, MPGO 2025, MPRJ promotor 2026, TJSC servidor 2026, TJPE juiz 2026 (capa sem marcação), TJMS juiz 2023.
- **Gabarito em tabela diferente:** TJPR 2021 (edital assinado com quadro por tipo), MPRJ e MPU.
- **Página sem os cadernos:** TJRN 2023, TJAM, TJMG 2021, TJRJ, TJPB 2026 (gabarito ainda não saiu).
- **Bancas que bloqueiam acesso automatizado ou não publicam o PDF em link direto:** Vunesp (TJSP, MPSP; 403), Consulplan/EJEF (TJMG 2026) e as páginas dos próprios tribunais. Para esses, baixe os PDFs manualmente e use o extrator da FGV/Cebraspe como base.
- **MPSC 2023 e MPGO (Cebraspe):** itens Certo/Errado sem separação por disciplina.
