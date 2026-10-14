# Teses RG e Repetitivos — dados + app

1. `python3 scripts/parse_teses.py arquivo.pdf data` gera `data/teses.json`.
2. Abra `docs/index.html` via servidor estático (`python3 -m http.server -d docs`) ou GitHub Pages.
3. `scripts/sync.sh arquivo.pdf "msg"` regenera e envia ao GitHub.

Para integrar em um app existente, leia `data/teses.json` (ver `CLAUDE.md` para o esquema).
