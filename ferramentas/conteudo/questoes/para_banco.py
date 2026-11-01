"""Acrescenta ao banco "Provas de concurso" do app as provas extraídas por fgv_lote.py.

    python ferramentas/conteudo/questoes/para_banco.py SAIDA/ app-src.txt

Converte cada JSON de SAIDA/ para o formato de dados/simulados/<id>.json (o mesmo das provas que já estão no app,
anulada = gabarito "X") e embute todas as provas de dados/simulados/ em PROVAS_PUBLICO no arquivo indicado.
Só acrescenta: provas que já existem com o mesmo id não são sobrescritas, e o restante do banco sai idêntico.
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

DADOS = Path(__file__).resolve().parents[1] / "dados" / "simulados"
AVISO_FIGURA = "\n[Esta questão usa figura ou quadro que não foi extraído do caderno: confira o enunciado completo na prova original.]"


def slug(t):
    t = "".join(c for c in unicodedata.normalize("NFD", t.lower()) if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")


def converter(d):
    pid = f"{d['orgao'].lower()}-{d['ano']}-{slug(d['cargo'])}"
    qs = []
    for q in d["questoes"]:
        enun = q["enunciado"] + (AVISO_FIGURA if q.get("imagem") else "")
        qs.append({"n": q["n"], "materia": q["disciplina"] or "Sem disciplina", "enunciado": enun,
                   "alternativas": q["alternativas"], "gabarito": "X" if q["anulada"] else q["gabarito"]})
    return pid, {"id": pid, "nome": f"{d['orgao']} {d['ano']} · {d['cargo']}", "cargo": f"Concurso de servidores · prova tipo {d['tipo']}",
                 "banca": d["banca"], "gabarito": "definitivo", "questoes": qs}


def embutir(arquivo):
    provas = [json.loads(p.read_text(encoding="utf-8")) for p in sorted(DADOS.glob("*.json")) if not p.stem.endswith("-correcoes")]
    provas.sort(key=lambda p: p["id"] != "fcc-defensorias")   # banco de questões da FCC primeiro
    bloco = "const PROVAS_PUBLICO = " + json.dumps(provas, ensure_ascii=False).replace("</", "<\\/") + ";\n"
    t = Path(arquivo).read_text(encoding="utf-8")
    a = t.index("const PROVAS_PUBLICO = ")
    Path(arquivo).write_text(t[:a] + bloco + t[t.index(";\n", a) + 2:], encoding="utf-8")
    return provas


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    novas = []
    for f in sorted(Path(sys.argv[1]).glob("*.json")):
        pid, prova = converter(json.loads(f.read_text(encoding="utf-8")))
        dest = DADOS / f"{pid}.json"
        if dest.exists():
            print("já existe, mantida:", pid)
            continue
        dest.write_text(json.dumps(prova, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        novas.append(pid)
    provas = embutir(sys.argv[2])
    print(f"{len(novas)} prova(s) nova(s); {len(provas)} no banco, {sum(len(p['questoes']) for p in provas)} questões")


if __name__ == "__main__":
    main()
