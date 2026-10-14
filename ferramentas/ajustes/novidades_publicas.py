"""Novidades embutidas no código do app (NOV_PUBLICO), sem baralho cifrado nem senha.

    python ferramentas/ajustes/novidades_publicas.py index.html novidades-2026-10-14.json [mais.json ...]

Os itens somam-se às novidades do baralho (DECK.novidades); se um id já existir no baralho, vale o do baralho.
Rodar de novo não duplica: os arquivos são mesclados por id com o que já estiver embutido.
Use também no fonte.html antes do próximo build, senão as novidades embutidas somem.
"""
import json, re, sys
from pathlib import Path

ANTES = "const nvItens = () => (DECK.novidades || {}).itens || [];"
DEPOIS = ("const nvItens = () => { const d = (DECK.novidades || {}).itens || [], ids = new Set(d.map(n => n.id));\n"
          "  return [...d, ...(typeof NOV_PUBLICO !== \"undefined\" ? NOV_PUBLICO : []).filter(n => !ids.has(n.id))]; };")
FONTE_ANTES = '${esc(DECK.novidades.fonte || "")}'
FONTE_DEPOIS = '${esc((DECK.novidades || {}).fonte || "Resumos próprios: confira sempre o texto oficial.")}'
NOV_RE = re.compile(r"^const NOV_PUBLICO = (\[.*\]);\n", re.M)
OBRIG = ("id", "lei", "pub", "titulo", "resumo", "temas", "mudou", "dpe", "prova")

def main(html_path: Path, arquivos: list[Path]) -> None:
    html = html_path.read_text(encoding="utf-8")
    if DEPOIS not in html:
        if html.count(ANTES) != 1: sys.exit("trecho de nvItens não encontrado; nada foi gravado.")
        html = html.replace(ANTES, DEPOIS)
    if FONTE_ANTES in html: html = html.replace(FONTE_ANTES, FONTE_DEPOIS)
    m = NOV_RE.search(html)
    itens = json.loads(m.group(1)) if m else []
    por_id = {n["id"]: n for n in itens}
    for arq in arquivos:
        for n in json.loads(arq.read_text(encoding="utf-8")):
            falta = [c for c in OBRIG if not n.get(c)]
            if falta: sys.exit(f"{n.get('id')}: faltam campos {falta}; nada foi gravado.")
            por_id[n["id"]] = n
    bloco = "const NOV_PUBLICO = " + json.dumps(list(por_id.values()), ensure_ascii=False) + ";\n"
    if m: html = html[:m.start()] + bloco + html[m.end():]
    else:
        i = html.index(DEPOIS); html = html[:i] + bloco + html[i:]
    html_path.write_text(html, encoding="utf-8")
    print(f"{html_path}: {len(por_id)} novidades embutidas")

if __name__ == "__main__":
    if len(sys.argv) < 3: sys.exit(__doc__)
    main(Path(sys.argv[1]), [Path(a) for a in sys.argv[2:]])
