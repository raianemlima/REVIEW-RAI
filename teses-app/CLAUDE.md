# Teses de Repercussão Geral e Recursos Repetitivos (STF/STJ)

Base de dados estruturada (JSON) extraída do PDF "Teses de RG e Recursos Repetitivos" (Info 1227 STF / 901 STJ).

## Estrutura
- `data/teses.json` — `{estrutura:{capitulos,secoes,subsecoes}, teses:[...]}`; `data/teses.jsonl` — uma tese por linha.
- Campos de cada tese: `id, capitulo, secao, subsecao, pagina, titulo, texto, fontes[], tribunais[], temas[], info[], link_dizerodireito, link_oficial`.
- `scripts/extract_lines.py` + `scripts/parse_teses.py` — regeneram os dados a partir do PDF (precisa de `poppler-utils`). Os títulos são identificados pela fonte/cor do PDF (Noto Sans BoldItalic 19pt #c83e43).
- `docs/index.html` — visualizador estático com busca (GitHub Pages: servir a pasta `/docs`).
- `scripts/sync.sh` — regenera, comita e dá push.

## Regras
- Não commitar o PDF (já no `.gitignore`). Manter o repositório PRIVADO: o conteúdo é obra protegida de terceiros.
- Nunca editar `data/*.json` à mão; ajuste o parser e rode de novo.
- Limitação conhecida: ~16 teses sem `fontes` (citação em formato atípico) — conferir `fontes == []`.
