"""Acrescenta ao banco "Provas de concurso" do app as provas extraídas por fgv_lote.py e cebraspe.py (só área jurídica).

    python ferramentas/conteudo/questoes/para_banco.py app-src.txt SAIDA_FGV/ SAIDA_CEBRASPE/ ...

Converte cada JSON para o formato de dados/simulados/<id>.json (o mesmo das provas que já estão no app, anulada =
gabarito "X"), filtra pela área jurídica (juridica.py) e embute todas as provas de dados/simulados/ em PROVAS_PUBLICO.
Só mexe nas provas geradas aqui (ids que começam com "tj" ou "mp"): são apagadas e refeitas a cada execução. As demais
(FCC, DPE-*) não são tocadas e saem idênticas.
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import juridica  # noqa: E402

DADOS = Path(__file__).resolve().parents[1] / "dados" / "simulados"
GERADAS = re.compile(r"^(tj|mp)[a-z]*-\d{4}-")
AVISO = "\n[Esta questão usa figura, quadro ou texto que não foi extraído do caderno: confira o enunciado completo na prova original.]"


def slug(t):
    t = "".join(c for c in unicodedata.normalize("NFD", t.lower()) if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")


def converter(d, usados):
    pid = f"{d['orgao'].lower()}-{d['ano']}-{slug(d['cargo'])}"
    if pid in usados:
        pid += "-" + d["banca"].lower()
    carreira = bool(re.search(r"(?i)juiz|promotor|procurador|defensor", d["cargo"]))
    rotulo = "Carreira jurídica" if carreira else "Concurso de servidores"
    if d.get("tipo"):
        rotulo += f" · prova tipo {d['tipo']}"
    qs = []
    for q in d["questoes"]:
        enun = q["enunciado"] + (AVISO if q.get("imagem") else "")
        qs.append({"n": q["n"], "materia": q["disciplina"] or "Sem disciplina", "enunciado": enun,
                   "alternativas": q["alternativas"], "gabarito": "X" if q["anulada"] else q["gabarito"]})
    return pid, {"id": pid, "nome": f"{d['orgao']} {d['ano']} · {d['cargo']}", "cargo": rotulo,
                 "banca": d["banca"], "gabarito": "definitivo", "questoes": qs}


def embutir(arquivo):
    provas = [json.loads(p.read_text(encoding="utf-8")) for p in sorted(DADOS.glob("*.json")) if not p.stem.endswith("-correcoes")]
    provas.sort(key=lambda p: p["id"] != "fcc-defensorias")   # banco de questões da FCC primeiro
    bloco = "const PROVAS_PUBLICO = " + json.dumps(provas, ensure_ascii=False).replace("</", "<\/") + ";\n"
    t = Path(arquivo).read_text(encoding="utf-8")
    a = t.index("const PROVAS_PUBLICO = ")
    Path(arquivo).write_text(t[:a] + bloco + t[t.index(";\n", a) + 2:], encoding="utf-8")
    return provas


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    arquivo, pastas = sys.argv[1], [Path(p) for p in sys.argv[2:]]
    for f in DADOS.glob("*.json"):
        if GERADAS.match(f.stem):
            f.unlink()   # refeitas abaixo; as provas que não são daqui (FCC, DPE-*) nunca casam
    usados, novas, fora = set(), [], []
    for pasta in pastas:
        for f in sorted(pasta.glob("*.json")):
            d = json.loads(f.read_text(encoding="utf-8"))
            antes = len(d["questoes"])
            d = juridica.filtrar(d)
            if d is None:
                fora.append(f"{f.stem} (cargo não jurídico ou sem questões jurídicas)")
                continue
            pid, prova = converter(d, usados)
            usados.add(pid)
            (DADOS / f"{pid}.json").write_text(json.dumps(prova, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
            novas.append(f"{pid}: {len(prova['questoes'])} de {antes} questões")
    provas = embutir(arquivo)
    print("\n".join(novas))
    print(f"\nfora (não jurídicas): {len(fora)}")
    for x in fora:
        print("  -", x)
    print(f"{len(novas)} prova(s) nova(s); {len(provas)} no banco, {sum(len(p['questoes']) for p in provas)} questões")


if __name__ == "__main__":
    main()
