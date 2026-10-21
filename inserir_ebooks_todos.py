"""Uso (no computador, dentro de ferramentas/conteudo): python3 inserir_ebooks_todos.py deck.json ebooks-todos.json
Equivale a rodar `ebooks.py inserir deck.json` com cada estudo; repetir não duplica (atualiza pelo id)."""
import json, sys
deck_p, lista_p = sys.argv[1], sys.argv[2]
d = json.load(open(deck_p, encoding="utf-8"))
discs = {x["id"] for x in d["disciplinas"]}
eb = {e["id"]: e for e in d.get("ebooks") or []}
for e in json.load(open(lista_p, encoding="utf-8")):
    assert e["disc"] in discs, e["disc"]
    eb[e["id"]] = e
    print(e["id"], len(e["caps"]), "capítulos")
d["ebooks"] = list(eb.values())
json.dump(d, open(deck_p, "w", encoding="utf-8"), ensure_ascii=False)
