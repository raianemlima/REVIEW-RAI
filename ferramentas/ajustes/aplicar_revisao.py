"""Aplica no fonte.html uma revisão de texto de cartões (frente, verso ou porquê), pelo id do cartão.

    python ferramentas/ajustes/aplicar_revisao.py C:\\caminho\\fonte.html revisao.json

O revisao.json tem a forma {"id-do-cartao": {"frente": "...", "verso": "...", "porque": "..."}}; cada campo é opcional.
Ele traz texto do baralho: guarde junto do fonte.html, fora do GitHub. Depois rode o node build.mjs como sempre.
Pode rodar mais de uma vez: o que já está igual não muda.
"""
import json, re, sys
from pathlib import Path

CAMPOS = ("frente", "verso", "porque")
DECK_RE = re.compile(r"^const DECK = (\{.*\});$", re.M)

if __name__ == "__main__":
    if len(sys.argv) != 3: sys.exit(__doc__)
    fonte, rev = Path(sys.argv[1]), json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
    html = fonte.read_text(encoding="utf-8")
    m = DECK_RE.search(html)
    if not m: sys.exit("const DECK não encontrado em " + str(fonte))
    deck = json.loads(m.group(1))
    por_id = {c["id"]: c for c in deck["cartoes"]}
    faltam = [i for i in rev if i not in por_id]
    mudou = 0
    for i, novo in rev.items():
        c = por_id.get(i)
        if not c: continue
        for k, v in novo.items():
            if k not in CAMPOS: sys.exit(f"{i}: campo '{k}' não é revisável (só {', '.join(CAMPOS)})")
            if c.get(k) != v: c[k] = v; mudou += 1
    if mudou:
        fonte.write_text(html[:m.start()] + "const DECK = " + json.dumps(deck, ensure_ascii=False) + ";" + html[m.end():], encoding="utf-8")
    print(f"{fonte}: {mudou} campo(s) alterado(s) em {len(rev) - len(faltam)} cartão(ões)")
    if faltam: print(f"atenção: {len(faltam)} id(s) não encontrados no baralho: {', '.join(faltam[:20])}")
